# First Test Run - Step-by-Step Checklist

Use this checklist for your first test run to ensure you capture all the data you need.

## Pre-Flight Checklist

### ☐ Integration (5 min)
- [ ] Open `FlavorFinder.xcodeproj` in Xcode
- [ ] Add test view to app (choose one method from `TESTING_SETUP_COMPLETE.md`)
- [ ] Build project (Cmd+B) - verify no errors
- [ ] Run on device (Cmd+R) - iPhone recommended for speed

### ☐ Setup (2 min)
- [ ] Navigate to test view in app
- [ ] Verify you see "Menu Generator Testing" screen
- [ ] Confirm test configuration shows:
  - 27 featured ingredients
  - 6 dish types
  - 2 modes
  - 10 samples per case
  - 324 total test cases
  - 3,240 total dishes

## Test Run Checklist

### ☐ Start Test (1 min)
- [ ] Tap "Run Full Test Suite" button
- [ ] Verify progress bar appears
- [ ] Note start time: ___:___ AM/PM

### ☐ Monitor Progress (2-5 min)
- [ ] Watch progress bar (0% → 100%)
- [ ] Observe test names scrolling
- [ ] Note any long pauses (might indicate backtracking issues)
- [ ] Note completion time: ___:___ AM/PM
- [ ] Total duration: _____ minutes

### ☐ Review Summary (2 min)
When tests complete, note these metrics:

**Overall Statistics**:
- [ ] Overall Success Rate: _______%
- [ ] Avg Role Score: _______%
- [ ] Avg Category Validation: _______%

**Initial Assessment**:
- [ ] 🟢 All metrics >90% (excellent!)
- [ ] 🟡 Some metrics 70-90% (refinement needed)
- [ ] 🔴 Any metrics <70% (critical issues)

## Export Data Checklist

### ☐ Markdown Report (Must Have)
- [ ] Tap "Export Markdown Report"
- [ ] Choose destination:
  - [ ] AirDrop to Mac
  - [ ] Save to Files app
  - [ ] Share to Notes
- [ ] Verify file saved: `test-results.md`

### ☐ CSV Data (Recommended)
- [ ] Tap "Export CSV Data"
- [ ] Save to Files app or AirDrop to Mac
- [ ] Verify file saved: `test-results.csv`

### ☐ JSON (Optional)
- [ ] Tap "Export JSON (Full Data)"
- [ ] Save for archival/custom analysis
- [ ] Verify file saved: `test-results.json`

## Analysis Checklist

### ☐ Quick Scan (5 min)
Open the Markdown report and skim:

- [ ] Read "Overview" section
  - Note overall success rate
  - Note overall role score
  - Note category validation rate

- [ ] Scan "Results by Dish Type" table
  - Which dish type has lowest success? _____________
  - Which dish type has highest success? _____________

- [ ] Scan "Results by Category" table
  - Which category has lowest success? _____________
  - Which category has highest success? _____________

- [ ] Count "Problem Cases"
  - How many cases have <70% success? _____________

- [ ] Count "Category Validation Failures"
  - How many violations? _____________
  - Which dish types? _____________

### ☐ Deep Dive (15 min)
Pick the **top 3 problem areas** to investigate:

**Problem Area 1**: _____________________________
- [ ] What's failing? (dish type, category, mode)
- [ ] Success rate: ______%
- [ ] Role score: ______%
- [ ] Hypothesis for why it's failing: _______________________________________________

**Problem Area 2**: _____________________________
- [ ] What's failing? (dish type, category, mode)
- [ ] Success rate: ______%
- [ ] Role score: ______%
- [ ] Hypothesis for why it's failing: _______________________________________________

**Problem Area 3**: _____________________________
- [ ] What's failing? (dish type, category, mode)
- [ ] Success rate: ______%
- [ ] Role score: ______%
- [ ] Hypothesis for why it's failing: _______________________________________________

### ☐ Sample Review (10 min)
Review actual generated dishes from the CSV:

**High-Performing Dishes (role score >80%)**:
- [ ] Sample 1: ____________________________________________
  - Does it make culinary sense? Y / N
  - Would you eat it? Y / N

- [ ] Sample 2: ____________________________________________
  - Does it make culinary sense? Y / N
  - Would you eat it? Y / N

