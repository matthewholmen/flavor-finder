# Drink Pairing Expansion Plan

## Executive Summary

Expand the drink pairing database from 61 ingredients to **300+ ingredients** using the comprehensive "What to Drink with What You Eat" reference book by Andrew Dornenburg. This will provide drink recommendations for ~52% of the app's 578 total ingredients.

**Current State:**
- 61 ingredients with drink pairings
- 293 total pairings (255 wines, 31 beers, 7 spirits)
- Tier 2 specificity (balanced varietals)

**Target State:**
- 300+ ingredients with drink pairings
- ~2,000+ total pairings
- Maintain Tier 2 specificity
- Cover all major ingredient categories

---

## Data Source Analysis

### Source Book: "What to Drink with What You Eat"
- **File:** `FlavorFinder/Resources/Data/392944594-Andrew-Dornenburg-WhatToDrinkwitht-What-You-Eat.txt`
- **Size:** 19,472 lines, 505KB
- **Coverage:** ~942 ingredient/dish entries (many are preparation methods, not base ingredients)
- **Content:** Expert drink pairing recommendations from sommelier Andrew Dornenburg

### App Ingredient Database
- **Total ingredients:** 578 (in `ingredientProfiles.json`)
- **Current coverage:** 61 ingredients (10.6%)
- **Target coverage:** 300+ ingredients (52%+)

### Extraction Tool
- **Script:** `extract_drink_pairings.py`
- **Method:** Parse text file for all-caps ingredient headers, extract indented drink lists
- **Features:**
  - Normalizes ingredient names (plural → singular)
  - Classifies drinks by category (wine/beer/spirits)
  - Assigns style tags ("bold red", "crisp white", etc.)
  - Limits to top 8 drinks per category per ingredient
  - Filters out non-alcoholic beverages

---

## Current Coverage Analysis

### Covered Ingredients (61)

**Proteins (5):**
- beef, steak, chicken, salmon, duck

**Vegetables (10):**
- avocado, beet, broccoli, carrot, cauliflower, eggplant, mushroom, potato, spinach, tomato

**Fruits (3):**
- blueberry, lemon, strawberry

**Dairy (4):**
- cheddar, cream, feta, parmesan

**Seasonings (2):**
- basil, garlic

**Dishes (20+):**
- burger, caesar salad, pasta, pizza, steak, etc.

**Gaps:**
- Missing: pork, lamb, turkey, most seafood
- Missing: most herbs/spices (thyme, rosemary, cilantro, etc.)
- Missing: most fruits (apple, pear, peach, citrus)
- Missing: most grains (rice, quinoa, pasta varieties)
- Missing: most cheeses (mozzarella, goat cheese, blue cheese, etc.)

---

## Expansion Strategy

### Phase 1: Priority Ingredients (100 → 200 total)

**Expand Core Categories:**

**Proteins (40 ingredients):**
- Meats: pork, lamb, venison, veal, rabbit, goat
- Poultry: turkey, quail, cornish hen, goose
- Seafood: tuna, halibut, cod, sea bass, trout, mackerel, swordfish, mahi mahi
- Shellfish: shrimp, lobster, scallops, crab, clams, mussels, oysters
- Plant: tofu, tempeh, seitan

**Vegetables (30 ingredients):**
- Allium: onion, leek, shallot, scallion
- Leafy: kale, arugula, chard, collards, watercress
- Roots: sweet potato, turnip, rutabaga, parsnip, celery root
- Squash: zucchini, butternut, acorn, pumpkin
- Brassicas: brussels sprouts, cabbage, kohlrabi
- Stalks: asparagus, celery, fennel
- Fruit veg: eggplant, bell pepper, cucumber

**Fruits (20 ingredients):**
- Citrus: orange, grapefruit, lime, yuzu
- Stone: peach, plum, apricot, cherry, nectarine
- Berries: raspberry, blackberry, cranberry
- Pome: apple, pear
- Tropical: mango, pineapple, papaya
- Melons: watermelon, cantaloupe

