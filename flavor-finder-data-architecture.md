# Flavor Finder — Data architecture & flavor science integration

## Purpose

This document describes how Flavor Finder's search syntax is powered by real data. It maps each operator category to its data sources, explains how the FlavorMap algorithm integrates with volatile compound databases, and provides a practical build roadmap.

The goal: a Scryfall-style composable query language for recipes, where the `flavor:` and `pairs:` operators are the product moat — powered by flavor chemistry, not just keyword matching.

---

## Data source inventory

### Tier 1: Schema.org/Recipe (structured data from the web)

The foundation layer. Google incentivizes recipe sites to embed JSON-LD structured data for rich results. Most major food sites (Serious Eats, Allrecipes, NYT Cooking, Epicurious, Bon Appétit, food blogs using WP Recipe Maker/Tasty/WPRM) already publish this.

**What schema.org/Recipe gives us directly:**

| Schema field | Flavor Finder operator | Adoption rate | Notes |
|---|---|---|---|
| `recipeIngredient` | `has:`, `ingredient:`, `ingredients:` (count), `protein:` (derived) | Very high (~90%+) | Google requires for Assistant guidance. Free-text but parseable. |
| `totalTime` / `cookTime` / `prepTime` | `time:`, `t:` | High (~80%) | ISO 8601 duration. Google recommends. No active/passive split. |
| `recipeCuisine` | `cuisine:`, `c:` | Moderate (~60%) | Free text, needs normalization ("Korean" vs "korean" vs "South Korean") |
| `recipeCategory` | `meal:`, `course:` | Moderate (~60%) | Free text. Values like "dinner", "dessert", "appetizer". Inconsistent. |
| `recipeYield` | `serves:`, `sv:` | High (~70%) | Free text. "4 servings", "serves 6", "12 cookies". Needs parsing. |
| `author` | `author:`, `by:` | Very high (~95%) | Person or Organization object. |
| `aggregateRating` | `rating:`, `r:` | High (~75%) | `ratingValue` + `ratingCount`. Direct numeric. |
| `recipeInstructions` | `steps:` (count) | High (~85%) | HowToStep array or free text. Step count derivable. |
| `nutrition` / `NutritionInformation` | `cal:`, `protein-g:`, `carb-g:`, `fat-g:` | Moderate (~35%) | Optional. Major sites include it. Blogs often don't. |
| `cookingMethod` | `technique:`, `tech:` | Low (~20%) | Free text, no controlled vocabulary. "Baked" vs "Baking" vs "bake". |
| `suitableForDiet` | `diet:`, `d:` | Very low (~5%) | Enum exists (GlutenFreeDiet, VeganDiet, etc.) but almost nobody uses it. |
| `tool` | `equipment:`, `eq:` | Very low (~10%) | HowTo parent type. Rarely populated. |
| `video` | `video:`, `vid:` | Moderate (~40%) | VideoObject. Major sites increasingly include. |
| `datePublished` | `year:`, `yr:` | Very high (~90%) | ISO date. Direct. |
| `isAccessibleForFree` | `-paywall`, `-pw` | Low (~15%) | Supported but rarely declared. Supplement with domain-level paywall detection. |
| `keywords` | various tags | Moderate (~50%) | Catch-all. Sites dump diet info, season, occasion here. Valuable but noisy. |

**What we derive from `recipeIngredient` (the Rosetta Stone):**

The ingredient list is the single most valuable field. From a parsed ingredient list we can infer:

- `protein:` — Primary protein classification (chicken, beef, pork, tofu, etc.) via ingredient NER
- `allergy:` — Allergen flags by matching against the FDA Big 9 allergen list
- `diet:` — Dietary compliance (no dairy ingredients = dairy-free, no animal products = vegan)
- `budget:` — Rough cost estimation via ingredient price databases (USDA, Instacart)
- `grocery:` — Ingredient rarity/availability tier (mainstream vs specialty vs online-only)
- `ingredients:` — Simple count
- Partial `flavor:` — Ingredient-to-compound mapping (see Tier 4)

