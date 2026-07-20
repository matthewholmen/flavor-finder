// The thin page extractor (EXTENSION_PLAN.md: JSON-LD → microdata → CSS classes).
//
// ⚠️ This function is injected into recipe pages via
// chrome.scripting.executeScript({ func }) — it is serialized with
// Function.toString(), so it MUST stay fully self-contained: no imports,
// no references to anything outside its own body. Helpers live inside.
//
// It only READS ingredient lines + title; nothing is stored or republished.

export interface ExtractedRecipe {
  title: string;
  lines: string[];
  source: 'json-ld' | 'microdata' | 'css';
}

export function extractRecipeFromPage(): ExtractedRecipe | null {
  const clean = (s: unknown): string =>
    String(s ?? '')
      .replace(/\s+/g, ' ')
      .trim();

  const linesFrom = (raw: unknown): string[] =>
    Array.isArray(raw) ? raw.map(clean).filter(Boolean) : [];

  // ---- 1. JSON-LD (covers ~90% of real recipe sites; @graph included) ----
  const findRecipe = (node: unknown, depth: number): Record<string, unknown> | null => {
    if (depth > 6 || !node || typeof node !== 'object') return null;
    if (Array.isArray(node)) {
      for (const item of node) {
        const hit = findRecipe(item, depth + 1);
        if (hit) return hit;
      }
      return null;
    }
    const obj = node as Record<string, unknown>;
    const type = obj['@type'];
    const types = Array.isArray(type) ? type : [type];
    const ingredients = obj.recipeIngredient ?? obj.ingredients;
    if (types.includes('Recipe') && Array.isArray(ingredients)) return obj;
    if (obj['@graph']) return findRecipe(obj['@graph'], depth + 1);
    return null;
  };

  for (const script of Array.from(
    document.querySelectorAll('script[type="application/ld+json"]')
  )) {
    try {
      const recipe = findRecipe(JSON.parse(script.textContent || ''), 0);
      if (recipe) {
        const lines = linesFrom(recipe.recipeIngredient ?? recipe.ingredients);
        if (lines.length >= 2) {
          return {
            title: clean(recipe.name) || clean(document.title),
            lines,
            source: 'json-ld',
          };
        }
      }
    } catch {
      // Malformed JSON-LD block — try the next one.
    }
  }

  // ---- 2. Microdata ----
  const scope = document.querySelector(
    '[itemtype*="schema.org/Recipe"], [itemtype*="Recipe"]'
  );
  if (scope) {
    const items = Array.from(
      scope.querySelectorAll('[itemprop="recipeIngredient"], [itemprop="ingredients"]')
    )
      .map(el => clean(el.textContent))
      .filter(Boolean);
    if (items.length >= 2) {
      const name = scope.querySelector('[itemprop="name"]');
      return {
        title: clean(name?.textContent) || clean(document.title),
        lines: items,
        source: 'microdata',
      };
    }
  }

  // ---- 3. Known recipe-plugin CSS classes (WordPress food blogs) ----
  const cssSelectors = [
    '.wprm-recipe-ingredient', // WP Recipe Maker
    '.tasty-recipes-ingredients li', // Tasty Recipes
    '.mv-create-ingredients li', // Create by Mediavine
    '.ERSIngredients li', // EasyRecipe (legacy)
    '.recipe-ingredients li', // generic theme pattern
  ];
  for (const selector of cssSelectors) {
    const items = Array.from(document.querySelectorAll(selector))
      .map(el => clean(el.textContent))
      .filter(Boolean);
    if (items.length >= 2) {
      return { title: clean(document.title), lines: items, source: 'css' };
    }
  }

  return null;
}
