import React, { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useScreenSize } from '../../hooks/useScreenSize.ts';

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
  { key: 'alcohol-free', label: 'Alcohol-free' },
  { key: 'nut-free', label: 'Nut-free' },
  { key: 'nightshade-free', label: 'Nightshade-free' },
  { key: 'low-fodmap', label: 'Low-FODMAP' }
];

const COMPATIBILITY_MODES = [
  { key: 'perfect', label: 'Perfect', description: 'Generated pairings include only perfect matches — each ingredient is a recommended pairing for one another.' },
  { key: 'mixed', label: 'Mixed', description: 'Each ingredient pairs with at least one other ingredient in the set, allowing for more creative combinations.' },
  { key: 'random', label: 'Random', description: 'Completely random ingredients with no pairing requirements — for adventurous cooks!' }
];

// Helper to check dietary restriction state
const getDietaryState = (dietaryRestrictions, key) => {
  if (key === 'vegetarian') {
    return dietaryRestrictions['Proteins']?.['Meat'] &&
           dietaryRestrictions['Proteins']?.['Poultry'] &&
           dietaryRestrictions['Proteins']?.['Game'] &&
           dietaryRestrictions['Proteins']?.['Offal'] &&
           dietaryRestrictions['Proteins']?.['Fish'] &&
           dietaryRestrictions['Proteins']?.['Crustacean'] &&
           dietaryRestrictions['Proteins']?.['Mollusk'];
  }
  if (key === 'pescatarian') {
    return dietaryRestrictions['Proteins']?.['Meat'] &&
           dietaryRestrictions['Proteins']?.['Poultry'] &&
           dietaryRestrictions['Proteins']?.['Game'] &&
           dietaryRestrictions['Proteins']?.['Offal'];
  }
  if (key === 'gluten-free') {
    return dietaryRestrictions['Grains']?.['Pasta'] &&
           dietaryRestrictions['Grains']?.['Bread'];
  }
  if (key === 'dairy-free') {
    return dietaryRestrictions['Dairy']?.['Cultured Dairy'] &&
           dietaryRestrictions['Dairy']?.['Hard Cheese'] &&
           dietaryRestrictions['Dairy']?.['Soft Cheese'] &&
           dietaryRestrictions['Dairy']?.['Milk & Cream'];
  }
  if (key === 'alcohol-free') {
    return dietaryRestrictions['Alcohol']?.['Wines'] &&
           dietaryRestrictions['Alcohol']?.['Spirits'] &&
           dietaryRestrictions['Alcohol']?.['Liqueurs'];
  }
  if (key === 'nut-free') {
    return dietaryRestrictions['Seasonings']?.['Seeds & Botanicals'];
  }
  if (key === 'nightshade-free') {
    return dietaryRestrictions['Vegetables']?.['Fruit Vegetables'] &&
           dietaryRestrictions['Seasonings']?.['Chilis'];
  }
  if (key === 'low-fodmap') {
    return dietaryRestrictions['Vegetables']?.['Allium'];
  }
  return false;
};

// Helper to handle dietary toggle
const handleDietaryToggle = (dietaryRestrictions, onDietaryChange, key) => {
  const newRestrictions = { ...dietaryRestrictions };
  const isCurrentlyActive = getDietaryState(dietaryRestrictions, key);

  const setRestriction = (category, subcategory, value) => {
    if (!newRestrictions[category]) {
      newRestrictions[category] = {};
    }
    newRestrictions[category][subcategory] = value;
  };

  if (key === 'vegetarian') {
    const newValue = !isCurrentlyActive;
    setRestriction('Proteins', 'Meat', newValue);
    setRestriction('Proteins', 'Poultry', newValue);
    setRestriction('Proteins', 'Game', newValue);
    setRestriction('Proteins', 'Offal', newValue);
    setRestriction('Proteins', 'Fish', newValue);
    setRestriction('Proteins', 'Crustacean', newValue);
    setRestriction('Proteins', 'Mollusk', newValue);
  } else if (key === 'pescatarian') {
    const newValue = !isCurrentlyActive;
    setRestriction('Proteins', 'Meat', newValue);
    setRestriction('Proteins', 'Poultry', newValue);
    setRestriction('Proteins', 'Game', newValue);
    setRestriction('Proteins', 'Offal', newValue);
  } else if (key === 'gluten-free') {
    const newValue = !isCurrentlyActive;
    setRestriction('Grains', 'Pasta', newValue);
    setRestriction('Grains', 'Bread', newValue);
  } else if (key === 'dairy-free') {
    const newValue = !isCurrentlyActive;
    setRestriction('Dairy', 'Cultured Dairy', newValue);
    setRestriction('Dairy', 'Hard Cheese', newValue);
    setRestriction('Dairy', 'Soft Cheese', newValue);
    setRestriction('Dairy', 'Milk & Cream', newValue);
  } else if (key === 'alcohol-free') {
    const newValue = !isCurrentlyActive;
    setRestriction('Alcohol', 'Wines', newValue);
    setRestriction('Alcohol', 'Spirits', newValue);
    setRestriction('Alcohol', 'Liqueurs', newValue);
  } else if (key === 'nut-free') {
    const newValue = !isCurrentlyActive;
    setRestriction('Seasonings', 'Seeds & Botanicals', newValue);
  } else if (key === 'nightshade-free') {
    const newValue = !isCurrentlyActive;
    setRestriction('Vegetables', 'Fruit Vegetables', newValue);
    setRestriction('Seasonings', 'Chilis', newValue);
  } else if (key === 'low-fodmap') {
    const newValue = !isCurrentlyActive;
    setRestriction('Vegetables', 'Allium', newValue);
  }

  onDietaryChange(newRestrictions);
};

