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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, []);

  const handleTasteToggle = (taste: keyof TasteValues) => {
    if (!isDragging) {
      onToggleSlider(taste);
      
      if (!activeSliders.has(taste)) {
        setCurrentSlider(taste);
      }
      
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
    <div className="space-y-2">
      {/* Wrap the buttons in a scrollable container */}
      <div className="relative">
      <div 
        ref={scrollContainerRef}
        className="flex items-center gap-3 overflow-x-auto whitespace-nowrap scrollbar-hide py-2 px-0.5"
      >
          {(Object.keys(values) as Array<keyof TasteValues>).map((taste) => (
            <button
              key={taste}
              className={`
                px-3 py-1.5 rounded-full font-sans text-sm
                flex items-center gap-1.5
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
              <X size={14} className="hover:scale-110 transition-transform" />
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
                py-2 px-2
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

        {/* Gradient fade */}
        <div 
          className="absolute right-0 top-0 h-full w-8 pointer-events-none"
          style={{
            background: 'linear-gradient(to left, white, transparent)'
          }}
        />
      </div>
      
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
          step=".1"
          value={values[currentSlider]}
          onChange={handleSliderChange}
          className={`
            w-full h-3 rounded-full appearance-none cursor-pointer
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
  );
};

export default CompactTasteSliders;