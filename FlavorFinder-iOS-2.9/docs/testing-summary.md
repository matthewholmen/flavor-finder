# Menu Generator Testing - Quick Reference

## What We Built

An automated test harness that:
- ✅ Generates **3,240 dishes** across all combinations
- ✅ Measures **success rate**, **role fulfillment**, and **category validation**
- ✅ Exports results in **Markdown**, **CSV**, and **JSON** formats
- ✅ Runs in-app with progress tracking
- ✅ Takes **2-5 minutes** to complete

## Files Created

### Test Infrastructure
```
FlavorFinder/Utilities/Testing/
├── MenuGeneratorTestModels.swift      # Data models for test cases and results
├── MenuGeneratorTestRunner.swift     # Core test execution logic
└── TestResultsExporter.swift         # Export to Markdown/CSV/JSON

FlavorFinder/Views/Testing/
└── MenuGeneratorTestView.swift       # SwiftUI interface for running tests
```

### Documentation
```
docs/
├── menu-generator-testing-plan.md    # Complete testing methodology
├── testing-harness-usage.md          # How to use the test harness
├── testing-integration-guide.md      # How to integrate into your app
└── testing-summary.md                # This file (quick reference)
```

## Test Configuration

| Metric | Value |
|--------|-------|
| Featured Ingredients | 27 (across 8 categories) |
| Dish Types | 6 (Entree, Side, Salad, Dessert, Beverage, Sauce) |
| Compatibility Modes | 2 (Flexible, Strict) |
| Samples per Case | 10 |
| **Total Test Cases** | **324** |
| **Total Dishes** | **3,240** |

## What Gets Measured

### 1. Success Rate
**What**: % of test cases that successfully generate dishes (non-nil)

**Goal**: >90%

**Scale**:
- 🟢 >90%: Excellent
- 🟡 70-90%: Needs refinement
- 🔴 <70%: Critical issues

### 2. Role Fulfillment Score
**What**: Weighted score based on required/preferred/optional role completion

**Formula**: (3 × required + 2 × preferred + 1 × optional) / max possible × 100

**Goal**: >70%

**Pass Threshold**: ≥60%

### 3. Category Validation
**What**: % of dishes with no invalid ingredient categories

**Example violations**:
- Desserts with proteins/vegetables
- Beverages with proteins/vegetables

**Goal**: 100%

### 4. Additional Metrics
- Avg ingredient count per dish (target: 3-5)
- Avg generation time (target: <100ms)

## How to Run

### Step 1: Integrate
Add test view to your app (pick one):
- **Settings tab**: Most convenient
- **Debug menu**: Cleanest (hidden from users)
- **Temporary tab**: Easiest for testing

```swift
// In SettingsView.swift
NavigationLink {
    MenuGeneratorTestView(appState: appState)
} label: {
    Label("Menu Generator Testing", systemImage: "chart.bar.doc.horizontal")
}
```

### Step 2: Run
1. Open app on your iPhone
2. Navigate to test view
3. Tap "Run Full Test Suite"
4. Wait 2-5 minutes

### Step 3: Export
Choose format:
- **Markdown**: Human-readable report with tables and analysis
- **CSV**: Data for Excel/Numbers (pivot tables, charts)
- **JSON**: Complete structured data for custom analysis

### Step 4: Analyze
Review key sections:
1. **Overview**: Overall success rate, role score, category validation
2. **By Dish Type**: Which dish types struggle?
3. **By Category**: Which featured ingredient categories fail?
4. **Problem Cases**: Specific combinations with <70% success
5. **Category Violations**: Invalid ingredients in wrong dish types

## Example Results Interpretation

### Scenario 1: High Success, Low Role Score
```
Success Rate: 95%
Role Score: 65%
```

**Meaning**: Dishes generate successfully but miss preferred roles (e.g., entrees without aromatic base)

**Fix**: Adjust role requirements or improve role inference logic

### Scenario 2: Low Success, High Role Score (for successful dishes)
```
Success Rate: 70%
Role Score: 88%
```

**Meaning**: When dishes succeed they're good, but many fail to generate at all

