import React from 'react';
import { DietarySectionProps } from './types.ts';

// Common dietary restrictions for quick access
const QUICK_DIETARY_TOGGLES = [
  { key: 'vegetarian', label: 'Vegetarian', description: 'Exclude meat and poultry' },
  { key: 'pescatarian', label: 'Pescatarian', description: 'Exclude meat, allow fish' },
  { key: 'gluten-free', label: 'Gluten-free', description: 'Exclude gluten-containing grains' },
  { key: 'dairy-free', label: 'Dairy-free', description: 'Exclude all dairy products' }
];

const DietarySection: React.FC<DietarySectionProps> = ({
  restrictions,
  onChange,
  quickToggles = QUICK_DIETARY_TOGGLES.map(t => t.key)
}) => {
  const handleQuickToggle = (restrictionKey: string) => {
    let newRestrictions = { ...restrictions };

    // Helper: set restriction to false (excluded) or delete key (allowed)
    const setRestriction = (key: string, shouldExclude: boolean) => {
      if (shouldExclude) {
        newRestrictions[key] = false;
      } else {
        delete newRestrictions[key];
      }
    };

    const isActive = getToggleState(restrictionKey);
    const shouldExclude = !isActive;

    switch(restrictionKey) {
      case 'vegetarian':
        setRestriction('Proteins:Meat', shouldExclude);
        setRestriction('Proteins:Poultry', shouldExclude);
        setRestriction('Proteins:Seafood', shouldExclude);
        break;
      case 'pescatarian':
        setRestriction('Proteins:Meat', shouldExclude);
        setRestriction('Proteins:Poultry', shouldExclude);
        if (shouldExclude) {
          // Ensure seafood is allowed when turning on pescatarian
          delete newRestrictions['Proteins:Seafood'];
        }
        break;
      case 'gluten-free':
        setRestriction('Grains:Bread', shouldExclude);
        setRestriction('Grains:Pasta', shouldExclude);
        break;
      case 'dairy-free':
        setRestriction('Dairy:Cheese', shouldExclude);
        setRestriction('Dairy:Cultured', shouldExclude);
        setRestriction('Dairy:Milk & Cream', shouldExclude);
        break;
      default:
        newRestrictions[restrictionKey] = !restrictions[restrictionKey];
    }

    onChange(newRestrictions);
  };

  const getToggleState = (restrictionKey: string) => {
    // For special dietary keys, check if ALL relevant categories are disabled
    switch(restrictionKey) {
      case 'vegetarian':
        return restrictions['Proteins:Meat'] === false &&
               restrictions['Proteins:Poultry'] === false &&
               restrictions['Proteins:Seafood'] === false;
      case 'pescatarian':
        // Pescatarian: land meats excluded, seafood allowed
        return restrictions['Proteins:Meat'] === false &&
               restrictions['Proteins:Poultry'] === false &&
               restrictions['Proteins:Seafood'] !== false;
      case 'gluten-free':
        return restrictions['Grains:Bread'] === false &&
               restrictions['Grains:Pasta'] === false;
      case 'dairy-free':
        return restrictions['Dairy:Cheese'] === false &&
               restrictions['Dairy:Cultured'] === false &&
               restrictions['Dairy:Milk & Cream'] === false;
      default:
        return restrictions[restrictionKey] === false;
    }
  };

  const getActiveRestrictionsCount = () => {
    // Count how many of our quick toggles are active
    return QUICK_DIETARY_TOGGLES.filter(toggle => getToggleState(toggle.key)).length;
  };

  const handleClearAll = () => {
    // Reset all restrictions to enabled (true)
    const clearedRestrictions = Object.keys(restrictions).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    onChange(clearedRestrictions);
  };

  const activeCount = getActiveRestrictionsCount();

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-gray-900">Dietary</h3>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              onClick={handleClearAll}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Quick Dietary Toggles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {QUICK_DIETARY_TOGGLES.map((toggle) => {
          const isActive = getToggleState(toggle.key);
          return (
            <button
              key={toggle.key}
              onClick={() => handleQuickToggle(toggle.key)}
              className={
                'py-3 px-4 text-base rounded-full border-2 transition-all duration-200 text-center font-medium capitalize hover:shadow-sm ' +
                (isActive
                  ? 'border-[#6AAFE8] bg-[#6AAFE8] text-white'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500 hover:bg-gray-50')
              }
              title={toggle.description}
            >
              {toggle.label}
            </button>
          );
        })}
      </div>

      {/* Status Summary - Removed as it's redundant with visual button states */}

      {/* Help Text */}
      {activeCount === 0 && (
        <p className="text-xs text-gray-500">
          No dietary restrictions active
        </p>
      )}
    </div>
  );
};

export default DietarySection;
