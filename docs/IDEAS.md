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
