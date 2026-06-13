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

  // Check vegetarian - all animal proteins restricted (meat, poultry, seafood)
  const vegetarian = dietaryRestrictions['Proteins:Meat'] === false &&
                     dietaryRestrictions['Proteins:Poultry'] === false &&
                     dietaryRestrictions['Proteins:Seafood'] === false;
  if (vegetarian) {
    active.push('vegetarian');
  } else {
    // Check pescatarian - land meat restricted but seafood allowed
    const pescatarian = dietaryRestrictions['Proteins:Meat'] === false &&
                        dietaryRestrictions['Proteins:Poultry'] === false &&
                        dietaryRestrictions['Proteins:Seafood'] !== false;
    if (pescatarian) {
      active.push('pescatarian');
    }
  }

  // Check gluten-free
  if (dietaryRestrictions['Grains:Bread'] === false &&
      dietaryRestrictions['Grains:Pasta'] === false) {
    active.push('gluten-free');
  }

  // Check dairy-free
  if (dietaryRestrictions['Dairy:Cheese'] === false &&
      dietaryRestrictions['Dairy:Cultured'] === false &&
      dietaryRestrictions['Dairy:Milk & Cream'] === false) {
    active.push('dairy-free');
  }

  // Check alcohol-free
  if (dietaryRestrictions['Alcohol:Wine'] === false &&
      dietaryRestrictions['Alcohol:Spirits'] === false &&
      dietaryRestrictions['Alcohol:Liqueurs'] === false) {
    active.push('alcohol-free');
  }

  // Check nut-free (specific nut ingredients marked with special key)
  if (dietaryRestrictions['_nuts'] === false) {
    active.push('nut-free');
  }

  // Check keto (grains and sweeteners restricted)
  if (dietaryRestrictions['Grains:Rice'] === false &&
      dietaryRestrictions['Grains:Ancient Grains'] === false &&
      dietaryRestrictions['Grains:Bread'] === false &&
      dietaryRestrictions['Grains:Pasta'] === false &&
      dietaryRestrictions['Pantry:Sweeteners'] === false) {
    active.push('keto');
  }

  return active;
};

// Remove a specific dietary filter
const removeDietaryFilter = (key, dietaryRestrictions, onDietaryChange) => {
  const newRestrictions = { ...dietaryRestrictions };

  switch(key) {
    case 'vegetarian':
      delete newRestrictions['Proteins:Meat'];
      delete newRestrictions['Proteins:Poultry'];
      delete newRestrictions['Proteins:Seafood'];
      break;
    case 'pescatarian':
      delete newRestrictions['Proteins:Meat'];
      delete newRestrictions['Proteins:Poultry'];
      break;
    case 'gluten-free':
      delete newRestrictions['Grains:Bread'];
      delete newRestrictions['Grains:Pasta'];
      break;
    case 'dairy-free':
      delete newRestrictions['Dairy:Cheese'];
      delete newRestrictions['Dairy:Cultured'];
      delete newRestrictions['Dairy:Milk & Cream'];
      break;
    case 'alcohol-free':
      delete newRestrictions['Alcohol:Wine'];
      delete newRestrictions['Alcohol:Spirits'];
      delete newRestrictions['Alcohol:Liqueurs'];
      break;
    case 'nut-free':
      delete newRestrictions['_nuts'];
      break;
    case 'keto':
      delete newRestrictions['Grains:Rice'];
      delete newRestrictions['Grains:Ancient Grains'];
      delete newRestrictions['Grains:Bread'];
      delete newRestrictions['Grains:Pasta'];
      delete newRestrictions['Pantry:Sweeteners'];
      break;
  }

  onDietaryChange(newRestrictions);
};

export const DietaryFilterPills = ({
  dietaryRestrictions,
  onDietaryChange,
  isInFlow = false // When true, uses relative positioning instead of fixed
}) => {
  const activeFilters = getActiveDietaryFilters(dietaryRestrictions);

  if (activeFilters.length === 0) return null;

  // In-flow mode: pills can scroll and spill off both edges
  if (isInFlow) {
    return (
      <div className="overflow-x-auto scrollbar-hide -mx-4">
        <div className="flex flex-row gap-2 w-max px-4">
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
  }

  // Fixed mode: pills are fixed at bottom of screen
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
        bg-white dark:bg-black
        border-2
        transition-colors duration-200
      "
      style={{
        borderColor: 'var(--pill-border)',
        color: 'var(--pill-text)',
      }}
    >
      <style>{`
        :root {
          --pill-border: #d2d5db;
          --pill-text: #121826;
        }
        .dark {
          --pill-border: #4d5562;
          --pill-text: #ffffff;
        }
      `}</style>
      <span>{label}</span>
      <span className="flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity duration-200">
        <X size={14} strokeWidth={2.5} />
      </span>
    </button>
  );
};

export default DietaryFilterPills;
