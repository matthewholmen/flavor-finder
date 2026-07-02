import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Copy, Check, ArrowUpRight } from 'lucide-react';
import { openExternal } from '../../utils/openExternal.ts';

// Curated, home-chef-friendly recipe sites searched via Google's site: filter
const RECIPE_SITES = [
  { name: 'AllRecipes', domain: 'allrecipes.com' },
  { name: 'Serious Eats', domain: 'seriouseats.com' },
  { name: 'NYT Cooking', domain: 'cooking.nytimes.com' },
  { name: 'Bon Appétit', domain: 'bonappetit.com' },
  { name: 'Food Network', domain: 'foodnetwork.com' },
  { name: 'BBC Good Food', domain: 'bbcgoodfood.com' },
  { name: 'Food52', domain: 'food52.com' },
  { name: 'Epicurious', domain: 'epicurious.com' },
  { name: 'Smitten Kitchen', domain: 'smittenkitchen.com' },
  { name: 'Budget Bytes', domain: 'budgetbytes.com' },
];

interface RecipeFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: string[];
}

export const RecipeFinderModal: React.FC<RecipeFinderModalProps> = ({
  isOpen,
  onClose,
  ingredients,
}) => {
  // Which ingredients to include in the search (all by default)
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  // When on, every selected ingredient is quoted so the search engine
  // treats it as required (rather than optionally dropping uncommon ones)
  const [requireAll, setRequireAll] = useState(true);

  // Reset selection whenever the modal opens with a new combination
  useEffect(() => {
    if (isOpen) {
      setExcluded(new Set());
      setCopied(false);
      setRequireAll(true);
    }
  }, [isOpen, ingredients.join(',')]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeIngredients = useMemo(
    () => ingredients.filter(ing => !excluded.has(ing)),
    [ingredients, excluded]
  );

  if (!isOpen) return null;

  const terms = requireAll
    ? activeIngredients.map(ing => `"${ing}"`).join(' ')
    : activeIngredients.join(' ');
  const query = `${terms} recipe`;

  const openSearch = (siteDomain?: string) => {
    if (activeIngredients.length === 0) return;
    const q = siteDomain ? `${query} site:${siteDomain}` : query;
    // Anchor-click helper (not window.open) — iOS standalone opens a blank sheet
    // for window.open with 'noopener'.
    openExternal(`https://www.google.com/search?q=${encodeURIComponent(q)}`);
    // Close so returning from the external search lands on the app, not this modal.
    onClose();
  };

  const toggleIngredient = (ing: string) => {
    setExcluded(prev => {
      const next = new Set(prev);
      if (next.has(ing)) {
        next.delete(ing);
      } else {
        next.add(ing);
      }
      return next;
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeIngredients.join(', ')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Find recipes"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-overlay-in"
        onClick={onClose}
      />

      {/* Panel: bottom sheet on mobile, centered card on desktop */}
      <div
        className="
          relative w-full sm:max-w-lg
          max-h-[85vh] overflow-y-auto
          bg-white dark:bg-gray-800
          rounded-t-3xl sm:rounded-3xl
          shadow-2xl
          p-6 sm:p-8
          animate-modal-in
        "
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4
            w-9 h-9 rounded-full
            flex items-center justify-center
            text-gray-400 hover:text-gray-600 hover:bg-gray-100
            dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700
            transition-colors
          "
          aria-label="Close"
        >
          <X size={20} strokeWidth={2} />
        </button>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 font-display tracking-tight">
          Find recipes
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Search with these ingredients — tap one to leave it out.
        </p>

        {/* Ingredient chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {ingredients.map(ing => {
            const isExcluded = excluded.has(ing);
            return (
              <button
                key={ing}
                onClick={() => toggleIngredient(ing)}
                aria-pressed={!isExcluded}
                className={`
                  px-3.5 py-1.5 rounded-full text-sm font-medium
                  border-2 transition-all duration-150
                  ${isExcluded
                    ? 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 line-through'
                    : 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  }
                `}
              >
                {ing}
              </button>
            );
          })}
        </div>

        {/* Require-all toggle */}
        <button
          onClick={() => setRequireAll(v => !v)}
          role="switch"
          aria-checked={requireAll}
          className="
            w-full mb-6
            flex items-center justify-between gap-3
            text-left
          "
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">
              Require every ingredient
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              Only show recipes that include all of them
            </span>
          </span>
          <span
            className={`
              relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200
              ${requireAll ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'}
            `}
          >
            <span
              className={`
                absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-gray-900 shadow
                transition-transform duration-200
                ${requireAll ? 'translate-x-[22px]' : 'translate-x-0.5'}
              `}
            />
          </span>
        </button>

        {/* Primary: search the whole web */}
        <button
          onClick={() => openSearch()}
          disabled={activeIngredients.length === 0}
          className="
            w-full mb-3
            flex items-center justify-center gap-2
            rounded-full py-3.5
            bg-gray-900 dark:bg-white
            text-white dark:text-gray-900
            font-semibold text-base
            hover:bg-gray-700 dark:hover:bg-gray-200
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <Search size={18} strokeWidth={2} />
          Search the web
        </button>

        {/* Copy ingredients */}
        <button
          onClick={handleCopy}
          disabled={activeIngredients.length === 0}
          className="
            w-full mb-6
            flex items-center justify-center gap-2
            rounded-full py-2.5
            border-2 border-gray-300 dark:border-gray-600
            text-gray-600 dark:text-gray-300
            font-medium text-sm
            hover:border-gray-400 dark:hover:border-gray-500
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        >
          {copied
            ? <><Check size={16} strokeWidth={2} className="text-green-600 dark:text-green-400" /> Copied!</>
            : <><Copy size={16} strokeWidth={2} /> Copy ingredient list</>}
        </button>

        {/* Curated sites */}
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
          Or search a favorite site
        </p>
        <div className="grid grid-cols-2 gap-2">
          {RECIPE_SITES.map(site => (
            <button
              key={site.domain}
              onClick={() => openSearch(site.domain)}
              disabled={activeIngredients.length === 0}
              className="
                flex items-center justify-between gap-1
                px-3.5 py-2.5 rounded-xl
                border border-gray-200 dark:border-gray-600
                text-sm font-medium text-gray-700 dark:text-gray-200
                hover:border-gray-400 dark:hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors text-left
              "
            >
              <span className="truncate">{site.name}</span>
              <ArrowUpRight size={14} strokeWidth={2} className="flex-shrink-0 text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecipeFinderModal;
