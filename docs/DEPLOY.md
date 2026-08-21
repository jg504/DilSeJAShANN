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

## Access

Cloudflare Access protects `/admin/*` and `/share`. It requires the custom domain and
does not work on `*.pages.dev`. Session duration set to maximum. **Not yet configured.**

---

## Verified live 2026-08-21

`/`, `/game/`, `/robots.txt` and all seven `/i/<slug>/` return 200; an unknown slug
returns 404 via `not_found_handling`. Tier privacy checked against the deployed HTML,
not just a local build.
