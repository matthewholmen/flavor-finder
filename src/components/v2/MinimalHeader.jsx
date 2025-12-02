import React from 'react';
import { Minus, Plus } from 'lucide-react';

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

  return (
    <header 
      className="
        fixed top-0 left-0 right-0
        flex items-center justify-between
        px-8 py-5
        bg-white
        z-50
      "
    >
      {/* Logo */}
      <div className="flex-shrink-0 w-24">
        <img 
          src="/flavor-finder-1.png" 
          alt="ff" 
          className="h-8 w-auto"
          onError={(e) => {
            // Fallback to text logo if image fails
            e.currentTarget.style.display = 'none';
            const sibling = e.currentTarget.nextElementSibling;
            if (sibling) sibling.classList.remove('hidden');
          }}
        />
        <span className="hidden text-2xl font-bold" style={{ color: '#FF91C3' }}>ff</span>
      </div>
      
      {/* Center Controls: -, Generate, + */}
      <div className="flex items-center gap-3">
        {/* Decrement Target Button */}
        <button
          onClick={onDecrementTarget}
          disabled={!canDecrement}
          className={`
            w-14 h-14
            flex items-center justify-center
            rounded-full
            border-2
            transition-all duration-200
            ${canDecrement 
              ? 'border-gray-300 hover:border-gray-400 text-gray-500' 
              : 'border-gray-200 text-gray-200 cursor-not-allowed'
            }
          `}
          title="Remove last ingredient"
          aria-label="Remove last ingredient"
        >
          <Minus size={20} strokeWidth={1.5} />
        </button>
        
        {/* Generate Button */}
        <button
          onClick={onGenerate}
          className={`
            px-10 py-3.5
            rounded-full
            border-2 border-gray-900
            text-gray-900
            font-medium
            text-lg
            transition-all duration-200
            hover:bg-gray-900 hover:text-white
            ${isGeneratePulsing ? 'animate-pulse shadow-lg scale-105' : ''}
          `}
        >
          Generate
        </button>
        
        {/* Increment Target Button */}
        <button
          onClick={onIncrementTarget}
          disabled={!canIncrement}
          className={`
            w-14 h-14
            flex items-center justify-center
            rounded-full
            border-2
            transition-all duration-200
            ${canIncrement 
              ? 'border-gray-300 hover:border-gray-400 text-gray-500' 
              : 'border-gray-200 text-gray-200 cursor-not-allowed'
            }
          `}
          title="Add ingredient slot"
          aria-label="Add ingredient slot"
        >
          <Plus size={20} strokeWidth={1.5} />
        </button>
      </div>
      
      {/* Recipes Link */}
      <div className="w-24 text-right">
        <button
          onClick={onRecipesClick}
          className="
            text-gray-300
            font-medium
            text-lg
            hover:text-gray-500
            transition-colors duration-200
          "
        >
          Recipes
        </button>
      </div>
    </header>
  );
};

export default MinimalHeader;
