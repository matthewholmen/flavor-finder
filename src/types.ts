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
  Proteins: "Plant Proteins" | "Fish" | "Pork" | "Poultry" | "Game" | "Crustacean" | "Mollusk";
  Vegetables: "Allium" | "Brassicas" | "Leafy Greens" | "Root Vegetable" | "Squash" | "Mushroom" | "Peppers" | "Stalks" | "Fruit Vegetables";
  Fruits: "Citrus" | "Pome Fruit" | "Stone Fruit" | "Tropical Fruit" | "Berries" | "Melons" | "Other Fruits";
  Seasonings: "Herbs" | "Spices" | "Chilis";
  Dairy: "Cultured Dairy" | "Hard Cheese" | "Soft Cheese" | "Milk & Cream";
  Grains: "Rice" | "Pasta" | "Bread" | "Ancient Grains";
  Legumes: "Beans" | "Lentils" | "Peas" | "Soy";
  Liquids: "Broths & Stocks" | "Oils & Fats" | "Fruit Juices" | "Vinegars";
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
}

export type { AromaSubcategory, IngredientSubcategory };