**Dairy & Cheese (15 ingredients):**
- Cheese: mozzarella, goat cheese, blue cheese, brie, camembert, gruyere, manchego, ricotta
- Dairy: butter, yogurt, milk, sour cream

**Seasonings (25 ingredients):**
- Herbs: thyme, rosemary, parsley, cilantro, mint, oregano, sage, tarragon, dill, chives
- Spices: cumin, coriander, cinnamon, ginger, cardamom, clove, nutmeg, paprika, saffron, turmeric
- Chilis: jalapeño, serrano, habanero, chipotle, poblano

**Grains & Pantry (10 ingredients):**
- Grains: rice, quinoa, farro, barley
- Oils: olive oil, butter (covered in dairy)
- Vinegars: balsamic, red wine vinegar, sherry vinegar
- Sauces: soy sauce, tomato sauce

### Phase 2: Extended Coverage (200 → 300+ total)

**Secondary Priorities:**

**More Seafood (15):**
- Anchovy, sardine, octopus, squid, eel, catfish, tilapia, snapper, grouper, sole, flounder, haddock, pollock, monkfish, skate

**More Vegetables (20):**
- Radish, artichoke, okra, jicama, corn, peas, edamame, snow peas, bean sprouts, bamboo shoots, water chestnuts, hearts of palm, endive, radicchio, frisée, bok choy, napa cabbage, daikon, taro, lotus root

**More Fruits (10):**
- Fig, date, persimmon, pomegranate, guava, passion fruit, lychee, dragon fruit, kiwi, starfruit

**More Cheese (10):**
- Fontina, taleggio, emmental, provolone, pecorino, havarti, muenster, raclette, burrata, halloumi

**Nuts & Seeds (10):**
- Almond, walnut, pecan, pistachio, hazelnut, cashew, macadamia, pine nut, sesame, sunflower seed

**Dessert Items (10):**
- Chocolate, vanilla, honey, maple syrup, caramel, coffee, coconut, hazelnut spread

**Prepared Dishes (30+):**
- Extract from book's extensive dish coverage (BBQ, curry, stir-fry, risotto, paella, cassoulet, etc.)

---

## Extraction Process

### Step 1: Update Priority Ingredient List

Modify `extract_drink_pairings.py` to include **all 578 app ingredients** in the priority list, not just 100.

**Implementation:**
```python
# Load ingredient names from ingredientProfiles.json
with open('ingredientProfiles.json') as f:
    profiles = json.load(f)
    PRIORITY_INGREDIENTS = {normalize_ingredient(p['name']) for p in profiles}
```

### Step 2: Improve Ingredient Matching

**Current Issues:**
- Script uses exact string matching (lowercase, singular)
- Misses compound names ("sweet potato" vs "potato")
- Misses dish preparations ("grilled chicken" vs "chicken")

**Enhancements:**
1. **Fuzzy matching:** Use word overlap (e.g., "roast chicken" matches "chicken")
2. **Parent ingredient matching:** "beef wellington" → "beef"
3. **Manual mapping:** Map book entries to app ingredients
   - "BBQ" → "bbq" (ingredient in app)
   - "Grilled salmon" → "salmon"
   - "Caesar salad" → existing mapping

### Step 3: Expand Wine/Beer/Spirit Classifications

**Add Missing Wine Styles:**
- Vinho Verde, Muscadet, Vermentino, Chenin Blanc
- Nero d'Avola, Primitivo, Carménère, Pinotage
- Tokaji, Vin Santo, Muscat, Asti

**Add Missing Beer Styles:**
- Sour beer, Gose, Berliner Weisse
- Kölsch, Bock, Doppelbock
- Farmhouse ale, Belgian Dubbel/Tripel

**Add Missing Spirits:**
- Sake, Soju, Baijiu
- Pisco, Cachaça, Aquavit
- Amaretto, Frangelico, Sambuca, Ouzo

### Step 4: Handle Non-Alcoholic Options (Optional)

**Consideration:** Book includes tea, coffee, juice recommendations

**Decision:** Keep for now (filter in UI), or create separate non-alcoholic pairing file?

