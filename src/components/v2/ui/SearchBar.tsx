import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';

// The app's ONE search anatomy (July 2026 unification): a pill-shaped input with a
// leading search icon, and a dropdown whose rows all share the same grammar —
// [category dot | icon] label … [secondary action | kind label]. Every surface
// (landing, drawer, flavor map) renders this same shape; only the scope of `hits`
// and the meaning of `onPick` differ, and picking ALWAYS means "into the combo".
// "Show me instead" verbs (open the map, re-center) are explicit secondary actions.
//
// The hits are computed by the caller — this component owns look and keyboard
// behavior only (Enter = top hit, Escape = clear), never ranking or data.

export interface SearchBarHit {
  /** Unique row key. */
  key: string;
  label: string;
  /** Category dot color (ingredient rows). */
  dotColor?: string;
  /** Leading icon instead of a dot (e.g. the compose sparkles). */
  icon?: React.ReactNode;
  /** Trailing kind label ("cuisine", "dish type") for rows without a secondary action. */
  kindLabel?: string;
  /** Bold label (compose rows). */
  emphasize?: boolean;
  /** Whether this row shows the bar's secondary action (default: only dot rows). */
  secondary?: boolean;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  hits: SearchBarHit[];
  /** Pick = the row's primary meaning (add to the combo, everywhere). */
  onPick: (hit: SearchBarHit) => void;
  /** Per-row secondary action (ⓘ info, "show on map"…) — one icon slot, same seat on
   *  every surface. Shown on rows with a dot (ingredients) unless the hit opts out. */
  secondaryAction?: {
    icon: React.ReactNode;
    label: (hit: SearchBarHit) => string;
    onPick: (hit: SearchBarHit) => void;
  };
  placeholder?: string;
  ariaLabel: string;
  /** Rendered over the empty input (the landing's rotating "Try …" suggestions). */
  emptyOverlay?: React.ReactNode;
  /** Open the results list upward (bars docked at the bottom of the screen). */
  dropUp?: boolean;
  /** lg = the landing hero pill; md = docked bars (drawer, map). */
  size?: 'lg' | 'md';
  autoFocus?: boolean;
  /** Message when the term matches nothing; null hides the empty row. */
  noMatchesText?: string | null;
  inputRef?: React.RefObject<HTMLInputElement>;
  onFocus?: () => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  hits,
  onPick,
  secondaryAction,
  placeholder,
  ariaLabel,
  emptyOverlay,
  dropUp = false,
  size = 'md',
  autoFocus = false,
  noMatchesText = null,
  inputRef,
  onFocus,
  className = '',
}) => {
  const fallbackRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? fallbackRef;
  const open = value.trim() !== '';

  const listPosition = dropUp ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <div className={`relative ${className}`}>
      <Search
        size={20}
        className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
        aria-hidden="true"
      />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={e => {
          if (e.key === 'Enter' && hits.length > 0) {
            onPick(hits[0]);
          } else if (e.key === 'Escape' && value !== '') {
            // Clear, and keep the Escape from bubbling into overlay-close handlers —
            // one press empties the search, a second closes whatever hosts it.
            e.stopPropagation();
            onChange('');
          }
        }}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        placeholder={emptyOverlay ? undefined : placeholder}
        style={{ fontSize: '16px' }} // never smaller — an iOS input under 16px zooms the page
        className={`
          w-full pl-12 rounded-full text-base
          border-2 border-gray-300 dark:border-gray-600
          focus:border-gray-900 dark:focus:border-white focus:outline-none
          bg-white dark:bg-gray-800 text-gray-900 dark:text-white
          placeholder-gray-400 dark:placeholder-gray-500
          transition-colors
          ${size === 'lg' ? 'py-4 pr-12' : 'h-12 pr-10'}
        `}
      />
      {value !== '' && (
        <button
          onClick={() => {
            onChange('');
            ref.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X size={18} />
        </button>
      )}
      {value === '' && emptyOverlay && (
        <div
          className="absolute left-12 right-5 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        >
          {emptyOverlay}
        </div>
      )}

      {/* Results — one dropdown anatomy everywhere */}
      {open && hits.length > 0 && (
        <div
          className={`
            absolute left-0 right-0 ${listPosition} z-30
            rounded-2xl border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 shadow-lg overflow-hidden
            max-h-72 overflow-y-auto text-left
          `}
        >
          {hits.map(hit => {
            const showSecondary =
              !!secondaryAction && (hit.secondary ?? hit.dotColor !== undefined);
            return (
              // Row = pick button + optional trailing secondary action. Two sibling
              // buttons, never nested — the secondary replaces the kind label there.
              <div
                key={hit.key}
                className="w-full flex items-center hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
              >
                <button
                  onClick={() => onPick(hit)}
                  className="flex-1 min-w-0 flex items-center gap-2.5 pl-5 pr-2 py-2.5 text-left text-gray-900 dark:text-white"
                >
                  {hit.icon}
                  {!hit.icon && hit.dotColor && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: hit.dotColor }}
                      aria-hidden="true"
                    />
                  )}
                  <span className={`truncate ${hit.emphasize ? 'font-semibold' : ''}`}>
                    {hit.label}
                  </span>
                </button>
                {showSecondary ? (
                  <button
                    onClick={() => secondaryAction!.onPick(hit)}
                    aria-label={secondaryAction!.label(hit)}
                    title={secondaryAction!.label(hit)}
                    className="shrink-0 px-4 py-2.5 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  >
                    {secondaryAction!.icon}
                  </button>
                ) : hit.kindLabel ? (
                  <span className="shrink-0 pr-5 pl-2 text-xs text-gray-400 dark:text-gray-500">
                    {hit.kindLabel}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      {open && hits.length === 0 && noMatchesText && (
        <div
          className={`
            absolute left-0 right-0 ${listPosition} z-30
            rounded-2xl border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 shadow-lg text-left
            px-5 py-3 text-sm text-gray-500 dark:text-gray-400
          `}
        >
          {noMatchesText}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
