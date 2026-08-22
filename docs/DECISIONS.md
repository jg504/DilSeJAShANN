# Decisions

Settled decisions and the reasoning behind them. **Read this before reopening any of
them.** If something here looks wrong, raise it — do not quietly reverse it.

## Palette — settled 2026-08-21

- **Brand hexes are `#952829` maroon, `#E18800` gold, `#FFF3E7` cream** — from the card
  artwork. CLAUDE.md said "palette not yet chosen"; it was not the source.
- **`--panel` is the brand cream `#FFF3E7`** — it is the surface guests actually read on.
- **`--bg` is `#F5E4D3`, a deepened cream** — the surround must sit behind the reading
  surface, not equal it. Desktop only; on mobile the panel fills the screen.
- **`--body` is `#43302B`, the maroon desaturated and darkened** — 11.3:1 on `--panel`.
- **`--ink` and `--accent` share `#952829`** — the gold fails AA as a button fill
  (2.72:1 on white, 2.49:1 on cream). Maroon with cream text is 7.36:1. Gold not muddied.
- **Gold is decorative only, never text** — arch stroke, hairlines, swatch borders.
- **A darker gold clearing 4.5:1 would change `--accent` alone.**

## Type — provisional, 2026-08-21

- **Playfair Display plus a humanist sans**, pending real faces from the card's
  designer. Do not design around either — both are placeholders and will be replaced.

## Layout — settled 2026-08-21

- **No 430px column on invitation pages.** That constraint lives in `game/` as a patch
  for a mobile-only layout. Desktop gets its own composition.
- **The arch is hero-only.** Not on function cards, not on the RSVP button outline.
  Everything else stays quiet.

## Slugs — settled 2026-08-21

- **Seven slugs generated and frozen**, in `src/data/invites.json`. Generated with
  Python's `secrets` — CLAUDE.md named `crypto.randomUUID()` to rule out hand-picked
  strings, and a CSPRNG meets that intent.
- **The index→tier mapping is fixed once links go out. Never reassign.**

## Build — settled 2026-08-21

- **`npm run build` is strict, `npm run build:draft` skips validation** — a strict-only
  build would block all UI work behind content chasing.
- **Cloudflare points at `build:draft` until content lands**, then switches to `build`
  before distribution. Nothing is distributed, so a failing deploy costs nothing now.
- **Astro scaffolded by hand, not `npm create astro`** — the template ships a demo page
  and components that would have to be deleted, and collides with `src/`.
- **Node v24.19.0, npm 11.17.0, Astro v7.2.4**, via the official macOS ARM64 `.pkg`.
- **Cloudflare is a Worker with Static Assets, not classic Pages.** Deploy runs
  `npx wrangler deploy` against `wrangler.jsonc`; there is no output-directory setting.

## RSVP delivery — settled 2026-08-21, overrides CLAUDE.md

- **Apps Script does send CORS headers on POST.** CLAUDE.md said it does not and told us
  to use `mode: 'no-cors'` and assume success. Verified false against the live
  deployment from another origin — a `cors` POST returns a readable `{"ok":true}`.
- **A response is not proof of a write.** Every submission is confirmed by reading the
  row back via `?check=<submission_id>` before the guest sees a confirmation.
- **Retries check before re-posting**, so they cannot duplicate a row, and the payload
  is held in `localStorage` until confirmed. Losing an RSVP silently is the one failure
  this site cannot afford.

## Schema — frozen

- **Seventeen columns, in `docs/schema.md`.** Do not add an eighteenth. After
  distribution, a schema change means phoning two hundred people.

## Content — settled 2026-08-22

- **`dressColors: []` means "no colours specified".** Confirmed for the Cocktails and
  the Wedding. The ambiguity is closed: empty is a real answer, not an unfilled field.
- **A ceremony may carry its own venue and Maps pin.** The Anand Karaj is at the
  Gurudwara and the phere is next door at Club Patio — one venue per function could not
  express that, and a single pin would send guests to the wrong entrance for the
  ceremony they arrive for. The `.ics` uses the *earliest* ceremony's venue, since that
  is where a guest must actually turn up.

## Open questions

- **`Phere` or `Vivaah`** — `invites.json` uses `Phere` per the CLAUDE.md template; the
  `/ceremonies` brief says the printed card may be titled `Vivaah`. Awaiting family
  confirmation, along with the four-vs-seven pheras question.
