import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Moon, Sun, SlidersHorizontal } from 'lucide-react';
import { useScreenSize } from '../../hooks/useScreenSize.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';

const shortcuts = [
  { key: 'space', action: 'generate' },
  { key: 'enter', action: 'search' },
  { key: '+', action: 'add ingredient' },
  { key: '-', action: 'remove ingredient' },
  { key: 'delete', action: 'delete last ingr.' },
  { key: 'z', action: 'undo' },
];

const COMPATIBILITY_MODES = [
  { key: 'perfect', label: 'Perfect', description: 'Generated pairings include only perfect matches — each ingredient is a recommended pairing for one another.' },
  { key: 'mixed', label: 'Mixed', description: 'Each ingredient pairs with at least one other ingredient in the set, allowing for more creative combinations.' },
  { key: 'random', label: 'Random', description: 'Completely random ingredients with no pairing requirements — for adventurous cooks!' }
];

// Collapsible Section Component
const CollapsibleSection = ({ title, isOpen, onToggle, children }) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 px-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="text-gray-900 dark:text-gray-100 font-semibold text-base">{title}</span>
        <ChevronDown
          size={20}
          strokeWidth={1.5}
          className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// Generation Options Content (shared between mobile and desktop)
const GenerationOptionsContent = ({
  compatibilityMode,
  onCompatibilityChange,
}) => {
  return (
    <>
      {/* Compatibility Section */}
      <h3 className="text-gray-700 dark:text-gray-300 font-medium text-sm mb-3">Compatibility</h3>
      <div className="relative inline-grid grid-cols-3 bg-gray-200 dark:bg-gray-700 rounded-full p-1 w-full mb-2">
        {/* Sliding background indicator */}
        <div
          className="absolute top-1 bottom-1 bg-gray-900 dark:bg-gray-100 rounded-full transition-all duration-200 ease-out"
          style={{
            width: 'calc(33.333% - 2px)',
            left: `calc(${COMPATIBILITY_MODES.findIndex(m => m.key === compatibilityMode) * 33.333}% + 1px)`,
          }}
        />
        {COMPATIBILITY_MODES.map((mode) => (
          <button
            key={mode.key}
            onClick={() => onCompatibilityChange(mode.key)}
            className={`
              relative z-10 py-1.5 px-2 text-xs font-medium text-center
              rounded-full transition-colors duration-200
              ${compatibilityMode === mode.key
                ? 'text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
              }
            `}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        {COMPATIBILITY_MODES.find(m => m.key === compatibilityMode)?.description}
      </p>
    </>
  );
};

// Bottom Settings Toggles (shared)
const BottomSettingsToggles = () => {
  const { isDarkMode, toggleDarkMode, isHighContrast, toggleHighContrast } = useTheme();

  return (
    <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
      {/* Dark Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDarkMode ? (
            <Moon size={18} className="text-gray-600 dark:text-gray-300" />
          ) : (
            <Sun size={18} className="text-gray-600 dark:text-gray-300" />
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</span>
        </div>
        <button
          onClick={toggleDarkMode}
          className={`
            relative w-11 h-6 rounded-full transition-colors duration-200
            ${isDarkMode ? 'bg-gray-900' : 'bg-gray-300'}
          `}
        >
          <div
            className={`
              absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200
              ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* High Contrast Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700 dark:text-gray-300">High Contrast</span>
        <button
          onClick={toggleHighContrast}
          className={`
            relative w-11 h-6 rounded-full transition-colors duration-200
            ${isHighContrast ? 'bg-gray-900' : 'bg-gray-300'}
          `}
        >
          <div
            className={`
              absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200
              ${isHighContrast ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
    </div>
  );
};

export const Sidebar = ({
  isOpen,
  onClose,
  dietaryRestrictions = {},
  onDietaryChange = () => {},
  compatibilityMode = 'perfect',
  onCompatibilityChange = () => {},
  onOpenIngredientFilters = () => {},
}) => {
  const { isMobile } = useScreenSize();
  const [openSections, setOpenSections] = useState({ generation: true });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/20
          transition-opacity duration-300
          z-[60]
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <aside
        className={`
          fixed top-0 left-0 h-full
          bg-gray-100 dark:bg-gray-800
          shadow-lg
          z-[61]
          transition-transform duration-300 ease-in-out
          ${isMobile ? 'w-72' : 'w-80'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center justify-between ${isMobile ? 'px-4 py-3' : 'px-6 py-5'}`}>
            <div className="relative group cursor-pointer" onClick={onClose}>
              <img
                src="/flavor-finder-1.png"
                alt="ff"
                className={`w-auto ${isMobile ? 'h-6' : 'h-8'} transition-opacity duration-200 group-hover:opacity-0`}
              />
              <img
                src="/flavor-finder-1-hover.png"
                alt="ff"
                className={`absolute top-0 left-0 w-auto ${isMobile ? 'h-6' : 'h-8'} opacity-0 transition-opacity duration-200 group-hover:opacity-100`}
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close sidebar"
            >
              <ChevronRight size={20} strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Description */}
            <p className="text-gray-700 dark:text-gray-400 text-sm leading-relaxed px-4 py-3">
              Mix and match ingredients that taste great together, then jump
              straight to recipes for your combination.
            </p>

            {/* Generation Options */}
            <CollapsibleSection
              title="Generation Options"
              isOpen={openSections.generation}
              onToggle={() => toggleSection('generation')}
            >
              <GenerationOptionsContent
                compatibilityMode={compatibilityMode}
                onCompatibilityChange={onCompatibilityChange}
              />
            </CollapsibleSection>

            {/* Ingredient Filters */}
            <button
              onClick={() => {
                onClose();
                onOpenIngredientFilters();
              }}
              className="w-full flex items-center justify-between py-3 px-4 text-left border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold text-base">
                <SlidersHorizontal size={16} strokeWidth={2} className="text-gray-500 dark:text-gray-400" />
                Ingredient Filters
              </span>
              <ChevronRight size={20} strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />
            </button>

            {/* Keyboard shortcuts - desktop only */}
            {!isMobile && (
              <div className="px-4 py-4">
                <h3 className="text-gray-400 dark:text-gray-500 font-medium text-sm mb-3">Shortcuts</h3>
                <ul className="space-y-1.5">
                  {shortcuts.map(({ key, action }) => (
                    <li key={key} className="flex items-baseline gap-2 text-sm">
                      <span className="font-bold text-gray-700 dark:text-gray-300">{key}</span>
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                      <span className="text-gray-600 dark:text-gray-400">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Spacer to push settings to bottom */}
            <div className="flex-1" />

            {/* Settings toggles at bottom */}
            <BottomSettingsToggles />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