- [ ] Sample 3: ____________________________________________
  - Does it make culinary sense? Y / N
  - Would you eat it? Y / N

**Low-Performing Dishes (role score <60%)**:
- [ ] Sample 1: ____________________________________________
  - What's wrong with it? ___________________________________
  - What role is missing? ___________________________________

- [ ] Sample 2: ____________________________________________
  - What's wrong with it? ___________________________________
  - What role is missing? ___________________________________

- [ ] Sample 3: ____________________________________________
  - What's wrong with it? ___________________________________
  - What role is missing? ___________________________________

## Recipe Validation Checklist (Optional, 30 min)

Pick 10 interesting dishes and validate with Google:

### Dish 1: ________________________________________
- [ ] Google search: `"[ingredient1] [ingredient2] [ingredient3] recipe"`
- [ ] Results: Many / Few / None
- [ ] Rating (1-5): _____

### Dish 2: ________________________________________
- [ ] Google search: `"[ingredient1] [ingredient2] [ingredient3] recipe"`
- [ ] Results: Many / Few / None
- [ ] Rating (1-5): _____

### Dish 3: ________________________________________
- [ ] Google search: `"[ingredient1] [ingredient2] [ingredient3] recipe"`
- [ ] Results: Many / Few / None
- [ ] Rating (1-5): _____

### Dish 4: ________________________________________
- [ ] Google search: `"[ingredient1] [ingredient2] [ingredient3] recipe"`
- [ ] Results: Many / Few / None
- [ ] Rating (1-5): _____

### Dish 5: ________________________________________
- [ ] Google search: `"[ingredient1] [ingredient2] [ingredient3] recipe"`
- [ ] Results: Many / Few / None
- [ ] Rating (1-5): _____

*(Continue for dishes 6-10...)*

**Summary**:
- [ ] How many dishes had "Many" recipes? _____ / 10
- [ ] How many dishes had "Few" recipes? _____ / 10
- [ ] How many dishes had "None"? _____ / 10
- [ ] Average rating: _____ / 5

## Findings Summary

### ☐ Key Findings (Write 3-5 sentences)
1. ___________________________________________________________________
2. ___________________________________________________________________
3. ___________________________________________________________________
4. ___________________________________________________________________
5. ___________________________________________________________________

### ☐ Top Issues (Prioritized)
**Priority 1 (Critical - Fix Immediately)**:
- [ ] _________________________________________________________________
- [ ] _________________________________________________________________

**Priority 2 (High - Fix This Week)**:
- [ ] _________________________________________________________________
- [ ] _________________________________________________________________

**Priority 3 (Medium - Fix Soon)**:
- [ ] _________________________________________________________________
- [ ] _________________________________________________________________

### ☐ Hypotheses for Fixes
**Issue 1**: _______________________________________________________
**Potential Fix**: _________________________________________________

**Issue 2**: _______________________________________________________
**Potential Fix**: _________________________________________________

**Issue 3**: _______________________________________________________
**Potential Fix**: _________________________________________________

## Action Items

### ☐ Immediate Next Steps
- [ ] Archive baseline results (save to `test-results/2026-01-14-baseline.md`)
- [ ] Share results with team (if applicable)
- [ ] Schedule time to implement Priority 1 fixes
- [ ] Re-run tests after fixes to validate improvements

### ☐ Follow-Up Tasks
- [ ] Create GitHub issues for each priority item (optional)
- [ ] Document fixes in `CHANGELOG.md` (optional)
- [ ] Plan next test run after fixes (date: _____________)

## Notes & Observations

Use this space for any additional notes during your test run:

___________________________________________________________________
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________

## Success Metrics

After completing this checklist, you should have:
- ✅ Baseline test results exported (Markdown + CSV)
- ✅ Clear understanding of current system performance
- ✅ Identified top 3-5 problem areas
- ✅ Prioritized list of fixes
- ✅ Validated 10+ sample dishes manually (optional)
- ✅ Archived results for future comparison

**Estimated Total Time**: 30-60 minutes

---

**First Test Run Date**: __________________
**Completed By**: __________________
**Overall Assessment**: 🟢 Excellent / 🟡 Needs Work / 🔴 Critical Issues
