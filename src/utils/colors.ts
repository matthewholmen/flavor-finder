export const TASTE_COLORS = {
    sweet: '#F86A8A',
    salty: '#6AAFE8',
    sour: '#7CB342',
    umami: '#F57C00',
    fat: '#FFC233',
    spicy: '#F44336',
    aromatic: '#9B8AD6'
  };

// Neutral tint for a "wild" slot — no taste/category constraint. Reads as a
// quiet gray so it's visibly distinct from any taste or category color.
export const WILD_COLOR = '#9aa3b2';

// One icon-size scale for the whole app, so we stop sprinkling
// `size={isMobile ? 24 : 30}` literals across components. Each step gives a
// mobile + desktop value; pick the step by role, not by eyeballing pixels.
//   xs — inline affordances (chevrons inside pills, count carets)
//   sm — secondary controls (lock toggles, close buttons)
//   md — primary controls (cycle chevrons, generate icon)
//   lg — hero / focal glyphs
export const ICON_SIZES = {
  xs: { mobile: 14, desktop: 16 },
  sm: { mobile: 18, desktop: 20 },
  md: { mobile: 24, desktop: 30 },
  lg: { mobile: 30, desktop: 36 },
} as const;

export type IconSizeStep = keyof typeof ICON_SIZES;

// Resolve an icon-size step to a pixel value for the current breakpoint.
export const iconSize = (step: IconSizeStep, isMobile: boolean): number =>
  isMobile ? ICON_SIZES[step].mobile : ICON_SIZES[step].desktop;

// One accent color per top-level category — used by Taste Lab's category mode to
// tint a slot the way TASTE_COLORS tints a taste. Kept earthier/muted so a
// category-constrained slot reads distinctly from a taste-constrained one.
export const CATEGORY_COLORS: Record<string, string> = {
    Proteins: '#D9685A',
    Vegetables: '#5FA85A',
    Fruits: '#E86A9A',
    Dairy: '#EAC25A',
    Seasonings: '#8E7CC3',
    Pantry: '#C08A5E',
    Grains: '#D4A95C',
    Alcohol: '#7E9BD4',
  };

// Blend `hex` toward `target` by `amount` (0–1), returning hex. The basis for
// the "ink" and "tone" helpers below: every derived surface/text color is a
// mix of the taste color itself, so panels read as one pigment, not layers.
export const mixHex = (hex: string, target: string, amount: number): string => {
  const c = hex.replace('#', '');
  const t = target.replace('#', '');
  if (c.length < 6 || t.length < 6) return hex;
  const mix = (i: number) =>
    Math.round(parseInt(c.slice(i, i + 2), 16) * (1 - amount) + parseInt(t.slice(i, i + 2), 16) * amount);
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(mix(0))}${h(mix(2))}${h(mix(4))}`;
};

// Relative luminance of a #rrggbb color, for choosing black vs white text.
export const hexLuminance = (hex: string): number => {
  const c = hex.replace('#', '');
  if (c.length < 6) return 1;
  const channel = (h: string) => {
    const x = parseInt(h, 16) / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const r = channel(c.slice(0, 2));
  const g = channel(c.slice(2, 4));
  const b = channel(c.slice(4, 6));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Text color to sit on a colored fill: black on the color unless it's genuinely
// dark (e.g. spicy red), where white reads better.
export const contrastText = (hex: string): string =>
  hexLuminance(hex) > 0.32 ? '#131823' : '#ffffff';

// WCAG contrast ratio between two colors.
export const contrastRatio = (a: string, b: string): number => {
  const la = hexLuminance(a);
  const lb = hexLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

// "Ink" for a taste-colored panel: a deep (or pale) mix of the panel's own hue
// rather than flat black/white, so type reads as pigment on pigment — think
// dark plum on pink, cream on chili red. Contrast-aware: it starts from the
// hue-rich mix, picks whichever side (dark/light) has more headroom, and
// deepens the mix stepwise until it clears WCAG AA (4.5:1) or bottoms out at
// the near-black / near-cream base.
export const tasteInk = (bg: string): string => {
  const darkBase = '#160f0c';
  const lightBase = '#fffcf5';
  const darkStart = mixHex(bg, darkBase, 0.82);
  const lightStart = mixHex(bg, lightBase, 0.92);
  const useDark = contrastRatio(bg, darkStart) >= contrastRatio(bg, lightStart);
  const base = useDark ? darkBase : lightBase;
  let amount = useDark ? 0.82 : 0.92;
  let ink = mixHex(bg, base, amount);
  while (contrastRatio(bg, ink) < 4.5 && amount < 1) {
    amount = Math.min(1, amount + 0.05);
    ink = mixHex(bg, base, amount);
  }
  return ink;
};

// The panel fill itself, tuned per theme: nudged toward paper in light mode so
// full-bleed color isn't shrill, and deepened in dark mode so panels sit richly
// against the dark chrome instead of glowing.
export const panelTone = (color: string, isDarkMode?: boolean): string =>
  isDarkMode ? mixHex(color, '#101216', 0.16) : mixHex(color, '#fffdf8', 0.08);

// Get ingredient color with high-contrast mode support
export const getIngredientColorWithContrast = (color: string, isHighContrast?: boolean, isDarkMode?: boolean): string => {
  // Use passed parameters if available (for React components), otherwise check DOM
  const highContrast = isHighContrast !== undefined
    ? isHighContrast
    : (typeof document !== 'undefined' && document.documentElement.classList.contains('high-contrast'));

  if (!highContrast) return color;

  const isDark = isDarkMode !== undefined
    ? isDarkMode
    : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  return isDark ? '#e6e6e6' : '#1a1a1a';
};