# dilsejashann.com

Private RSVP site for a wedding on **26–28 December 2026**, Gurgaon.

## The site's single job

The formal invitation is a **PNG card** forwarded on WhatsApp. It carries the venue
details. This website is additional, and its one job is to **get the RSVP submitted**.

Second job: be personal and worth looking at.

Anything that adds friction between landing and submitting is a bug, however good it
looks.

---

## Guests, sides and links

Two sides. Seven invitation links. Each link is a tier.

| # | Slug pattern | Side | Functions | Accommodation |
|---|---|---|---|---|
| 1 | `xxxxxx1` | groom | Cocktails, Wedding, Reception | yes |
| 2 | `xxxxxx2` | groom | Wedding, Reception | no |
| 3 | `xxxxxx3` | groom | Wedding | no |
| 4 | `xxxxxx4` | groom | Reception | no |
| 5 | `xxxxxx5` | bride | Wedding, Reception | yes |
| 6 | `xxxxxx6` | bride | Wedding | no |
| 7 | `xxxxxx7` | bride | Reception | no |

**Slug format:** six random alphanumeric characters **ending in a letter**, then the
index digit 1–7. No hyphen. Example: `k7f2mq3`. Generate the random part with
`crypto.randomUUID()`, never by hand. The random part must not end in a digit or the
index becomes ambiguous.

**Functions:**

- `f1` — Cocktails, evening of 26 Dec
- `f2` — Wedding, 27 Dec. **Two ceremonies in one function**: Anand Karaj, then Hindu
  phere. Both times must appear on the page. A guest who reads only "Wedding, 27 Dec"
  will arrive at the wrong hour.
- `f3` — Reception, 28 Dec

---

## Tier privacy — the most important rule in this repo

Which functions a guest is invited to is a matter of status. A guest discovering that
other tiers exist is worse than any bug in this codebase. With seven links in
circulation, forwarding will happen.

1. **Never render a tier label, index, or side name in the UI.** The trailing digit in
   the URL is unavoidable; nothing else may leak.
2. **No page may reference another tier or another tier's functions** — not in copy,
   not in markup, not in a comment in the shipped HTML.
3. **Ship only that link's data to that link's page.** Never inline the full
   `invites.json` into the client bundle.
4. **Every invitation must read as _the_ invitation** — complete in itself, never as a
   variant or a reduced version of something larger.
5. **Bride-side pages are written from her side**, in her family's voice — not a
   groom-side page with a function removed.
6. **Root `/` is not an index.** No page lists invitations. Direct visits get a plain
   "please use your personal invitation link" page.
7. Admin and distribution pages live at their own routes and are never linked from any
   guest page.
8. **`noindex` on every page**, `robots.txt` disallows all. This site publishes venue
   addresses and a family schedule.

---

## Stack

- **Astro**, static build (`output: 'static'`)
- **Vanilla CSS** with custom properties. No Tailwind, no CSS-in-JS
- **Cloudflare Pages** — domain `dilsejashann.com`, registered at Cloudflare Registrar
- **Cloudflare Access** on admin routes (requires the custom domain; does not work on
  `*.pages.dev`)
- **Google Apps Script** Web App → Google Sheet, two tabs
- Motion: Astro View Transitions (native) plus **Motion One** (~5KB) if needed. GSAP
  core only for a real timeline. **Never Framer Motion** — it pulls React into a static
  site for no return.
- No auth for guests, no accounts, no cookies, no analytics

**Ask before adding any dependency, with its gzipped size.** Size decides.

---

## Design

### Direction

Contemporary Indian, continuous with the save-the-date card. Blush and cream, one deep
maroon, a gold accent, an arch frame. Restrained, not ornamental-traditional.

**The arch is the signature element.** It comes from the card and translates directly:
hero frame, image masks, the top edge of function cards, the shape around the RSVP
button. Most wedding sites have no structural idea. This one does.

**Signature moment:** on load, the arch strokes itself in and content settles inside
it. Transform and opacity only, sub-second, once per session.

**`#DilSeJAShANN` is the wordmark**, not a decoration. The hashtag and the domain are
the same word. It appears at the top of every page and is what makes the site and the
card obviously the same wedding.

### Do not carry over from the card

