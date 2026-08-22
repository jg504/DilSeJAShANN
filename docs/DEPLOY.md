# Deploy — dilsejashann.com

**This is a Cloudflare Worker with Static Assets, not classic Pages.** The distinction
matters: there is no "build output directory" setting. The deploy step runs
`npx wrangler deploy`, and `wrangler.jsonc` in the repo root is what tells it to upload
`dist/`. Without that file the build succeeds and the deploy fails.

- Worker name: **`dilsejashann`** — must match `wrangler.jsonc`, or a deploy creates a
  second Worker and leaves the domain on the old one
- Repo: `github.com/jg504/DilSeJAShANN`, production branch `main`
- Domain `dilsejashann.com`, registered at Cloudflare Registrar

## Dashboard settings

Workers & Pages → `dilsejashann` → Settings → Build:

- **Build command:** `npm run build:draft` — see below
- **Deploy command:** `npx wrangler deploy`
- **Root directory:** `/`

### `build` vs `build:draft`

- `npm run build` runs `scripts/validate-invites.mjs` first and **fails** if any record
  is incomplete. A page with a missing venue can never ship.
- `npm run build:draft` skips validation so UI work can continue while content is being
  chased.

`invites.json` still holds 40 `<<FILL>>` values, so **strict `build` fails today** and
would fail every deploy. Cloudflare therefore points at `build:draft` for now.

**Switch Cloudflare to `npm run build` before the links are distributed.** This is on
the pre-launch checklist. Until that switch happens, validation is not protecting the
live site — it only protects local builds.

---

## File migration — done 2026-08-21

Files moved as below. **Public URLs did not change**, verified live.

| From | To | Note |
|---|---|---|
| `game/` | `public/game/` | Ships untouched. `/game/` keeps working. |
| `robots.txt` | `public/robots.txt` | |
| `shared/` | `public/shared/` | Access test. |
| `index.html` | `src/pages/index.astro` | Becomes the plain fallback route. |

`public/` ships byte-for-byte, so the game keeps its hand-written CSS and its `.webp`
assets without passing through the Astro image pipeline. That is correct — it is a
finished, self-contained artefact and is not being rebuilt.

**No photographs go in `public/`.** Source photos for the story and gallery pages belong
in `src/assets/`, so Astro processes them at build time.

`game/` still holds a duplicate set of `.webp` files at its top level alongside
`game/assets/`; `index.html` references the top-level copies. Nothing was deleted.
`monogram.webp` and `damask.webp` were copied into `src/assets/` as design source.

---

## Commands

| Command | What it does |
|---|---|
| `npm test` | Unit tests for the logic that must not be wrong: RSVP report arithmetic, phone normalisation, and the live-mode state machine. |
| `npm run validate` | Content check. Fails on `<<FILL>>`, the tier table, ceremony and story shape, and story function-neutrality. |
| `npm run build` | Strict. Runs `validate` first, so an incomplete record cannot ship. |
| `npm run build:draft` | Skips validation. What Cloudflare uses until the content lands. |
| `npm run verify` | **Post-build.** Checks `dist/` for tier leaks, gating, `.ics` sets, OG parity, stale output, layout-triggering animations and the weight budget. |
| `npm run check` | All of the above: test, build, verify. Run this before pushing. |

### What is unit-tested, and why those three

Each covers logic where being quietly wrong costs more than being obviously
broken:

- **`src/lib/report.ts`** — bed-nights decide how many beds get booked.
- **`src/lib/phone.ts`** — `phone_e164` is the sheet's record key; a mangled
  number is a guest who cannot be chased.
- **`src/lib/live.ts`** — runs unattended across the wedding days and cannot be
  fixed while it is running.

All three are imported by the pages that use them, so the tested code is the
code that ships. That is checked too: `verify` follows script bundles rather
than reading page HTML alone, because a behaviour check that silently starts
passing against nothing is worse than no check.

Both build scripts empty `dist/` first. Astro only clears the top level, and
Cloudflare restores a build output cache, so a stale nested file — a leftover
`.ics` for a function a guest is not invited to — could otherwise reach
production.

**Run `npm run verify` after any change to a page template.** It is the only
thing standing between a refactor and a tier leak, and it has been checked
against eight deliberately injected faults.

---

## Measured weight

Invitation page, gzipped as Cloudflare serves it:

| | |
|---|---|
| HTML | 4.4 KB |
| CSS | 1.5 KB |
| Two woff2 faces | 65.6 KB |
| **Total** | **71.4 KB in 3 requests** |

Against the 800KB above-the-fold budget for Class A.

The LCP path is only the HTML and CSS — 5.9KB — because `font-display: swap`
paints text in the fallback face immediately. The fonts are preloaded so they
start during the CSS round trip rather than after it.

**Not yet done:** an actual throttled run. These are transfer measurements and
arithmetic, not a Slow 4G or 4× CPU trace. Build steps 8.4 and 8.6 stay open
until someone runs it on a real device.

---

## Access

Cloudflare Access protects `/admin/*` and `/share`. It requires the custom domain and
does not work on `*.pages.dev`. Session duration set to maximum. **Not yet configured.**

---

## Verified live 2026-08-21

`/`, `/game/`, `/robots.txt` and all seven `/i/<slug>/` return 200; an unknown slug
returns 404 via `not_found_handling`. Tier privacy checked against the deployed HTML,
not just a local build.
