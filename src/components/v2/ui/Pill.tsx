import React from 'react';

/**
 * The single pill/chip button used across filters, dietary presets, and Taste
 * Lab tag pickers. Standardizes border width, padding, radius, and the
 * active/inactive/disabled treatments that were previously hand-tuned per
 * component (the canonical pattern came from IngredientFiltersModal).
 *
 * Neutral pills (no `accent`) use the app's gray-900/white selected style.
 * Accent pills (taste/category) tint border + fill with the supplied color when
 * active, so a "sweet" pill reads sweet — the accent is applied via inline style
 * because the colors are data-driven (TASTE_COLORS / CATEGORY_COLORS) and can't
 * be enumerated as Tailwind classes.
 */
export interface PillProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  /** Optional data-driven accent (hex). When active, tints border + fill. */
  accent?: string;
  size?: 'sm' | 'md';
  /** Optional leading element (e.g. a Check icon when active). */
  leading?: React.ReactNode;
  children: React.ReactNode;
}

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
} as const;

export const Pill: React.FC<PillProps> = ({
  active = false,
  accent,
  size = 'sm',
  leading,
  children,
  className = '',
  type = 'button',
  style,
  ...rest
}) => {
  const neutralActive =
    'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900';
  const inactive =
    'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500';

  // Accent pills drive their border/fill via inline style, but still need a
  // theme-aware *text* color when inactive — otherwise the label falls back to
  // the browser default (black) and disappears on a dark surface.
  const accentInactiveText = 'text-gray-700 dark:text-gray-200';
  const stateClass = active
    ? accent ? '' : neutralActive
    : accent ? accentInactiveText : inactive;

  const accentStyle: React.CSSProperties | undefined = accent
    ? active
      ? { borderColor: accent, backgroundColor: accent, color: '#fff' }
      : { borderColor: `${accent}66` }
    : undefined;

  return (
    <button
      type={type}
      aria-pressed={active}
      className={`
        inline-flex items-center gap-1.5
        ${SIZES[size]}
        rounded-full font-medium
        border-2 transition-all duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${stateClass}
        ${className}
      `}
      style={{ ...accentStyle, ...style }}
      {...rest}
    >
      {leading}
      {children}
    </button>
  );
};

export default Pill;
