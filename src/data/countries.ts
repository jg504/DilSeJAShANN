// Country dial codes for the WhatsApp number field.
//
// Ordered by actual guest spread, NOT alphabetically — India, US, Canada,
// Australia, UAE, UK, Singapore, then the rest. An alphabetical list buries
// India behind Afghanistan and Albania.
//
// There is deliberately no default selection. A pre-filled +91 gets ignored by
// someone half-paying-attention and stores an American number as Indian:
// valid-looking, silently wrong, and it fails in December when the chase
// message does not deliver.
//
// `min`/`max` are national-number digit counts, used for length validation.
// Exact for the seven priority countries; deliberately generous for the rest,
// where a false rejection costs more than a bad number.
//
// `group` splits the national number for the confirmation echo. That echo is
// the check that actually works, because it makes a human look at it.

export interface Country {
  name: string;
  dial: string;
  min: number;
  max: number;
  group?: number[];
}

export const PRIORITY: Country[] = [
  { name: 'India', dial: '91', min: 10, max: 10, group: [5, 5] },
  { name: 'United States', dial: '1', min: 10, max: 10, group: [3, 3, 4] },
  { name: 'Canada', dial: '1', min: 10, max: 10, group: [3, 3, 4] },
  { name: 'Australia', dial: '61', min: 9, max: 9, group: [3, 3, 3] },
  { name: 'United Arab Emirates', dial: '971', min: 8, max: 9, group: [2, 3, 4] },
  { name: 'United Kingdom', dial: '44', min: 10, max: 10, group: [4, 6] },
  { name: 'Singapore', dial: '65', min: 8, max: 8, group: [4, 4] },
];

export const REST: Country[] = [
  { name: 'Bahrain', dial: '973', min: 8, max: 8 },
  { name: 'Bangladesh', dial: '880', min: 9, max: 10 },
  { name: 'Belgium', dial: '32', min: 8, max: 9 },
  { name: 'Bhutan', dial: '975', min: 7, max: 8 },
  { name: 'France', dial: '33', min: 9, max: 9 },
  { name: 'Germany', dial: '49', min: 9, max: 11 },
  { name: 'Hong Kong', dial: '852', min: 8, max: 8 },
  { name: 'Indonesia', dial: '62', min: 9, max: 12 },
  { name: 'Ireland', dial: '353', min: 8, max: 9 },
  { name: 'Israel', dial: '972', min: 8, max: 9 },
  { name: 'Italy', dial: '39', min: 9, max: 10 },
  { name: 'Japan', dial: '81', min: 9, max: 10 },
  { name: 'Kenya', dial: '254', min: 9, max: 9 },
  { name: 'Kuwait', dial: '965', min: 8, max: 8 },
  { name: 'Malaysia', dial: '60', min: 8, max: 10 },
  { name: 'Maldives', dial: '960', min: 7, max: 7 },
  { name: 'Mauritius', dial: '230', min: 7, max: 8 },
  { name: 'Nepal', dial: '977', min: 9, max: 10 },
  { name: 'Netherlands', dial: '31', min: 9, max: 9 },
  { name: 'New Zealand', dial: '64', min: 8, max: 10 },
  { name: 'Nigeria', dial: '234', min: 9, max: 10 },
  { name: 'Norway', dial: '47', min: 8, max: 8 },
  { name: 'Oman', dial: '968', min: 8, max: 8 },
  { name: 'Pakistan', dial: '92', min: 10, max: 10 },
  { name: 'Philippines', dial: '63', min: 10, max: 10 },
  { name: 'Poland', dial: '48', min: 9, max: 9 },
  { name: 'Portugal', dial: '351', min: 9, max: 9 },
  { name: 'Qatar', dial: '974', min: 8, max: 8 },
  { name: 'Saudi Arabia', dial: '966', min: 9, max: 9 },
  { name: 'South Africa', dial: '27', min: 9, max: 9 },
  { name: 'South Korea', dial: '82', min: 9, max: 10 },
  { name: 'Spain', dial: '34', min: 9, max: 9 },
  { name: 'Sri Lanka', dial: '94', min: 9, max: 9 },
  { name: 'Sweden', dial: '46', min: 7, max: 10 },
  { name: 'Switzerland', dial: '41', min: 9, max: 9 },
  { name: 'Thailand', dial: '66', min: 8, max: 9 },
  { name: 'Turkey', dial: '90', min: 10, max: 10 },
  { name: 'Vietnam', dial: '84', min: 9, max: 10 },
];

export const COUNTRIES: Country[] = [...PRIORITY, ...REST];
