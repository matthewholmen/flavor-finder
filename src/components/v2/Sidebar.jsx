import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Moon, Sun } from 'lucide-react';
import { useScreenSize } from '../../hooks/useScreenSize.ts';
import { useTheme } from '../../contexts/ThemeContext';

const shortcuts = [
  { key: 'space', action: 'generate' },
  { key: 'enter', action: 'search' },
  { key: '+', action: 'add ingredient' },
  { key: '-', action: 'remove ingredient' },
  { key: 'delete', action: 'delete last ingr.' },
  { key: 'z', action: 'undo' },
];

const DIETARY_TOGGLES = [
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'pescatarian', label: 'Pescatarian' },
  { key: 'gluten-free', label: 'Gluten-free' },
  { key: 'dairy-free', label: 'Dairy-free' },
  { key: 'alcohol-free', label: 'Alc-free' },
  { key: 'nut-free', label: 'Nut-free' }
];

const COMPATIBILITY_MODES = [
  { key: 'perfect', label: 'Perfect', description: 'Generated pairings include only perfect matches — each ingredient is a recommended pairing for one another.' },
  { key: 'mixed', label: 'Mixed', description: 'Each ingredient pairs with at least one other ingredient in the set, allowing for more creative combinations.' },
  { key: 'random', label: 'Random', description: 'Completely random ingredients with no pairing requirements — for adventurous cooks!' }
];

// Helper to check dietary restriction state
// Uses flat format: 'Category:Subcategory' = false (false means excluded)
const getDietaryState = (dietaryRestrictions, key) => {
  if (key === 'vegetarian') {
    return dietaryRestrictions['Proteins:Meat'] === false &&
           dietaryRestrictions['Proteins:Poultry'] === false &&
           dietaryRestrictions['Proteins:Game'] === false &&
           dietaryRestrictions['Proteins:Pork'] === false &&
           dietaryRestrictions['Proteins:Offal'] === false &&
           dietaryRestrictions['Proteins:Fish'] === false &&
           dietaryRestrictions['Proteins:Crustacean'] === false &&
           dietaryRestrictions['Proteins:Mollusk'] === false;
  }
  if (key === 'pescatarian') {
    return dietaryRestrictions['Proteins:Meat'] === false &&
           dietaryRestrictions['Proteins:Poultry'] === false &&
           dietaryRestrictions['Proteins:Game'] === false &&
           dietaryRestrictions['Proteins:Pork'] === false &&
           dietaryRestrictions['Proteins:Offal'] === false;
  }
  if (key === 'gluten-free') {
    return dietaryRestrictions['Grains:Pasta'] === false &&
           dietaryRestrictions['Grains:Bread'] === false;
  }
  if (key === 'dairy-free') {
    return dietaryRestrictions['Dairy:Cultured Dairy'] === false &&
           dietaryRestrictions['Dairy:Hard Cheese'] === false &&
           dietaryRestrictions['Dairy:Soft Cheese'] === false &&
           dietaryRestrictions['Dairy:Milk & Cream'] === false;
  }
  if (key === 'alcohol-free') {
    return dietaryRestrictions['Alcohol:Wines'] === false &&
           dietaryRestrictions['Alcohol:Spirits'] === false &&
           dietaryRestrictions['Alcohol:Liqueurs'] === false;
  }
  if (key === 'nut-free') {
    return dietaryRestrictions['_nuts'] === false;
  }
  if (key === 'nightshade-free') {
    return dietaryRestrictions['_nightshades'] === false;
  }
  if (key === 'low-fodmap') {
    return dietaryRestrictions['_fodmap'] === false;
  }
  return false;
};

// Helper to handle dietary toggle
// Uses flat format: 'Category:Subcategory' = false (false means excluded)
const handleDietaryToggle = (dietaryRestrictions, onDietaryChange, key) => {
  const newRestrictions = { ...dietaryRestrictions };
  const isCurrentlyActive = getDietaryState(dietaryRestrictions, key);

  // When toggling ON (activating restriction), set to false (excluded)
  // When toggling OFF (deactivating), delete the key
  const setRestriction = (restrictionKey, shouldExclude) => {
    if (shouldExclude) {
      newRestrictions[restrictionKey] = false;
    } else {
      delete newRestrictions[restrictionKey];
    }
  };

  const shouldExclude = !isCurrentlyActive;

  if (key === 'vegetarian') {
    setRestriction('Proteins:Meat', shouldExclude);
    setRestriction('Proteins:Poultry', shouldExclude);
    setRestriction('Proteins:Game', shouldExclude);
    setRestriction('Proteins:Pork', shouldExclude);
    setRestriction('Proteins:Offal', shouldExclude);
    setRestriction('Proteins:Fish', shouldExclude);
    setRestriction('Proteins:Crustacean', shouldExclude);
    setRestriction('Proteins:Mollusk', shouldExclude);
  } else if (key === 'pescatarian') {
    setRestriction('Proteins:Meat', shouldExclude);
    setRestriction('Proteins:Poultry', shouldExclude);
    setRestriction('Proteins:Game', shouldExclude);
    setRestriction('Proteins:Pork', shouldExclude);
    setRestriction('Proteins:Offal', shouldExclude);
  } else if (key === 'gluten-free') {
    setRestriction('Grains:Pasta', shouldExclude);
    setRestriction('Grains:Bread', shouldExclude);
  } else if (key === 'dairy-free') {
    setRestriction('Dairy:Cultured Dairy', shouldExclude);
    setRestriction('Dairy:Hard Cheese', shouldExclude);
    setRestriction('Dairy:Soft Cheese', shouldExclude);
    setRestriction('Dairy:Milk & Cream', shouldExclude);
  } else if (key === 'alcohol-free') {
    setRestriction('Alcohol:Wines', shouldExclude);
    setRestriction('Alcohol:Spirits', shouldExclude);
    setRestriction('Alcohol:Liqueurs', shouldExclude);
  } else if (key === 'nut-free') {
    setRestriction('_nuts', shouldExclude);
  } else if (key === 'nightshade-free') {
    setRestriction('_nightshades', shouldExclude);
  } else if (key === 'low-fodmap') {
    setRestriction('_fodmap', shouldExclude);
  }

  onDietaryChange(newRestrictions);
};

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

