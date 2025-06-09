// types.ts

type AromaSubcategory = {
  Fruity: "Berry" | "Citrus" | "Dried Fruit" | "Melon" | "Tree Fruit" | "Tropical";
  Maillard: "Caramel" | "Chocolate" | "Meaty" | "Nutty" | "Roasted" | "Toasted";
  Terpene: "Medicinal" | "Spice" | "Smoke" | "Petrol" | "Wood";
  Vegetal: "Green" | "Earthy" | "Fruit-Like" | "Herbaceous";
  Phenol: never;
  Pungent: never;
  Marine: never;
  Sour: never;
  Savory: never;
  Sulphur: never;
  Alcohol: never;
  Dairy: never;
}

type IngredientSubcategory = {
  Proteins: "Plant Proteins" | "Fish" | "Pork" | "Poultry" | "Game" | "Crustacean" | "Mollusk" | "Meat" | "Offal";
  Vegetables: "Allium" | "Brassicas" | "Leafy Greens" | "Roots" | "Squash" | "Mushroom" | "Peppers" | "Stalks" | "Fruit Vegetables";
  Fruits: "Citrus" | "Pome Fruit" | "Stone Fruit" | "Tropical Fruit" | "Berries" | "Melons" | "Other Fruits";
  Seasonings: "Herbs" | "Spices" |  "Seeds & Botanicals" | "Chilis";
  Dairy: "Cultured Dairy" | "Hard Cheese" | "Soft Cheese" | "Milk & Cream";
  Grains: "Rice" | "Pasta" | "Bread" | "Ancient Grains";
  Liquids: "Broths & Stocks" | "Oils & Fats" | "Vinegars";
  Condiments: "Fermented" | "Sauces" | "Preserves" | "Sweeteners";
  Alcohol: "Wines" | "Spirits" | "Liqueurs";
}

export interface IngredientProfile {
  name: string;
  category: keyof IngredientSubcategory;
  subcategory: IngredientSubcategory[keyof IngredientSubcategory];
  flavorProfile: {
    sweet: number;
    salty: number;
    sour: number;
    bitter: number;
    umami: number;
    fat: number;
    spicy: number;
  };
  aromas: {
    primary: keyof AromaSubcategory;
    secondary?: AromaSubcategory[keyof AromaSubcategory];
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
    bitter: number;
    umami: number;
    fat: number;
    spicy: number;
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
    bitter: number;
    umami: number;
    fat: number;
    spicy: number;
  };
}

export type { AromaSubcategory, IngredientSubcategory };