**Ingredient parsing strategy:**

Recipe ingredient strings are semi-structured: "2 tablespoons gochujang (Korean chili paste)". We need to extract: quantity (2), unit (tablespoons), ingredient name (gochujang), and preparation state (n/a). Libraries and approaches:

- **recipe-scrapers** (Python, open source) — extracts structured recipe data from 100+ sites
- **Ingredient NER models** — NYU's Ingredient Phrase Tagger, or fine-tuned SpaCy/transformer models
- **USDA FoodData Central** — canonical ingredient taxonomy for normalization. Maps "gochujang" to a standardized food ID with nutrition data.

### Tier 2: RecipeDB (academic structured data)

RecipeDB (IIIT Delhi / Oxford, cosylab.iiitd.edu.in/recipedb) is a structured compilation of 118,171 recipes with deep annotations. Open Access (CC BY 4.0).

**What RecipeDB provides beyond schema.org:**

- 20,280 unique ingredients normalized to a canonical taxonomy
- 268 cooking processes/techniques extracted from instructions
- 69 utensils/equipment identified per recipe
- Temporal sequence of cooking processes (process ordering)
- Cuisine mapping across 26 world regions and 74 countries
- USDA nutrition integration at ingredient level
- Links to FlavorDB for ingredient-to-flavor-compound mapping
- Ingredient category composition (what % of a recipe is "spice" vs "dairy" vs "vegetable")
- Similar recipe discovery via ingredient category and process composition vectors

**How to use it:**

RecipeDB is an SQLite database. It's not a live API for web-scale search, but it's an invaluable training/enrichment resource:

1. Use it to build and validate the ingredient NER model
2. Use its process/technique annotations to train the `technique:` classifier
3. Use its utensil data to seed the `equipment:` taxonomy
4. Use its cuisine mappings to build the `cuisine:` / `region:` normalization dictionary
5. Use its FlavorDB links as the bridge between recipe data and flavor chemistry

**Limitations:** 118K recipes is a good training set but not a consumer-scale index. Sources are AllRecipes, Epicurious, Food Network, TarlaDalal — good but not comprehensive.

### Tier 3: RecipeRadar and other recipe aggregators

RecipeRadar (reciperadar.com) is an open-source (AGPLv3) recipe search engine built on information retrieval principles. Clunky UI but solid data engineering.

**What's useful:**

- ~2,500 normalized ingredient names with synonym mapping
- Ingredient extraction pipeline using recipe-scrapers library
- Treats recipe search as a constraint satisfaction problem (their explicit framing)
- Shelf life, cost, availability, dietary requirements, seasonality as stated design goals
- Federation model — indexes recipes from community GitHub repositories

**How to use it:**

RecipeRadar's ingredient normalization pipeline and its constraint-satisfaction architecture are directly relevant to Flavor Finder's search model. Study their ingredient taxonomy and synonym mapping as a starting point, then extend it.

### Tier 4: Flavor compound databases (the moat)

This is where Flavor Finder becomes something genuinely new. No consumer product currently maps recipes to flavor profiles using volatile compound chemistry. The data exists — it just hasn't been made accessible.

#### FlavorDB2

**URL:** cosylab.iiitd.edu.in/flavordb2
**Coverage:** 25,595 flavor molecules. 2,254 molecules associated with 936 natural ingredients across 34 categories.
**License:** Free for non-commercial use. Commercial use requires explicit permission.
**Built by:** Computational Systems Biology Group, IIIT Delhi (same team as RecipeDB)

**What it provides:**

- Ingredient → flavor molecule mapping (e.g., "garlic" has 76 associated volatile compounds)
- Flavor profile descriptors for each molecule (sweet, fruity, smoky, earthy, etc.)
- Aroma and taste threshold values (how much of a compound is needed to be perceptible)
- Flavor network — shared compound graph showing which ingredients share flavor molecules
- Built-in flavor pairing search
- Functional group and physicochemical property data

**How it powers Flavor Finder operators:**

The `flavor:` operator works by aggregating the flavor profiles of all ingredients in a recipe:

