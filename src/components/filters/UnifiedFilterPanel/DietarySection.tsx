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
    
    switch(restrictionKey) {
      case 'vegetarian':
        // If vegetarian is currently active, turn it off
        if (getToggleState('vegetarian')) {
          // Enable all protein categories
          newRestrictions['Proteins:Meat'] = true;
          newRestrictions['Proteins:Poultry'] = true;
          newRestrictions['Proteins:Game'] = true;
          newRestrictions['Proteins:Pork'] = true;
          newRestrictions['Proteins:Offal'] = true;
          newRestrictions['Proteins:Fish'] = true;
          newRestrictions['Proteins:Crustacean'] = true;
          newRestrictions['Proteins:Mollusk'] = true;
        } else {
          // Exclude all animal proteins
          newRestrictions['Proteins:Meat'] = false;
          newRestrictions['Proteins:Poultry'] = false;
          newRestrictions['Proteins:Game'] = false;
          newRestrictions['Proteins:Pork'] = false;
          newRestrictions['Proteins:Offal'] = false;
          newRestrictions['Proteins:Fish'] = false;
          newRestrictions['Proteins:Crustacean'] = false;
          newRestrictions['Proteins:Mollusk'] = false;
        }
        break;
      case 'pescatarian':
        // If pescatarian is currently active, turn it off
        if (getToggleState('pescatarian')) {
          // Enable meat and poultry categories
          newRestrictions['Proteins:Meat'] = true;
          newRestrictions['Proteins:Poultry'] = true;
          newRestrictions['Proteins:Game'] = true;
          newRestrictions['Proteins:Pork'] = true;
          newRestrictions['Proteins:Offal'] = true;
        } else {
          // Exclude meat and poultry but allow fish
          newRestrictions['Proteins:Meat'] = false;
          newRestrictions['Proteins:Poultry'] = false;
          newRestrictions['Proteins:Game'] = false;
          newRestrictions['Proteins:Pork'] = false;
          newRestrictions['Proteins:Offal'] = false;
          // Ensure fish/seafood is enabled
          newRestrictions['Proteins:Fish'] = true;
          newRestrictions['Proteins:Crustacean'] = true;
          newRestrictions['Proteins:Mollusk'] = true;
        }
        break;
      case 'gluten-free':
        // Toggle gluten-containing grains
        const glutenActive = getToggleState('gluten-free');
        newRestrictions['Grains:Bread'] = glutenActive;
        newRestrictions['Grains:Pasta'] = glutenActive;
        break;
      case 'dairy-free':
        // Toggle all dairy categories
        const dairyActive = getToggleState('dairy-free');
        newRestrictions['Dairy:Hard Cheese'] = dairyActive;
        newRestrictions['Dairy:Soft Cheese'] = dairyActive;
        newRestrictions['Dairy:Cultured Dairy'] = dairyActive;
        newRestrictions['Dairy:Milk & Cream'] = dairyActive;
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
               restrictions['Proteins:Game'] === false &&
               restrictions['Proteins:Pork'] === false &&
               restrictions['Proteins:Offal'] === false &&
               restrictions['Proteins:Fish'] === false &&
               restrictions['Proteins:Crustacean'] === false &&
               restrictions['Proteins:Mollusk'] === false;
      case 'pescatarian':
        // Pescatarian is only active if land animals are disabled but fish is enabled
        // AND it's not vegetarian
        const isVegetarian = restrictions['Proteins:Meat'] === false &&
                            restrictions['Proteins:Poultry'] === false &&
                            restrictions['Proteins:Game'] === false &&
                            restrictions['Proteins:Pork'] === false &&
                            restrictions['Proteins:Offal'] === false &&
                            restrictions['Proteins:Fish'] === false &&
                            restrictions['Proteins:Crustacean'] === false &&
                            restrictions['Proteins:Mollusk'] === false;
        
        return !isVegetarian &&
               restrictions['Proteins:Meat'] === false &&
               restrictions['Proteins:Poultry'] === false &&
               restrictions['Proteins:Game'] === false &&
               restrictions['Proteins:Pork'] === false &&
               restrictions['Proteins:Offal'] === false &&
               restrictions['Proteins:Fish'] !== false &&
               restrictions['Proteins:Crustacean'] !== false &&
               restrictions['Proteins:Mollusk'] !== false;
      case 'gluten-free':
        return restrictions['Grains:Bread'] === false ||
               restrictions['Grains:Pasta'] === false;
      case 'dairy-free':
        return restrictions['Dairy:Hard Cheese'] === false ||
               restrictions['Dairy:Soft Cheese'] === false ||
               restrictions['Dairy:Cultured Dairy'] === false ||
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
                  ? 'border-[#72A8D5] bg-[#72A8D5] text-white'
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
        <p className="text-xs text-gray-500 italic">
          No dietary restrictions active
        </p>
      )}
    </div>
  );
};

export default DietarySection;
