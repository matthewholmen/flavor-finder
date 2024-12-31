export const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export const matchesIngredient = (ingredient: string, searchTerm: string): boolean => {
  if (!searchTerm) return true;
  
  const normalizedSearch = normalizeText(searchTerm);
  const normalizedIngredient = normalizeText(ingredient);

  // Check if ingredient starts with search term
  if (normalizedIngredient.startsWith(normalizedSearch)) {
    return true;
  }

  // Check if any word starts with the search term
  const words = normalizedIngredient.split(/\s+/);
  return words.some(word => word.startsWith(normalizedSearch));
};

export const filterIngredients = (
  ingredients: string[],
  searchTerm: string,
  selectedIngredients: string[] = []
): string[] => {
  if (!searchTerm) return ingredients.filter(i => !selectedIngredients.includes(i));
  
  return ingredients
    .filter(ingredient => !selectedIngredients.includes(ingredient))
    .filter(ingredient => matchesIngredient(ingredient, searchTerm))
    .sort((a, b) => {
      // Prioritize exact matches and matches at the start
      const normalizedSearch = normalizeText(searchTerm);
      const aStarts = normalizeText(a).startsWith(normalizedSearch);
      const bStarts = normalizeText(b).startsWith(normalizedSearch);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return a.localeCompare(b);
    });
};
