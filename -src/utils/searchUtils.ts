export const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

// Check if search term matches a category or subcategory
export const matchesCategory = (ingredient: string, searchTerm: string, ingredientProfiles: any[]): boolean => {
  if (!searchTerm) return false;
  
  const normalizedSearch = normalizeText(searchTerm);
  
  const profile = ingredientProfiles.find(p => p.name.toLowerCase() === ingredient.toLowerCase());
  if (!profile) return false;
  
  // Check if category matches search term
  if (normalizeText(profile.category).includes(normalizedSearch)) {
    return true;
  }
  
  // Check if subcategory matches search term
  if (normalizeText(profile.subcategory).includes(normalizedSearch)) {
    return true;
  }
  
  return false;
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
  selectedIngredients: string[] = [],
  ingredientProfiles: any[] = []
): string[] => {
  if (!searchTerm) return ingredients.filter(i => !selectedIngredients.includes(i));
  
  return ingredients
    .filter(ingredient => !selectedIngredients.includes(ingredient))
    .filter(ingredient => 
      matchesIngredient(ingredient, searchTerm) || 
      matchesCategory(ingredient, searchTerm, ingredientProfiles)
    )
    .sort((a, b) => {
      // Prioritize exact matches and matches at the start
      const normalizedSearch = normalizeText(searchTerm);
      const aStarts = normalizeText(a).startsWith(normalizedSearch);
      const bStarts = normalizeText(b).startsWith(normalizedSearch);
      
      // Prioritize ingredient name matches over category matches
      const aIsNameMatch = matchesIngredient(a, searchTerm);
      const bIsNameMatch = matchesIngredient(b, searchTerm);
      
      // First prioritize name matches over category matches
      if (aIsNameMatch && !bIsNameMatch) return -1;
      if (!aIsNameMatch && bIsNameMatch) return 1;
      
      // Then prioritize starts-with matches
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return a.localeCompare(b);
    });
};