**Recommendation:**
- Add `"nonAlcoholic"` category to pairings structure
- Include tea, coffee, kombucha, sparkling water suggestions
- Display in UI with toggle "Show non-alcoholic options"

---

## Implementation Plan

### Phase 1: Script Enhancement (2-3 hours)

**Tasks:**
1. Load all 578 ingredient names from `ingredientProfiles.json`
2. Implement fuzzy ingredient matching
3. Add manual mapping for common dish → ingredient transformations
4. Expand wine/beer/spirit classification dictionaries
5. Add non-alcoholic beverage category

**Files Modified:**
- `extract_drink_pairings.py`

### Phase 2: Data Extraction (1-2 hours)

**Tasks:**
1. Run enhanced extraction script
2. Review extracted pairings for accuracy
3. Manually add missing pairings for top 50 ingredients
4. Validate JSON structure

**Expected Output:**
- `drinkPairings.json` with 300+ ingredients
- ~2,000-3,000 total pairings

### Phase 3: Data Curation (3-5 hours)

**Tasks:**
1. **Review pairings for top 100 ingredients** (spot check)
2. **Remove duplicates** (e.g., "Champagne" and "champagne")
3. **Consolidate similar wines** (e.g., "Syrah" and "Shiraz" → "Syrah")
4. **Add missing common pairings** not in book
5. **Validate Tier 2 compliance** (specific but not obscure)
6. **Add style tags** where missing

**Quality Checks:**
- Each ingredient has 3-8 pairings (not 1, not 20)
- Style tags are consistent
- No nonsensical pairings (e.g., "Chocolate" with "Pilsner")

### Phase 4: Testing & Validation (1-2 hours)

**Tasks:**
1. Load expanded `drinkPairings.json` in iOS app
2. Test Menu Planner drink pairing section
3. Verify pairing aggregation logic works with larger dataset
4. Check performance (should still be <50ms)
5. Test with menus containing 10+ dishes

**Success Criteria:**
- ✅ App loads successfully
- ✅ Drink pairings appear for most menu ingredients
- ✅ Perfect pairing detection works (80%+ threshold)
- ✅ No crashes or performance issues

### Phase 5: Documentation Update (30 min)

**Tasks:**
1. Update `CLAUDE.md` with new pairing count
2. Archive old implementation plan
3. Document any manual mappings or special cases

---

## Enhanced Script Pseudocode

```python
#!/usr/bin/env python3
"""
Enhanced drink pairing extraction with fuzzy matching and non-alcoholic options.
"""

import json
import re
from difflib import SequenceMatcher

# Load all 578 ingredient names from app
def load_app_ingredients():
    with open('ingredientProfiles.json') as f:
        profiles = json.load(f)
    return {normalize_ingredient(p['name']): p['name'] for p in profiles}

# Fuzzy match ingredient name to app ingredient
def match_ingredient(ingredient_text, app_ingredients):
    normalized = normalize_ingredient(ingredient_text)

    # Exact match
    if normalized in app_ingredients:
        return app_ingredients[normalized]

    # Word overlap match (e.g., "roast chicken" → "chicken")
    words = set(normalized.split())
    for app_ing in app_ingredients:
        app_words = set(app_ing.split())
        overlap = words & app_words
        if len(overlap) > 0 and len(overlap) / len(app_words) >= 0.8:
            return app_ingredients[app_ing]

    # Parent ingredient match (e.g., "beef wellington" → "beef")
    for app_ing in app_ingredients:
        if app_ing in normalized or normalized in app_ing:
            return app_ingredients[app_ing]

    return None

# Extract pairings with enhanced matching
def extract_pairings_enhanced(file_path, app_ingredients):
    # ... (same parsing logic)

    for line in lines:
        if is_ingredient_header(line):
            matched = match_ingredient(line, app_ingredients)
            if matched:
                current_ingredient = matched
                in_pairing_section = True

        elif in_pairing_section:
            # ... (same drink extraction)

            # NEW: Categorize non-alcoholic
            if is_non_alcoholic(drink):
                pairings[current_ingredient]['nonAlcoholic'].append({
                    'name': drink,
                    'style': classify_non_alcoholic(drink)
                })

    return pairings

# Main execution
if __name__ == '__main__':
    app_ingredients = load_app_ingredients()
    pairings = extract_pairings_enhanced(source_file, app_ingredients)

    # Curate and validate
    pairings = remove_duplicates(pairings)
    pairings = consolidate_similar_wines(pairings)
    pairings = limit_to_top_8_per_category(pairings)

    # Output
    output = {
        'version': '2.0',
        'tier': 2,
        'updated': today(),
        'pairings': pairings
    }

    write_json(output, 'drinkPairings.json')
```