- **The couple-on-a-motorcycle illustration.** It is stock art. Fine at card size in a
  ten-second video; at hero scale on a website it reads as clipart. Use it small in a
  footer, or not at all.
- **The damask background pattern at full scale.** At card size it is texture; at
  screen size it is noise and it fights the photography. Margins only, or drop it.

The site's advantage over the card is real photographs. Lean there.

### Tokens — change in one place

**Every colour in the build derives from CSS custom properties defined once.** Six
values. Never hardcode a hex in a component.

```css
:root{
  --bg:      /* outer page background */
  --panel:   /* content surface */
  --ink:     /* headings, primary */
  --line:    /* arch stroke, borders, rules */
  --accent:  /* RSVP button, small highlights */
  --body:    /* body text */
}
```

Palette not yet chosen. Build against the tokens; the values get set later.

**Deviations are allowed but must carry a comment saying why:**

```css
/* deliberate override — accent fails contrast on the dark story hero */
color: #F4E3D2;
```

Without the comment, nobody can tell a decision from a mistake three months later.
Expect legitimate overrides on the story page (dark behind photographs) and the admin
dashboard (a data tool, not a wedding page — let it be plain).

### Typography

- **Display serif** for names, headings, function titles, the wordmark
- **Humanist sans** for form labels, times, addresses, buttons, and all admin UI
- **Never set the RSVP form in the serif.** Serif forms read as decorative and get less
  trust on mobile. That page's only job is getting a submission.
- 2 weights maximum per face, subsetted, woff2, `font-display: swap`. A full-charset
  display serif is 200KB on its own.
- Exact faces are pending from the card's designer. Placeholder: a high-contrast
  transitional serif in the Playfair Display family.

---

## Two page classes, two budgets

### Class A — invitation pages

- Full experience. Hero, motion, signature moment.
- **RSVP action reachable without hunting** — once near the top, once at the end.
- Venue details appear here as a convenience; the PNG is the offline fallback, so
  nothing must survive a JS failure.
- LCP under 2.5s on simulated Slow 4G. A guest who bounces never RSVPs.
- Above-the-fold payload under ~800KB. Below the fold, lazy-load and spend freely.

### Class B — story, gallery, photos

- No meaningful weight cap. Go heavy.
- Everything below the first screen lazy-loads with blur or dominant-colour
  placeholders. No layout shift.
- First screen under ~1MB.
- This is where the ambitious motion work belongs.

---

## Motion

Animation is wanted. These rules keep it working on a low-end Android.

- **Animate `transform` and `opacity` only.** Anything touching `width`, `height`,
  `top`, `left`, `margin`, `padding` forces layout recalculation and janks visibly.
- **`IntersectionObserver` for scroll reveals.** Never a scroll event listener, never an
  rAF loop reading scroll position.
- **Respect `prefers-reduced-motion: reduce`** — collapse to instant states.
- `will-change` only on elements actively animating; remove after.
- Never animate more than a handful of elements at once on mobile.
- Test every animation at 4× CPU throttle before calling it done.

**Spend the boldness on the arch.** Everything around it stays quiet and precise.
Scattered motion is what makes a designed page read as templated.

---

## Image pipeline

Motion libraries cost 5–70KB. Twenty unoptimised photos cost 40MB. The pipeline is the
entire performance story.

- Astro `<Image>` / `<Picture>`. Never a raw `<img>` with a full-size source.
- AVIF with WebP fallback. Responsive `srcset` at 400 / 800 / 1200 / 1600px.
- `loading="lazy"` and `decoding="async"` below the fold.
- Explicit `width` and `height` on every image.
- Blur or dominant-colour placeholder in galleries.
- Source photos in `src/assets/` so Astro processes them at build time. Files in
  `public/` ship untouched — **never put photographs there**.

---

## Data model

### `src/data/invites.json` — single source of truth

One file. **One page template.** Never create seven page files — duplicated venue
details drift and a guest ends up at the wrong address.

