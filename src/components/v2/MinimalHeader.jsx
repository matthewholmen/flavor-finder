import React from 'react';
import { Minus, Plus } from 'lucide-react';
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
  onLogoClick,
  isGeneratePulsing = false,
  isMobile: isMobileProp,
}) => {
  const { isMobile: isMobileHook, width } = useScreenSize();
  const isMobile = isMobileProp !== undefined ? isMobileProp : isMobileHook;

  // Compact mode for very small screens (< 375px)
  const isCompact = width < 375;
  // Extra small mode (hide +/- on extremely small screens)
  const isExtraSmall = width < 320;

  // Mobile: simplified header with just logo and recipes
  if (isMobile) {
    return (
      <header
        className={`
          fixed top-0 left-0 right-0
          flex items-center justify-between
          bg-white dark:bg-gray-900
          z-50
          px-4 py-3
          transition-colors duration-300
        `}
      >
        {/* Logo */}
        <button
          onClick={onLogoClick}
          className="relative group cursor-pointer bg-transparent border-none p-0"
          aria-label="Open menu"
        >
          <img
            src="/mobile-logo.png"
            alt="Flavor Finder"
            className="w-auto h-6 transition-opacity duration-200 group-active:opacity-70"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </button>

        {/* Recipes Link */}
        <button
          onClick={onRecipesClick}
          className="
            text-gray-300
            font-medium
            active:text-gray-500
            transition-colors duration-200
            text-lg
          "
          title="Find Recipes"
          aria-label="Find Recipes"
        >
          Recipes
        </button>
      </header>
    );
  }

  // Desktop: full header with controls
  return (
    <header
      className="
        fixed top-0 left-0 right-0
        flex items-center justify-between
        bg-white dark:bg-gray-900
        z-50
        px-8 py-5
        transition-colors duration-300
      "
    >
      {/* Logo */}
      <div className="flex-shrink-0 w-24">
        <button
          onClick={onLogoClick}
          className="relative group cursor-pointer bg-transparent border-none p-0"
          aria-label="Open menu"
        >
          <img
            src="/flavor-finder-1.png"
            alt="ff"
            className="w-auto h-8 transition-opacity duration-200 group-hover:opacity-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const sibling = e.currentTarget.parentElement?.querySelector('.logo-hover');
              if (sibling) sibling.classList.add('hidden');
              const textFallback = e.currentTarget.parentElement?.nextElementSibling;
              if (textFallback) textFallback.classList.remove('hidden');
            }}
          />
          <img
            src="/flavor-finder-1-hover.png"
            alt="ff"
            className="logo-hover absolute top-0 left-0 w-auto h-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          />
        </button>
        <span
          className="hidden font-bold text-2xl"
          style={{ color: '#F86A8A' }}
        >
          ff
        </span>
      </div>

      {/* Center Controls: -, Generate, + */}
      <div className="flex items-center gap-3">
        {/* Decrement Target Button */}
        <button
          onClick={onDecrementTarget}
          disabled={!canDecrement}
          className={`
            flex items-center justify-center
            rounded-full
            border-2
            transition-all duration-200
            w-14 h-14
            ${canDecrement
              ? 'border-gray-300 hover:border-gray-400 text-gray-500 active:bg-gray-100'
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
            rounded-full
            border-2 border-gray-900
            text-gray-900
            font-medium
            transition-all duration-200
            hover:bg-gray-900 hover:text-white
            active:bg-gray-800 active:text-white
            px-10 py-3.5 text-lg
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
            flex items-center justify-center
            rounded-full
            border-2
            transition-all duration-200
            w-14 h-14
            ${canIncrement
              ? 'border-gray-300 hover:border-gray-400 text-gray-500 active:bg-gray-100'
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
      <div className="text-right w-24">
        <button
          onClick={onRecipesClick}
          className="
            text-gray-300
            font-medium
            hover:text-gray-500
            transition-colors duration-200
            text-lg
          "
          title="Find Recipes"
          aria-label="Find Recipes"
        >
          Recipes
        </button>
      </div>
    </header>
  );
};

export default MinimalHeader;
