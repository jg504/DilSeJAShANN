# Story photographs

Drop photographs here and reference them by filename in `src/data/story.json`.

- **Here, never `public/`.** Files in `public/` ship untouched at full size; Astro only
  optimises what lives in `src/assets/`. A 4MB phone photo in `public/` is 4MB on a
  guest's mobile data.
- Any size — the build emits AVIF and WebP at 400 / 800 / 1200 / 1600px and serves the
  one the device asks for. Send the originals, not resized copies.
- `.jpg`, `.jpeg`, `.png`, `.webp` and `.avif` are picked up.
- Every image needs real `alt` text in `story.json`. These carry meaning; they are not
  decoration, and the build fails on an empty one.
