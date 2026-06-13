# Integrating the Test Harness into Your App

## Quick Integration Steps

### Option 1: Add to Settings (Recommended)

Add a "Testing" button in your Settings view:

```swift
// In SettingsView.swift

Section("Developer") {
    NavigationLink {
        MenuGeneratorTestView(appState: appState)
    } label: {
        Label("Menu Generator Testing", systemImage: "chart.bar.doc.horizontal")
    }
}
```

### Option 2: Add as Tab (Temporary)

Add a test tab to MainTabView:

```swift
// In MainTabView.swift

TabView(selection: $selectedTab) {
    // ... existing tabs ...

    MenuGeneratorTestView(appState: appState)
        .tabItem {
            Label("Testing", systemImage: "chart.bar")
        }
        .tag(4)
}
```

### Option 3: Debug Menu (Cleanest)

Create a hidden debug gesture:

```swift
// In MainTabView.swift or DiscoverView.swift

.onLongPressGesture(minimumDuration: 3.0) {
    showTestView = true
}
.sheet(isPresented: $showTestView) {
    MenuGeneratorTestView(appState: appState)
}
```

## What You'll See

1. **Test Configuration Panel**
   - Shows 27 test ingredients
   - 6 dish types × 2 modes = 12 combinations per ingredient
   - 324 total test cases
   - 3,240 total dishes

2. **Run Button**
   - Tap to start full test suite
   - Runs asynchronously (app stays responsive)

3. **Progress Indicator**
   - Linear progress bar (0-100%)
   - Current test being run
   - Completed count (e.g., "150 / 324 completed")

4. **Results Summary**
   - Overall success rate (e.g., "87.3%")
   - Avg role score (e.g., "75.2%")
   - Avg category validation (e.g., "98.5%")

5. **Export Buttons**
   - Export Markdown Report (human-readable)
   - Export CSV Data (for Excel)
   - Export JSON (full data)

## Running Your First Test

### Step 1: Build and Run
```bash
# Open in Xcode
open FlavorFinder.xcodeproj

# Build and run on your iPhone (not simulator for best performance)
# Cmd+R
```

### Step 2: Navigate to Test View
- Go to Settings → Menu Generator Testing
- (Or use whichever integration method you chose)

### Step 3: Start Test
- Tap "Run Full Test Suite"
- Watch progress (takes 2-5 minutes)

### Step 4: Review Results
- Check overall success rate (goal: >90%)
- Check role score (goal: >70%)
- Check category validation (goal: 100%)

### Step 5: Export Data
- Tap "Export Markdown Report"
- Share to Files, Notes, or AirDrop to your Mac
- Review the detailed report

## What to Look For

### In the App UI

**Green scores (>90%)**:
- ✅ System is working well
- Minor tweaks may improve further

**Orange scores (70-90%)**:
- ⚠️ System mostly works but needs refinement
- Focus on problem cases

**Red scores (<70%)**:
- ❌ Significant issues
- Review failure patterns immediately

### In the Markdown Report

**Check the "Problem Cases" section**:
- Lists test cases with <70% success rate
- Identifies which combinations fail most

**Check "Category Validation Failures"**:
- Shows invalid ingredients in dishes
- E.g., "Dessert contains beef (Proteins category)"

**Check "Results by Dish Type"**:
- Which dish type has lowest success rate?
- Salad? Dessert? Beverage?

**Check "Results by Category"**:
- Which featured ingredient category struggles?
- Seasonings? Pantry items?

### In the CSV Data

Open in Excel/Numbers/Google Sheets:

**Create pivot table**:
- Rows: Dish Type
- Columns: Mode (Flexible vs Strict)
- Values: Average Success Rate

**Create charts**:
- Bar chart: Success rate by category
- Scatter plot: Role score vs Success rate
- Heatmap: Dish Type × Category success rates

## Example Analysis Workflow

### 1. High-Level Overview
```
Overall Success Rate: 87.3%
Avg Role Score: 75.2%
Avg Category Validation: 98.5%
```

**Interpretation**: Good but not great. 87% success means ~400 dishes failed out of 3,240. Role score of 75% suggests some preferred roles are missing.

### 2. Drill Down by Dish Type
```
Entree:  95% success, 82% role score
Side:    91% success, 78% role score
Salad:   68% success, 61% role score  ⚠️
Dessert: 84% success, 73% role score
Beverage: 79% success, 69% role score
Sauce:   88% success, 76% role score
```

**Finding**: Salad generation is the problem! Only 68% success rate, barely passing role score.

### 3. Dig Into Salad Failures
Look at "Problem Cases" section:
```
| Featured Ingredient | Dish Type | Mode | Success Rate |
|-------------------|-----------|------|--------------|
| cumin             | salad     | strict | 10%        |
| soy sauce         | salad     | flexible | 30%      |
| thyme             | salad     | flexible | 40%      |
```

