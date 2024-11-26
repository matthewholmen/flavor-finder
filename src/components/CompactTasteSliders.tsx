import React from 'react';

interface TasteValues {
  sweet: number;
  salty: number;
  sour: number;
  bitter: number;
  umami: number;
  fat: number;
  spicy: number;
}

interface CompactTasteSlidersProps {
  values: TasteValues;
  onChange: (values: TasteValues) => void;
  activeSliders?: Set<keyof TasteValues>;
  onToggleSlider?: (slider: keyof TasteValues) => void;
}

const TASTE_COLORS = {
  sweet: '#f97316',  // orange
  salty: '#3b82f6',  // blue
  sour: '#22c55e',   // green
  bitter: '#a855f7',  // purple
  umami: '#ef4444',  // red
  fat: '#facc15',    // yellow
  spicy: '#ec4899'   // pink
};

const CompactTasteSliders: React.FC<CompactTasteSlidersProps> = ({
  values,
  onChange,
  activeSliders = new Set(Object.keys(values) as Array<keyof TasteValues>),
  onToggleSlider = () => {}
}) => {
  const handleSliderChange = (taste: keyof TasteValues, value: number) => {
    onChange({
      ...values,
      [taste]: value
    });
  };

  return (
    <div className="px-4">
      {/* Labels row with toggles */}
      <div className="flex gap-8 mb-1">
        {(Object.keys(values) as Array<keyof TasteValues>).map(taste => (
          <div key={taste} className="flex-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleSlider(taste)}
                className={`w-5 h-5 border rounded flex items-center justify-center ${
                  activeSliders.has(taste) ? 'border-gray-400' : 'border-gray-300'
                }`}
              >
                {activeSliders.has(taste) && "✓"}
              </button>
              <span className="text-sm capitalize" style={{ color: TASTE_COLORS[taste] }}>
                {taste}
              </span>
            </div>
          </div>
        ))}
      </div>
  
      {/* Sliders row */}
      <div className="flex gap-8">
        {(Object.keys(values) as Array<keyof TasteValues>).map(taste => (
          <div key={taste} className="flex-1">
            <input
              type="range"
              min="0"
              max="10"
              value={values[taste] || 0} // Default to 0 if undefined
              onChange={(e) =>
                onChange({
                  ...values,
                  [taste]: Number(e.target.value),
                })
              }
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer 
                [&::-webkit-slider-thumb]:appearance-none 
                [&::-webkit-slider-thumb]:h-4 
                [&::-webkit-slider-thumb]:w-4 
                [&::-webkit-slider-thumb]:rounded-full 
                [&::-webkit-slider-thumb]:shadow
                [&::-webkit-slider-thumb]:bg-current`}
              style={{
                background: `linear-gradient(to right, ${TASTE_COLORS[taste]}66, ${TASTE_COLORS[taste]})`,
                opacity: activeSliders.has(taste) ? 1 : 0.5,
                color: TASTE_COLORS[taste], // Sets the color for the thumb via bg-current
              }}
              disabled={!activeSliders.has(taste)}
            />

          </div>
        ))}
      </div>
    </div>
  );
}

export default CompactTasteSliders;