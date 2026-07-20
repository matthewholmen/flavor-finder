// Types for the app's plain-JS modules the panel imports.
declare module '*/urlEncoding.js' {
  export const encodeIngredientsToUrl: (ingredients: string[]) => string;
  export const decodeUrlToIngredients: (urlString: string) => string[];
  export const encodeRecipeState: (state: {
    t?: string;
    c: string[];
    s: string[];
  }) => string;
  export const decodeRecipeState: (str: string) => unknown;
}
