// types.ts

type IngredientSubcategory = {
  Proteins: "Meat" | "Poultry" | "Seafood" | "Plant Proteins";
  Vegetables: "Allium" | "Leafy Greens" | "Roots" | "Squash" | "Brassicas" | "Mushrooms" | "Stalks" | "Fruit Vegetables";
  Fruits: "Citrus" | "Stone Fruit" | "Tropical" | "Berries" | "Pome Fruit" | "Melons";
  Dairy: "Cheese" | "Cultured" | "Milk & Cream";
  Seasonings: "Herbs" | "Spices" | "Chilis";
  Pantry: "Oils & Fats" | "Vinegars" | "Stocks" | "Sauces" | "Sweeteners";
  Grains: "Rice" | "Pasta" | "Bread" | "Ancient Grains";
  Alcohol: "Wine" | "Spirits" | "Liqueurs";
}

export interface IngredientProfile {
  name: string;
  category: keyof IngredientSubcategory;
  subcategory: IngredientSubcategory[keyof IngredientSubcategory];
  flavorProfile: {
    sweet: number;
    salty: number;
    sour: number;
    umami: number;
    fat: number;
    spicy: number;
    aromatic: number;
  };
  description: string;
  // MVP+
  cookingMethods?: string[];
  texture?: string[];
  intensity?: number;
  allergen?: string[];
  dietary?: string[];
  
  // Menu Planner extensions
  dishTypes?: ('entree' | 'side' | 'salad' | 'dessert' | 'beverage' | 'sauce')[];
  weight?: number; // Scale 1-10: flavor intensity/prominence
  volume?: number; // Scale 1-10: typical quantity used
  seasonality?: ('spring' | 'summer' | 'fall' | 'winter' | 'year-round')[];
}

// Dish structure for Menu Planner
export interface Dish {
  id: string;
  name: string;
  type: 'entree' | 'side' | 'salad' | 'dessert' | 'beverage' | 'sauce';
  keyIngredient: string; // Primary ingredient from which the dish is built
  ingredients: string[]; // Array of ingredient names in the dish
  tasteProfile: {
    sweet: number;
    salty: number;
    sour: number;
    umami: number;
    fat: number;
    spicy: number;
    aromatic: number;
  };
  weight: number; // Overall weight/intensity
  preparationTime?: number; // Optional: estimated minutes
}

// Menu structure for Menu Planner
export interface Menu {
  id: string;
  name: string;
  keyIngredient: string; // The central ingredient of the menu
  dishes: Dish[]; // Array of dishes in the menu
  balanceScore: number; // Overall taste balance score (0-100)
  tasteProfile: {
    sweet: number;
    salty: number;
    sour: number;
    umami: number;
    fat: number;
    spicy: number;
    aromatic: number;
  };
}

// Taste properties for filtering
export type TasteProperty = 'sweet' | 'salty' | 'sour' | 'umami' | 'fat' | 'spicy' | 'aromatic';

export const TASTE_PROPERTIES: TasteProperty[] = ['sweet', 'salty', 'sour', 'umami', 'fat', 'spicy', 'aromatic'];

export type { IngredientSubcategory };