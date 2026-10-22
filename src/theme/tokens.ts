/** رموز التصميم — مصدر واحد للألوان والمسافات والخطوط. */

export const palette = {
  emerald: '#17a673',
  emeraldDark: '#0f7d56',
  emeraldSoft: '#d8f3e8',
  gold: '#f2b705',
  goldSoft: '#fdf0cc',
  ruby: '#e5484d',
  rubyDark: '#b7343a',
  rubySoft: '#fde8e8',
  sky: '#2a9ddb',
  skySoft: '#dcefff',
  violet: '#7c5cd6',
  violetSoft: '#e9e2fb',
  rose: '#e0609a',
  roseSoft: '#fbe3ee',
  indigo: '#4458c7',
  indigoSoft: '#e0e4fa',
  teal: '#128f8b',
  tealSoft: '#d6f0ef',
  orange: '#e8833a',
  orangeSoft: '#fdeada',
} as const;

/** ألوان الوحدات — المفاتيح هي قيم `color` في ملفات المحتوى. */
export const unitColors = {
  green: { base: palette.emerald, soft: palette.emeraldSoft },
  blue: { base: palette.sky, soft: palette.skySoft },
  purple: { base: palette.violet, soft: palette.violetSoft },
  orange: { base: palette.orange, soft: palette.orangeSoft },
  red: { base: palette.ruby, soft: palette.rubySoft },
  teal: { base: palette.teal, soft: palette.tealSoft },
  pink: { base: palette.rose, soft: palette.roseSoft },
  indigo: { base: palette.indigo, soft: palette.indigoSoft },
} as const;

export type UnitColor = keyof typeof unitColors;

/** مجموعة ألوان واحدة — يوجد منها نسخة فاتحة ونسخة داكنة. */
export type Scheme = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  border: string;
  borderStrong: string;
  locked: string;
  lockedInk: string;
  shadow: string;
  correctBg: string;
  correctInk: string;
  wrongBg: string;
  wrongInk: string;
};

const light: Scheme = {
  bg: '#fbf9f4',
  surface: '#ffffff',
  surfaceAlt: '#f3f0e9',
  ink: '#20262e',
  inkSoft: '#5d6977',
  inkFaint: '#97a1ad',
  border: '#e2ddd2',
  borderStrong: '#cdc6b8',
  locked: '#ddd8cc',
  lockedInk: '#a79f90',
  shadow: 'rgba(32, 38, 46, 0.12)',
  correctBg: palette.emeraldSoft,
  correctInk: palette.emeraldDark,
  wrongBg: palette.rubySoft,
  wrongInk: palette.rubyDark,
};

const dark: Scheme = {
  bg: '#14181d',
  surface: '#1c2228',
  surfaceAlt: '#232a31',
  ink: '#f1efe9',
  inkSoft: '#a8b2bd',
  inkFaint: '#6c7783',
  border: '#2e363f',
  borderStrong: '#404a55',
  locked: '#2a3139',
  lockedInk: '#5d6771',
  shadow: 'rgba(0, 0, 0, 0.45)',
  correctBg: '#113b2c',
  correctInk: '#5fd6a5',
  wrongBg: '#45191c',
  wrongInk: '#ff8b8f',
};

export const schemes = { light, dark };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const font = {
  regular: 'Cairo_400Regular',
  medium: 'Cairo_500Medium',
  semibold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
  black: 'Cairo_900Black',
} as const;

export const size = {
  caption: 12,
  small: 14,
  body: 16,
  lead: 18,
  title: 22,
  display: 28,
  hero: 34,
} as const;

/** ارتفاع الحافة السفلية التي تعطي الأزرار إحساس الضغط ثلاثي الأبعاد. */
export const LIP = 4;
