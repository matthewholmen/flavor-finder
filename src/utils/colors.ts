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