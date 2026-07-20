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

/**
 * Encode an arbitrary object to a compact, URL-safe (base64url) string. Used to
 * deep-link the whole Taste Lab state (slots, picks, locks, pool) in `?lab=`.
 * Query-param based so it works on any static host (e.g. Vercel) with no
 * server-side routing.
 * @param {object} state
 * @returns {string} base64url string, or '' on failure
 */
export const encodeTasteLabState = (state) => {
  try {
    const json = JSON.stringify(state);
    // encodeURIComponent → unescape handles unicode (e.g. "jalapeño") before btoa.
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
};

/**
 * Flavor-report deep link (`?recipe=`): same base64url object encoding as `?lab=`.
 * Carries only canonical names + title — never the pasted text (long, and
 * someone's copyrighted prose). Shape: { t?: string, c: string[], s: string[] }.
 */
export const encodeRecipeState = (state) => encodeTasteLabState(state);
export const decodeRecipeState = (str) => decodeTasteLabState(str);

/**
 * Inverse of encodeTasteLabState.
 * @param {string} str base64url string from a `?lab=` param
 * @returns {object|null} the decoded state, or null if malformed
 */
export const decodeTasteLabState = (str) => {
  try {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch {
    return null;
  }
};
