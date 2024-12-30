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
   * Checks if any word in the ingredient name starts with the search term
   * Handles both accented characters and case sensitivity
   */
  export const matchesIngredient = (ingredient: string, searchTerm: string): boolean => {
    // If search is empty, return true to show all ingredients
    if (!searchTerm) return true;
    
    const normalizedSearch = normalizeText(searchTerm);
    const normalizedIngredient = normalizeText(ingredient);
    
    // Don't split the search term, use it as is
    return normalizedIngredient.includes(normalizedSearch);
  };
  
    
  /**
   * Filters a list of ingredients based on search term
   * Returns ingredients where any word starts with the search term
   */
  export const filterIngredients = (
    ingredients: string[],
    searchTerm: string,
    selectedIngredients: string[] = []  // Add this parameter
  ): string[] => {
    if (!searchTerm) return ingredients.filter(i => !selectedIngredients.includes(i));
    
    return ingredients
      .filter(ingredient => !selectedIngredients.includes(ingredient))  // Filter out selected
      .filter(ingredient => matchesIngredient(ingredient, searchTerm));
  };