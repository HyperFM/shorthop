// ============================================================
// SHORTHOP ICON ROTATION CONFIG
// ============================================================
// To add a new seasonal icon later:
// 1. Drop the .png into assets/icons/
// 2. Add the name string to the correct month's icons array below
// 3. Add a matching entry to app.json under ios.alternateIcons
// 4. Rebuild via: eas build --platform ios --profile production
// ============================================================

// YOUR BIRTHDAY MONTH (1=Jan ... 12=Dec)
export const BIRTHDAY_MONTH = 12; // December 27th

// SEASONAL ICON DEFINITIONS
// probability = chance the icon activates on the 27th each year (1.0 = always)
export const SEASONAL_CONFIG = {
  1:  { probability: 1.00, icons: ['icon_january'] },
  2:  { probability: 1.00, icons: ['icon_february_v1', 'icon_february_v2'] },
  3:  { probability: 1.00, icons: ['icon_march'] },
  4:  { probability: 1.00, icons: ['icon_april'] },
  5:  { probability: 1.00, icons: ['icon_may'] },
  6:  { probability: 1.00, icons: ['icon_june'] },
  7:  { probability: 1.00, icons: ['icon_july'] },
  8:  { probability: 0.00, icons: [] },                         // August -- always original
  9:  { probability: 1.00, icons: ['icon_september'] },
  10: { probability: 1.00, icons: ['icon_october_v1', 'icon_october_v2'] },
  11: { probability: 1.00, icons: ['icon_november_v1', 'icon_november_v2', 'icon_november_v3'] },
  12: { probability: 1.00, icons: ['icon_december_christmas_v1', 'icon_december_christmas_v2', 'icon_december_christmas_v3'] },
};

// BIRTHDAY ICONS -- always shown on December 27th instead of Christmas icons
export const BIRTHDAY_ICONS = [
  'icon_birthday_v1',
  'icon_birthday_v2',
  'icon_birthday_v3',
];

// DEFAULT = original app icon (null means iOS keeps the base icon)
export const DEFAULT_ICON = null;
