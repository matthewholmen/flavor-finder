# Menu Generator Test Harness - Usage Guide

## Overview

The automated test harness generates dishes systematically and collects quantitative data to validate menu generation logic. It tests **27 featured ingredients** across **6 dish types** in **2 compatibility modes**, generating **10 samples per case** for a total of **3,240 dishes**.

## Quick Start

### Option 1: Run Tests via UI (Recommended)

1. **Add the test view to your app** (temporary integration)
2. **Launch the app** on your iPhone
3. **Navigate to the test screen**
4. **Tap "Run Full Test Suite"**
5. **Wait for completion** (~2-5 minutes depending on device)
6. **Export results** in your preferred format (Markdown, CSV, or JSON)

### Option 2: Run Tests Programmatically

```swift
// In your app or test target
let testRunner = MenuGeneratorTestRunner(
    menuGenerator: appState.menuGenerator,
    ingredientService: appState.ingredientService
)

Task {
    let results = await testRunner.runFullTestSuite(samplesPerCase: 10)

    // Export markdown report
    let markdown = TestResultsExporter.exportMarkdownReport(results)
    print(markdown)

    // Or export CSV
    let csv = TestResultsExporter.exportSummaryCSV(results)

    // Or save to file
    TestResultsExporter.saveToFile(markdown, filename: "test-results.md")
}
```

## Test Configuration

### Test Matrix

**Featured Ingredients (27 total)**:
- Proteins: chicken, salmon, tofu, beef
- Vegetables: tomato, carrot, spinach, onion, mushroom
- Fruits: lemon, apple, strawberry, mango
- Dairy: parmesan, heavy cream, yogurt
- Grains: rice, pasta
- Seasonings: thyme, cumin, basil
- Pantry: olive oil, soy sauce, honey, balsamic vinegar
- Alcohol: white wine, bourbon

**Dish Types (6)**:
- Entree
- Side
- Salad
- Dessert
- Beverage
- Sauce

**Compatibility Modes (2)**:
- Flexible: Main ingredients pair with featured ingredient
- Strict: All ingredients pair with featured ingredient

**Samples per case**: 10

**Total test cases**: 27 × 6 × 2 = 324
**Total dishes generated**: 324 × 10 = 3,240

## What Gets Measured

### 1. Success Rate
Percentage of successful dish generations (non-nil results).
- **Goal**: >90%
- **Acceptable**: 70-90%
- **Problem**: <70%

### 2. Role Fulfillment Score
Weighted score based on how well dishes fulfill their role requirements:
- Required roles: 3 points each (MUST have)
- Preferred roles: 2 points each (should have)
- Optional roles: 1 point each (nice to have)

**Scoring**: (actual points / max possible points) × 100

**Pass threshold**: ≥60%

Example for Entree:
- Required: main (3 pts)
- Preferred: aromatic (2 pts), fat (2 pts)
- Optional: supporting (1 pt)
- Max score: 8 pts
- Pass score: ≥5 pts (62.5%)

### 3. Category Validation
Checks if dishes contain invalid ingredient categories for their dish type.

Example violations:
- Desserts with proteins or vegetables
- Beverages with proteins or vegetables

**Goal**: 100% (no violations)

### 4. Ingredient Count
Average number of ingredients per dish.
- Typical range: 3-5 ingredients
- Too few (<3): Incomplete dishes
- Too many (>6): Over-complicated

### 5. Generation Time
Time to generate each dish in milliseconds.
- Typical: 10-100ms
- Slow: >500ms (indicates backtracking issues)

## Export Formats

### Markdown Report
**Filename**: `test-results.md`

**Contains**:
- Overview statistics (success rate, role score, category validation)
- Results by dish type (table format)
- Results by ingredient category (table format)
- Results by compatibility mode (table format)
- Problem cases (success rate <70%)
- Category validation failures (with specific ingredient violations)
- Sample successful dishes

**Best for**: Human-readable analysis, sharing with team

### CSV Summary
**Filename**: `test-results.csv`

**Columns**:
- Featured Ingredient
- Category
- Subcategory
- Dish Type
- Mode
- Success Rate %
- Avg Ingredients
- Avg Role Score %
- Category Valid %
- Avg Time (ms)

**Best for**: Excel analysis, charts, pivot tables

### CSV Detailed
**Filename**: `test-results-detailed.csv`

**Columns**:
- Featured Ingredient
- Dish Type
- Mode
- Sample #
- Success (YES/NO)
- Ingredients (semicolon-separated)
- Ingredient Count
- Generation Time (ms)

**Best for**: Dish-level analysis, recipe validation

### JSON Full Data
**Filename**: `test-results.json`

**Contains**: Complete structured data including:
- All test cases
- All generation results
- Role fulfillment analysis per dish
- Category validation per dish
- Taste profiles per dish

**Best for**: Programmatic analysis, custom visualizations, archival

## Interpreting Results

### Success Rate Analysis

**By Dish Type**:
- Which dish types have low success rates?
- Are certain dish types failing consistently?