---

## Manual Mapping Table

Some book entries require manual mapping to app ingredients:

| Book Entry | App Ingredient | Notes |
|------------|---------------|-------|
| BBQ / BARBECUE | bbq | Dish entry |
| ROAST CHICKEN | chicken | Preparation method |
| GRILLED SALMON | salmon | Preparation method |
| BEEF WELLINGTON | beef | Specific dish |
| CAESAR SALAD | caesar salad | Already mapped |
| PASTA (various) | pasta | Generic |
| TOMATO SAUCE | tomato sauce | Pantry item |
| OLIVE OIL | olive oil | Pantry item |
| BALSAMIC VINEGAR | balsamic | App uses short name |
| SOY SAUCE | soy sauce | Already in app |

**Implementation:**
Add `MANUAL_MAPPINGS` dict to script:
```python
MANUAL_MAPPINGS = {
    'barbecue': 'bbq',
    'roast chicken': 'chicken',
    'grilled salmon': 'salmon',
    # ... etc
}
```

---

## Non-Alcoholic Beverage Strategy

### Categories to Add

**Tea (50+ entries in book):**
- Black tea, Green tea, Oolong, White tea, Pu-erh, Herbal tea, Chai, Matcha

**Coffee:**
- Espresso, Cold brew, French press, Cappuccino, Latte

**Juice & Other:**
- Citrus juice, Apple juice, Cranberry juice, Pomegranate juice
- Sparkling water, Tonic water, Ginger ale, Kombucha

### Data Structure Extension

```json
{
  "chicken": {
    "wines": [...],
    "beers": [...],
    "spirits": [...],
    "nonAlcoholic": [
      { "name": "Green Tea", "style": "light tea" },
      { "name": "Iced Tea", "style": "cold beverage" },
      { "name": "Lemonade", "style": "citrus drink" }
    ]
  }
}
```

### UI Integration

**Menu Planner Enhancement:**
- Add "Non-Alcoholic" section below spirits
- Toggle in settings: "Show non-alcoholic beverage pairings"
- Default: OFF (to avoid clutter)

**Use Cases:**
- Non-drinkers
- Family meals
- Daytime events
- Health-conscious users

---

## Expected Outcomes

### Quantitative Goals

| Metric | Current | Target | % Increase |
|--------|---------|--------|------------|
| Ingredients with pairings | 61 | 300+ | 392% |
| Total pairings | 293 | 2,000+ | 583% |
| Wine pairings | 255 | 1,500+ | 488% |
| Beer pairings | 31 | 300+ | 868% |
| Spirit pairings | 7 | 200+ | 2,757% |
| Non-alcoholic pairings | 0 | 300+ | ∞ |
| Coverage of app ingredients | 10.6% | 52%+ | 391% |

### Qualitative Goals

**User Experience:**
- ✅ Most menus will have drink recommendations
- ✅ Users discover pairings for niche ingredients (e.g., saffron, fennel)
- ✅ Feature becomes essential part of menu planning workflow
- ✅ Educational value increases (learn pairing principles)

**Data Quality:**
- ✅ All pairings are Tier 2 appropriate (not obscure)
- ✅ Consistent style tagging
- ✅ No duplicate or conflicting recommendations
- ✅ Balanced coverage across wine/beer/spirits

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Extraction errors (wrong pairings) | High | Medium | Manual review of top 100 ingredients |
| JSON file size too large | Low | Low | 2,000 pairings × 50 bytes = 100KB (negligible) |
| Performance degradation | Medium | Low | Test with 300+ ingredients, optimize queries |
| Fuzzy matching false positives | Medium | Medium | Conservative matching thresholds + manual review |