**Finding**: Seasonings and Pantry items fail as featured ingredients for salads. Makes sense—these shouldn't be salad "stars."

### 4. Check Category Validation
```
Dessert with "chicken": Invalid category 'Proteins' for dessert
Beverage with "spinach": Invalid category 'Vegetables' for beverage
```

**Finding**: Category exclusions not working! Proteins/vegetables leaking into desserts/beverages.

### 5. Form Hypothesis
Based on findings:
1. Salads struggle with non-vegetable featured ingredients
2. Need better filtering of "excluded featured subcategories" for salads
3. Category exclusions for desserts/beverages aren't enforced
4. Bridge fallback not working well for difficult pairings

### 6. Prioritize Fixes
**Fix 1 (Critical)**: Category exclusions
- Update `validateCategories` logic
- Ensure desserts/beverages filter out proteins/vegetables

**Fix 2 (High)**: Salad featured ingredient filtering
- Add salad-specific validation
- Exclude Seasonings/Pantry from salad featured ingredients

**Fix 3 (Medium)**: Bridge fallback
- Improve bridge ingredient selection
- Add more fallback tiers

### 7. Implement & Re-test
- Make fixes
- Run test suite again
- Compare before/after results
- Goal: 95%+ success rate, 80%+ role score

## Recipe Validation (Manual Step)

After automated testing, validate realism:

### Pick Sample Dishes
From the exported CSV, pick 20-30 interesting dishes:
- 5 with high role scores (check if they're realistic)
- 5 with medium role scores (are they still good?)
- 5 with low role scores (are they actually bad?)
- 5 edge cases (unusual featured ingredients)

### Google Search Each
```
Search: "chicken garlic lemon olive oil recipe"
Result: 10,000+ recipes ✓ Classic combo

Search: "salmon dill yogurt cucumber recipe"
Result: 500+ recipes ✓ Common pairing

Search: "cumin spinach tomato honey recipe"
Result: 12 recipes ~ Uncommon but valid

Search: "bourbon broccoli chocolate recipe"
Result: 0 recipes ✗ Unrealistic
```

### Rate Culinary Logic
For each dish, rate 1-5:
- 5: Perfect, restaurant-quality combination
- 4: Good, makes sense, would eat it
- 3: Okay, a bit odd but workable
- 2: Questionable, probably not realistic
- 1: Nonsensical, would never work

### Calculate Correlation
Compare role score to culinary rating:
- Do high role scores = high ratings? (Good!)
- Do low role scores = low ratings? (Expected)
- Any mismatches? (Needs investigation)

## Cleanup After Testing

Once you've collected data and made fixes, remove the test view:

### Option 1: Comment Out
```swift
// Section("Developer") {
//     NavigationLink {
//         MenuGeneratorTestView(appState: appState)
//     } label: {
//         Label("Menu Generator Testing", systemImage: "chart.bar.doc.horizontal")
//     }
// }
```

### Option 2: Build Configuration
```swift
#if DEBUG
Section("Developer") {
    NavigationLink {
        MenuGeneratorTestView(appState: appState)
    } label: {
        Label("Menu Generator Testing", systemImage: "chart.bar.doc.horizontal")
    }
}
#endif
```

This keeps testing available in debug builds but hidden in release.

### Option 3: Remove Completely
Delete the navigation link—you can always re-add it later if needed.

## Archiving Test Results

Save your test results for future reference:

```
flavor-finder/
└── test-results/
    ├── 2026-01-14-baseline.md
    ├── 2026-01-14-baseline.csv
    ├── 2026-01-14-baseline.json
    ├── 2026-01-20-after-category-fix.md
    ├── 2026-01-20-after-category-fix.csv
    └── 2026-01-20-after-category-fix.json
```

This lets you:
- Track improvements over time
- Compare before/after fixes
- Document what worked/didn't work

## Troubleshooting

**"AppState is not initialized"**:
- Make sure you're passing the correct appState instance
- Check that services are initialized in FlavorFinderApp.swift

**Tests never complete**:
- Check for infinite loops in MenuGenerator
- Add timeout logic if needed
- Reduce sample count from 10 to 5

**Export buttons don't work**:
- Check file permissions
- Verify Documents directory exists
- Use Xcode's Device window to inspect app container

**Results seem wrong**:
- Verify ingredientProfiles.json and flavorPairings.json are loaded
- Check that role inference logic matches MenuGenerator
- Add debug logging to understand failures

## Next Steps

1. ✅ Integrate test view into app (choose one of 3 options)
2. ✅ Run full test suite on your iPhone
3. ✅ Export results (Markdown + CSV)
4. ✅ Review summary statistics
5. ✅ Identify problem areas
6. ✅ Manually validate 20-30 sample dishes with Google
7. 📋 Create issue list prioritized by severity
8. 🛠️ Implement fixes
9. 🔄 Re-run tests to validate improvements
10. 📊 Compare before/after metrics

Let me know when you've run the tests and I'll help analyze the results!
