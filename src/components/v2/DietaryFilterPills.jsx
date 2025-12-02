import React, { useState } from 'react';
import { X } from 'lucide-react';

const DIETARY_LABELS = {
  vegetarian: 'vegetarian',
  pescatarian: 'pescatarian',
  'gluten-free': 'gluten-free',
  'dairy-free': 'dairy-free'
};

// Determine which dietary filters are active based on restrictions
const getActiveDietaryFilters = (dietaryRestrictions) => {
  const active = [];
  
  // Check vegetarian - all meat/poultry/fish/seafood restricted
  const proteinKeys = ['Meat', 'Poultry', 'Game', 'Pork', 'Offal', 'Fish', 'Crustacean', 'Mollusk'];
  const allProteinsRestricted = proteinKeys.every(k => dietaryRestrictions[`Proteins:${k}`] === false);
  if (allProteinsRestricted) {
    active.push('vegetarian');
  } else {
    // Check pescatarian - land meat restricted but seafood allowed
    const landMeatKeys = ['Meat', 'Poultry', 'Game', 'Pork', 'Offal'];
    const landMeatRestricted = landMeatKeys.every(k => dietaryRestrictions[`Proteins:${k}`] === false);
    const seafoodAllowed = ['Fish', 'Crustacean', 'Mollusk'].some(k => dietaryRestrictions[`Proteins:${k}`] !== false);
    if (landMeatRestricted && seafoodAllowed) {
      active.push('pescatarian');
    }
  }
  
  // Check gluten-free
  const glutenKeys = ['Bread', 'Pasta'];
  const glutenRestricted = glutenKeys.some(k => dietaryRestrictions[`Grains:${k}`] === false);
  if (glutenRestricted) {
    active.push('gluten-free');
  }
  
  // Check dairy-free
  const dairyKeys = ['Hard Cheese', 'Soft Cheese', 'Cultured Dairy', 'Milk & Cream'];
  const dairyRestricted = dairyKeys.some(k => dietaryRestrictions[`Dairy:${k}`] === false);
  if (dairyRestricted) {
    active.push('dairy-free');
  }
  
  return active;
};

// Remove a specific dietary filter
const removeDietaryFilter = (key, dietaryRestrictions, onDietaryChange) => {
  const newRestrictions = { ...dietaryRestrictions };
  
  switch(key) {
    case 'vegetarian':
      // Re-enable all protein subcategories
      const proteinKeys = ['Meat', 'Poultry', 'Game', 'Pork', 'Offal', 'Fish', 'Crustacean', 'Mollusk'];
      proteinKeys.forEach(k => {
        delete newRestrictions[`Proteins:${k}`];
      });
      break;
    case 'pescatarian':
      // Re-enable land meat
      ['Meat', 'Poultry', 'Game', 'Pork', 'Offal'].forEach(k => {
        delete newRestrictions[`Proteins:${k}`];
      });
      break;
    case 'gluten-free':
      // Re-enable gluten items
      ['Bread', 'Pasta'].forEach(k => {
        delete newRestrictions[`Grains:${k}`];
      });
      break;
    case 'dairy-free':
      // Re-enable dairy items
      ['Hard Cheese', 'Soft Cheese', 'Cultured Dairy', 'Milk & Cream'].forEach(k => {
        delete newRestrictions[`Dairy:${k}`];
      });
      break;
  }
  
  onDietaryChange(newRestrictions);
};

export const DietaryFilterPills = ({ 
  dietaryRestrictions, 
  onDietaryChange 
}) => {
  const activeFilters = getActiveDietaryFilters(dietaryRestrictions);
  
  if (activeFilters.length === 0) return null;
  
  return (
    <div className="fixed bottom-24 left-6 z-30 flex flex-col gap-2">
      {activeFilters.map((filter) => (
        <FilterPill
          key={filter}
          label={DIETARY_LABELS[filter]}
          onRemove={() => removeDietaryFilter(filter, dietaryRestrictions, onDietaryChange)}
        />
      ))}
    </div>
  );
};

const FilterPill = ({ label, onRemove }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onRemove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative
        px-4 py-2.5
        rounded-full
        font-medium text-sm
        transition-all duration-200 ease-out
        shadow-md hover:shadow-lg
        ${isHovered 
          ? 'bg-red-500 text-white pr-10' 
          : 'bg-[#72A8D5] text-white'
        }
      `}
      style={{
        minWidth: isHovered ? '140px' : 'auto',
      }}
    >
      <span className={`
        transition-opacity duration-150
        ${isHovered ? 'opacity-90' : 'opacity-100'}
      `}>
        {label}
      </span>
      
      {/* X icon that appears on hover */}
      <span 
        className={`
          absolute right-3 top-1/2 -translate-y-1/2
          transition-all duration-200
          ${isHovered 
            ? 'opacity-100 scale-100' 
            : 'opacity-0 scale-75'
          }
        `}
      >
        <X size={16} strokeWidth={2.5} />
      </span>
    </button>
  );
};

export default DietaryFilterPills;
