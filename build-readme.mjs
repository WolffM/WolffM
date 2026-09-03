#!/usr/bin/env node
/**
 * The profile README is every hadoku.me URL that serves a PAGE, one per line.
 *
 * Source is hadoku_site's docs/routes.json (`pnpm run routes:index`), so a new
 * app appears here by regenerating, not by remembering. Three filters, applied
 * in this order:
 *
 *   1. Pages only. routes.json already splits page mounts from API prefixes, so
 *      the 71 /api/* routes drop out by construction rather than by matching on
 *      the string "api" — /aggregator would survive that match and /prefs/*
 *      would not, and both would be wrong.
 *   2. No sub-routes. /watchparty/ stands for /watchparty/docs and
 *      /watchparty/game; /games/ for /games/host and /games/brave-quartet. A
 *      path is dropped when a shorter listed path is its parent.
 *   3. No aliases. /jobs 301s to /jobplatform/ and /printtool 308s to /craft/ —
 *      same destination, so the redirect is a duplicate of its target.
 *
 * Subdomains are excluded wholesale: every one either proxies a hadoku.me
 * prefix already listed (privatebin, pygmalion, dataplatform, …) or answers
 * JSON/404 to a browser.
 *
 * EXCLUDED then names what survives all three filters and is still not wanted
 * here. It is a deliberate list, not a rule — the filters above cannot derive
 * "I do not want to advertise this", so without it every regeneration would
 * quietly put these six back.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const ROUTES_JSON = process.argv[2] ?? `${process.env.HOME}/repos/hadoku_site/docs/routes.json`;
const OUT = new URL('./README.md', import.meta.url);

/** Redirects, keyed by the alias → where it lands. Both spellings are one place. */
const ALIASES = new Set(['/jobs', '/printtool', '/games-host']);

/**
 * Pages that pass every filter but stay off the profile by choice.
 *
 * /admin, /auth and /command-station are operator plumbing, not destinations.
 * /v1 /v2 /v3 are the
 * three frontpage variants that `/` already crossfades between, so listing them
 * shows the same front page four times.
 */
const EXCLUDED = new Set(['/admin', '/auth', '/command-station/', '/v1/', '/v2/', '/v3/']);

const routes = JSON.parse(readFileSync(ROUTES_JSON, 'utf8'));
const paths = routes.pages
	.map((p) => p.displayPath)
	.filter((p) => !ALIASES.has(p) && !EXCLUDED.has(p));

// A page is a sub-route when another LISTED page is its parent. Compared on the
// slash-normalised path so /games/ is recognised as the parent of /games/host,
// which a raw startsWith on the unnormalised strings gets right only by luck.
const norm = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
const kept = paths.filter((p) => {
	const me = norm(p);
	return !paths.some((other) => {
		const parent = norm(other);
		return parent !== me && parent !== '/' && me.startsWith(`${parent}/`);
	});
});

const urls = kept.map((p) => `https://hadoku.me${p}`).sort();

// One markdown list item per URL. Bare URLs on consecutive lines collapse into a
// single wrapped paragraph on GitHub, so the dash is what keeps them one-per-line.
writeFileSync(OUT, `${urls.map((u) => `- ${u}`).join('\n')}\n`);
console.log(`${urls.length} links → README.md`);
