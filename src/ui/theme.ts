/**
 * Design tokens. These are a neutral placeholder until the brand kit arrives (due 11 Oct); swapping
 * the brand in should only touch this file and the fonts it names.
 */
export const colors = {
  background: '#101012',
  surface: '#1A1A1E',
  surfaceRaised: '#232329',
  border: '#2E2E35',
  text: '#F4F1EA',
  textMuted: '#A19D94',
  accent: '#C8A96A',
  onAccent: '#101012',
  positive: '#7FB89A',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 8, md: 14, lg: 24, pill: 999 } as const;

export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '600' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;

export const MAX_CONTENT_WIDTH = 520;
