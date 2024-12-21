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
    
    // Split ingredient into words and check if any word starts with the search term
    const words = normalizedIngredient.split(' ');
    return words.some(word => word.startsWith(normalizedSearch));
  };
  
  /**
   * Filters a list of ingredients based on search term
   * Returns ingredients where any word starts with the search term
   */
  export const filterIngredients = (
    ingredients: string[],
    searchTerm: string
  ): string[] => {
    if (!searchTerm) return ingredients;
    
    return ingredients.filter(ingredient => 
      matchesIngredient(ingredient, searchTerm)
    );
  };