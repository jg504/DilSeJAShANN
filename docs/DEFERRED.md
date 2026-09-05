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

### The Wedding's second ceremony is called "Phere" on the invitation — open 2026-09-05
The printed card titles the Hindu ceremony **Vivaah**, with **Mangal Phere** as one step
inside it. `invites.json` still labels the 2 pm slot `Phere`, so the invitation and the
card disagree about the name of the same thing.

**Needs:** a decision. Rename the slot to `Vivaah` to match the card, or keep `Phere`
because that is what the family actually says. **Asked him.**

Family-elder confirmation of the ritual sequences is still outstanding — the cards print
first and cannot be recalled.

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

### Ceremony copy — done 2026-09-05
Taken word for word from `DilSeJAShANN_ceremony_cards_v2.pdf`, the A6 card artwork.
Both ceremonies complete: about, etiquette, sequence, and the four Laavan and seven
steps with the card's own lead and closing lines. The only line not from the card is the
page intro, which the card has no equivalent of.

Also settled two of CLAUDE.md's open questions: the card is titled **Vivaah**, and the
Anand Karaj runs **four** Laavan.

### Travel copy — dropped 2026-09-05
The three-line air/train/cab block is gone. Jaskaran's call: "It's Gurgaon, I think
everyone will be able to manage." Replaced by one shared `venueNote` — *"Parking is
limited — a cab is easier than driving."* Six lorem fields removed with it.
