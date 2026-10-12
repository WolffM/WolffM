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
 * quietly put these back. It is applied LAST, after the sub-route collapse, so
 * that excluding a parent still hides the children it stood for.
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
const EXCLUDED = new Set([
	'/admin',
	'/auth',
	'/command-station/',
	'/games/',
	'/v1/',
	'/v2/',
	'/v3/',
]);

/**
 * The ecosystem map heads the profile, in four renders: a 2:1 banner for desktop and a 1:2 tower
 * for phones (under 768px), each in GitHub's dark (#0d1117) and light (#ffffff) canvas.
 *
 * Each render is its own LINKED <picture>, so a click opens the image the viewer is looking at (one
 * <a> around one <picture> can only ever open one file). A picture shows a 1x1 transparent
 * assets/blank.png unless its own screen width AND theme match, so exactly one is visible. Only the
 * dark tower uses a real <img> fallback: a renderer that ignores <source> (the GitHub mobile app)
 * shows that one image instead of four. The towers come FIRST: a renderer that turns the whole line into
 * one link then opens a tower. A banner sits ONLY behind (min-width: 768px), never a catch-all source:
 * the GitHub app draws the right image but its full-screen viewer re-picks by theme alone, and found
 * the banner through `media="all"` (operator, 2026-10-12). No width attribute: GitHub caps images at the column width.
 */
const HEADER = `<a href="assets/tower-dark.png"><picture><source media="(min-width: 768px)" srcset="assets/blank.png"><source media="(prefers-color-scheme: light)" srcset="assets/blank.png"><img alt="HADOKU ECOSYSTEM" src="assets/tower-dark.png"></picture></a><a href="assets/tower-light.png"><picture><source media="(min-width: 768px)" srcset="assets/blank.png"><source media="(prefers-color-scheme: dark)" srcset="assets/blank.png"><source media="all" srcset="assets/tower-light.png"><img alt="" src="assets/blank.png"></picture></a><a href="assets/wide-dark.png"><picture><source media="(prefers-color-scheme: light)" srcset="assets/blank.png"><source media="(min-width: 768px)" srcset="assets/wide-dark.png"><img alt="" src="assets/blank.png"></picture></a><a href="assets/wide-light.png"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/blank.png"><source media="(min-width: 768px)" srcset="assets/wide-light.png"><img alt="" src="assets/blank.png"></picture></a>
`;

const routes = JSON.parse(readFileSync(ROUTES_JSON, 'utf8'));
const paths = routes.pages.map((p) => p.displayPath).filter((p) => !ALIASES.has(p));

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

// EXCLUDED is applied AFTER the sub-route collapse, never before. A parent has
// to stay in `paths` long enough to suppress its own children: dropping /games/
// first put /games/host and /games/brave-quartet BACK, because nothing was left
// to parent them, and the list grew by one on a change meant to shrink it.
const urls = kept
	.filter((p) => !EXCLUDED.has(p))
	.map((p) => `https://hadoku.me${p}`)
	.sort();

// One markdown list item per URL. Bare URLs on consecutive lines collapse into a
// single wrapped paragraph on GitHub, so the dash is what keeps them one-per-line.
writeFileSync(OUT, `${HEADER}\n${urls.map((u) => `- ${u}`).join('\n')}\n`);
console.log(`${urls.length} links → README.md`);
