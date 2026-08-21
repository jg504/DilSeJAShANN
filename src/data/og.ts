// WhatsApp preview copy.
//
// IDENTICAL ON ALL SEVEN LINKS. Defined once here so no page can accidentally
// render tier-specific preview text. Nothing in these strings may name a
// function, a date beyond the month, a side, or a tier.
//
// The guest has already seen the PNG card on WhatsApp. If the preview reads as
// a second copy of it, they scroll past and never RSVP — so this sells the
// action, not the announcement.

export const OG_TITLE = 'Please RSVP · #DilSeJAShANN';
export const OG_DESCRIPTION = 'Open your invitation and let us know if you can join us.';

// public/og.png — 1200×630 PNG, ~50KB. Source and rules in scripts/og/.
export const OG_IMAGE = '/og.png';
export const OG_IMAGE_WIDTH = '1200';
export const OG_IMAGE_HEIGHT = '630';
