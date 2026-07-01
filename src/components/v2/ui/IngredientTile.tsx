import React from 'react';
import { contrastText } from '../../../utils/colors.ts';

/**
 * The one selectable ingredient tile — a taste-colored, pill-shaped button used
 * in the Classic search drawer (mobile + desktop) and the Taste Lab per-slot
 * search. Centralizing it means stroke width, radius, padding, and the
 * hover/selected/muted/partial treatments live in a single place, so a style
 * tweak stays consistent everywhere.
 *
 * States (callers resolve their own, since "selected" means different things —
 * greyed-out in the drawer, highlighted in Taste Lab):
 *  - `filled`   — accent fill + contrast text (Taste Lab current pick, or a
 *                 drawer tile the parent is highlighting on hover)
 *  - `muted`    — greyed, non-interactive look (already in the combo)
 *  - `dashed`   — partial-match border
 *  - `tintBg`   — subtle background override (drawer pairing highlight)
 *  - `hoverFill`— fill with the accent on hover, via CSS (Taste Lab); the drawer
 *                 drives its own hover through `filled` so it can also tint the
 *                 paired tiles, so it leaves this off.
 */
export interface IngredientTileProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  name: string;
  /** Border / fill color (the ingredient's taste color). */
  accent: string;
  filled?: boolean;
  muted?: boolean;
  dashed?: boolean;
  tintBg?: string;
  hoverFill?: boolean;
  isDarkMode?: boolean;
}

export const IngredientTile: React.FC<IngredientTileProps> = ({
  name,
  accent,
  filled = false,
  muted = false,
  dashed = false,
  tintBg,
  hoverFill = false,
  isDarkMode = false,
  className = '',
  type = 'button',
  ...rest
}) => {
  const baseText = isDarkMode ? '#f3f4f6' : '#1f2937';
  const baseBg = isDarkMode ? '#111827' : '#ffffff';
  const contrast = contrastText(accent);

  let bg = tintBg ?? baseBg;
  let text = baseText;
  let border = accent;

  if (muted) {
    text = isDarkMode ? '#4b5563' : '#d1d5db';
    border = isDarkMode ? '#374151' : '#e5e7eb';
  } else if (filled) {
    bg = accent;
    text = contrast;
  }

  return (
    <button
      type={type}
      data-hover-fill={hoverFill && !muted ? '' : undefined}
      className={`
        ingredient-tile
        inline-flex items-center justify-center
        px-5 py-2.5 min-h-[44px]
        rounded-full border-2 font-semibold text-base
        transition-all duration-150
        ${muted ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}
        ${className}
      `}
      style={{
        backgroundColor: bg,
        color: text,
        borderColor: border,
        borderStyle: dashed ? 'dashed' : 'solid',
        // Consumed by the .ingredient-tile[data-hover-fill]:hover rule in index.css
        ['--tile-accent' as string]: accent,
        ['--tile-contrast' as string]: contrast,
      }}
      {...rest}
    >
      {name}
    </button>
  );
};

export default IngredientTile;