**Fix**: Pairing data gaps, featured ingredient filtering issues, or backtracking problems

### Scenario 3: Category Validation Failures
```
Category Validation: 85%
```

**Meaning**: 15% of dishes contain invalid categories (e.g., beef in desserts)

**Fix**: Update excluded category logic in MenuGenerator

## Common Findings

Based on testing methodology, expect to find:

### 1. Salad Generation Issues
**Problem**: Salads with non-vegetable featured ingredients struggle (Cumin Salad? Soy Sauce Salad?)

**Fix**: Filter featured ingredient candidates for salads to vegetables/fruits only

### 2. Category Exclusions
**Problem**: Desserts/beverages sometimes contain proteins or vegetables

**Fix**: Verify `excludedSupportingCategories` is properly enforced in generation logic

### 3. Seasonings as Featured Ingredients
**Problem**: Herbs/spices/oils as featured ingredients create unrealistic dishes

**Fix**: Expand `excludedFeaturedSubcategories` or filter per dish type

### 4. Bridge Fallback Usage
**Problem**: Difficult pairings (e.g., Saffron Salad) rely on bridge ingredients

**Fix**: Improve bridge selection logic or expand pairing data

## Recipe Validation (Manual)

After automated testing, manually validate 20-30 sample dishes:

### Process
1. Pick dishes from test results (mix of high/medium/low scores)
2. Google search: `"[ingredient1] [ingredient2] [ingredient3] recipe"`
3. Record findings:
   - ✅ Many recipes (realistic)
   - ⚠️ Few recipes (valid but uncommon)
   - ❌ No recipes (unrealistic)

### Example Template
| Featured | Dish Type | Ingredients | Recipes Found | Rating |
|----------|-----------|-------------|---------------|--------|
| Chicken | Entree | chicken, garlic, lemon, olive oil | Many | 5/5 |
| Strawberry | Dessert | strawberry, cream, vanilla, sugar | Many | 5/5 |
| Cumin | Salad | cumin, spinach, tomato, olive oil | Few | 2/5 |

This validates whether high role scores correlate with real-world recipes.

## Recommended Fixes Priority

### Priority 1: Critical (Success Rate <50%)
- Category exclusions not working
- Required roles not filled
- Generation completely failing for certain combinations

**Action**: Fix immediately, re-run tests

### Priority 2: Refinement (Success Rate 70-90%)
- Preferred roles inconsistently filled
- Some unrealistic combinations
- Role inference needs tuning

**Action**: Adjust logic, validate with samples

### Priority 3: Category Adjustments
- Ingredients in wrong categories
- Subcategory confusion
- Need new subcategories

**Action**: Update ingredient data, re-test affected cases

### Priority 4: Enhancement (Success Rate >90%)
- Add variety
- Improve realism
- Add explicit role data to ingredients

**Action**: Incremental improvements over time

## Next Steps

1. **Today**: Integrate test view, run first test suite
2. **This Week**: Analyze results, identify top 5 issues, implement fixes
3. **Next Week**: Re-run tests, compare before/after, validate improvements
4. **Ongoing**: Run tests after major changes to ensure no regressions

## Quick Commands

### Run Tests (in app)
```
Settings → Menu Generator Testing → Run Full Test Suite
```

### Export Results
```
Export Markdown Report → Share to Files
Export CSV Data → Open in Numbers/Excel
Export JSON → Use for custom analysis
```

### Archive Results
```
flavor-finder/test-results/
├── 2026-01-14-baseline.md
├── 2026-01-20-after-fixes.md
└── 2026-01-27-final.md
```

## Support

If you hit issues:
1. Check `testing-integration-guide.md` for troubleshooting
2. Review `testing-harness-usage.md` for detailed usage
3. Refer to `menu-generator-testing-plan.md` for methodology

## Key Insight

The test harness answers:
- **"Does it work?"** → Success Rate
- **"Is it realistic?"** → Role Fulfillment Score + Manual Recipe Validation
- **"Is it correct?"** → Category Validation

All three must be high for a quality menu generator!
