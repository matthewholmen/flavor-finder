// utils/search.ts










// unused
















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
   * Checks if any word in the text starts with the query
   * Works with both accented and non-accented characters
   */
  export const matchesWordStart = (text: string, query: string): boolean => {
    if (!query) return true;
    
    const normalizedText = normalizeText(text);
    const normalizedQuery = normalizeText(query);
    
    // Split text into words and check if any word starts with the query
    const words = normalizedText.split(/\s+/);
    return words.some(word => word.startsWith(normalizedQuery));
  };
  
  /**
   * Filters and sorts ingredients based on search query
   * Returns ingredients where any word starts with the query
   */
  export const filterIngredients = (
    ingredients: string[],
    query: string,
    selectedIngredients: string[] = []
  ): string[] => {
    if (!query) return ingredients;
  
    return ingredients
      .filter(ingredient => 
        !selectedIngredients.includes(ingredient) && 
        matchesWordStart(ingredient, query)
      )
      .sort((a, b) => {
        // Prioritize exact matches and matches at the start
        const normalizedQuery = normalizeText(query);
        const aStarts = normalizeText(a).startsWith(normalizedQuery);
        const bStarts = normalizeText(b).startsWith(normalizedQuery);
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Fall back to alphabetical order
        return a.localeCompare(b);
      });
  };