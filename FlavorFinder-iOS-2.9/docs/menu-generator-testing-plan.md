# Menu Generator Testing Plan

## Objective
Validate that the menu generator creates logical, realistic dishes across all dish types, compatibility modes, and featured ingredient categories. Identify whether improvements should come from:
1. Menu generation logic refinements
2. Ingredient category/subcategory adjustments
3. Enhanced role-based generation
4. New category structures

## Test Methodology

### Phase 1: Systematic Category Testing
Test each major category as a featured ingredient to validate generation logic across the ingredient spectrum.

#### Test Matrix: Featured Ingredient × Dish Type × Compatibility Mode

**Featured Ingredient Categories to Test:**
- **Proteins**: Chicken, Salmon, Tofu, Beef
- **Vegetables**: Tomato, Carrot, Spinach, Onion, Mushroom
- **Fruits**: Lemon, Apple, Strawberry, Mango
- **Dairy**: Parmesan, Cream, Yogurt
- **Grains**: Rice, Pasta
- **Seasonings**: Thyme, Cumin, Basil
- **Pantry**: Olive Oil, Soy Sauce, Honey, Balsamic Vinegar
- **Alcohol**: White Wine, Bourbon

**Dish Types:**
- Entree
- Side
- Salad
- Dessert
- Beverage
- Sauce

**Compatibility Modes:**
- Freeform (no featured ingredient constraint)
- Flexible (main ingredients must pair with featured)
- Strict (all ingredients must pair with featured)

**Total Test Cases**: ~288 combinations (8 categories × 6 dish types × 3 modes × 2 samples each)

### Phase 2: Automated Batch Testing

Create test harness that:
1. Generates 10 dishes per test case
2. Records success rate (% successful generations)
3. Captures ingredient composition per dish
4. Logs fallback events (tiers 1-7)
5. Analyzes role fulfillment rates

### Phase 3: Qualitative Analysis

For each generated dish, evaluate:

#### A. **Culinary Logic**
- [ ] Does the dish make sense as a real recipe?
- [ ] Are all ingredients appropriate for the dish type?
- [ ] Do flavor pairings feel natural?
- [ ] Is there proper balance (not all aromatics, not missing key roles)?

#### B. **Role Fulfillment**
Track how often required/preferred roles are filled:
- **Entree**: main (protein), aromatic, fat, supporting
- **Salad**: leafy greens (1-2), fat, acid
- **Dessert**: sweetener, main (fruit), fat, aromatic
- **Sauce**: fat, aromatic, acid, liquid
- **Side**: main (grain/veg), aromatic, fat
- **Beverage**: alcohol, aromatic, acid

#### C. **Category Appropriateness**
- Are ingredients in the right categories?
- Should any subcategories be split or merged?
- Are "excluded featured subcategories" (Herbs, Spices, Oils & Fats, Vinegars) correct?

#### D. **Fallback Analysis**
Count fallback tier usage per dish type:
- **Tier 1**: Direct pairing with required roles
- **Tier 2**: Bridge ingredients
- **Tier 3**: Taste-based substitution
- **Tier 4**: Role relaxation (skip preferred/optional)
- **Tier 7**: Complete failure (nil return)

High Tier 3-7 usage = need better category/role data

## Test Cases by Dish Type

### 1. Entree Testing
**Featured Ingredients**: Chicken, Salmon, Tofu, Beef, Mushroom
**Expected Role Composition**:
- Main (protein): 1 required
- Aromatic: 1 preferred
- Fat: 1 preferred
- Supporting: 1 optional

**Success Criteria**:
- Always includes a protein (even if featured is not protein, e.g., Mushroom)
- Has aromatic base (onion, garlic, herbs)
- Includes fat source (oil, butter, cheese)
- Makes sense as a main course

**Common Issues to Watch**:
- Non-protein featured ingredients (Mushroom → should add Chicken/Tofu)
- Missing aromatic base
- Too many seasonings, not enough substance

