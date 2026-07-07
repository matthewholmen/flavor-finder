import React from 'react';

/**
 * The one on/off switch. A single source of truth for switch styling so the
 * settings toggles (Dark Mode, High Contrast) and the pairing-source toggles
 * can't drift apart — historically the settings ones lacked `dark:` variants and
 * `role="switch"`, so they rendered near-invisible in dark mode and were opaque
 * to screen readers.
 *
 * Owns the switch's track/thumb visuals and the accessibility contract
 * (`role="switch"` + `aria-checked` + required `label`). The caller supplies the
 * surrounding row/label markup.
 */
export interface ToggleProps {
  /** Whether the switch is on. */
  checked: boolean;
  onChange: () => void;
  /** Required: switches need an accessible name. */
  label: string;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, className = '' }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-300 dark:bg-gray-600'
      } ${className}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

export default Toggle;