// Mobile Generation Options Component
const MobileGenerationOptions = ({
  dietaryRestrictions,
  onDietaryChange,
  compatibilityMode,
  onCompatibilityChange,
  activeGenerationTab,
  setActiveGenerationTab,
}) => {
  return (
    <div className="flex-1 px-4 py-2 overflow-y-auto">
      {/* Description text */}
      <p className="text-gray-700 text-sm leading-relaxed mb-6">
        Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidu.
      </p>

      {/* Generation Options Header */}
      <h2 className="text-gray-900 font-semibold text-lg mb-2">Generation Options</h2>

      {/* Dietary Section */}
      <h3 className="text-gray-700 font-medium text-base mb-3">Dietary</h3>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {DIETARY_TOGGLES.map((toggle) => {
          const isActive = getDietaryState(dietaryRestrictions, toggle.key);
          return (
            <button
              key={toggle.key}
              onClick={() => handleDietaryToggle(dietaryRestrictions, onDietaryChange, toggle.key)}
              className={`
                py-2.5 px-3 text-sm
                rounded-full border-2 font-medium
                transition-all
                ${isActive
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }
              `}
            >
              {toggle.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-4" />

      {/* Compatibility Section */}
      <h3 className="text-gray-700 font-medium text-base mb-3">Compatibility</h3>
      <div className="relative inline-grid grid-cols-3 bg-gray-100 rounded-full p-1 w-full mb-3">
        {/* Sliding background indicator */}
        <div
          className="absolute top-1 bottom-1 bg-gray-900 rounded-full transition-all duration-200 ease-out"
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
              relative z-10 py-2 px-3 text-sm font-medium text-center
              rounded-full transition-colors duration-200
              ${compatibilityMode === mode.key
                ? 'text-white'
                : 'text-gray-600 hover:text-gray-800'
              }
            `}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-500 leading-relaxed">
        {COMPATIBILITY_MODES.find(m => m.key === compatibilityMode)?.description}
      </p>
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
  const [activeGenerationTab, setActiveGenerationTab] = useState('dietary');

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
          bg-gray-100
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
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close sidebar"
            >
              <ChevronRight size={20} strokeWidth={1.5} className="text-gray-400" />
            </button>
          </div>

          {isMobile ? (
            /* Mobile: Generation Options */
            <MobileGenerationOptions
              dietaryRestrictions={dietaryRestrictions}
              onDietaryChange={onDietaryChange}
              compatibilityMode={compatibilityMode}
              onCompatibilityChange={onCompatibilityChange}
              activeGenerationTab={activeGenerationTab}
              setActiveGenerationTab={setActiveGenerationTab}
            />
          ) : (
            /* Desktop: Shortcuts */
            <>
              <div className="px-6 py-6">
                <h2 className="text-gray-400 font-medium text-lg mb-4">Shortcuts</h2>
                <ul className="space-y-2">
                  {shortcuts.map(({ key, action }) => (
                    <li key={key} className="flex items-baseline gap-2">
                      <span className="font-bold text-gray-700">{key}</span>
                      <span className="text-gray-400">—</span>
                      <span className="text-gray-600">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Settings link at bottom */}
              <div className="px-6 py-6">
                <button className="text-gray-300 font-medium text-lg hover:text-gray-500 transition-colors">
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