```
Recipe: Gochujang Pork Tacos
Ingredients: pork shoulder, gochujang, brown sugar, garlic, lime, cilantro, corn tortillas

Step 1: Map each ingredient to FlavorDB2 entities
Step 2: Retrieve associated flavor molecules + their profile descriptors
Step 3: Aggregate descriptors across all ingredients:
  - sweet: brown sugar (high), gochujang (moderate) → sweet score: 4/5
  - spicy: gochujang (high) → spicy score: 3/5
  - umami: pork (moderate), gochujang (high), garlic (moderate) → umami score: 4/5
  - bright: lime (high), cilantro (moderate) → bright score: 3/5
  - smoky: gochujang (low) → smoky score: 1/5
Step 4: Index as flavor vector: [sweet:4, spicy:3, umami:4, bright:3, smoky:1]
```

When a user queries `f:sweet+spicy`, we match recipes whose sweet AND spicy scores exceed a threshold.

**The `pairs:` operator** works differently — it queries the flavor network directly:

```
Query: pairs:peanut+lime

Step 1: Look up shared volatile compounds between peanut and lime
Step 2: Find recipes that contain ingredients sharing those same compound bridges
Step 3: Rank by compound overlap density
```

This is the Scryfall-unique move. It's not keyword matching — it's graph traversal over chemical relationships.

#### FooDB (The Food Database)

**URL:** foodb.ca
**Coverage:** 28,000+ chemicals across 1,000+ unprocessed foods
**License:** Free for non-commercial. Commercial requires permission.
**API:** Beta REST API available. Bulk CSV/SDF download available.
**Built by:** University of Alberta (David Wishart lab)

**What it provides beyond FlavorDB2:**

