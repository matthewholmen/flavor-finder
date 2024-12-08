import React, { useState, useEffect } from 'react';
import { TASTE_COLORS } from '../utils/colors.ts';

export interface TasteValues {
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
  activeSliders: Set<keyof TasteValues>;
  onToggleSlider: (taste: keyof TasteValues) => void;
}

const DEFAULT_VALUE = 5;

const CompactTasteSliders: React.FC<CompactTasteSlidersProps> = ({
  values,
  onChange,
  activeSliders,
  onToggleSlider
}) => {
  const [currentSlider, setCurrentSlider] = useState<keyof TasteValues>('sweet');
  const [isDragging, setIsDragging] = useState(false);
  const [initializedSliders] = useState(new Set<keyof TasteValues>());

  const handleTasteToggle = (taste: keyof TasteValues) => {
    if (!isDragging) {
      onToggleSlider(taste);
      setCurrentSlider(taste);
      
      // Set default value only on first activation
      if (!activeSliders.has(taste) && !initializedSliders.has(taste)) {
        initializedSliders.add(taste);
        onChange({
          ...values,
          [taste]: DEFAULT_VALUE
        });
      }
    }
    setIsDragging(false);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onChange({
      ...values,
      [currentSlider]: value
    });
  };

  const getDesaturatedColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    const mix = 0.85;
    const desatR = Math.round(r * (1 - mix) + 255 * mix);
    const desatG = Math.round(g * (1 - mix) + 255 * mix);
    const desatB = Math.round(b * (1 - mix) + 255 * mix);
    
    return `rgb(${desatR}, ${desatG}, ${desatB})`;
  };

  const areAllSlidersDisabled = activeSliders.size === 0;

  // Initialize values for newly mounted sliders
  useEffect(() => {
    const uninitialized = Array.from(activeSliders).filter(
      taste => !initializedSliders.has(taste) && values[taste] === 0
    );
    
    if (uninitialized.length > 0) {
      const newValues = { ...values };
      uninitialized.forEach(taste => {
        initializedSliders.add(taste);
        newValues[taste] = DEFAULT_VALUE;
      });
      onChange(newValues);
    }
  }, [activeSliders]);

  return (
    <div className="space-y-4">
      {/* Taste Toggle Buttons with justified layout */}
      <div className="flex justify-between">
        {(Object.keys(values) as Array<keyof TasteValues>).map((taste) => (
          <button
            key={taste}
            onClick={() => handleTasteToggle(taste)}
            className="relative inline-flex items-center group"
            onMouseDown={() => setIsDragging(false)}
          >
            <div
              className={`w-5 h-5 rounded-full transition-all duration-200 border-4
                ${activeSliders.has(taste)
                  ? 'border-transparent'
                  : 'border-current'
                }
                ${currentSlider === taste && activeSliders.has(taste)
                  ? 'ring-2 ring-offset-1 ring-gray-200 dark:ring-gray-700'
                  : ''
                }
                group-hover:scale-110
              `}
              style={{
                backgroundColor: activeSliders.has(taste)
                  ? TASTE_COLORS[taste]
                  : 'transparent',
                borderColor: TASTE_COLORS[taste]
              }}
            />
            <span className="ml-1 text-sm capitalize">
              {taste}
            </span>
          </button>
        ))}
      </div>

      {/* Slider */}
      <div className={`relative transition-opacity duration-200 ${areAllSlidersDisabled ? 'opacity-30' : 'opacity-100'}`}>
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            background-color: var(--thumb-color) !important;
            box-shadow: 0 0 0 2px black;
          }
          input[type="range"]::-moz-range-thumb {
            background-color: var(--thumb-color) !important;
            box-shadow: 0 0 0 2px black;
          }
        `}</style>
        <input
          type="range"
          min="0"
          max="10"
          step="0.1"
          value={values[currentSlider]}
          onChange={handleSliderChange}
          onMouseDown={() => setIsDragging(false)}
          onMouseUp={() => setIsDragging(true)}
          className={`
            w-full h-3 rounded-full appearance-none cursor-pointer
            transition-all duration-200
            border-1 border-black dark:border-white
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:transition-transform
            [&::-moz-range-thumb]:hover:scale-110
          `}
          style={{
            color: TASTE_COLORS[currentSlider],
            background: `linear-gradient(to right, 
              ${TASTE_COLORS[currentSlider]} 0%, 
              ${TASTE_COLORS[currentSlider]} ${values[currentSlider] * 10}%, 
              ${getDesaturatedColor(TASTE_COLORS[currentSlider])} ${values[currentSlider] * 10}%, 
              ${getDesaturatedColor(TASTE_COLORS[currentSlider])} 100%)`,
            ['--thumb-color' as string]: TASTE_COLORS[currentSlider]
          }}
          disabled={areAllSlidersDisabled}
        />
      </div>
    </div>
  );
};

export default CompactTasteSliders;