### 2. Salad Testing
**Featured Ingredients**: Spinach, Arugula, Tomato, Cucumber, Lemon
**Expected Role Composition**:
- Supporting (leafy greens): 1-2 required
- Fat: 1 preferred
- Acid: 1 preferred

**Success Criteria**:
- Has at least one leafy green (Spinach, Arugula, Lettuce, Kale, etc.)
- Includes fat (olive oil, cheese, avocado)
- Includes acid (vinegar, lemon, lime)
- Reads like a salad, not a cooked dish

**Common Issues to Watch**:
- No leafy greens (using only Tomato, Cucumber, etc.)
- Bridge fallback usage for difficult pairings (Saffron → Lemon → Arugula)
- Missing acid or fat
- Proteins appearing as main ingredient (should be supporting)

### 3. Dessert Testing
**Featured Ingredients**: Strawberry, Chocolate, Vanilla, Apple, Honey
**Expected Role Composition**:
- Sweetener: 1 required
- Main (fruit/sweet base): 1 preferred
- Fat: 1 preferred
- Aromatic: 1 optional

**Success Criteria**:
- Always includes sweetener (sugar, honey, maple syrup)
- Has sweet base (fruit, chocolate, vanilla)
- Includes richness (cream, butter, coconut milk)
- NO savory proteins or vegetables

**Common Issues to Watch**:
- Proteins/vegetables leaking in (excluded categories not working)
- Missing sweetener
- Taste fallback to high-sweet ingredients working properly

### 4. Sauce Testing
**Featured Ingredients**: Tomato, Cream, Soy Sauce, Balsamic Vinegar, Butter
**Expected Role Composition**:
- Fat: 1 preferred
- Aromatic: 1 preferred
- Acid: 1 optional
- Liquid: 1 optional

**Success Criteria**:
- Has fat base (oil, butter, cream)
- Has aromatic (garlic, onion, herbs)
- Makes sense as a sauce (not a standalone dish)
- Balanced flavor profile

**Common Issues to Watch**:
- Too thick/thin (missing liquid or too many liquids)
- No fat base
- Reads like a full dish instead of a sauce

### 5. Side Testing
**Featured Ingredients**: Rice, Pasta, Carrot, Broccoli, Potato
**Expected Role Composition**:
- Main (grain/veg): 1 required
- Aromatic: 1 preferred
- Fat: 1 optional

**Success Criteria**:
- Has grain OR substantial vegetable as base
- Includes aromatic (garlic, onion)
- Complements main course (not stealing the show)

**Common Issues to Watch**:
- Too complex (should be simpler than entree)
- Missing aromatic
- Proteins as featured (should filter to non-meat subcategories)

### 6. Beverage Testing
**Featured Ingredients**: White Wine, Bourbon, Vodka, Rum
**Expected Role Composition**:
- Main (alcohol): 1 required
- Aromatic: 1 optional
- Acid: 1 optional

**Success Criteria**:
- Has alcohol base
- Modifiers make sense (citrus, herbs, sweeteners)
- NO proteins or vegetables

**Common Issues to Watch**:
- Excluded categories not working (vegetables, proteins)
- Too many modifiers (should be simple: 2-3 ingredients)

## Data Collection Template

For each test case, record:

```
Featured Ingredient: [name]
Dish Type: [type]
Compatibility Mode: [mode]
Success Rate: [X/10]

Sample Dishes:
1. [ingredient list]
   - Culinary Logic: ✓/✗
   - Role Fulfillment: [main: ✓, aromatic: ✓, fat: ✗, etc.]
   - Notes: [any issues]

2. [ingredient list]
   ...

Fallback Events:
- Tier 1: X times
- Tier 2: X times
- Tier 3: X times
- Tier 7: X times

Issues Identified:
- [ ] Category misassignment
- [ ] Missing role
- [ ] Logic refinement needed
- [ ] New category needed

Recommendations:
[specific suggestions]
```

## Analysis Framework

After collecting data, analyze across dimensions:

### 1. Success Rate by Category
Which featured ingredient categories have:
- High success (>90%): Working well
- Medium success (70-90%): Need minor tweaks
- Low success (<70%): Need significant changes

