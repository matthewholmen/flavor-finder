export const TASTE_COLORS = {
    sweet: '#F86A8A',
    salty: '#6AAFE8',
    sour: '#7CB342',
    bitter: '#9B8AD6',
    umami: '#F57C00',
    fat: '#FFC233',
    spicy: '#F44336'
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