```json
{
  "functions": {
    "f1": {
      "name": "Cocktails", "date": "2026-12-26", "startTime": "<<FILL>>",
      "venue": "<<FILL>>", "address": "<<FILL>>", "mapsUrl": "<<FILL>>",
      "dressCode": "<<FILL>>", "dressColors": [], "dressNote": ""
    },
    "f2": {
      "name": "Wedding", "date": "2026-12-27",
      "ceremonies": [
        { "name": "Anand Karaj", "startTime": "<<FILL>>" },
        { "name": "Phere",       "startTime": "<<FILL>>" }
      ],
      "venue": "<<FILL>>", "address": "<<FILL>>", "mapsUrl": "<<FILL>>",
      "dressCode": "<<FILL>>", "dressColors": [],
      "dressNote": "Heads must be covered for the Anand Karaj."
    },
    "f3": {
      "name": "Reception", "date": "2026-12-28", "startTime": "<<FILL>>",
      "venue": "<<FILL>>", "address": "<<FILL>>", "mapsUrl": "<<FILL>>",
      "dressCode": "<<FILL>>", "dressColors": [], "dressNote": ""
    }
  },

  "sides": {
    "groom": {
      "greeting": "<<FILL>>",
      "contacts": [
        { "name": "<<FILL>>", "phone": "<<FILL>>" },
        { "name": "<<FILL>>", "phone": "<<FILL>>" }
      ],
      "hotel": { "name": "<<FILL>>", "address": "<<FILL>>", "mapsUrl": "<<FILL>>", "note": "<<FILL>>" },
      "travel": { "airport": "<<FILL>>", "station": "<<FILL>>", "cabNote": "<<FILL>>" }
    },
    "bride": { "…same shape, different values…" }
  },

  "invites": [
    { "slug": "<<FILL>>1", "index": 1, "side": "groom", "functions": ["f1","f2","f3"], "accom": true,  "nights": ["26","27","28"] },
    { "slug": "<<FILL>>2", "index": 2, "side": "groom", "functions": ["f2","f3"],      "accom": false },
    { "slug": "<<FILL>>3", "index": 3, "side": "groom", "functions": ["f2"],           "accom": false },
    { "slug": "<<FILL>>4", "index": 4, "side": "groom", "functions": ["f3"],           "accom": false },
    { "slug": "<<FILL>>5", "index": 5, "side": "bride", "functions": ["f2","f3"],      "accom": true,  "nights": ["26","27","28"] },
    { "slug": "<<FILL>>6", "index": 6, "side": "bride", "functions": ["f2"],           "accom": false },
    { "slug": "<<FILL>>7", "index": 7, "side": "bride", "functions": ["f3"],           "accom": false }
  ]
}
```

`accom` is the **only** switch controlling the accommodation block. Never branch on
`side` or `index` for it.

**Build-time validation.** A script that fails the build if any record is missing a
function, a contact, a hotel, or still contains `<<FILL>>`. Two people edit this file.
A broken record must not ship as a page with a missing venue.

### RSVP schema

Frozen. Specified in `docs/schema.md` and mirrored in both sheet tabs. Do not add,
rename, remove, or reorder columns. If a change looks necessary, **stop and ask** —
after distribution, a schema change means phoning two hundred people.

---

## Pages

| Route | Purpose |
|---|---|
| `/i/[slug]` | The invitation. One template, driven by `invites.json`. |
| `/i/[slug]/rsvp` | RSVP form. Accommodation block only when `accom: true`. |
| `/story` | Shared story and photos. Reachable from all seven links. |
| `/ceremonies` | Anand Karaj and Vivaah explainers. **Only linked from invites containing `f2`.** |
| `/photos` | "Coming soon" placeholder from day one. Becomes the January gallery link. |
| `/` | Plain fallback. No content, no links. |
| `/admin/groom` | Groom-side operations. Cloudflare Access. |
| `/admin/bride` | Bride-side operations. Cloudflare Access. |
| `/admin/combined` | Shared-function totals. Cloudflare Access. |
| `/share` | Family distribution page. Cloudflare Access. |

### Invitation page

1. **Hero** — names, dates, the arch moment
2. **RSVP call to action** — early, visible without hunting
3. **Function details** in date order, only this link's functions. Wedding shows both
   ceremony times.
4. **Get Directions** button per venue — plain link to the Maps short URL, new tab.
   Never an embedded Maps iframe; slow and unusable.
5. Dress code per function with rendered colour swatches and `dressNote`
6. Add-to-calendar `.ics` per function
7. Hotel and travel — from the side block
8. Contacts — from the side block, side-specific. A bride-side guest must never be
   routed to a groom-side number.
