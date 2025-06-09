import React from 'react';
import { X } from 'lucide-react';
import { TasteSectionProps } from './types.ts';
import { TASTE_COLORS } from '../../../utils/colors.ts';

const TASTE_PROPERTIES = ['sweet', 'salty', 'sour', 'bitter', 'umami', 'fat', 'spicy'] as const;
const DEFAULT_VALUE = 5;

const TasteSection: React.FC<TasteSectionProps> = ({
  values,
  activeSliders,
  onChange,
  onToggleSlider,
  compact = false
}) => {
  const handleTasteToggle = (taste: string) => {
    onToggleSlider(taste);
    
    // Initialize with default value if not already set
    if (!activeSliders.has(taste) && values[taste as keyof typeof values] === 0) {
      onChange({
        ...values,
        [taste]: DEFAULT_VALUE
      });
    }
  };

  const handleSliderChange = (taste: string, value: number) => {
    onChange({
      ...values,
      [taste]: value
    });
  };

  const handleClearAll = () => {
    // Clear all active sliders
    Array.from(activeSliders).forEach(taste => onToggleSlider(taste));
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

  return (
    <div className="space-y-2">
      {/* Clear all button if needed */}
      {activeSliders.size > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleClearAll}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Taste Toggle Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
        {TASTE_PROPERTIES.map((taste) => (
          <button
            key={taste}
            onClick={() => handleTasteToggle(taste)}
            className={`
              py-1.5 px-2 text-xs rounded-full border-2 transition-all duration-200
              text-center font-medium capitalize
              ${activeSliders.has(taste)
                ? 'text-white border-transparent'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
              }
            `}
            style={{
              backgroundColor: activeSliders.has(taste) ? TASTE_COLORS[taste] : 'white',
              borderColor: activeSliders.has(taste) ? TASTE_COLORS[taste] : undefined,
            }}
            onMouseEnter={(e) => {
              if (!activeSliders.has(taste)) {
                e.currentTarget.style.backgroundColor = TASTE_COLORS[taste];
                e.currentTarget.style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              if (!activeSliders.has(taste)) {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = '#374151'; // text-gray-700
              }
            }}
          >
            <div className="flex items-center justify-center gap-1">
              <span>{taste}</span>
              {activeSliders.has(taste) && <X size={10} />}
            </div>
          </button>
        ))}
      </div>

      {/* Active Slider Display */}
      {activeSliders.size > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600">Active Filters</h4>
          <div className="space-y-1.5">
            {Array.from(activeSliders).map((taste) => (
              <div key={taste} className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full border"
                  style={{ backgroundColor: TASTE_COLORS[taste] }}
                />
                <span className="text-xs font-medium capitalize min-w-0 flex-shrink-0 w-12">
                  {taste}
                </span>
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={values[taste as keyof typeof values]}
                    onChange={(e) => handleSliderChange(taste, parseFloat(e.target.value))}
                    className={`
                      w-full h-1.5 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-2.5
                      [&::-webkit-slider-thumb]:h-2.5
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:border-2
                      [&::-webkit-slider-thumb]:border-gray-800
                      [&::-moz-range-thumb]:w-2.5
                      [&::-moz-range-thumb]:h-2.5
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:border-2
                      [&::-moz-range-thumb]:border-gray-800
                    `}
                    style={{
                      background: `linear-gradient(to right, 
                        ${TASTE_COLORS[taste]} 0%, 
                        ${TASTE_COLORS[taste]} ${values[taste as keyof typeof values] * 10}%, 
                        ${getDesaturatedColor(TASTE_COLORS[taste])} ${values[taste as keyof typeof values] * 10}%, 
                        ${getDesaturatedColor(TASTE_COLORS[taste])} 100%)`,
                      ['--thumb-color' as string]: TASTE_COLORS[taste]
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 min-w-0 w-6 text-right">
                  {values[taste as keyof typeof values].toFixed(1)}
                </span>
                <button
                  onClick={() => onToggleSlider(taste)}
                  className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      {activeSliders.size === 0 && (
        <p className="text-xs text-gray-500 italic">
          Click taste properties above to add filters
        </p>
      )}
    </div>
  );
};

export default TasteSection;