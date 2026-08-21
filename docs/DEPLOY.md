# Deploy — dilsejashann.com

Cloudflare Pages, connected to `github.com/jg504/DilSeJAShANN`. Domain
`dilsejashann.com`, registered at Cloudflare Registrar.

---

## Current state — pre-Astro

The site deploys as **raw static files served from the repository root**. There is no
build step, no `package.json`, and no build command set in the Pages dashboard.

| Path | Source |
|---|---|
| `/` | `index.html` — plain fallback |
| `/game/` | `game/index.html` — memory game, self-contained |
| `/shared/` | `shared/index.html` — Cloudflare Access test |
| `/robots.txt` | `robots.txt` |

---

## Required before the first Astro push

Astro builds to `dist/`. Pages currently serves the repo root. **If a push contains an
Astro project before the dashboard is changed, the deploy serves the wrong directory and
the live site breaks.**

Pages project → Settings → Builds & deployments:

- **Build command:** `npm run build:draft` — see below
- **Build output directory:** `dist`
- **Root directory:** leave blank

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

## File migration plan

When the scaffold lands, existing files move as below. **Public URLs do not change.**

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

Note that `game/` also holds a duplicate set of `.webp` files at its top level alongside
`game/assets/`. Reconcile that during the move rather than copying both.

---

## Access

Cloudflare Access protects `/admin/*` and `/share`. It requires the custom domain and
does not work on `*.pages.dev`. Session duration set to maximum.

---

## Blocked

All of the above waits on a Node runtime, which is not installed on the build machine as
of 2026-08-21. See `docs/DECISIONS.md`.
