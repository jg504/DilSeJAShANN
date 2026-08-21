# RSVP Schema — LOCKED

A contract between the site, the Apps Script endpoint, and both Google Sheet tabs.

Once the seven links are distributed, **this file does not change**. Most submissions
arrive in the first 72 hours. A schema change after that means re-collecting data by
phone, one guest at a time.

Two tabs — `groom` and `bride` — in one spreadsheet. **Identical header rows, identical
column order.** The moment they diverge, anything reading both breaks.

---

## Columns

| # | Column | Type | Required | Applies to | Notes |
|---|---|---|---|---|---|
| 1 | `submission_id` | string | yes | all | UUID, generated client-side |
| 2 | `timestamp` | ISO 8601 | yes | all | Server-side, Asia/Kolkata |
| 3 | `slug` | string | yes | all | Which of the seven links |
| 4 | `index` | int 1–7 | yes | all | Reporting only. Never rendered in the UI |
| 5 | `side` | groom / bride | yes | all | Determines which tab |
| 6 | `name` | string | yes | all | Primary guest |
| 7 | `phone_e164` | string | yes | all | Record key. See below |
| 8 | `additional_guests` | string | no | all | Free text. Reference only, not parsed |
| 9 | `count_f1` | int 0–8 | yes | all | Cocktails. `0` for tiers without it |
| 10 | `count_f2` | int 0–8 | yes | all | Wedding |
| 11 | `count_f3` | int 0–8 | yes | all | Reception |
| 12 | `accommodation` | yes / no | no | `accom` links | Empty string otherwise |
| 13 | `travellers` | int | no | `accom` links | People needing a bed |
| 14 | `nights` | string | no | `accom` links | Pipe-delimited: `26\|27\|28` |
| 15 | `dietary` | string | no | all | Free text, optional |
| 16 | `notes` | string | no | all | Free text. See below |
| 17 | `superseded` | yes / blank | no | all | Set when a later submission replaces this row |

Columns 12–14 are written as **empty strings** for non-`accom` links. Never omitted,
never null — a ragged row breaks the sheet.

---

## Field rules

**`phone_e164` is the record key.** Stored in full international format:
`+14155552671`. Strip spaces, dashes, brackets, leading zeros, and a duplicated country
code before storing.

Guests come from India, the US, Canada, Australia, the UAE and elsewhere, so a bare
ten-digit Indian assumption is wrong. The column must be **formatted as plain text** in
both tabs — `setNumberFormat('@')` — before any writes, or Sheets converts the string
to scientific notation and may read the leading `+` as a formula.

**There is no `attending` column.** A guest who declines submits zeros in all three
count columns. The form uses a toggle for this and skips to a short closing step, but
the stored result is zeros.

**Counts are per function, and zero is valid.** A family can send two people to the
Cocktails and four to the Wedding. Zero on a function the guest was invited to means
they are skipping it — that is real data, not a missing value.

**`additional_guests` is reference text, not structured data.** It will contain things
like `"Priya, Arjun and the kids"`. Do not parse it. Headcount comes from the count
columns; the maximum of the three is the household total.

**`accommodation` never mentions rooms.** The form asks whether accommodation is needed
and how many people are travelling. Rooms are shared and allocated manually by phone.
The word "room" does not appear anywhere in the guest-facing form.

**`nights` values are `26`, `27`, `28` only.** Collected as three buttons. There is no
25th. Never a date range, never a date picker — hotels bill by night, and "arriving on
the 27th" does not say whether the night of the 26th is needed.

**`notes` on non-`accom` tiers is load-bearing.** Those guests are not offered
accommodation, but some will need it — an outstation guest, an elderly relative who
cannot manage a same-day return. The neutral label *"Anything else we should know?"*
captures the request without promising anything. Surface these in the admin view.

**`dietary` is exception-only.** Optional free text: *"Anything we should tell the
kitchen?"* Blank means standard. Not a dropdown — the caterer works to a minimum
guarantee, so the field exists to catch Jain, allergies, no onion-garlic and diabetic
cases, which a three-option dropdown would miss entirely.

---

## Resubmission

There is no edit link and no lookup page. **A guest who wants to change their response
opens their invitation link and fills the form in again.**

- Match on normalised `phone_e164`. Number only — no name matching. Households sharing a
  number are rare enough to accept.
- The new row is appended. The previous row is marked `superseded = yes` rather than
  overwritten. History costs nothing and makes a wrong number recoverable.
- The admin view shows current rows only, with superseded rows collapsed.
- The confirmation screen must state this: *"Plans change? Open your invitation link and
  fill this in again — we'll use your latest response."*

**Known gap:** two people in one household sharing a phone number will overwrite each
other silently. Accepted. The `superseded` column is what makes it recoverable.

---

## Derived reports — computed in the admin view, never stored

- **Headcount per function** — sum the relevant count column across current rows
- **Bed-nights per date** — for each of 26 / 27 / 28, sum `travellers` across current
  rows containing that night. Room count comes from manual pairing, not from this sheet.
- **Kitchen list** — non-empty `dietary`, with names. Printed per function and handed to
  the banquet manager on paper.
- **Buried accommodation requests** — non-`accom` rows whose `notes` mention needing a
  bed
- **Duplicate flags** — same `phone_e164` submitted more than once
- **Combined totals** — `count_f2` and `count_f3` summed across both tabs. Both sides
  attend the Wedding and the Reception.

**There is no non-responder list.** With seven shared links rather than per-guest links,
the sheet can only show who responded. Chasing is a manual pass against the guest list.

---

## Frozen

All open questions are closed:

- ~~Adults/kids split~~ — dropped. One count per function.
- ~~Room count~~ — dropped. Accommodation is yes/no plus traveller count.
- ~~`share_with` / roommate pairing~~ — dropped. Handled by phone.
- ~~Pickup, arrival time, travel mode~~ — dropped. No pickups are being offered.
- ~~Dietary dropdown~~ — replaced by optional free text.
- ~~`attending` column~~ — replaced by zeros.
- ~~Per-guest name rows~~ — replaced by one free-text field.
- ~~Edit tokens and a "find my RSVP" page~~ — replaced by resubmission.

Seventeen columns. Do not add an eighteenth.