### Data Quality Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Book pairings too specific (Tier 3) | High | High | Apply Tier 2 simplification rules |
| Missing pairings for app ingredients | Medium | Medium | Supplement with standard pairing wisdom |
| Inconsistent style tags | Medium | Medium | Normalize during curation phase |
| Non-alcoholic clutter | Low | Medium | Make optional in UI (default OFF) |

---

## Timeline Estimate

| Phase | Tasks | Time |
|-------|-------|------|
| **Script Enhancement** | Fuzzy matching, manual mappings, non-alcoholic | 2-3 hours |
| **Data Extraction** | Run script, initial validation | 1-2 hours |
| **Data Curation** | Review, clean, consolidate, validate | 3-5 hours |
| **Testing** | iOS app integration, performance testing | 1-2 hours |
| **Documentation** | Update docs, create summary | 30 min |
| **TOTAL** | | **7.5-12.5 hours** |

**Faster than original estimate** because we're automating extraction vs. manual curation.

---

## Success Criteria

### Must Have (Blocker)
- ✅ 300+ ingredients with drink pairings
- ✅ No crashes or errors loading JSON
- ✅ Pairings display correctly in Menu Planner
- ✅ All Tier 2 appropriate (no obscure wines)

### Should Have (Important)
- ✅ 2,000+ total pairings
- ✅ Consistent style tagging
- ✅ No duplicates
- ✅ Performance <50ms for pairing lookup

### Nice to Have (Optional)
- ✅ Non-alcoholic pairings
- ✅ Coverage for all 578 ingredients
- ✅ Regional wine variants (optional)

---

## Refinements Needed (v2.1)

### Issue 1: Generic Beer Entries

**Problem:** Book often says "beer, esp. lager or pale ale" but script extracts as generic "Beer (various)"

**Solution:** Parse "esp." qualifiers to extract specific beer styles
- "beer, esp. lager or wheat" → Add both "Lager" and "Wheat Beer"
- "beer, esp. fruit, pale ale, or Trappist ale" → Add "Pale Ale" and "Belgian Ale"

**Implementation:**
```python
# Parse "esp." patterns
if 'esp.' in drink_normalized:
    # Extract comma/or-separated list after "esp."
    esp_match = re.search(r'esp\.\s+(.+)$', drink_normalized)
    if esp_match:
        styles = esp_match.group(1).split(/,|or/)
        for style in styles:
            # Match each style to BEER_STYLES
```

### Issue 2: Generic Cocktail Entries

**Problem:** Book says "cocktails made with Cognac or Madeira" but script extracts as "Cocktail (mixed)"

**Solution:** Extract base spirits from cocktail descriptions
- "cocktails made with Cognac or Madeira" → Add "Cognac" (Madeira is wine, skip)
- "cocktails made with Armagnac, Bourbon, brandy, Calvados, Cognac, Cointreau, or Grand Marnier" → Add all spirits

**Implementation:**
```python
# Parse cocktail ingredients
if 'cocktail' in drink_normalized and 'made with' in drink_normalized:
    # Extract spirit list
    spirit_match = re.search(r'made with (.+)$', drink_normalized)
    if spirit_match:
        spirits = spirit_match.group(1).split(/,|or/)
        for spirit in spirits:
            if spirit in SPIRIT_STYLES:
                # Add to spirits, not cocktails
```

### Issue 3: Cocktail with Modifiers

**Problem:** "cocktail with brown spirit" is too vague

**Solution:** Map generic categories to specific spirits
- "brown spirit" → Bourbon, Whiskey, Brandy, Rum (aged)
- "white spirit" → Vodka, Gin, White Rum, Tequila
- "citrus-based cocktail" → Add Vodka, Gin (common citrus bases)

