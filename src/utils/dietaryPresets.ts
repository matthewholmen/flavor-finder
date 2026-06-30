// Shared dietary preset definitions and helpers.
// Dietary restrictions use a flat key format: 'Category:Subcategory' = false
// (false means excluded). Special keys (_nuts, _nightshades, _fodmap) cover
// cross-category ingredient sets.

export interface DietaryPreset {
  key: string;
  label: string;
  // The restriction keys this preset excludes
  restrictionKeys: string[];
}

export const DIETARY_PRESETS: DietaryPreset[] = [
  {
    key: 'vegetarian',
    label: 'Vegetarian',
    restrictionKeys: ['Proteins:Meat', 'Proteins:Poultry', 'Proteins:Seafood'],
  },
  {
    key: 'vegan',
    label: 'Vegan',
    restrictionKeys: [
      'Proteins:Meat',
      'Proteins:Poultry',
      'Proteins:Seafood',
      'Proteins:Eggs',
      'Dairy:Cheese',
      'Dairy:Cultured',
      'Dairy:Milk & Cream',
      'Dairy:Custards & Frozen',
    ],
  },
  {
    key: 'pescatarian',
    label: 'Pescatarian',
    restrictionKeys: ['Proteins:Meat', 'Proteins:Poultry'],
  },
  {
    key: 'gluten-free',
    label: 'Gluten-free',
    restrictionKeys: ['Grains:Pasta', 'Grains:Bread'],
  },
  {
    key: 'dairy-free',
    label: 'Dairy-free',
    restrictionKeys: ['Dairy:Cheese', 'Dairy:Cultured', 'Dairy:Milk & Cream', 'Dairy:Custards & Frozen'],
  },
  {
    key: 'alcohol-free',
    label: 'Alcohol-free',
    restrictionKeys: ['Alcohol:Wine', 'Alcohol:Beer & Cider', 'Alcohol:Spirits', 'Alcohol:Liqueurs'],
  },
  {
    key: 'nut-free',
    label: 'Nut-free',
    restrictionKeys: ['_nuts'],
  },
];

export type DietaryRestrictions = Record<string, boolean>;

// A preset is active when every restriction key it covers is excluded
export const isPresetActive = (
  dietaryRestrictions: DietaryRestrictions,
  preset: DietaryPreset
): boolean =>
  preset.restrictionKeys.every(key => dietaryRestrictions[key] === false);

// Toggle a preset on/off, returning the new restrictions object
export const togglePreset = (
  dietaryRestrictions: DietaryRestrictions,
  preset: DietaryPreset
): DietaryRestrictions => {
  const next = { ...dietaryRestrictions };
  const activate = !isPresetActive(dietaryRestrictions, preset);
  preset.restrictionKeys.forEach(key => {
    if (activate) {
      next[key] = false;
    } else {
      delete next[key];
    }
  });
  return next;
};