- Much broader chemical coverage (28K+ compounds vs FlavorDB2's 25K, with different scope)
- Macronutrient and micronutrient composition data
- Health effect associations
- Flavor and aroma constituent data with concentration values
- Food source → compound mappings with quantitative data

**How to use it:**

FooDB is the deepest source for quantitative compound-in-food data. Use it to:

1. Fill gaps where FlavorDB2 doesn't have an ingredient
2. Get concentration data for threshold-based flavor intensity scoring (is there enough of compound X in this ingredient to actually taste it?)
3. Cross-reference nutrition data with USDA for the `cal:`, `protein-g:` operators

#### Flavornet

**URL:** flavornet.org
**Coverage:** 738 aroma compounds detected by gas chromatography-olfactometry (GCO)
**Built by:** Terry Acree & Heinrich Arn, Cornell University

**What it provides:**

- Curated list of volatile compounds that humans can actually detect at supra-threshold levels
- Each compound has odor descriptors, retention indices, CAS numbers
- Organized by odor class (fruity, floral, green, roasted, etc.)

**How to use it:**

Flavornet is small but high-signal. Every compound in it has been verified as perceptible by humans — unlike FlavorDB2 which includes many compounds that exist in foods but may not be at perceptible concentrations. Use Flavornet as a **relevance filter**: when scoring a recipe's flavor profile, weight compounds that appear in Flavornet higher than those that don't. If a compound is in Flavornet, it matters to human perception.

#### FSBI-DB (Food Systems Biology Database)

**URL:** fsbi-db.de
**Built by:** Leibniz Institute for Food Systems Biology, Technical University of Munich

**What it provides:**

- Flavor-active compound properties
- Food composition data
- Chemosensory receptor mappings (which taste/smell receptors each compound activates)
- Integration of Leibniz-LSB Odorant Database

**How to use it:**

The receptor mapping data is unique. It bridges the gap between "this compound exists in this food" and "this compound activates these specific taste/smell receptors." For Flavor Finder, this enables more precise flavor dimension scoring — we can distinguish "sweet via sugar receptors" from "sweet via aroma perception."

#### Additional compound data sources

- **BitterDB** (bitterdb.agri.huji.ac.il) — Database of bitter compounds. Useful for the `f:bitter` operator.
- **SuperSweet** — Database of natural and artificial sweeteners. Useful for `f:sweet` intensity.
- **SuperScent** — Database of volatile scent compounds.
- **Phenol-Explorer** (phenol-explorer.eu) — Polyphenol database. Relevant for astringency, bitterness in wine/tea/chocolate contexts.

---

## Integration with FlavorMap

FlavorMap is Flavor Finder's existing algorithm built on chef-recommended ingredient pairings — the empirical wisdom captured in resources like The Flavor Bible.

**The key insight:** FlavorMap and the volatile compound databases answer the same question from different directions:

- **FlavorMap (chef knowledge):** "Peanut and lime go together because chefs say so, and it works in Thai, Vietnamese, and West African cuisines."
- **FlavorDB2 (chemistry):** "Peanut and lime share volatile compounds X, Y, Z — specifically, they both contain linalool and certain esters that create complementary aroma profiles."

These are not competing approaches — they're complementary evidence layers.

### The hybrid scoring model

For the `pairs:` operator, Flavor Finder should use a weighted combination:

```
pairing_score = (w1 * chef_recommendation_score) + (w2 * shared_compound_score) + (w3 * co_occurrence_score)
```

Where:
- `chef_recommendation_score` — FlavorMap's existing data. Binary or weighted. Source: The Flavor Bible's pairing recommendations, curated chef knowledge.
- `shared_compound_score` — Number and perceptual relevance of shared volatile compounds between two ingredients. Source: FlavorDB2 + Flavornet relevance filter.
- `co_occurrence_score` — How often these ingredients appear together in real recipes. Source: RecipeDB co-occurrence matrix, web-crawled recipe data.

**Why all three matter:**

- Chemistry alone misses context. Strawberry and cheddar share volatile compounds but don't make good partners in most culinary contexts.
- Chef recommendations alone are limited to what's been tried and documented. The Flavor Bible is North American/European-centric.
- Co-occurrence alone just reinforces existing combinations. It'll never suggest something novel.

The sweet spot is using chemistry to **discover** potential pairings, chef knowledge to **validate** them, and co-occurrence to **contextualize** them (what cuisine, what technique, what other ingredients).

### Bridging the science books

The conceptual frameworks from key texts should inform how we translate raw compound data into user-facing flavor dimensions:

**The Flavor Bible (Page & Dornenburg):**
- Provides the "classic pairings" knowledge base that FlavorMap is built on
- Organizes by ingredient → "what goes with it" with intensity/affinity ratings
- Gaps: Doesn't explain *why* pairings work, limited to documented chef experience, Western-centric

**The Art and Science of Foodpairing (Peter Coucquyt, Bernard Lahousse, Johan Langenbick):**
- Introduces the "foodpairing tree" — hierarchical clustering of ingredients by shared aroma compounds
- Key principle: ingredients that share key volatile aroma compounds tend to pair well
- Provides the methodological basis for compound-based pairing scores
- The foodpairing.com commercial API exists but is expensive and proprietary

**The Flavor Matrix (James Briscione):**
- Organizes flavor relationships into a visual matrix of ingredient interactions
- Categorizes flavors into dimensions: sweet, sour, salt, bitter, umami, fat, spicy, plus aroma families
- Provides the UX framework for how to present compound data accessibly — the matrix visualization is more intuitive than a compound list
- Key insight: ingredients have "flavor fingerprints" across multiple dimensions simultaneously

### Translating chemistry to user-facing dimensions

The raw compound data is molecular — users don't search for "linalool." We need a translation layer:

```
Molecular level (FlavorDB2):        linalool, citral, eugenol, vanillin...
     ↓ aggregate by descriptor
Aroma descriptor level:             floral, citrusy, spicy-warm, sweet-vanilla...
     ↓ cluster into dimensions
User-facing flavor dimension:       bright, aromatic, sweet, warm
     ↓ score intensity
Operator value:                     f:bright>3 f:aromatic>2 f:sweet>4
```

**Proposed flavor dimensions and their compound/descriptor mappings:**

| User dimension | Compound descriptors (from FlavorDB2) | Examples |
|---|---|---|
| `sweet` | sweet, caramel, vanilla, honey, sugary, candy | vanillin, furaneol, maltol |
| `spicy` | pungent, hot, peppery, biting | capsaicin, piperine, allyl isothiocyanate |
| `sour/bright` | acidic, citrus, tart, sharp, fresh, zesty | citric acid, citral, limonene |
| `umami` | savory, meaty, brothy | glutamic acid, inosinic acid, guanylic acid |
| `bitter` | bitter, astringent | caffeine, quinine, naringin |
| `smoky` | smoky, roasted, charred, burnt, toasted | guaiacol, 4-methylguaiacol, furfural |
| `rich` | fatty, buttery, creamy, oily | diacetyl, butyric acid, oleic acid |
| `funky` | fermented, cheesy, pungent, musty | butyric acid, isovaleric acid, trimethylamine |
| `aromatic` | herbal, spiced, warm-spice, resinous | linalool, eugenol, cineole, thymol |
| `earthy` | mushroom, truffle, soil, root | 1-octen-3-ol, geosmin, 2-methylisoborneol |
| `nutty` | nutty, toasted, roasted, grain | pyrazines, benzaldehyde |
| `floral` | floral, rose, lavender, jasmine | geraniol, linalool, beta-ionone |
| `herbaceous` | green, grassy, leafy, fresh-cut | cis-3-hexenol, hexanal |

---

## Data pipeline architecture

### Phase 1: Schema.org harvest (MVP)

```
Web crawl (CommonCrawl / targeted) → Extract JSON-LD Recipe markup
    → Parse & normalize fields
    → Ingredient NER pipeline
    → Index into search engine (Typesense / Meilisearch / Elasticsearch)
    → Expose Scryfall-style query parser
```

**Operators enabled at Phase 1:**
`has:`, `ingredient:`, `ingredients:`, `time:`, `cuisine:`, `meal:`, `course:`, `serves:`, `author:`, `rating:`, `reviews:`, `steps:`, `video:`, `year:`, `sort:`, exact phrase search, boolean operators

**Estimated recipe count:** 5-50M+ recipes depending on crawl scope.

### Phase 2: Enrichment pipeline (LLM + heuristics)

```
Phase 1 index → LLM enrichment pass per recipe
    → Classify: protein, diet, allergens, effort, speed, active/passive time split
    → Classify: technique, equipment (from instruction text)
    → Classify: occasion, leftover quality, meal-prep suitability
    → Tag: tested (source domain lookup), paywall (domain + crawl check)
    → Estimate: budget (ingredient price lookup via USDA/grocery APIs)
    → Estimate: grocery tier (ingredient rarity classifier)
```

**Operators enabled at Phase 2:**
`protein:`, `diet:`, `allergy:`, `effort:`, `speed:`, `active:`, `passive:`, `technique:`, `equipment:`, `occasion:`, `leftover:`, `tested:`, `-paywall`, `budget:`, `grocery:`, `macro:`, `temp:`

### Phase 3: Flavor graph integration (the moat)

```
FlavorDB2 + FooDB + Flavornet data → Build ingredient-compound mapping table
    → For each recipe in index:
        → Map ingredients to compounds
        → Filter by Flavornet perceptibility (is this compound present above threshold?)
        → Aggregate compound descriptors into flavor dimension scores
        → Store as flavor vector per recipe
    → Build flavor pairing graph (ingredient → shared compounds → paired ingredients)
    → Integrate FlavorMap chef pairing data as validation/weighting layer
    → Enable flavor: and pairs: operators
```

**Operators enabled at Phase 3:**
`flavor:` (all dimensions + intensity), `pairs:`, `texture:` (partial), `fusion:` (via multi-cuisine ingredient co-occurrence)

### Phase 4: Contextual intelligence

```
Seasonal produce database (USDA + regional calendars) + user geolocation
    → Enable season:now
Ingredient price APIs (Instacart, grocery chain APIs)
    → Enable real-time budget: scoring
User taste profile + search history
    → Enable personalized ranking and recommendation
```

**Operators enabled at Phase 4:**
`season:now` (geo-aware), real-time `budget:`, personalized `sort:relevance`

---

## Regarding KitchenQuery

KitchenQuery (Kelley Sweitzer) is an academic project — a recipe search engine built with PyTerrier using Doc2Query expansion and BM25 + RM3 query expansion. No working version is publicly available, only a Medium article describing the methods.

**What's useful from it (methodology, not code):**

- Their Doc2Query approach of inferring diet tags from ingredient lists is directly applicable. They added synthetic descriptors like "vegan plant-based no_meat no_eggs" to recipe documents based on ingredient analysis — this is essentially what our Phase 2 enrichment pipeline does.
- Their query expansion strategy (RM3) for handling synonym matching ("gf" → "gluten-free" → "celiac-friendly") is relevant to our abbreviation system.
- Their finding that BM25 baseline was adequate for simple queries but fell off for complex/compositional queries validates the need for a structured operator syntax rather than just full-text search.

**What's not useful:** The code/system itself. It's a class project, not production software.

---

## Regarding RecipeRadar

RecipeRadar is clunky as a consumer product but has genuine engineering substance.

**Worth studying:**

- Their ingredient normalization pipeline (~2,500 canonical ingredient names with synonym mapping)
- Their use of recipe-scrapers for data ingestion
- Their constraint-satisfaction framing of recipe search
- Their AGPLv3 codebase (github.com/openandclose/reciperadar) as reference architecture
- Their stated goal of incorporating "flavour profiles" and "seasonality of produce in their local area" — aligned with Flavor Finder but not yet implemented

**Not worth using directly:** The frontend, the search UX, or the hosting infrastructure.

---

## Open questions and risks

1. **FlavorDB2 licensing for commercial use.** Free for non-commercial. Need to contact IIIT Delhi (Ganesh Bagler's lab) for commercial terms. Same for FooDB.

2. **Ingredient NER accuracy at scale.** Parsing "2 tablespoons gochujang (Korean chili paste)" is easy. Parsing "a generous glug of good olive oil" is hard. Error rate compounds across millions of recipes.

3. **Flavor scoring calibration.** The compound-to-dimension mapping is an approximation. Two recipes with the same `f:sweet` score may taste very different. Need user feedback loops to calibrate.

4. **Compound threshold data is incomplete.** Flavornet covers 738 compounds. FooDB has concentration data for many ingredients but not all. For some ingredient-compound pairs, we won't know if the compound is present at perceptible levels.

5. **The "strawberry and cheddar" problem.** Shared compounds don't always mean good pairings. The hybrid scoring model (chemistry + chef knowledge + co-occurrence) addresses this, but weighting the factors is an ongoing tuning problem.

6. **Web crawl at recipe scale.** CommonCrawl has recipe data but extracting and deduplicating at scale is engineering-intensive. Alternatively, start with a curated source list (top 200 recipe sites) and expand.

7. **Freshness.** Recipe data is mostly static (recipes don't change often), but ratings, reviews, and paywall status do. Need a re-crawl strategy.

---

## Summary: what makes this different

Every existing recipe search tool does keyword matching or faceted filtering on surface-level metadata. Flavor Finder's thesis is that flavor is a *computable dimension* — and that the scientific data to compute it already exists, scattered across academic databases that have never been assembled into a consumer product.

The build order is:

1. **Ship on schema.org data** — free, structured, web-scale. Gets you a working product with 15+ operators.
2. **Enrich with LLM classification** — unlocks the operators that require understanding (active time, effort, diet inference, technique extraction).
3. **Integrate flavor chemistry** — FlavorDB2 + FooDB + Flavornet + FlavorMap. This is the moat. Nobody else has done it. The `flavor:` and `pairs:` operators become the reason people use Flavor Finder instead of Google.
4. **Add contextual intelligence** — seasonality, real-time pricing, personalization. This is the long game.

The Scryfall analogy holds: Scryfall is the best MTG search engine because it understands the *structure* of Magic cards deeply. Flavor Finder can be the best recipe search engine by understanding the *structure* of flavor deeply.
