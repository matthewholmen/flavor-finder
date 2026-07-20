import { defineContentScript } from '#imports';

// Recipe *presence* detector — the badge's eyes (EXTENSION_PLAN X4).
// Deliberately much lighter than the real extractor: it only answers "does
// this page look like a recipe?" so the toolbar icon can light up. It reads
// nothing else and sends a single boolean; extraction still happens on click.
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    const looksLikeRecipe = (): boolean => {
      for (const script of Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      )) {
        const text = script.textContent || '';
        // Cheap string probe before any JSON parsing.
        if (text.includes('"Recipe"') && text.includes('ecipeIngredient')) {
          return true;
        }
      }
      if (
        document.querySelector(
          '[itemtype*="Recipe"] [itemprop="recipeIngredient"]'
        )
      ) {
        return true;
      }
      return !!document.querySelector(
        '.wprm-recipe-ingredient, .tasty-recipes-ingredients, .mv-create-ingredients'
      );
    };

    const report = (found: boolean) =>
      chrome.runtime
        .sendMessage({ type: 'recipeSeen', found })
        .catch(() => {});

    const first = looksLikeRecipe();
    report(first);
    if (!first) {
      // Late-rendering pages (SPAs, lazy JSON-LD) get one re-check.
      setTimeout(() => {
        const found = looksLikeRecipe();
        if (found) report(true);
      }, 2500);
    }
  },
});
