// src/styles/theme.ts

const palette = {
  // Brand
  orange:       '#fc5d00',
  orangeLight:  '#ff7a2e',
  orangeDark:   '#d94e00',
  green:        '#9abc05',
  greenLight:   '#b2d606',
  greenDark:    '#7a9904',

  // Neutrals
  white:        '#ffffff',
  black:        '#111111',

  // Light mode greys
  grey50:       '#fafafa',
  grey100:      '#f5f5f5',
  grey200:      '#eeeeee',
  grey300:      '#e0e0e0',
  grey400:      '#dddddd',
  grey600:      '#888888',
  grey700:      '#666666',
  grey800:      '#555555',
  grey900:      '#333333',

  // Dark mode greys
  dark100:      '#2a2a2a',
  dark200:      '#242424',
  dark300:      '#1e1e1e',
  dark400:      '#1a1a1a',
  dark500:      '#141414',

  // Status
  red:          '#e74c3c',
  blue:         '#3498db',

  // Priority
  priorityLowBg:      '#e8f5e9',
  priorityLowText:    '#2e7d32',
  priorityMedBg:      '#fff8e1',
  priorityMedText:    '#f57f17',
  priorityHighBg:     '#fdecea',
  priorityHighText:   '#c62828',

  // Priority dark
  priorityLowBgDark:  '#1a2e1a',
  priorityMedBgDark:  '#2e2200',
  priorityHighBgDark: '#2e1010',
};

// ─────────────────────────────────────────
// LIGHT COLORS
// ─────────────────────────────────────────

export const lightColors = {
  // Brand
  primary:            palette.orange,
  primaryLight:       palette.orangeLight,
  primaryDark:        palette.orangeDark,
  secondary:          palette.green,
  secondaryLight:     palette.greenLight,

  // Backgrounds
  bgPrimary:          palette.white,
  bgSecondary:        palette.grey100,
  bgCard:             palette.white,
  bgInput:            palette.grey100,
  bgAvatar:           palette.grey300,
  bgToggle:           palette.grey200,
  bgListIcon:         palette.grey100,

  // Text
  textPrimary:        palette.grey900,
  textSecondary:      palette.grey600,
  textMuted:          palette.grey700,
  textLabel:          palette.grey900,
  textOnDark:         palette.white,
  textCardTitle:      palette.grey800,

  // Borders
  borderDefault:      palette.grey200,
  borderSecondary:    palette.grey400,
  borderList:         palette.grey100,
  borderChart:        '#999999',

  // Interactive
  accent:             palette.blue,
  danger:             palette.red,

  // Buttons
  btnPrimaryBg:       palette.orange,
  btnPrimaryText:     palette.white,
  btnSecondaryBg:     palette.white,
  btnSecondaryBorder: palette.grey400,
  btnSecondaryText:   palette.grey900,

  // Progress / Chart
  progressFill:       palette.orange,
  progressTrack:      palette.grey200,
  barActive:          palette.orange,
  barInactive:        palette.grey300,
  barLabel:           palette.grey700,
  fab:                palette.orange,

  // Priority
  priorityLowBg:      palette.priorityLowBg,
  priorityLowText:    palette.priorityLowText,
  priorityMedBg:      palette.priorityMedBg,
  priorityMedText:    palette.priorityMedText,
  priorityHighBg:     palette.priorityHighBg,
  priorityHighText:   palette.priorityHighText,

  // Switch
  switchTrackOn:      palette.orange,
  switchTrackOff:     palette.grey300,
  switchThumb:        palette.white,

  forgotPasswordText: palette.blue,
};

// ─────────────────────────────────────────
// DARK COLORS
// ─────────────────────────────────────────

export const darkColors: typeof lightColors = {
  // Brand
  primary:            palette.orange,
  primaryLight:       palette.orangeLight,
  primaryDark:        palette.orangeDark,
  secondary:          palette.green,
  secondaryLight:     palette.greenLight,

  // Backgrounds
  bgPrimary:          palette.dark400,
  bgSecondary:        palette.dark300,
  bgCard:             palette.dark200,
  bgInput:            palette.dark300,
  bgAvatar:           palette.dark100,
  bgToggle:           palette.dark100,
  bgListIcon:         palette.dark300,

  // Text
  textPrimary:        palette.white,
  textSecondary:      '#aaaaaa',
  textMuted:          '#888888',
  textLabel:          palette.white,
  textOnDark:         palette.white,
  textCardTitle:      '#cccccc',

  // Borders
  borderDefault:      palette.dark100,
  borderSecondary:    '#3a3a3a',
  borderList:         palette.dark100,
  borderChart:        '#555555',

  // Interactive
  accent:             palette.blue,
  danger:             palette.red,

  // Buttons
  btnPrimaryBg:       palette.orange,
  btnPrimaryText:     palette.white,
  btnSecondaryBg:     palette.dark200,
  btnSecondaryBorder: '#3a3a3a',
  btnSecondaryText:   palette.white,

  // Progress / Chart
  progressFill:       palette.orange,
  progressTrack:      palette.dark100,
  barActive:          palette.orange,
  barInactive:        '#3a3a3a',
  barLabel:           '#888888',
  fab:                palette.orange,

  // Priority
  priorityLowBg:      palette.priorityLowBgDark,
  priorityLowText:    '#66bb6a',
  priorityMedBg:      palette.priorityMedBgDark,
  priorityMedText:    '#ffb300',
  priorityHighBg:     palette.priorityHighBgDark,
  priorityHighText:   '#ef5350',

  // Switch
  switchTrackOn:      palette.orange,
  switchTrackOff:     '#3a3a3a',
  switchThumb:        palette.white,

  forgotPasswordText: palette.blue,
};

export type AppColors = typeof lightColors;

// ─────────────────────────────────────────
// GRADIENT
// ─────────────────────────────────────────

export const gradients = {
  primary: ['#fc5d00', '#ff7a2e'],
  secondary: ['#9abc05', '#b2d606'],
  subtle: ['#fc5d00', '#9abc05'],
};

// ─────────────────────────────────────────
// SPACING
// ─────────────────────────────────────────

export const spacing = {
  xs:   4,
  sm:   8,
  md:   15,
  lg:   20,
  xl:   25,
  xxl:  30,
  xxxl: 40,
};

// ─────────────────────────────────────────
// BORDER RADIUS
// ─────────────────────────────────────────

export const borderRadius = {
  sm:   4,
  md:   12,
  lg:   16,
  full: 30,
};

// ─────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────

export const fontSizes = {
  xs:   10,
  sm:   12,
  md:   14,
  base: 16,
  lg:   18,
  xl:   24,
  xxl:  28,
  xxxl: 32,
  hero: 34,
};

export const fontWeights = {
  regular:   '400' as const,
  semibold:  '600' as const,
  bold:      'bold' as const,
  extraBold: '800' as const,
};