### 2. Role Fulfillment Rates
For each dish type, track:
- Required roles filled: Should be 100%
- Preferred roles filled: Should be >80%
- Optional roles filled: Should be >50%

### 3. Fallback Frequency
High Tier 2-3 usage indicates:
- Ingredient categories too restrictive
- Need better role data
- Pairing data gaps

### 4. Category Analysis
Flag ingredients that consistently cause issues:
- Wrong category? (e.g., should Tomato be Vegetable or Fruit?)
- Wrong subcategory? (e.g., should we split "Leafy Greens" from "Salad Greens"?)
- Missing subcategory? (e.g., "Alliums" vs "Other Vegetables")

### 5. Culinary Logic Patterns
Common failure modes:
- "Salads" with no greens
- "Desserts" with savory elements
- "Sauces" that read like full dishes
- "Entrees" with no protein

## Recommendations Framework

Based on findings, prioritize fixes:

### Priority 1: Critical Failures
- Required roles not being filled
- Wrong categories appearing in dish types
- Success rate <50%

**Solutions**:
- Fix category exclusions
- Adjust role requirements
- Add missing ingredient data

### Priority 2: Logic Refinements
- Dishes make sense but lack polish
- Success rate 70-90%
- Preferred roles inconsistently filled

**Solutions**:
- Tune role inference logic
- Adjust fallback tier thresholds
- Refine taste-based substitution

### Priority 3: Category Restructuring
- Consistent category-based failures
- Subcategory confusion
- Ingredients in wrong buckets

**Solutions**:
- Split/merge subcategories
- Add new categories
- Reclassify ingredients

### Priority 4: Enhanced Roles
- Dishes work but could be better
- Success rate >90%
- Want more variety

**Solutions**:
- Add explicit role data to ingredients
- Create dish type variants
- Add culinary style parameters

## Test Execution Plan

### Week 1: Automated Testing
1. Build test harness in Swift
2. Run full test matrix (288 cases × 10 samples = 2,880 dishes)
3. Export results to CSV/JSON

### Week 2: Manual Review
1. Review 100 sample dishes (stratified by dish type)
2. Rate culinary logic (1-5 scale)
3. Document failure patterns
4. Identify category issues

### Week 3: Analysis & Recommendations
1. Aggregate statistics
2. Create visualizations (success rate by category, role fulfillment heatmap)
3. Write recommendations document
4. Prioritize fixes

### Week 4: Implementation & Validation
1. Implement Priority 1 fixes
2. Re-run tests on fixed logic
3. Validate improvements
4. Iterate if needed

## Key Questions to Answer

1. **Category Structure**: Are our 8 categories + subcategories sufficient, or do we need new ones?
2. **Role Coverage**: Do all ingredients have appropriate roles assigned (explicit or inferred)?
3. **Generation Strategy**: Is role-based generation better than category-based, or do we need both?
4. **Fallback Effectiveness**: Are taste-based substitutions and bridge ingredients working?
5. **Exclusion Rules**: Are "excluded featured subcategories" and "excluded supporting categories" correct?
6. **Dish Type Formulas**: Do our role requirements per dish type reflect real culinary structure?

## Expected Outcomes

By the end of testing, we should have:
1. **Quantitative metrics**: Success rates, role fulfillment rates, fallback frequencies
2. **Qualitative assessment**: Culinary logic ratings, failure pattern documentation
3. **Actionable recommendations**: Specific fixes prioritized by impact
4. **Validation data**: Before/after comparison showing improvements

## Next Steps

Would you like me to:
1. **Build the automated test harness** to run batch generations?
2. **Run a sample test** on a specific dish type (e.g., 10 salads with different featured ingredients)?
3. **Create a Swift test file** with the test matrix and evaluation logic?
4. **Start with manual testing** on a subset of cases to validate the approach?

I recommend starting with **Option 2** (sample test) to validate the testing methodology before building the full harness. We can manually generate 20-30 dishes across a few dish types and review them together to calibrate expectations before automating.
