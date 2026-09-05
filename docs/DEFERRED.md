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

### The printed card says only "cover your head" — open 2026-09-05
The invitation now reads **"Head and body must be fully covered for the Anand Karaj."**
Jaskaran's wording. The A6 ceremony card's etiquette panel says only *"Cover your head.
Scarves are available at the entrance."* — nothing about the body.

So the site and the card disagree about a religious observance, and the card is the one
that cannot be recalled once printed.

**Needs:** a decision before the cards go to press. Either add the body requirement to
the card's "Before you enter" panel, or tell me the site is overstating it and I will
match the card.

### Ritual sequences — awaiting family elders
Both sequences come from the printed cards, which CLAUDE.md records as drafted and not
yet confirmed. The cards print first and cannot be recalled, so a correction after
printing means re-issuing the card rather than quietly changing the site.

### Story copy — briefed 2026-09-05, waiting on you
`src/data/story.json` now has real headings and eight `<<FILL>>` gaps — the lorem is
gone. **`docs/STORY-BRIEF.md` is the fill-in sheet**: eight numbered questions with the
length each slot wants, and the two rules the page has to obey.

This is the last thing blocking `npm run build`. Must stay function-neutral — it is shared by all seven
links and two of them end a day before everyone else. Validation enforces that.

Also: the invitation's story teaser reads *"A little about how the two of them got
here"* — third person, on their own site. Worth a rewrite in the same pass.

### The gift note on the printed PNG card — for your designer
The site now carries it in three places: the invitation, the RSVP confirmation, and the
paste-ready message on the family share page. The **card** is the formal invitation and
the place older relatives will actually look, and that one is not mine to change.

**Needs:** ask the designer to add it. The wording, so both match:

> A small request — no boxed gifts please

A longer version giving the reason was written first and cut — Jaskaran wanted the
phrase alone, as the heading rather than a heading plus a line. It lives in one field, `giftNote` in `src/data/invites.json`, and removing
it there removes it everywhere.

### Turtlepic selfie search — January 2027, with the gallery
Jaskaran uses Turtlepic and asked whether it can be linked. It can, from `/photos`.

**Link, not embed.** This site has no third parties at all — no analytics, no cookies,
no accounts, no external scripts — which is a property worth keeping and part of why the
invitation paints in 0.5s on Slow 4G. A plain `<a>` out costs nothing. An embedded widget
would be the first third-party script here and needs the dependency conversation
CLAUDE.md asks for, with its gzipped size.

Turtlepic can show a person **only their own pictures** after they upload a selfie.
That is worth more than it first appears: a guest cannot be in a photograph of a day
they did not attend, so the face filter does the tier filtering for free.

The risk is not the search but what sits around it. If the gallery also offers a
browse-all view, or shows album names, dates or photo counts, a guest learns there were
three days whatever their selfie returns.

**Needs, before this is wired up:**
1. **Can Turtlepic hold three separate albums with three separate links, one per day?**
   If yes, each guest's day page links only to the albums they were at and the tier rule
   holds end to end. If it is one album per event, the browse view has to be checked for
   what it reveals before anything links to it.
2. The share URL(s).
3. A disclosure line. Selfie search means uploading a photo of your face to a vendor.
   Say in one line what it does, and make sure the plain gallery works for anyone who
   would rather not — several of the older guests will not want to, and nobody should
   have to opt in to see their own photographs.

### Build the photo gallery — January 2027
**A single shared `/photos`**, settled 2026-09-05. Not per-day, not per-slug: Turtlepic's
selfie search shows a guest only their own pictures, and nobody appears in photographs of
a day they did not attend, so the face filter does the tier filtering by itself.

Not built yet: there are no photographs, and the layout depends on how many there are.

- The page must **never list the days** — no album names, no dates, no counts. That is
  the whole reason a single page is safe. See the Turtlepic entry above for the browse-all
  question that has to be answered first.
- Put the link back in the "Our story" block of `src/pages/i/[slug].astro`, where a
  comment marks the spot. Nothing needs re-sending; guests reopen their invitation link.

### Before distribution
- Switch the Cloudflare build command from `npm run build:draft` to `npm run build`, so
  validation gates the live deploy and lorem cannot ship.
- Delete `public/_rsvp-test.html`, and clear every test row from both sheet tabs.
- Verify the WhatsApp preview on a real device: PNG card first, link as a separate
  message.

## Done

### The Wedding's second ceremony — settled 2026-09-05
Renamed `Phere` to `Vivaah` on the invitation, to match the printed card. Jaskaran's
call. `Mangal Phere` stays as one step inside Vivaah on `/ceremonies`, which is what the
card says.

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
