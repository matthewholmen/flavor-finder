import React, { useState } from 'react';
import { Minus, Plus, ArrowUpRight, Bookmark, Sparkles, Share2, Check } from 'lucide-react';
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
  onSaveClick,
  onShareClick,
  isSaved = false,
  onLogoClick,
  isGeneratePulsing = false,
  isMobile: isMobileProp,
  // Landing state: the combo-only controls (Share/Save/Recipes, ±) act on a
  // combo that doesn't exist yet, so they vanish entirely — `invisible` keeps
  // the layout (Generate stays optically centered) while removing them from
  // clicks and the accessibility tree. Generate alone stays as a single dimmed
  // affordance; the logo stays bright.
  dimmed = false,
}) => {
  const { isMobile: isMobileHook, width } = useScreenSize();
  const isMobile = isMobileProp !== undefined ? isMobileProp : isMobileHook;
  const hideClass = dimmed ? 'invisible' : '';

  // Brief "Copied" confirmation after sharing the deep-link.
  const [shareCopied, setShareCopied] = useState(false);
  const handleShare = () => {
    onShareClick?.();
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

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
          pl-4 pr-6 py-5
          transition-colors duration-300
        `}
      >
        {/* Logo — opens the menu */}
        <button
          onClick={onLogoClick}
          className="flex items-center cursor-pointer bg-transparent border-none p-0 active:opacity-70 transition-opacity"
          aria-label="Open menu"
        >
          <img
            src="/mobile-logo.png"
            alt="Flavor Finder"
            className="w-auto h-6"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </button>

        {/* Right-side actions */}
        <div className={`flex items-center gap-2 ${hideClass}`}>
          {/* Share deep-link */}
          <button
            onClick={handleShare}
            className={`
              flex items-center justify-center
              w-10 h-10 rounded-full border-2
              transition-all duration-200 active:opacity-80
              ${shareCopied
                ? 'border-transparent text-green-600 dark:text-green-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
              }
            `}
            title="Copy a shareable link"
            aria-label={shareCopied ? 'Link copied' : 'Share'}
          >
            {shareCopied
              ? <Check size={18} strokeWidth={2.5} />
              : <Share2 size={18} strokeWidth={2.5} />}
          </button>

          {/* Save combination */}
          <button
            onClick={onSaveClick}
            className={`
              flex items-center justify-center
              w-10 h-10 rounded-full border-2
              transition-all duration-200 active:opacity-80
              ${isSaved
                ? 'border-transparent'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
              }
            `}
            style={isSaved ? { borderColor: '#F86A8A', color: '#F86A8A' } : undefined}
            title={isSaved ? 'Saved — tap to remove' : 'Save this combination'}
            aria-label={isSaved ? 'Saved' : 'Save combination'}
            aria-pressed={isSaved}
          >
            <Bookmark size={18} strokeWidth={2.5} className={isSaved ? 'fill-current' : ''} />
          </button>

          {/* Recipes CTA */}
          <button
            onClick={onRecipesClick}
            className="
              flex items-center gap-1
              px-4 py-2 rounded-full
              bg-gray-900 dark:bg-white
              text-white dark:text-gray-900
              font-semibold text-base
              active:opacity-80
              transition-all duration-200
            "
            title="Find recipes with these ingredients"
            aria-label="Find recipes"
          >
            <span className="whitespace-nowrap">Recipes</span>
            <ArrowUpRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </header>
    );
  }

  // Desktop: full header with controls.
  // Below lg the side columns size naturally (justify-between keeps Generate
  // roughly centered); at lg+ they get flex-1 so Generate is perfectly centered.
  // The symmetric flex-1 forces each side to the wider side's width, so applying
  // it only at lg keeps the tablet band (768–1023) from overflowing/wrapping.
  return (
    <header
      className="
        fixed top-0 left-0 right-0
        flex items-center justify-between
        bg-white dark:bg-gray-900
        z-50
        px-4 lg:px-8 py-5
        transition-colors duration-300
      "
    >
      {/* Logo — opens the menu */}
      <div className="lg:flex-1">
        <button
          onClick={onLogoClick}
          className="group flex items-center cursor-pointer bg-transparent border-none p-0"
          aria-label="Open menu"
          title="Menu — modes, presets, saved combinations"
        >
          <img
            src="/flavor-finder-HORIZONTAL-512.png"
            alt="Flavor Finder"
            className="w-auto h-6 transition-opacity duration-200 group-hover:opacity-80"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </button>
      </div>

      {/* Center Controls: -, Generate, + */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Decrement Target Button */}
        <button
          onClick={onDecrementTarget}
          disabled={!canDecrement}
          className={`
            flex items-center justify-center
            rounded-full
            border-2
            transition-all duration-200
            w-11 h-11 lg:w-14 lg:h-14
            ${hideClass}
            ${canDecrement
              ? 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800'
              : 'border-gray-200 dark:border-gray-700 text-gray-200 dark:text-gray-700 cursor-not-allowed'
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
          title="Find a new compatible combination — locked ingredients and slot roles stay put"
          aria-label="Generate a new combination"
          className={`
            inline-flex items-center gap-2
            rounded-full
            border-2 border-gray-900 dark:border-white
            text-gray-900 dark:text-white
            font-medium whitespace-nowrap
            transition-all duration-200
            hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-gray-900
            active:bg-gray-800 active:text-white dark:active:bg-gray-200 dark:active:text-gray-900
            px-6 lg:px-10 py-3 lg:py-3.5 text-base lg:text-lg
            ${isGeneratePulsing ? 'animate-pulse shadow-lg scale-105' : ''}
            ${dimmed ? 'opacity-40 pointer-events-none' : ''}
          `}
        >
          <Sparkles size={18} strokeWidth={2} />
          Generate
          {/* Quiet shortcut hint — border-current keeps it legible when the
              button inverts on hover. */}
          <kbd className="hidden xl:inline-block ml-1 px-1.5 py-0.5 rounded-md border border-current text-[10px] font-sans font-semibold uppercase tracking-wider opacity-40">
            space
          </kbd>
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
            w-11 h-11 lg:w-14 lg:h-14
            ${hideClass}
            ${canIncrement
              ? 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800'
              : 'border-gray-200 dark:border-gray-700 text-gray-200 dark:text-gray-700 cursor-not-allowed'
            }
          `}
          title="Add ingredient slot"
          aria-label="Add ingredient slot"
        >
          <Plus size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* Right-side actions */}
      <div className={`lg:flex-1 flex justify-end items-center gap-2 lg:gap-3 ${hideClass}`}>
        {/* Share deep-link */}
        <button
          onClick={handleShare}
          className={`
            flex items-center justify-center
            w-11 h-11 lg:w-12 lg:h-12 rounded-full border-2
            transition-all duration-200
            ${shareCopied
              ? 'border-transparent text-green-600 dark:text-green-400'
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
            }
          `}
          title="Copy a shareable link"
          aria-label={shareCopied ? 'Link copied' : 'Share'}
        >
          {shareCopied
            ? <Check size={20} strokeWidth={2.5} />
            : <Share2 size={20} strokeWidth={2.5} />}
        </button>

        {/* Save combination */}
        <button
          onClick={onSaveClick}
          className={`
            flex items-center gap-1.5
            px-3.5 lg:px-5 py-2 lg:py-2.5 rounded-full border-2
            font-semibold text-base whitespace-nowrap
            transition-all duration-200
            ${isSaved
              ? ''
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
            }
          `}
          style={isSaved ? { borderColor: '#F86A8A', color: '#F86A8A' } : undefined}
          title={isSaved ? 'Saved — click to remove' : 'Save this combination'}
          aria-label={isSaved ? 'Saved' : 'Save combination'}
          aria-pressed={isSaved}
        >
          <Bookmark size={18} strokeWidth={2.5} className={isSaved ? 'fill-current' : ''} />
          {isSaved ? 'Saved' : 'Save'}
        </button>

        {/* Recipes CTA */}
        <button
          onClick={onRecipesClick}
          className="
            flex items-center gap-1.5
            px-3.5 lg:px-5 py-2 lg:py-2.5 rounded-full
            bg-gray-900 dark:bg-white
            text-white dark:text-gray-900
            font-semibold text-base whitespace-nowrap
            hover:bg-gray-700 dark:hover:bg-gray-200
            transition-all duration-200
          "
          title="Find recipes with these ingredients"
          aria-label="Find recipes"
        >
          {/* Shorten to "Recipes" in the tighter tablet band. */}
          <span className="lg:hidden">Recipes</span>
          <span className="hidden lg:inline">Find recipes</span>
          <ArrowUpRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </header>
  );
};

export default MinimalHeader;