// Mobile Generation Options Content
const GenerationOptionsContent = ({
  dietaryRestrictions,
  onDietaryChange,
  compatibilityMode,
  onCompatibilityChange,
}) => {
  return (
    <>
      {/* Dietary Section */}
      <h3 className="text-gray-700 dark:text-gray-300 font-medium text-sm mb-3">Dietary</h3>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {DIETARY_TOGGLES.map((toggle) => {
          const isActive = getDietaryState(dietaryRestrictions, toggle.key);
          return (
            <button
              key={toggle.key}
              onClick={() => handleDietaryToggle(dietaryRestrictions, onDietaryChange, toggle.key)}
              className={`
                py-2 px-3 text-sm
                rounded-full border-2 font-medium
                transition-all
                ${isActive
                  ? 'border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }
              `}
            >
              {toggle.label}
            </button>
          );
        })}
      </div>

      {/* Compatibility Section */}
      <h3 className="text-gray-700 dark:text-gray-300 font-medium text-sm mb-3 mt-4">Compatibility</h3>
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

// Settings Content
const SettingsContent = () => {
  const { isDarkMode, toggleDarkMode, isHighContrast, toggleHighContrast } = useTheme();

  return (
    <div className="space-y-4">
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

// Mobile Sidebar Content with Collapsible Sections
const MobileSidebarContent = ({
  dietaryRestrictions,
  onDietaryChange,
  compatibilityMode,
  onCompatibilityChange,
}) => {
  const [openSections, setOpenSections] = useState({ generation: true, settings: false });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Description text */}
      <p className="text-gray-700 dark:text-gray-400 text-sm leading-relaxed px-4 py-3">
        Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidu.
      </p>

      {/* Collapsible Sections */}
      <CollapsibleSection
        title="Generation Options"
        isOpen={openSections.generation}
        onToggle={() => toggleSection('generation')}
      >
        <GenerationOptionsContent
          dietaryRestrictions={dietaryRestrictions}
          onDietaryChange={onDietaryChange}
          compatibilityMode={compatibilityMode}
          onCompatibilityChange={onCompatibilityChange}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Settings"
        isOpen={openSections.settings}
        onToggle={() => toggleSection('settings')}
      >
        <SettingsContent />
      </CollapsibleSection>
    </div>
  );
};

export const Sidebar = ({
  isOpen,
  onClose,
  // Generation options props (for mobile)
  dietaryRestrictions = {},
  onDietaryChange = () => {},
  compatibilityMode = 'perfect',
  onCompatibilityChange = () => {},
}) => {
  const { isMobile } = useScreenSize();

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
          ${isMobile ? 'w-64' : 'w-80'}
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

          {isMobile ? (
            /* Mobile: Collapsible Sections */
            <MobileSidebarContent
              dietaryRestrictions={dietaryRestrictions}
              onDietaryChange={onDietaryChange}
              compatibilityMode={compatibilityMode}
              onCompatibilityChange={onCompatibilityChange}
            />
          ) : (
            /* Desktop: Shortcuts */
            <>
              <div className="px-6 py-6">
                <h2 className="text-gray-400 dark:text-gray-500 font-medium text-lg mb-4">Shortcuts</h2>
                <ul className="space-y-2">
                  {shortcuts.map(({ key, action }) => (
                    <li key={key} className="flex items-baseline gap-2">
                      <span className="font-bold text-gray-700 dark:text-gray-300">{key}</span>
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                      <span className="text-gray-600 dark:text-gray-400">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Settings link at bottom */}
              <div className="px-6 py-6">
                <button className="text-gray-300 dark:text-gray-600 font-medium text-lg hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
                  Settings
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
