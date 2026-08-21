# Decisions

Settled decisions and the reasoning behind them. **Read this before reopening any of
them.** If something here looks wrong, raise it — do not quietly reverse it.

---

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

- **Seven slugs generated and frozen**, in `src/data/invites.json`.
- **Generated with Python's `secrets`**, not `crypto.randomUUID()` — no Node on the
  machine. CLAUDE.md named that API to rule out hand-picked strings; a CSPRNG meets the
  intent.
- **The index→tier mapping is fixed once links go out. Never reassign.**

## Toolchain — open, as of 2026-08-21

- **No Node runtime on the build machine.** The Astro scaffold, `package.json` and the
  build-time validation script are blocked on it. Nothing has been scaffolded — do not
  assume a `package.json` exists.

## Schema — frozen

- **Seventeen columns, in `docs/schema.md`.** Do not add an eighteenth. After
  distribution, a schema change means phoning two hundred people.

## Open questions

- **`dressColors: []` is ambiguous** — empty may mean "no colours given" or "not yet
  filled". The validation script cannot tell the two apart, so an unfilled record would
  pass. Settle the convention before content lands.
- **`Phere` or `Vivaah`** — `invites.json` uses `Phere` per the CLAUDE.md template; the
  `/ceremonies` brief says the printed card may be titled `Vivaah`. Awaiting family
  confirmation, along with the four-vs-seven pheras question.
