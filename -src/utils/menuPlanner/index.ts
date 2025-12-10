// Re-export all menu planner utilities for easy import
export * from './tasteBalance';
export * from './dishSuggestion';
export * from './menuGeneration';

// Main types used across multiple files
export const DISH_TYPES = [
  'entree',
  'side',
  'salad',
  'dessert',
  'beverage',
  'sauce'
] as const;

export type DishType = typeof DISH_TYPES[number];

export const DIETARY_RESTRICTIONS = [
  'vegan',
  'vegetarian',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'shellfish-free',
  'kosher',
  'halal',
  'no meat',
  'no fish',
  'no pork'
] as const;

export type DietaryRestriction = typeof DIETARY_RESTRICTIONS[number];

export const SEASONS = [
  'spring',
  'summer',
  'fall',
  'winter',
  'year-round'
] as const;

export type Season = typeof SEASONS[number];

// Default dish type configurations - which dish types to include by default
export const DEFAULT_DISH_CONFIGS = [
  {
    name: 'Full Course',
    description: 'A complete meal experience',
    types: ['entree', 'side', 'salad', 'dessert']
  },
  {
    name: 'Main & Side',
    description: 'Classic pairing',
    types: ['entree', 'side']
  },
  {
    name: 'Light Meal',
    description: 'Perfect for lunch',
    types: ['entree', 'salad']
  },
  {
    name: 'Appetizers',
    description: 'For social gatherings',
    types: ['side', 'salad']
  }
];