9. **RSVP call to action**, repeated

### Story page

Shared across all seven links, so it must be **function-neutral throughout**. No
captions referencing a function only some guests are invited to, no closing line about
the 28th. Tier 3 and 6 are Wedding-only and end a day before everyone else.

### Ceremony explainer pages (`/ceremonies`)

Two printed A6 four-page cards explain the Wedding day ceremonies — **Anand Karaj**
(Sikh) and **Vivaah** (Hindu). The same content goes on the site once the print
version is finalised.

**Tier gate.** These describe `f2` only. Link to them **only from invites whose
`functions` array contains `f2`** — indexes 1, 2, 3, 5, 6. Reception-only guests
(indexes 4 and 7) are not invited to the Wedding and must not see this content, or the
tier structure leaks. Drive the conditional off `functions.includes('f2')`, never off
tier or side.

**One source of truth.** The card copy and the site copy are the same text. Put it in
`src/data/ceremonies.json` and treat it the way `invites.json` is treated. The cards
print first and cannot be recalled, so **the site matches the card** — if a correction
is needed after printing, the card is re-issued rather than the site quietly diverging.

**Structure per ceremony**, mirroring the card:

1. Name and one-line gloss
2. What is happening — two short paragraphs
3. Etiquette notes — head covering, shoes, seating, and anything venue-specific
4. The ceremony in order — named steps with one line each
5. The meaning — the four Laavan for Anand Karaj, the seven steps for Vivaah

**This is the best motion opportunity on the site.** The four Laavan and the seven
steps are natural scroll sequences — one revealing after another as the guest moves
down the page. Spend the animation budget here rather than scattering it.

**Not yet verified.** The ritual sequences are drafted and awaiting confirmation from
family elders — in particular the card title `Vivaah`, whether the ceremony runs four
pheras or seven, and whether the gurdwara adds anything. Do not treat the copy as final
until that confirmation lands.



During 26–28 Dec the invitation page leads with "happening now" or "up next" — venue,
time, Maps link, contact number — pinned above everything else.

- **Computed client-side from `Date.now()`, converted explicitly to IST.** A static
  site's HTML is baked at build time; a build-time switch would show whatever was true
  at last deploy. Guests on foreign-timezone phones must still see IST.
- Three states: before, during, after.
- **This cannot be fixed while it is running.** Build it early, fake the date, test
  every state and every transition. Not on the 25th.

### Admin dashboards

Read-only. Fetch the sheet tabs as published JSON or CSV and render. No writes.

- Headcount per function
- **Bed-nights per date** (26 / 27 / 28) — people needing accommodation × nights. Room
  count comes from manual pairing, not from the sheet.
- Notes and dietary requirements list — including any accommodation requests that
  arrive via notes from non-`accom` tiers
- Duplicate flags: same phone submitted more than once
- `/admin/combined` sums f2 and f3 across both tabs — both sides attend those.

Plain and legible. This is a data tool; the wedding palette does not apply.

### Family distribution page

For parents and grandparents sending links out. Plain and obvious.

- Table: index, side and tier **spelled out in words**, the link, a copy button, a
  WhatsApp share button
- **Sending instructions at the top, in large text:** send the PNG card first, then the
  link as a **separate message**. A caption containing a URL suppresses the WhatsApp
  link preview, and the preview is what makes people open it.
- Paste-ready message text making the RSVP ask explicit. Without it, family members
  write "here's the invite" and nobody clicks.
- The index→tier mapping is fixed once links are distributed. Never reassign.

---

## RSVP form — this is the point of the site

Form length costs submissions directly, and the longest form belongs to the tiers whose
response matters most.

### Flow

```
Step 1   Your name
         WhatsApp number  [country dropdown] [number]
         Anyone else coming with you?  [text]

Step 2   Attending?  Yes / No          ← No skips to the closing step
         Cocktails    − 2 +            ← only this link's functions
         Wedding      − 4 +
         Reception    − 4 +

Step 3   Do you need accommodation?  Yes / No     ← accom links only
         Which nights?  [26] [27] [28]
         Anything we should tell the kitchen?  [text]
         Anything else we should know?  [text]
```

### Rules

