import { TASTE_COLORS, getIngredientColorWithContrast } from './colors.ts';

interface FlavorProfile {
  sweet?: number;
  salty?: number;
  sour?: number;
  bitter?: number;
  umami?: number;
  fat?: number;
  spicy?: number;
}

interface IngredientProfile {
  name: string;
  flavorProfile?: FlavorProfile;
}

/**
 * Get the dominant taste color for an ingredient based on its flavor profile.
 * Falls back to a neutral gray if no profile is found.
 *
 * @param ingredient - The ingredient name to look up
 * @param ingredientProfiles - Array of ingredient profiles with flavor data
 * @param isHighContrast - Whether high contrast mode is enabled
 * @param isDarkMode - Whether dark mode is enabled
 * @returns The color string for the ingredient
 */
export const getIngredientColor = (
  ingredient: string,
  ingredientProfiles: IngredientProfile[],
  isHighContrast?: boolean,
  isDarkMode?: boolean
): string => {
  const profile = ingredientProfiles.find(
    p => p.name.toLowerCase() === ingredient.toLowerCase()
  );

  if (!profile?.flavorProfile) {
    return getIngredientColorWithContrast('#374151', isHighContrast, isDarkMode);
  }

  let dominantTaste = 'sweet';
  let maxValue = -1;

  Object.entries(profile.flavorProfile).forEach(([taste, value]) => {
    if (value > maxValue) {
      maxValue = value;
      dominantTaste = taste;
    }
  });

  const baseColor = maxValue > 0
    ? (TASTE_COLORS[dominantTaste as keyof typeof TASTE_COLORS] || '#374151')
    : '#374151';

  return getIngredientColorWithContrast(baseColor, isHighContrast, isDarkMode);
};
