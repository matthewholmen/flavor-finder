import React from 'react';
import { Minus, Plus, Search, Sparkles, Undo2 } from 'lucide-react';

export const MobileBottomBar = ({
  canIncrement,
  canDecrement,
  canUndo,
  onGenerate,
  onIncrementTarget,
  onDecrementTarget,
  onDrawerToggle,
  onUndo,
  isDrawerOpen,
  isGeneratePulsing = false,
}) => {
  const buttonBase = `
    flex items-center justify-center
    flex-1
    h-12
    rounded-full
    border-2
    transition-all duration-200
  `;

  return (
    <div
      className="
        fixed left-0 right-0 bottom-0 z-[60]
        bg-white dark:bg-gray-900
        transition-colors duration-300
      "
    >
      {/* Five equal-width buttons */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        {/* Undo Button */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`
            ${buttonBase}
            ${canUndo
              ? 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800'
              : 'border-gray-200 dark:border-gray-700 text-gray-200 dark:text-gray-700 cursor-not-allowed'
            }
          `}
          aria-label="Undo"
        >
          <Undo2 size={20} strokeWidth={1.5} />
        </button>

        {/* Decrement Button */}
        <button
          onClick={onDecrementTarget}
          disabled={!canDecrement}
          className={`
            ${buttonBase}
            ${canDecrement
              ? 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800'
              : 'border-gray-200 dark:border-gray-700 text-gray-200 dark:text-gray-700 cursor-not-allowed'
            }
          `}
          aria-label="Remove ingredient"
        >
          <Minus size={20} strokeWidth={1.5} />
        </button>

        {/* Generate Button (Sparkle) */}
        <button
          onClick={onGenerate}
          className={`
            ${buttonBase}
            border-gray-900 dark:border-white
            text-gray-900 dark:text-white
            active:bg-gray-900 dark:active:bg-white active:text-white dark:active:text-gray-900
            ${isGeneratePulsing ? 'animate-pulse shadow-lg scale-105' : ''}
          `}
          aria-label="Generate"
        >
          <Sparkles size={22} strokeWidth={1.5} />
        </button>

        {/* Increment Button */}
        <button
          onClick={onIncrementTarget}
          disabled={!canIncrement}
          className={`
            ${buttonBase}
            ${canIncrement
              ? 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800'
              : 'border-gray-200 dark:border-gray-700 text-gray-200 dark:text-gray-700 cursor-not-allowed'
            }
          `}
          aria-label="Add ingredient"
        >
          <Plus size={20} strokeWidth={1.5} />
        </button>

        {/* Search/Drawer Toggle Button */}
        <button
          onClick={onDrawerToggle}
          className={`
            ${buttonBase}
            ${isDrawerOpen
              ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800'
            }
          `}
          aria-label={isDrawerOpen ? "Close ingredient drawer" : "Search ingredients"}
        >
          <Search size={20} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

export default MobileBottomBar;
