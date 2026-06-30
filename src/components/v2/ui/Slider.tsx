import React, { useId } from 'react';

/**
 * The single range-slider used for taste thresholds. Previously the thumb CSS
 * was duplicated (IngredientDrawer, the deleted CompactTasteSliders/TasteSection,
 * TasteLabSplit) with a hard `1px solid black` border that disappeared on light
 * taste colors (e.g. fat's yellow). Here the thumb is tinted by `accent` and
 * ringed with a white border + dark halo so it stays visible on any track color
 * in both light and dark mode.
 *
 * The thumb color is data-driven, so its CSS is injected per-instance via a
 * scoped class (WebKit + Firefox need pseudo-element rules that Tailwind can't
 * express).
 */
export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  accent: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max = 10,
  step = 1,
  accent,
  onChange,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const reactId = useId();
  const cls = `ff-slider-${reactId.replace(/[:]/g, '')}`;

  // Filled portion of the track reads in the accent color, the remainder in a
  // faint tint of the same accent — so the slider shows its value at a glance
  // and reads cohesively with the taste it represents, on any background.
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const trackFill = `linear-gradient(to right, ${accent} 0%, ${accent} ${pct}%, ${accent}29 ${pct}%, ${accent}29 100%)`;

  const thumb = `
    .${cls}::-webkit-slider-thumb {
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background-color: ${accent};
      border: 2px solid #fff;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.28);
      cursor: pointer;
    }
    .${cls}::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background-color: ${accent};
      border: 2px solid #fff;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.28);
      cursor: pointer;
    }
    .${cls}:disabled { opacity: 0.4; cursor: not-allowed; }
  `;

  return (
    <>
      <style>{thumb}</style>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ background: trackFill }}
        className={`h-1.5 rounded-full appearance-none cursor-pointer ${cls} ${className}`}
      />
    </>
  );
};

export default Slider;
