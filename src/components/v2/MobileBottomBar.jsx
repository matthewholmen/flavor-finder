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
        bg-white
      "
    >
      {/* Five equal-width buttons */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200">
        {/* Undo Button */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`
            ${buttonBase}
            ${canUndo
              ? 'border-gray-300 text-gray-500 active:bg-gray-100'
              : 'border-gray-200 text-gray-200 cursor-not-allowed'
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
              ? 'border-gray-300 text-gray-500 active:bg-gray-100'
              : 'border-gray-200 text-gray-200 cursor-not-allowed'
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
            border-gray-900
            text-gray-900
            active:bg-gray-900 active:text-white
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
              ? 'border-gray-300 text-gray-500 active:bg-gray-100'
              : 'border-gray-200 text-gray-200 cursor-not-allowed'
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
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-300 text-gray-500 active:bg-gray-100'
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