- **Multi-step, not one long scroll.** Show progress: "Step 2 of 3."
- **Steppers, not sliders.** `− 2 +`. Sliders are imprecise on a phone and show no
  confirmation. Range 0–8. **Zero must be selectable** — that is how a guest says they
  are coming to the Wedding but skipping Cocktails.
- **Tap targets over dropdowns.** Nights are three buttons, never a date picker.
- **"Not attending" is a toggle** that skips to a short closing step — a note field and
  submit, nothing else. Stored as zeros in all count columns; there is no `attending`
  column. Write the decline copy warmly: *"Sorry you can't make it — anything you'd
  like to pass on?"* A bare submit button on a decline reads cold.
- **Preserve entered data on validation failure.** Losing a half-filled form on a phone
  ends the session permanently.
- **Confirmation screen must feel like something happened.** This is the moment a guest
  tells their spouse it's done.
- **On the confirmation screen, tell them how to change it:** *"Plans change? Open your
  invitation link and fill this in again — we'll use your latest response."* Without
  that line they phone a family member instead.
- **If the write fails, say so plainly** and show a WhatsApp fallback link. A silent
  failure is a lost RSVP nobody knows about.

### Phone number

- Label it **"WhatsApp number"**, not "phone number". Some international guests will be
  on an Indian SIM by late December; WhatsApp stays tied to their home number, which is
  the one that works in October *and* December.
- **Country dropdown, never free text.** Ordered by actual guest spread — India, US,
  Canada, Australia, UAE, UK, Singapore, then the rest. Not alphabetical.
- **No default country.** Placeholder reads "Select". A pre-filled +91 gets ignored by
  someone half-paying-attention and stores an American number as Indian — valid-looking,
  silently wrong, and it fails in December when the chase message doesn't deliver.
- **Store E.164**: `+14155552671`. Strip spaces, dashes, brackets, leading zeros, and a
  duplicated country code if typed twice.
- **Echo the assembled number back on the confirmation step**: *"We'll WhatsApp you on
  **+1 415 555 2671**."* This is the check that works, because it makes a human look.
- Validate length per country. Won't catch everything (India and US are both 10) but
  kills the common cases.
- `inputmode="tel"`.
- Gives `wa.me/` links in the admin dashboard for free — one tap to chase from any
  country.

### Accommodation

- Ask **whether accommodation is needed** and **how many people are travelling**.
  Nothing else.
- **Never ask how many rooms, and never use the word "room" on the site.** Rooms are
  shared; friends will be paired manually. A guest who answers "1 room" believes he has
  been promised one. Allocation happens by phone call.
- Nights are **26 / 27 / 28**. There is no 25th.
- Non-`accom` tiers have no accommodation field. Some of them will need a bed anyway —
  an outstation guest, an elderly relative. The "anything else" field captures it. Flag
  those in the admin view so they don't get buried.

### Dietary

One **optional free-text** field on all tiers: *"Anything we should tell the kitchen?"*
Blank means standard.

Not a dropdown. The caterer has a minimum guarantee, so counts don't change the bill —
the field exists to catch Jain, allergies, no onion-garlic, diabetic. A three-option
dropdown misses all of those and collects polite "veg" answers from people who will eat
whatever is served.

Output is a **printed list handed to the banquet manager per function**, not a
spreadsheet column he will never open.

---

## Google Apps Script

- `doPost(e)` reads `side` and appends to the matching tab: `groom` or `bride`.
- **Same columns, same order, in both tabs.** The moment they diverge, anything reading
  both breaks.
- **Wrap the write in `LockService.getScriptLock()`** with a timeout. Everyone submits
  in the first 72 hours after distribution. Without the lock, rows drop silently.
- **Format the phone column as plain text** — `setNumberFormat('@')` — before any
  writes. Sheets converts long numeric strings to scientific notation and can read a
  leading `+` as a formula. Verify with a real submission, not a test string.
- **Resubmission upserts on normalised phone number.** Latest wins. Append the new row
  and mark the previous one superseded rather than replacing in place — the history
  costs nothing and a wrong number is recoverable.
- Deploy as Web App, execute as owner, access anyone.
- **CORS:** Apps Script returns no CORS headers on POST. Submit with `mode: 'no-cors'`
  and a `text/plain` content type carrying a JSON body, treating a completed request as
  success. Alternative: hidden iframe form post. Pick one and **confirm a row actually
  lands in the sheet before building any form UI** — this is where the time goes.
