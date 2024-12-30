// utils/searchUtils.ts

/**
 * Normalizes text by removing diacritics and converting to lowercase
 */
export const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

/**
 * Checks if ingredient starts with the search term
 * Only matches at the beginning of the ingredient name or after spaces
 */
export const matchesIngredient = (ingredient: string, searchTerm: string): boolean => {
  if (!searchTerm) return true;
  
  const normalizedSearch = normalizeText(searchTerm);
  const normalizedIngredient = normalizeText(ingredient);

  // Check if ingredient starts with search term
  if (normalizedIngredient.startsWith(normalizedSearch)) {
    return true;
  }

  // Check if any part after a space starts with the search term
  // We use ' ' + searchTerm to ensure we only match at word boundaries
  return normalizedIngredient.includes(' ' + normalizedSearch);
};

/**
 * Filters a list of ingredients based on search term
 * Returns ingredients where any word starts with the search term
 */
export const filterIngredients = (
  ingredients: string[],
  searchTerm: string,
  selectedIngredients: string[] = []
): string[] => {
  if (!searchTerm) return ingredients.filter(i => !selectedIngredients.includes(i));
  
  return ingredients
    .filter(ingredient => !selectedIngredients.includes(ingredient))
    .filter(ingredient => matchesIngredient(ingredient, searchTerm));
};