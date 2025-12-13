import React, { useState, useEffect, useRef } from 'react';
import { TASTE_COLORS } from '../utils/colors.ts';
import { X } from 'lucide-react';

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

const DEFAULT_VALUE = 1;

const CompactTasteSliders: React.FC<CompactTasteSlidersProps> = ({
  values,
  onChange,
  activeSliders,
  onToggleSlider
}) => {
  const [currentSlider, setCurrentSlider] = useState<keyof TasteValues>('sweet');
  const [isDragging, setIsDragging] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (isMobile) return; // Skip wheel handling on mobile
    
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isMobile]);

  const handleTasteToggle = (taste: keyof TasteValues) => {
    if (!isDragging) {
      // If activating (not currently active), set to default value
      if (!activeSliders.has(taste)) {
        setCurrentSlider(taste);
        onChange({
          ...values,
          [taste]: DEFAULT_VALUE
        });
      }
      onToggleSlider(taste);
    }
    setIsDragging(false);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onChange({
      ...values,
      [currentSlider]: value
    });
  };

  const getDesaturatedColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    const mix = 0.7;
    const desatR = Math.round(r * (1 - mix) + 255 * mix);
    const desatG = Math.round(g * (1 - mix) + 255 * mix);
    const desatB = Math.round(b * (1 - mix) + 255 * mix);

    return `rgb(${desatR}, ${desatG}, ${desatB})`;
  };

  const areAllSlidersDisabled = activeSliders.size === 0;

  useEffect(() => {
    // Set default value for any newly activated sliders that have value 0
    const needsDefault = Array.from(activeSliders).filter(
      taste => values[taste] === 0
    );

    if (needsDefault.length > 0) {
      const newValues = { ...values };
      needsDefault.forEach(taste => {
        newValues[taste] = DEFAULT_VALUE;
      });
      onChange(newValues);
    }
  }, [activeSliders]);

  return (
    <div className="space-y-2">
      <div className="relative">
        {isMobile ? (
          // Mobile: Grid layout to prevent overflow
          <div className="grid grid-cols-3 gap-1 px-2">
            {(Object.keys(values) as Array<keyof TasteValues>).map((taste) => (
              <button
                key={taste}
                className={`
                  py-1.5 px-2
                  rounded-full
                  font-sans text-xs
                  flex items-center justify-center gap-1
                  border-2 transition-all
                  ${activeSliders.has(taste) ? 'text-white' : 'text-black'}
                  ${currentSlider === taste && activeSliders.has(taste) ? 'ring-1 ring-gray-800' : ''}
                  hover:text-white
                `}
                style={{
                  borderColor: TASTE_COLORS[taste],
                  backgroundColor: activeSliders.has(taste) ? TASTE_COLORS[taste] : 'white',
                }}
                onClick={() => !activeSliders.has(taste) && handleTasteToggle(taste)}
              >
                <span 
                  className="capitalize cursor-pointer" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeSliders.has(taste)) {
                      setCurrentSlider(taste);
                    } else {
                      handleTasteToggle(taste);
                    }
                  }}
                >
                  {taste}
                </span>
                {activeSliders.has(taste) && (
                  <button 
                    className="p-1 -m-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTasteToggle(taste);
                    }}
                  >
                    <X size={12} className="hover:scale-110 transition-transform" />
                  </button>
                )}
              </button>
            ))}
            
            {/* Clear all button for mobile - only show if there are active sliders */}
            {activeSliders.size > 0 && (
              <div className="col-span-3 mt-2">
                <button
                  onClick={() => {
                    Array.from(activeSliders).forEach(taste => onToggleSlider(taste));
                  }}
                  className="
                    w-full
                    py-1.5 px-3
                    rounded-full
                    border-2
                    bg-white
                    text-gray-400
                    border-gray-400
                    hover:text-gray-800
                    hover:bg-white
                    hover:border-gray-800
                    transition-colors
                    text-xs
                    flex items-center justify-center gap-1
                  "
                >
                  <X size={12} />
                  Clear All
                </button>
              </div>
            )}
          </div>
        ) : (
          // Desktop: Original horizontal scroll layout
          <div 
            ref={scrollContainerRef}
            className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide py-2 px-8"
          >
            {(Object.keys(values) as Array<keyof TasteValues>).map((taste) => (
              <button
                key={taste}
                className={`
                  py-2 px-4
                  rounded-full
                  font-sans text-md
                  flex items-center gap-2
                  border-2 transition-all
                  ${activeSliders.has(taste) ? 'text-white' : 'text-black'}
                  ${currentSlider === taste && activeSliders.has(taste) ? 'ring-2 ring-gray-800' : ''}
                  hover:text-white
                  flex-shrink-0
                `}
                style={{
                  borderColor: TASTE_COLORS[taste],
                  backgroundColor: activeSliders.has(taste) ? TASTE_COLORS[taste] : 'white',
                }}
                onClick={() => !activeSliders.has(taste) && handleTasteToggle(taste)}
                onMouseEnter={(e) => {
                  if (!activeSliders.has(taste)) {
                    e.currentTarget.style.backgroundColor = TASTE_COLORS[taste];
                  }
                }}
                onMouseLeave={(e) => {
                  if (!activeSliders.has(taste)) {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = 'black';
                    e.currentTarget.style.borderColor = TASTE_COLORS[taste];
                  }
                }}
              >
                <span 
                  className="capitalize cursor-pointer" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeSliders.has(taste)) {
                      setCurrentSlider(taste);
                    } else {
                      handleTasteToggle(taste);
                    }
                  }}
                >
                  {taste}
                </span>
                {activeSliders.has(taste) && (
                  <button 
                    className="p-2 -m-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTasteToggle(taste);
                    }}
                  >
                    <X size={18} className="hover:scale-110 transition-transform" />
                  </button>
                )}
              </button>
            ))}
            
            {activeSliders.size > 0 && (
              <button
                onClick={() => {
                  Array.from(activeSliders).forEach(taste => onToggleSlider(taste));
                }}
                className="
                  py-3 px-3
                  rounded-full
                  border-2
                  bg-white
                  text-gray-400
                  border-gray-400
                  hover:text-gray-800
                  hover:bg-white
                  hover:border-gray-800
                  transition-colors
                  flex-shrink-0
                "
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="flex justify-center w-full px-2 md:px-8">
        <div className={`relative w-full transition-opacity duration-200 ${areAllSlidersDisabled ? 'opacity-30' : 'opacity-100'}`}>
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
            min="1"
            max="10"
            step="1"
            value={values[currentSlider]}
            onChange={handleSliderChange}
            className={`
              w-full h-3 rounded-full appearance-none cursor-pointer
              items-center
              transition-all duration-200
              border-0 border-gray-800
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-4
              [&::-moz-range-thumb]:h-4
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
    </div>
  );
};

export default CompactTasteSliders;