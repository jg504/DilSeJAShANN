# Writing the story page

Eight gaps to fill in `src/data/story.json`. The headings are already written — change
any that don't fit what actually happened; they are structure, not facts.

Answer the numbered questions below and the file can be assembled from them.

---

## Two hard constraints

The story page is shared by **all seven links**. Two of those seven are invited to the
Wedding only and go home a day before everyone else. So the page must never let a guest
work out that other people are staying longer.

**1. It cannot contain these words:** `Cocktails`, `Wedding`, `Reception`, `groom`,
`bride`. Not even in passing — "the wedding of our dreams" would leak. Say *"the day"*,
*"all of this"*, *"getting married"*.

**2. It cannot contain a wedding date** — no "26 December", no "the 28th".

`npm run validate` fails the build on both, so a slip gets caught rather than shipped.
Dates from *your own history* are fine: "we met in March 2019" is not a wedding date.

---

## The eight gaps

### 1 — Title
Two to five words. It sits under the monogram in the display serif, so it wants to be
short. Not "Our Story"; the page is already titled that in the browser tab.

### 2 — Intro
One sentence, under the title. Sets up the three chapters. Around 15–25 words.

### 3, 4 — "How we met"
Two paragraphs, roughly 40–70 words each. Where, when, who was there, what the first
impression actually was. The specific detail is what makes this readable — the year, the
place, the thing one of you said. Generalities read as filler.

### 5, 6 — "What happened next"
Two paragraphs, same length. The stretch between meeting and deciding. A move, a
distance, a bad year, a running joke, meeting each other's families.

### 7 — "Deciding on this"
One paragraph, 40–70 words. How the decision happened. It does not have to be a
proposal story; "we had been talking about it for a year and one day it was just
settled" is a better line than an invented moment.

### 8 — Closing
One sentence, centred in the serif under everything. The last thing a guest reads.
Around 10–20 words.

---

## Photographs

The page has slots for them. Drop files into `src/assets/story/` and name them in
`story.json` — no code change needed.

- **A lead photograph** under the intro, the first thing a guest sees.
- **One or more per chapter**, appearing between the heading and the text.

Send **originals, not resized copies**. The build emits AVIF and WebP at 400 / 800 /
1200 / 1600px and serves whichever the device asks for — a 3MB source came out at 26KB
in testing, and the page held LCP 0.54s on Slow 4G with zero layout shift.

Every photograph needs a line of **alt text** describing what is in it, and may have an
optional **caption**. Captions obey the same rule as the body: no function names, no
wedding dates. Validation fails the build on both, and on a filename that does not
resolve.

## Notes

- **Write it as the two of you, first person.** "We", not "Anusha and Jaskaran". The
  invitation's teaser was third person and has been corrected to match.
- **Both sides read this page**, so it belongs to the couple rather than either family.
- **Photographs go here later.** `src/assets/` is wired for the image pipeline and the
  chapter structure will take them without a rewrite. Write the words first; the photos
  will suggest themselves.
- Chapters can be added or removed — the template maps over whatever is in the array.
  Three is a shape, not a rule.
