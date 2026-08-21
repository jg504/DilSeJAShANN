# OG image

`og.html` is the source for `public/og.png` — the picture WhatsApp shows in the link
preview. Rendered with headless Chrome so there is no image dependency in the project.

Regenerate:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --default-background-color=FFF3E7 \
  --screenshot=public/og.png scripts/og/og.html
```

## Rules this file has to keep

- **1200×630, PNG or JPEG.** Never WebP — WhatsApp does not reliably render it in
  previews. Under 300KB; currently ~50KB.
- **Identical on all seven links.** It is one file served to every slug, so nothing in
  it may be tier-specific.
- **No dates beyond the month.** "26–28 December" would tell a Wedding-only guest that
  something happens on the other two days. `December 2026 · Gurgaon` is the most
  specific this image may get.
- **Palette comes from `src/styles/tokens.css`.** The hexes are duplicated here because
  this file is rendered standalone by Chrome, outside the Astro build.

## Frozen at distribution

WhatsApp caches previews aggressively. Once the links go out, changing this image will
not reach anyone who has already seen it. Settle it before Phase 9.

The typeface is Playfair Display, which is still a placeholder — if the card's designer
supplies different faces, regenerate this **before** distribution, not after.