**By Category**:
- Which featured ingredient categories struggle?
- Do Seasonings/Pantry items fail as featured ingredients?

**By Mode**:
- Is Strict mode significantly harder than Flexible?
- What's the success rate drop from Flexible → Strict?

### Role Fulfillment Analysis

**Low scores (<60%) indicate**:
- Required roles not being filled
- Role inference logic issues
- Ingredient category misassignment

**Questions to ask**:
- Which roles fail most often? (Check per dish type)
- Are we missing key ingredient roles in our data?
- Should role requirements be relaxed?

### Category Validation Failures

**Indicates**:
- Excluded category logic not working
- Ingredients in wrong categories
- Formula excludedSupportingCategories incomplete

**Questions to ask**:
- Which ingredients leak into wrong dish types?
- Should certain subcategories be excluded?
- Are category mappings correct?

### Common Failure Patterns

**Salads with no leafy greens**:
- Role inference for "Leafy Greens" subcategory failing
- Bridge fallback not working
- Check: Does featured ingredient pair with ANY leafy green?

**Desserts with savory items**:
- Category exclusion not working
- Check: Are proteins/vegetables properly excluded?

**Entrees with no protein**:
- forEntree logic not adding protein
- Check: Non-protein featured ingredients (mushroom, rice)

**Sauces that are too thick**:
- Missing liquid role
- Check: Is liquid marked as preferred/optional?

## Recipe Validation (Manual Step)

After reviewing generated dishes, validate with Google search:

1. **Pick interesting combinations** from results
2. **Search Google**: `"[ingredient1] [ingredient2] [ingredient3] recipe"`
3. **Note findings**:
   - ✓ Found many recipes (common combination)
   - ~ Found 1-5 recipes (valid but uncommon)
   - ✗ Found zero recipes (unrealistic pairing)

**Create a spreadsheet**:
| Dish Type | Featured Ingredient | Generated Ingredients | Recipe Count | Notes |
|-----------|-------------------|---------------------|--------------|-------|
| Entree | Chicken | chicken, garlic, lemon, olive oil | Many | Classic combo |
| Salad | Tomato | tomato, basil, mozzarella, balsamic | Many | Caprese salad |
| Dessert | Strawberry | strawberry, chocolate, cream, vanilla | Many | Common dessert |

This helps identify:
- **Realistic combinations**: Found in real recipes
- **Creative combinations**: Valid but uncommon
- **Unrealistic combinations**: No real-world examples

## Next Steps After Testing

### 1. Analyze Results
- Run the test suite
- Export all formats (Markdown, CSV, JSON)
- Review summary statistics
- Identify problem areas

### 2. Prioritize Fixes
Based on findings, prioritize:

**Priority 1: Critical (<50% success rate)**
- Category exclusions not working
- Required roles not filled
- Generation completely failing

**Priority 2: Refinement (70-90% success)**
- Preferred roles inconsistently filled
- Some unrealistic combinations
- Role inference needs tuning

**Priority 3: Category Adjustments**
- Ingredients in wrong categories
- Subcategory confusion
- Need new subcategories

**Priority 4: Enhancement (>90% success)**
- Add variety
- Improve realism
- Add explicit role data

### 3. Implement Fixes
Address issues in order:
1. Fix MenuGenerator logic
2. Update ingredient categories
3. Add/adjust role data
4. Re-run tests to validate

### 4. Iterate
- Compare before/after results
- Track improvement metrics
- Continue until goals met

## File Locations

**Test Files**:
- `FlavorFinder/Utilities/Testing/MenuGeneratorTestModels.swift`
- `FlavorFinder/Utilities/Testing/MenuGeneratorTestRunner.swift`
- `FlavorFinder/Utilities/Testing/TestResultsExporter.swift`
- `FlavorFinder/Views/Testing/MenuGeneratorTestView.swift`

**Output Files** (in app's Documents folder):
- `Documents/TestResults/test-results.md`
- `Documents/TestResults/test-results.csv`
- `Documents/TestResults/test-results.json`

## Tips

1. **Start small**: Run a subset first (e.g., 1-2 featured ingredients) to validate
2. **Review samples**: Don't just look at statistics—read actual ingredient lists
3. **Test on device**: Runs faster than simulator
4. **Export early**: Save results before analyzing to avoid losing data
5. **Compare modes**: Look at Flexible vs Strict differences to understand constraints
6. **Focus on outliers**: Highest/lowest performers tell you the most

## Troubleshooting

**Tests taking too long (>10 min)**:
- Reduce samplesPerCase from 10 to 5
- Run smaller subsets (filter TestIngredient.testSet)

**App crashes during testing**:
- Memory issue: Run in smaller batches
- Check for infinite loops in backtracking

**All results show 0% success**:
- Services not initialized properly
- Check AppState initialization
- Verify flavorPairings.json loaded

**Export files not found**:
- Check app's Documents directory
- Look in Files app under "On My iPhone" → FlavorFinder
- Use Xcode's Device window to browse container
