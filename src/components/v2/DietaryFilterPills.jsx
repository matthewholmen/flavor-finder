import React from 'react';
import { X } from 'lucide-react';

const DIETARY_LABELS = {
  vegetarian: 'vegetarian',
  pescatarian: 'pescatarian',
  'gluten-free': 'gluten-free',
  'dairy-free': 'dairy-free',
  'alcohol-free': 'alc-free',
  'nut-free': 'nut-free',
  'keto': 'keto'
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

  // Check alcohol-free
  const alcoholKeys = ['Liqueurs', 'Spirits', 'Wines'];
  const alcoholRestricted = alcoholKeys.some(k => dietaryRestrictions[`Alcohol:${k}`] === false);
  if (alcoholRestricted) {
    active.push('alcohol-free');
  }

  // Check nut-free (specific nut ingredients marked with special key)
  if (dietaryRestrictions['_nuts'] === false) {
    active.push('nut-free');
  }

  // Check keto (grains and sweeteners restricted)
  const grainKeys = ['Rice', 'Ancient Grains', 'Bread', 'Pasta', 'Starches'];
  const grainsRestricted = grainKeys.some(k => dietaryRestrictions[`Grains:${k}`] === false);
  const sweetenersRestricted = dietaryRestrictions['Condiments:Sweeteners'] === false;
  if (grainsRestricted && sweetenersRestricted) {
    active.push('keto');
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
    case 'alcohol-free':
      // Re-enable alcohol items
      ['Liqueurs', 'Spirits', 'Wines'].forEach(k => {
        delete newRestrictions[`Alcohol:${k}`];
      });
      break;
    case 'nut-free':
      // Re-enable nuts
      delete newRestrictions['_nuts'];
      break;
    case 'keto':
      // Re-enable grains and sweeteners
      ['Rice', 'Ancient Grains', 'Bread', 'Pasta', 'Starches'].forEach(k => {
        delete newRestrictions[`Grains:${k}`];
      });
      delete newRestrictions['Condiments:Sweeteners'];
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
    <div className="fixed bottom-24 left-0 right-0 z-30 px-4 overflow-x-auto scrollbar-hide">
      <div className="flex flex-row gap-2 w-max">
        {activeFilters.map((filter) => (
          <FilterPill
            key={filter}
            label={DIETARY_LABELS[filter]}
            onRemove={() => removeDietaryFilter(filter, dietaryRestrictions, onDietaryChange)}
          />
        ))}
      </div>
    </div>
  );
};

const FilterPill = ({ label, onRemove }) => {
  return (
    <button
      onClick={onRemove}
      className="
        group flex items-center gap-1.5
        pl-3 pr-2.5 py-2
        rounded-full
        font-medium text-sm
        bg-[#6AAFE8] text-white
        border-2 border-[#6AAFE8]
        transition-colors duration-200
        hover:bg-[#5a9ed6] hover:border-[#5a9ed6]
      "
    >
      <span>{label}</span>
      <span className="flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity duration-200">
        <X size={14} strokeWidth={2.5} />
      </span>
    </button>
  );
};

export default DietaryFilterPills;
