# Build steps — dilsejashann.com

Work through these in order. One at a time. Each step ends with something committed and
working.

Tick as you go.

---

## Phase 0 — before any code

- [x] **0.1** Repo created, `git init`, `CLAUDE.md` and `docs/schema.md` committed
- [x] **0.2** Cloudflare Pages project connected to the repo
- [x] **0.3** `dilsejashann.com` pointed at the Pages project, HTTPS live
- [x] **0.4** Seven slugs generated and pasted into `invites.json`
- [ ] **0.5** Function content collected — times, addresses, Maps links, dress codes
- [ ] **0.6** Side content collected — greetings, contacts, hotels, travel notes
- [ ] **0.7** Typeface names obtained from the card's designer
- [x] **0.8** Palette chosen

Content chasing (0.5–0.7) runs in parallel with everything below. Do not wait on it.

---

## Phase 1 — skeleton

- [x] **1.1** Astro scaffold, static output, deployed and live on the domain
- [x] **1.2** `invites.json` in place with all seven records
- [x] **1.3** Design tokens as CSS custom properties, one file
- [x] **1.4** One invitation template, dynamic route on slug
- [x] **1.5** All seven URLs resolve with correct functions; wrong slug returns 404
- [x] **1.6** `noindex` and `robots.txt` on everything
- [x] **1.7** Build-time validation script — fails on `<<FILL>>` or a missing field

**Done when:** seven working URLs, unstyled, correct content on each.

---

## Phase 2 — the data path

Do this before any form UI. It is the least predictable part of the build.

- [x] **2.1** Spreadsheet created with `groom` and `bride` tabs, identical headers
- [x] **2.2** Phone column set to plain-text format in both tabs
- [x] **2.3** Apps Script `doPost` written — routes on `side`, wrapped in `LockService`
- [x] **2.4** Deployed as Web App, execute as owner, access anyone
- [x] **2.5** A row posted from a plain HTML page lands correctly in the right tab
- [x] **2.6** CORS approach confirmed working from the deployed site, not localhost
- [x] **2.7** Resubmission logic — supersede on matching phone number

**Done when:** you can submit from a live page and see the row appear.

---

## Phase 3 — the RSVP form

- [x] **3.1** Step 1 — name, WhatsApp number with country dropdown, additional guests
- [x] **3.2** Phone normalisation to E.164, per-country length validation
- [x] **3.3** Step 2 — attending toggle, per-function steppers, only this link's functions
- [x] **3.4** Decline path skips to the closing step
- [x] **3.5** Step 3 — accommodation block, rendered only when `accom: true`
- [x] **3.6** Dietary and notes fields
- [x] **3.7** Confirmation screen — phone echoed back, resubmission instructions, warmth
- [x] **3.8** Failure state with a WhatsApp fallback link
- [x] **3.9** Data preserved on validation failure

**Done when:** every tier can submit, decline, and resubmit correctly.

---

## Phase 4 — sharing

- [x] **4.1** Per-slug OG tags, tier-neutral copy that sells the RSVP
- [x] **4.2** OG image rendered — 1200×630, JPEG or PNG, under 300KB
- [ ] **4.3** All seven previews checked in a real WhatsApp chat on a phone
- [ ] **4.4** PNG-then-link send order tested — does the preview still render?

**Done when:** all seven links preview correctly on a real device.

---

## Phase 5 — the invitation page

- [x] **5.1** Type scale and both faces loaded, subsetted
- [x] **5.2** Hero with the arch
- [x] **5.3** Function blocks — both ceremony times on the Wedding
- [x] **5.4** Dress code with colour swatches and notes
- [x] **5.5** Maps buttons, tested on a phone per venue
- [x] **5.6** Hotel, travel, contacts from the side block
- [x] **5.7** `.ics` download per function
- [x] **5.8** RSVP call to action, top and bottom

**Done when:** it looks like the card and a guest knows exactly what to do.

---

## Phase 6 — the tools

- [ ] **6.1** Cloudflare Access on `/admin/*` and `/share`, two email groups
- [ ] **6.2** Session duration set to maximum
- [x] **6.3** `/admin/groom` and `/admin/bride` — headcounts, bed-nights, kitchen list,
      buried accommodation requests, duplicate flags
- [x] **6.4** `/admin/combined` — f2 and f3 across both tabs
- [x] **6.5** `/share` — seven links, tiers in words, copy and WhatsApp buttons,
      sending instructions, paste-ready message text

**Done when:** both families can read their own numbers without asking you.

---

## Phase 7 — the day itself

- [x] **7.1** Live mode — client-side, IST, three states
- [x] **7.2** Tested with a faked date: before, during each function, after
- [x] **7.3** Both transitions tested
- [x] **7.4** `/photos` placeholder route live

**Done when:** it works unattended. You cannot fix this while wearing a sherwani.

---

## Phase 8 — story, ceremonies and polish

- [ ] **8.0** Ceremony copy confirmed by family elders, cards printed, site copy matched
- [x] **8.0b** `/ceremonies` built, linked only from invites containing `f2`
- [ ] **8.1** Photos selected, processed through the Astro image pipeline
- [ ] **8.2** Story page written — one voice, function-neutral
- [x] **8.3** Motion pass across the site
- [ ] **8.4** Performance pass — Slow 4G, 4× CPU throttle
- [x] **8.5** `prefers-reduced-motion` verified
- [ ] **8.6** Old Android Chrome and iOS Safari

---

## Phase 9 — launch

- [ ] **9.1** Full pre-launch checklist in `CLAUDE.md` completed
- [ ] **9.2** Five real people sent real links, real submissions checked in the sheet
- [ ] **9.3** One non-technical person completes an RSVP unassisted, watched
- [ ] **9.4** Family briefed on the distribution page
- [ ] **9.5** Links go out

---

## Kill switch

Two weeks after distribution, check submissions against links sent.

**Under 40%** — the site is not converting. Stop tuning it. Move to phone chasing and
treat the site as an information page. Do not spend December optimising a form.
