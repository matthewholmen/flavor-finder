import React, { useEffect, useMemo, useState } from 'react';
import { X, ChevronDown, RotateCcw, Check } from 'lucide-react';
import {
  DIETARY_PRESETS,
  isPresetActive,
  togglePreset,
} from '../../utils/dietaryPresets.ts';
import { categoryLabel } from '../../utils/categoryLabels.ts';

const CATEGORY_ORDER = [
  'Proteins',
  'Vegetables',
  'Fruits',
  'Dairy',
  'Seasonings',
  'Pantry',
  'Grains',
  'Alcohol',
];

interface IngredientFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  dietaryRestrictions: Record<string, boolean>;
  onDietaryChange: (restrictions: Record<string, boolean>) => void;
  ingredientProfiles: any[];
}

export const IngredientFiltersModal: React.FC<IngredientFiltersModalProps> = ({
  isOpen,
  onClose,
  dietaryRestrictions,
  onDietaryChange,
  ingredientProfiles,
}) => {
  const [expandedSubcats, setExpandedSubcats] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Group all ingredients: category -> subcategory -> ingredient names
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, string[]>>();
    ingredientProfiles.forEach(profile => {
      if (!profile.category || !profile.subcategory) return;
      if (!map.has(profile.category)) map.set(profile.category, new Map());
      const subMap = map.get(profile.category)!;
      if (!subMap.has(profile.subcategory)) subMap.set(profile.subcategory, []);
      subMap.get(profile.subcategory)!.push(profile.name);
    });
    map.forEach(subMap =>
      subMap.forEach(list => list.sort((a, b) => a.localeCompare(b)))
    );
    return map;
  }, [ingredientProfiles]);

  const orderedCategories = useMemo(() => {
    const cats = Array.from(grouped.keys());
    return cats.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [grouped]);

  const excludedCount = Object.values(dietaryRestrictions).filter(v => v === false).length;

  if (!isOpen) return null;

  const subcatKey = (category: string, subcategory: string) => `${category}:${subcategory}`;
  const isExcluded = (category: string, subcategory: string) =>
    dietaryRestrictions[subcatKey(category, subcategory)] === false;

  const toggleSubcategory = (category: string, subcategory: string) => {
    const key = subcatKey(category, subcategory);
    const next = { ...dietaryRestrictions };
    if (next[key] === false) {
      delete next[key];
    } else {
      next[key] = false;
    }
    onDietaryChange(next);
  };

  const toggleCategory = (category: string) => {
    const subcats = Array.from(grouped.get(category)?.keys() || []);
    const allExcluded = subcats.every(sub => isExcluded(category, sub));
    const next = { ...dietaryRestrictions };
    subcats.forEach(sub => {
      const key = subcatKey(category, sub);
      if (allExcluded) {
        delete next[key];
      } else {
        next[key] = false;
      }
    });
    onDietaryChange(next);
  };

  const resetAll = () => onDietaryChange({});

  const toggleExpanded = (key: string) => {
    setExpandedSubcats(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Ingredient filters"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="
          relative w-full sm:max-w-2xl
          h-[92vh] sm:h-auto sm:max-h-[85vh]
          flex flex-col
          bg-white dark:bg-gray-800
          rounded-t-3xl sm:rounded-3xl
          shadow-2xl
          overflow-hidden
        "
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 sm:px-8 border-b border-gray-100 dark:border-gray-700">
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

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            Ingredient filters
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Turn off anything you don't want in searches or generated combinations.
          </p>

          {/* Dietary presets */}
          <div className="flex flex-wrap gap-2">
            {DIETARY_PRESETS.map(preset => {
              const active = isPresetActive(dietaryRestrictions, preset);
              return (
                <button
                  key={preset.key}
                  onClick={() => onDietaryChange(togglePreset(dietaryRestrictions, preset))}
                  aria-pressed={active}
                  className={`
                    flex items-center gap-1.5
                    px-3 py-1.5 rounded-full text-sm font-medium
                    border-2 transition-all duration-150
                    ${active
                      ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                    }
                  `}
                >
                  {active && <Check size={14} strokeWidth={2.5} />}
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable category list */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-4">
          {orderedCategories.map(category => {
            const subMap = grouped.get(category)!;
            const subcats = Array.from(subMap.keys());
            const excludedSubcats = subcats.filter(sub => isExcluded(category, sub));
            const allExcluded = excludedSubcats.length === subcats.length;

            return (
              <div key={category} className="mb-5 last:mb-0">
                {/* Category header */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`
                    text-sm font-bold uppercase tracking-wide
                    ${allExcluded
                      ? 'text-gray-300 dark:text-gray-600 line-through'
                      : 'text-gray-700 dark:text-gray-200'}
                  `}>
                    {categoryLabel(category)}
                  </h3>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {allExcluded ? 'Include all' : 'Exclude all'}
                  </button>
                </div>

                {/* Subcategory rows */}
                <div className="space-y-1.5">
                  {subcats.map(sub => {
                    const key = subcatKey(category, sub);
                    const excluded = isExcluded(category, sub);
                    const ingredients = subMap.get(sub)!;
                    const expanded = expandedSubcats.has(key);

                    return (
                      <div
                        key={key}
                        className={`
                          rounded-xl border transition-colors
                          ${excluded
                            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                            : 'border-gray-200 dark:border-gray-600'}
                        `}
                      >
                        <div className="flex items-center gap-2 px-3 py-2">
                          {/* Include/exclude toggle */}
                          <button
                            onClick={() => toggleSubcategory(category, sub)}
                            role="switch"
                            aria-checked={!excluded}
                            aria-label={`${excluded ? 'Include' : 'Exclude'} ${sub}`}
                            className={`
                              relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200
                              ${excluded ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-900 dark:bg-gray-200'}
                            `}
                          >
                            <span
                              className={`
                                absolute left-0 top-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-900 shadow
                                transition-transform duration-200
                                ${excluded ? 'translate-x-0.5' : 'translate-x-[18px]'}
                              `}
                            />
                          </button>

                          {/* Name + count, click to expand */}
                          <button
                            onClick={() => toggleExpanded(key)}
                            className="flex-1 flex items-center justify-between gap-2 text-left min-w-0"
                            aria-expanded={expanded}
                          >
                            <span className={`
                              text-sm font-medium truncate
                              ${excluded
                                ? 'text-gray-400 dark:text-gray-500 line-through'
                                : 'text-gray-800 dark:text-gray-100'}
                            `}>
                              {sub}
                            </span>
                            <span className="flex items-center gap-1 flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                              {ingredients.length}
                              <ChevronDown
                                size={14}
                                strokeWidth={2}
                                className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                              />
                            </span>
                          </button>
                        </div>

                        {/* Expandable ingredient list */}
                        {expanded && (
                          <div className="px-3 pb-2.5 flex flex-wrap gap-1">
                            {ingredients.map(name => (
                              <span
                                key={name}
                                className={`
                                  px-2 py-0.5 rounded-full text-xs
                                  ${excluded
                                    ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 line-through'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}
                                `}
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 sm:px-8 py-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={resetAll}
            disabled={excludedCount === 0}
            className="
              flex items-center gap-1.5
              text-sm font-medium
              text-gray-500 dark:text-gray-400
              hover:text-gray-700 dark:hover:text-gray-200
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors
            "
          >
            <RotateCcw size={14} strokeWidth={2} />
            Reset all
          </button>
          <button
            onClick={onClose}
            className="
              px-5 py-2 rounded-full
              bg-gray-900 dark:bg-white
              text-white dark:text-gray-900
              text-sm font-semibold
              hover:bg-gray-700 dark:hover:bg-gray-200
              transition-colors
            "
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngredientFiltersModal;
