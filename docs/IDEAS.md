# Ideas

A running list. Nothing here is a decision — `docs/DECISIONS.md` is for those.
Each entry says what it is, why it might be worth it, and what it would cost.

**Status key:** `BUILT` · `PROPOSED` · `REJECTED` · `NEEDS YOU`

---

## Built

### `BUILT` Add all functions to calendar in one tap
One `.ics` containing every function on that link, alongside the per-function
files. Three taps became one, and the per-function files still exist for anyone
who only wants the Wedding. Gated per link like everything else.

### `BUILT` Copy address button
Guests paste the address into Uber or Ola — that is what actually happens on the
day. Maps links are good for planning, a copyable address is better for a cab.

### `BUILT` Countdown before the wedding
A quiet line under the hero dates: "82 days to go". Counts to **that link's own
first function**, so a Reception-only guest counts to the 28th, not the 26th.
Computed once on load in IST, no timer, so it costs nothing on battery and
cannot jank. Disappears once live mode takes over.

### `BUILT` Confirmation reads the answer back
Name, per-function counts, nights, dietary. Turns "the button worked" into
"they have my answer", and it is the last chance for a guest to notice they put
4 where they meant 1.

### `BUILT` Logic that must not be wrong is unit-tested
187 assertions across four suites, run by `npm test`. The three modules chosen
are the ones where being quietly wrong costs more than being obviously broken:
bed-nights book beds, `phone_e164` is the sheet's record key, and live mode runs
unattended and cannot be fixed while running. The calendar files got the same
treatment after a real RFC violation was found.

Each suite was mutation-checked — deliberate breakages introduced to confirm the
tests actually fail — and the pages import those modules, so the tested code is
the code that ships.

---

## Proposed — worth discussing

### `PROPOSED` A desktop composition, and the surround `--bg` was reserved for
`--bg` (`#F5E4D3`) is defined in `src/styles/tokens.css` and used by nothing.
DECISIONS.md settled it as "the outer surround, desktop only" and settled that
"desktop gets its own composition" — neither shipped. At 1280px the page is the
phone column centred on flat cream, so the surround has no surface to sit
against and the arch loses its frame.

Not a rendering bug: it looks fine, it just isn't the design that was agreed.
Most guests are on a phone, so this is not urgent — but it is the largest gap
between what DECISIONS.md records and what the build does, and the decision
should either be implemented or struck from the doc so the token stops reading
as an oversight. Structural, so it needs a plan first.

### `PROPOSED` Real photographs
The single largest visual upgrade available, and the site's stated advantage
over the card. Everything is built to receive them: `src/assets/` is wired for
the Astro image pipeline, and the story page has a structure waiting.
**Cost:** your time selecting them. **Blocked on you.**

### `PROPOSED` A photo-based OG image
Same reasoning. The monogram version is good and on-brand, but a photograph of
the two of you would stop the scroll harder in a WhatsApp list.
**Watch out:** WhatsApp caches by image URL, so it must ship as a *new*
filename, and it is effectively frozen once the links go out.

### `PROPOSED` "Getting there" detail per venue
Landmark, gate number, where cars actually drop off. Wedding venues in Gurugram
are large and a Maps pin often lands at the wrong entrance. One extra optional
field per function; no schema change, since it is site content not sheet data.

### `PROPOSED` A short "what to expect" line per function
Not the ceremony explainers — one sentence like how long it runs, or whether
food is served. Reduces the number of phone calls to the contact numbers.

### `PROPOSED` Dietary as a chip-plus-free-text hybrid
Keep the free text exactly as it is, but offer two or three taps (Jain,
no onion or garlic) that prefill it. The free text still catches everything;
the chips just lower the effort for the common cases.
**Risk:** chips bias answers toward the listed options. `docs/schema.md`
deliberately rejected a dropdown for this reason — this is a softer version of
the same idea and may deserve the same rejection.

---

## Rejected, with reasons

### `REJECTED` Offline support via a service worker
Tempting for a venue with poor signal. Rejected because a stale cache during
the wedding is exactly the failure that cannot be fixed while it is happening,
and the site is 89KB behind Cloudflare's edge cache already. The risk is real
and the gain is small.

### `REJECTED` A "find my RSVP" lookup page
`docs/schema.md` closed this deliberately in favour of resubmission. The
confirmation summary now delivers most of the value without a lookup, an edit
token, or a second write path.

### `REJECTED` Ornament pass — rosette, divider, sparkles, damask
Built 2026-09-05 and reverted the same hour. Jaskaran: *"Horrible."*

The ornaments were taken from the printed cards rather than invented — a gold
rosette above section headings, the card's oval-diamond divider, sparkles at the
arch's shoulders, and the damask as a fading band in the desktop margins. The
reasoning was continuity with the card. It did not work on screen.

Do not re-attempt this as-is. If the page needs more, the untried lever is the
hero-only rule on the arch, recorded in DECISIONS.md — the signature element
appears once and is never reprised, which is a different problem from a shortage
of decoration.

Reverted in full: `git revert 7f928d0`.

### `REJECTED` OTP to a phone number before showing the invitation
Raised 2026-09-05. Technically possible — the site is already a Cloudflare Worker,
so a Worker route plus KV could issue and verify codes. Rejected on cost, not
feasibility.

- **The friction lands before the RSVP.** Tap link, type number, wait, find the
  code, type it, and only then see the invitation. CLAUDE.md: anything between
  landing and submitting is a bug. Every step sheds a percentage of two hundred
  guests, and the ones who fail are the hardest to chase — elderly relatives,
  guests abroad on a foreign SIM.
- **It inverts where the phone number comes from.** The RSVP form collects it
  today. OTP needs all two hundred correct up front, and a wrong or changed
  number locks a guest out of their own invitation with a phone call as the only
  recovery.
- **Indian SMS needs DLT registration** — entity, header and template approval
  under TRAI. Weeks of paperwork; WhatsApp Business API is comparable.
- **It adds state to a static site**: a code store, expiry, and rate limiting,
  without which it is an SMS-bomb vector aimed at the guest list. And it creates
  a failure mode on 27 December that cannot be fixed while it is running.
- **What it buys is bounded.** No page carries a tier label and every invitation
  reads as complete in itself, so a forwarded link shows *an* invitation, not a
  hierarchy. The trade is a bounded embarrassment against a systematic loss of
  RSVPs and beds.

Only tier 1's page reveals a function the others do not have. If forwarding is a
real worry, a quiet word to that group costs nothing and breaks nothing.

### `REJECTED` Guest login or per-guest links
Seven shared links is the whole design. Two hundred personal links means two
hundred chances to send the wrong one.

---

## Needs you

### `NEEDS YOU` A throttled performance run
89KB in 3 requests, LCP path 5.9KB. Arithmetic says comfortably under 2.5s on
Slow 4G, but nobody has run a trace on real hardware. Build step 8.4.

### `NEEDS YOU` Old Android and iOS Safari
Audited and one real breakage fixed — `crypto.randomUUID` throws below
Safari 15.4 and ran on every submission. Still wants a real device. Step 8.6.

### `NEEDS YOU` A non-technical person completing an RSVP unwatched
The last item on the pre-launch checklist and the most informative test on it.
Where they hesitate is the drop-off.
