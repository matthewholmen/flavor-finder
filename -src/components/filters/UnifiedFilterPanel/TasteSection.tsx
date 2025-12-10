import React from 'react';
import { X } from 'lucide-react';
import { TasteSectionProps } from './types.ts';
import { TASTE_COLORS } from '../../../utils/colors.ts';

const TASTE_PROPERTIES = ['sweet', 'salty', 'sour', 'bitter', 'umami', 'fat', 'spicy'] as const;
const DEFAULT_VALUE = 1;

const TasteSection: React.FC<TasteSectionProps> = ({
  values,
  activeSliders,
  onChange,
  onToggleSlider,
  compact = false
}) => {
  const handleTasteToggle = (taste: string) => {
    // If activating (not currently active), set to default value
    if (!activeSliders.has(taste)) {
      onChange({
        ...values,
        [taste]: DEFAULT_VALUE
      });
    }
    onToggleSlider(taste);
  };

  const handleSliderChange = (taste: string, value: number) => {
    onChange({
      ...values,
      [taste]: value
    });
  };

  const handleClearAll = () => {
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-gray-900">Taste Profile</h3>
        {activeSliders.size > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {TASTE_PROPERTIES.map((taste) => {
          const isActive = activeSliders.has(taste);
          const tasteColor = TASTE_COLORS[taste];
          
          return (
            <button
              key={taste}
              onClick={() => handleTasteToggle(taste)}
              className={
                'py-3 px-4 text-base rounded-full border-2 transition-all duration-200 text-center font-medium capitalize hover:shadow-sm ' +
                (isActive
                  ? 'text-white'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500 hover:bg-gray-50')
              }
              style={
                isActive
                  ? { backgroundColor: tasteColor, borderColor: tasteColor }
                  : {}
              }
            >
              <div className="flex items-center justify-center gap-1">
                <span>{taste}</span>
                {isActive && <X size={14} />}
              </div>
            </button>
          );
        })}
      </div>

      {activeSliders.size > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600">Active Filters</h4>
          <div className="space-y-2">
            {Array.from(activeSliders).map((taste) => {
              const tasteColor = TASTE_COLORS[taste];
              
              return (
                <div key={taste} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: tasteColor }}
                  />
                  <span className="text-sm font-medium capitalize min-w-0 flex-shrink-0 w-16">
                    {taste}
                  </span>
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={values[taste as keyof typeof values]}
                      onChange={(e) => handleSliderChange(taste, parseInt(e.target.value, 10))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, ${tasteColor} 0%, ${tasteColor} ${values[taste as keyof typeof values] * 10}%, ${getDesaturatedColor(tasteColor)} ${values[taste as keyof typeof values] * 10}%, ${getDesaturatedColor(tasteColor)} 100%)`,
                        ['--thumb-color' as string]: tasteColor
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 min-w-0 w-8 text-right">
                    {values[taste as keyof typeof values]}
                  </span>
                  <button
                    onClick={() => onToggleSlider(taste)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSliders.size === 0 && (
        <p className="text-xs text-gray-500">
          Click taste properties above to add filters
        </p>
      )}
      
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          background-color: var(--thumb-color) !important;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1px solid #000;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          background-color: var(--thumb-color) !important;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1px solid #000;
          cursor: pointer;
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
};

export default TasteSection;
