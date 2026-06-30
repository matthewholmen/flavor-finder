import React from 'react';

/**
 * The one wrapper for icon-only controls. Two jobs:
 *  1. Guarantee a >=44px touch target (the visible glyph can be smaller — the
 *     hit area is padded out via min-width/height) so faint affordances like the
 *     drawer's filter chevron or Taste Lab's cycle arrows are reliably tappable.
 *  2. Force an `aria-label`, since icon-only buttons have no accessible name
 *     otherwise. It's a required prop, not optional.
 *
 * Visual styling stays the caller's job (color, opacity, hover) via `className`
 * and `style` — this only owns the hit area and accessibility contract.
 */
export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  children: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  children,
  className = '',
  type = 'button',
  ...rest
}) => {
  return (
    <button
      type={type}
      aria-label={label}
      className={`
        inline-flex items-center justify-center
        min-w-[44px] min-h-[44px]
        transition-colors
        disabled:cursor-not-allowed
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
};

export default IconButton;
