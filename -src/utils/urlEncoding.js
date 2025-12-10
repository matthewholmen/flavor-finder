/**
 * Encodes an array of ingredients into a URL-safe string
 * @param {string[]} ingredients - Array of ingredient names
 * @returns {string} URL-safe encoded string
 */
export const encodeIngredientsToUrl = (ingredients) => {
  // Basic encoding: URL-encode each ingredient and join with hyphens
  const encodedIngredients = ingredients.map(ingredient => 
    encodeURIComponent(ingredient.toLowerCase().trim())
  );
  
  return encodedIngredients.join('-');
};

/**
 * Decodes a URL string back to ingredient names
 * @param {string} urlString - The encoded URL string
 * @returns {string[]} Array of decoded ingredient names
 */
export const decodeUrlToIngredients = (urlString) => {
  if (!urlString) return [];
  
  // Split by hyphens and decode each part
  return urlString.split('-')
    .map(part => decodeURIComponent(part))
    .filter(Boolean); // Remove any empty strings
};