- The endpoint is public and the URL is visible in client JS. Accepted; no shared
  secret. Worst case is junk rows.

---

## OG tags

The WhatsApp preview decides whether anyone opens the site. The guest has already seen
the PNG card — if the preview looks like a second copy of it, they scroll past and
never RSVP.

- **Preview copy sells the RSVP**, not the invitation. An action, not an announcement.
- Per-slug `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card`
- `og:image`: absolute URL, 1200×630, under 300KB, **JPEG or PNG — WhatsApp does not
  reliably render WebP in previews**
- Same palette, type and arch as the card; different composition, so it reads as
  continuous rather than duplicate
- **Preview copy identical across all seven slugs.** Tier-neutral.
- The OG image is effectively frozen once distributed — WhatsApp caches previews
  aggressively. Finalise the palette before generating it.

---

## Build order

Commit before and after each step. Git is the undo mechanism.

1. **Design plan** — palette selection, type pairing, layout concept, the arch moment.
   Approved before any UI code.
2. Astro scaffold, `invites.json`, one template, dynamic slug route, tokens as CSS
   custom properties, build-time validation script
3. **Apps Script endpoint and both sheet tabs**, with `LockService` and the text-format
   phone column, verified end to end — before any form UI exists
4. RSVP form: multi-step, conditional accommodation block, decline path, phone echo
5. Per-slug OG tags, verified against a real WhatsApp preview on a device
6. Invitation page visual build — hero and arch signature
7. Admin dashboards and distribution page — plain, functional, no design work
8. **Live mode**, with date faking to test all three states and both transitions
9. Story and photo pages
10. Ceremony pages, gated on `f2` — build the content structure first, animate in step 11
11. Motion pass, then a performance pass on throttled hardware

Steps 9 to 11 are the enjoyable parts, which is exactly why starting there consumes
the schedule.

---

## Working conventions

- Plan mode before any structural change. Show the plan, wait for approval.
- Commit at the start and end of every task.
- Do not refactor code outside the current task.
- No tooling, linters, formatters, or CI unless asked.
- **Do not invent content.** No placeholder names, no sample dates, no stock love-story
  copy. Where a real value is missing, write the literal string `<<FILL>>` so it is
  greppable before launch.

---

## Pre-launch checklist

- [ ] `grep -r "<<FILL"` returns nothing
- [ ] Build-time validation passes on all seven records
- [ ] All seven slugs resolve; a wrong slug returns a clean 404
- [ ] No page's HTML source contains another slug, a tier label, a side name, or the
      full invite list
- [ ] `/ceremonies` is not linked or reachable from the Reception-only invitations
- [ ] Ceremony copy matches the printed cards word for word
- [ ] Bride-side pages read in her family's voice, not as reduced groom-side pages
- [ ] Contact numbers correct and side-specific on all seven
- [ ] Hotel correct per side; distance-to-venue note accurate for both
- [ ] Maps links open the correct pin in the Maps app, tested per venue on a phone
- [ ] Wedding page shows both ceremony times
- [ ] WhatsApp preview verified for all seven slugs on a real device
- [ ] PNG-then-link send order verified; preview card renders
- [ ] Test submissions from every tier land in the correct tab, all columns
- [ ] Decline path submits and appears in the sheet
- [ ] Resubmission from the same number supersedes correctly
- [ ] International number stored as E.164, displayed correctly in the echo, not
      mangled by Sheets
- [ ] Live mode tested in all three states with a faked date
- [ ] Site content cross-checked against the final PNG card — no contradictions
- [ ] Cloudflare Access working on all four protected routes; session duration set long
- [ ] Tested on an older Android Chrome and on iOS Safari
- [ ] Slow 4G: LCP under 2.5s. 4× CPU throttle: no visible jank
- [ ] `prefers-reduced-motion: reduce` collapses every animation
- [ ] No animation touches a layout-triggering property
- [ ] `noindex` on every route, `robots.txt` disallows all
- [ ] **A non-technical person completes a full RSVP on their own phone, unprompted,
      with no help.** Where they hesitate is the drop-off.