**Mapping Table:**
```python
COCKTAIL_CATEGORIES = {
    'brown spirit': ['Bourbon', 'Whiskey', 'Brandy'],
    'white spirit': ['Vodka', 'Gin'],
    'citrus': ['Vodka', 'Gin'],
    'sweet': ['Rum', 'Brandy'],
}
```

## Next Steps

1. **✅ Review and approve this plan**
2. **✅ Enhance extraction script** (`extract_drink_pairings_v2.py`)
3. **✅ Run extraction** to generate expanded `drinkPairings.json`
4. **🔄 Refine extraction (v2.1)** - Parse "esp." qualifiers and cocktail ingredients
5. **Re-run extraction** with refined logic
6. **Manual curation** of top 100 ingredients
7. **Test in iOS app**
8. **Deploy** updated data file

---

## Appendix A: Book Structure Analysis

The source book organizes entries as:

1. **Ingredient entries** (e.g., "CHICKEN", "TOMATO", "BASIL")
2. **Dish entries** (e.g., "PASTA CARBONARA", "BEEF WELLINGTON")
3. **Preparation method entries** (e.g., "GRILLED", "BRAISED", "ROASTED")
4. **Cuisine entries** (e.g., "ITALIAN", "MEXICAN", "THAI")

**Strategy:**
- Extract ingredient entries directly
- Map dish entries to primary ingredient (e.g., "Pasta Carbonara" → "pasta", "bacon", "cream")
- Ignore preparation method entries (too granular)
- Ignore cuisine entries (too broad)

---

## Appendix B: Tier 2 Wine List (Expanded)

### Red Wines
**Bold:** Cabernet Sauvignon, Malbec, Syrah/Shiraz, Cabernet Franc, Bordeaux, Nebbiolo, Barolo, Barbaresco, Brunello, Amarone, Primitivo

**Medium:** Merlot, Pinot Noir, Chianti, Sangiovese, Tempranillo, Rioja, Grenache, Côtes du Rhône, Zinfandel, Carménère, Nero d'Avola

**Light:** Beaujolais, Gamay, Valpolicella, Lambrusco

### White Wines
**Rich:** Chardonnay, Viognier, White Burgundy, Semillon

**Crisp:** Sauvignon Blanc, Pinot Grigio/Gris, Chablis, Sancerre, Albariño, Grüner Veltliner, Muscadet, Vermentino, Vinho Verde, Verdicchio

**Aromatic:** Riesling, Gewürztraminer, Moscato, Torrontés, Chenin Blanc, Viognier

### Sparkling
Champagne, Prosecco, Cava, Crémant, Sekt, Franciacorta, Lambrusco (sparkling)

### Fortified/Dessert
Port, Sherry (Fino, Amontillado, Oloroso, PX), Madeira, Marsala, Sauternes, Ice Wine, Late Harvest Riesling, Tokaji, Vin Santo, Muscat de Beaumes-de-Venise, Banyuls

### Rosé
Rosé (dry), Rosé (sweet), Tavel, Bandol Rosé

---

## Appendix C: File Structure

```
FlavorFinder-iOS-1/
├── docs/
│   ├── drinkPairings/
│   │   └── IMPLEMENTATION_PLAN.md (ARCHIVE - superseded by this plan)
│   ├── DRINK_PAIRING_EXPANSION_PLAN.md (THIS FILE)
│   └── menu-generator-testing-plan.md (KEEP - separate feature)
├── extract_drink_pairings.py (MODIFY)
├── FlavorFinder/
│   └── Resources/
│       └── Data/
│           ├── drinkPairings.json (UPDATE - expand to 300+ ingredients)
│           ├── ingredientProfiles.json (READ - source of app ingredients)
│           └── 392944594-Andrew-Dornenburg-WhatToDrinkwitht-What-You-Eat.txt (READ - source data)
```

---

## Document Metadata

- **Version:** 2.0
- **Created:** 2026-01-17
- **Author:** Claude (Flavor Finder Development)
- **Purpose:** Expand drink pairing coverage from 61 to 300+ ingredients
- **Supersedes:** `docs/drinkPairings/IMPLEMENTATION_PLAN.md` (v1.0)
