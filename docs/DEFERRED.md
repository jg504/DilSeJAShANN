# Deferred

Everything put off with "later", so none of it is lost. One dated entry each, saying
what is needed and from whom. **Raise the open items at the end of a working session** —
a list nobody opens is the same as no list.

Move an item to Done rather than deleting it, so it is obvious what was decided and when.

## Open

### Second contact per side — deferred 2026-09-05
`sides.groom.contacts` and `sides.bride.contacts` each hold one person: Jaskaran on the
groom side, Anusha on the bride side. Jaskaran asked to add a second per side later.

**Needs:** a name and number for each side. Usually a parent or a sibling, so guests are
not calling the couple during their own functions.

**Where:** `src/data/invites.json`, append to the `contacts` array. The template already
maps over the array, so nothing else changes.

### The hotel — deferred 2026-09-05
Two on the groom side: one at Club Patio itself, and Hotel Urban Oasis nearby. Neither
is fixed, so "Staying with us" currently renders the note alone — *"Where everyone is
staying is still being sorted out. We'll send you the details on WhatsApp closer to the
date."* The bride side carries the same note, which was my assumption, not his answer.

**Needs:** which hotel, its address and a Maps pin, per side. Filling `hotel.mapsUrl`
brings the venue line and Get Directions back automatically.

**Never write "room" on the site** — rooms are shared and paired by phone; validation
fails the build on the word.

### Travel copy — deferred 2026-09-05
`sides.*.travel.airport`, `.station` and `.cabNote` on both sides are lorem ipsum.

**Needs:** real lines. Which airport and how far, which station, and what to do about
cabs in Gurgaon in December.

### Ceremony copy — blocked 2026-09-05
`src/data/ceremonies.json` is entirely lorem. Jaskaran said to use "the details I shared
earlier as part of the draft copy"; that draft is not in either session transcript, not
in the repo, and not in this file's git history. **Asked him where it is.**

Still open from CLAUDE.md, pending family elders: whether the card is titled `Phere` or
`Vivaah`, and whether it runs four pheras or seven.

### Story copy — deferred 2026-09-05
`src/data/story.json` is lorem. Must stay function-neutral — it is shared by all seven
links and two of them end a day before everyone else. Validation enforces that.

Also: the invitation's story teaser reads *"A little about how the two of them got
here"* — third person, on their own site. Worth a rewrite in the same pass.

### Before distribution
- Switch the Cloudflare build command from `npm run build:draft` to `npm run build`, so
  validation gates the live deploy and lorem cannot ship.
- Delete `public/_rsvp-test.html`, and clear every test row from both sheet tabs.
- Sign in to `/share` once to confirm the Cloudflare Access flow works.
- Verify the WhatsApp preview on a real device: PNG card first, link as a separate
  message.

## Done

Nothing yet.
