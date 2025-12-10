import React from 'react';
import { Minus, Plus, Globe } from 'lucide-react';
import { useScreenSize } from '../../hooks/useScreenSize.ts';

export const MinimalHeader = ({
  targetCount,
  currentCount,
  minTarget = 1,
  maxTarget = 5,
  canIncrement,
  canDecrement,
  onGenerate,
  onIncrementTarget,
  onDecrementTarget,
  onRecipesClick,
  isGeneratePulsing = false,
}) => {
  const { isMobile, width } = useScreenSize();
  
  // Compact mode for very small screens (< 375px)
  const isCompact = width < 375;
  // Extra small mode (hide +/- on extremely small screens)
  const isExtraSmall = width < 320;

  return (
    <header 
      className={`
        fixed top-0 left-0 right-0
        flex items-center justify-between
        bg-white
        z-50
        ${isMobile ? 'px-3 py-3' : 'px-8 py-5'}
        ${isCompact ? 'px-2 py-2' : ''}
      `}
    >
      {/* Logo */}
      <div className={`flex-shrink-0 ${isMobile ? 'w-12' : 'w-24'}`}>
        <img 
          src="/flavor-finder-1.png" 
          alt="ff" 
          className={`w-auto ${isMobile ? 'h-6' : 'h-8'}`}
          onError={(e) => {
            // Fallback to text logo if image fails
            e.currentTarget.style.display = 'none';
            const sibling = e.currentTarget.nextElementSibling;
            if (sibling) sibling.classList.remove('hidden');
          }}
        />
        <span 
          className={`hidden font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`} 
          style={{ color: '#FF91C3' }}
        >
          ff
        </span>
      </div>
      
      {/* Center Controls: -, Generate, + */}
      <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
        {/* Decrement Target Button - Hide on extra small screens */}
        {!isExtraSmall && (
          <button
            onClick={onDecrementTarget}
            disabled={!canDecrement}
            className={`
              flex items-center justify-center
              rounded-full
              border-2
              transition-all duration-200
              ${isMobile ? 'w-10 h-10 min-w-[44px] min-h-[44px]' : 'w-14 h-14'}
              ${isCompact ? 'w-9 h-9' : ''}
              ${canDecrement 
                ? 'border-gray-300 hover:border-gray-400 text-gray-500 active:bg-gray-100' 
                : 'border-gray-200 text-gray-200 cursor-not-allowed'
              }
            `}
            title="Remove last ingredient"
            aria-label="Remove last ingredient"
          >
            <Minus size={isMobile ? 18 : 20} strokeWidth={1.5} />
          </button>
        )}
        
        {/* Generate Button */}
        <button
          onClick={onGenerate}
          className={`
            rounded-full
            border-2 border-gray-900
            text-gray-900
            font-medium
            transition-all duration-200
            hover:bg-gray-900 hover:text-white
            active:bg-gray-800 active:text-white
            ${isMobile 
              ? 'px-5 py-2.5 text-base min-h-[44px]' 
              : 'px-10 py-3.5 text-lg'
            }
            ${isCompact ? 'px-4 py-2 text-sm' : ''}
            ${isGeneratePulsing ? 'animate-pulse shadow-lg scale-105' : ''}
          `}
        >
          Generate
        </button>
        
        {/* Increment Target Button - Hide on extra small screens */}
        {!isExtraSmall && (
          <button
            onClick={onIncrementTarget}
            disabled={!canIncrement}
            className={`
              flex items-center justify-center
              rounded-full
              border-2
              transition-all duration-200
              ${isMobile ? 'w-10 h-10 min-w-[44px] min-h-[44px]' : 'w-14 h-14'}
              ${isCompact ? 'w-9 h-9' : ''}
              ${canIncrement 
                ? 'border-gray-300 hover:border-gray-400 text-gray-500 active:bg-gray-100' 
                : 'border-gray-200 text-gray-200 cursor-not-allowed'
              }
            `}
            title="Add ingredient slot"
            aria-label="Add ingredient slot"
          >
            <Plus size={isMobile ? 18 : 20} strokeWidth={1.5} />
          </button>
        )}
      </div>
      
      {/* Recipes Link - Icon only on mobile */}
      <div className={`text-right ${isMobile ? 'w-12' : 'w-24'}`}>
        <button
          onClick={onRecipesClick}
          className={`
            text-gray-300
            font-medium
            hover:text-gray-500
            transition-colors duration-200
            ${isMobile ? 'p-2 min-w-[44px] min-h-[44px] flex items-center justify-center' : 'text-lg'}
          `}
          title="Find Recipes"
          aria-label="Find Recipes"
        >
          {isMobile ? (
            <Globe size={22} strokeWidth={1.5} />
          ) : (
            'Recipes'
          )}
        </button>
      </div>
    </header>
  );
};

export default MinimalHeader;
