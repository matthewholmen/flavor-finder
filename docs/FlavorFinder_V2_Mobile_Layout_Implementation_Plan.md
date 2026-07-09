# FlavorFinder V2 Mobile Layout Implementation Plan

## Overview

Transform FlavorFinder V2's desktop-oriented layout into a responsive mobile-first design. Based on the uploaded screenshots, the mobile layout should feature:
- **Larger hero ingredient typography** that fills more of the mobile viewport
- **Compact header controls** that fit within mobile screen width
- **Redesigned ingredient drawer** with filters hidden by default, showing only suggestions

---

## Current State Analysis

### Screenshots Analysis

**Image 1 (Desktop - 4 ingredients + empty slot):**
- Shows: "black peppercorn, chive, pork, potato, & ________"
- Full header with logo, -, Generate, +, Recipes visible
- Large typography works on wide viewport

**Image 2 (Desktop - 5 ingredients):**
- Shows: "black peppercorn, chive, pork, potato, & asparagus"
- Complete pairing display with locked indicator visible

**Image 5 (Mobile mockup - 3 ingredients):**
- Shows: "zucchini, black bass, & white wine"
- **Much larger relative typography** - fills mobile width
- **Vertically stacked** ingredient layout (one per line)
- Compact header: ff logo, -, Generate button, (+ cut off)
- Bottom drawer handle visible

**Image 6 (Mobile with drawer open):**
- Shows filter panel open with tabs: Categories, Taste, Dietary
- "Selected:" bar showing current ingredients
- Filter grid visible
- **Issue:** Filters take up too much space on mobile

### Current Component Issues for Mobile

| Component | Current Issue | Required Change |
|-----------|---------------|-----------------|
| `MinimalHeader.jsx` | Fixed button sizes (w-14, px-10) too large for mobile | Responsive sizing with breakpoints |
| `HeroIngredientDisplay.jsx` | Horizontal text flow, small text on mobile | Stack vertically, larger font sizes |
| `HeroIngredient.jsx` | Font sizing doesn't scale well | Larger base size on mobile |
| `IngredientDrawer.jsx` | Filters always visible, take 340px width | Hide filters by default, full-width suggestions |

---

## Design Specifications

### Mobile Breakpoints

```
Mobile:     < 640px  (sm breakpoint)
Tablet:     640px - 1024px
Desktop:    > 1024px
```

### Mobile Header Layout

```
┌─────────────────────────────────────┐
│ [ff]    [-] [Generate] [+]   [...]  │
│  ↑        ↑      ↑       ↑      ↑   │
│ logo   smaller  med   smaller  menu │
│ 28px   w-10    px-6    w-10   icon  │
└─────────────────────────────────────┘
```

**Mobile Header Specs:**
- Logo: 28px height (down from 32px)
- +/- buttons: w-10 h-10 (down from w-14 h-14)
- Generate button: px-6 py-2 (down from px-10 py-3.5)
- Recipes: Hidden on mobile, accessible via "..." menu or drawer

### Mobile Hero Typography

```
┌─────────────────────────────────────┐
│                                     │
│          zucchini,                  │
│         black bass,                 │
│       & white wine                  │
│                                     │
└─────────────────────────────────────┘
```

**Mobile Typography Specs:**
- Font size: `text-5xl` (3rem / 48px) on mobile (up from current responsive)
- Line height: 1.25 (tighter for vertical stacking)
- Text alignment: Center
- Flow: Each ingredient can wrap to new line naturally
- Max width: 90vw

### Mobile Drawer Layout

**Default State (Filters Hidden):**
```
┌─────────────────────────────────────┐
│             [Chevron ∨]             │
├─────────────────────────────────────┤
│ Selected: zucchini, black bass...  │
├─────────────────────────────────────┤
│ [🔍 Search ingredients...] [Filter]│
├─────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│ │basil│ │lemon│ │thyme│ │olive│   │
│ └─────┘ └─────┘ └─────┘ └─────┘   │
│                                     │
│ (full-width ingredient grid)       │
└─────────────────────────────────────┘
```

**With Filters Visible:**
```
┌─────────────────────────────────────┐
│             [Chevron ∧]             │
├─────────────────────────────────────┤
│ [← Back to Suggestions]             │
├─────────────────────────────────────┤
│ [Categories] [Taste] [Dietary]      │
├─────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐         │
│  │ Proteins │ │Vegetables│         │
│  └──────────┘ └──────────┘         │
│  (filter options)                   │
└─────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Responsive Header (MinimalHeader.jsx)

**Changes Required:**

1. **Logo sizing**
   - Desktop: h-8 (32px)
   - Mobile: h-7 (28px)

2. **+/- Button sizing**
   - Desktop: w-14 h-14
   - Mobile: w-10 h-10

3. **Generate button sizing**
   - Desktop: px-10 py-3.5 text-lg
   - Mobile: px-6 py-2.5 text-base

4. **Recipes visibility**
   - Desktop: Text button "Recipes"
   - Mobile: Hidden (move to drawer or overflow menu)

5. **Padding/gaps**
   - Desktop: px-8 gap-3
   - Mobile: px-4 gap-2

**Code Changes:**
```jsx
// MinimalHeader.jsx responsive classes
className={`
  h-7 sm:h-8           // Logo
  w-10 sm:w-14 h-10 sm:h-14   // Buttons
  px-4 sm:px-8         // Padding
  gap-2 sm:gap-3       // Gaps
`}
```

### Phase 2: Responsive Hero Display (HeroIngredientDisplay.jsx)

**Changes Required:**

1. **Container padding**
   - Desktop: px-20
   - Mobile: px-4

2. **Font sizing**
   - Desktop: text-6xl to text-8xl
   - Mobile: text-4xl to text-5xl (larger relative to screen)

3. **Vertical centering**
   - Maintain min-h-[50vh] but adjust for mobile header height

4. **Text flow**
   - Allow natural wrapping at word boundaries
   - Center alignment on both mobile and desktop

**Code Changes:**
```jsx
// HeroIngredientDisplay.jsx
className={`
  px-4 sm:px-6 md:px-12 lg:px-20
  text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl
  min-h-[45vh] sm:min-h-[50vh]
`}
```

### Phase 3: Mobile Ingredient Drawer (IngredientDrawer.jsx)

**Complete Redesign for Mobile:**

1. **Filter visibility toggle**
   - New state: `showFilters` (default: false)
   - "Filter" button next to search toggles filter panel
   - "Back to suggestions" returns to default view

2. **Layout modes**
   - `suggestions`: Full-width ingredient grid
   - `filters`: Filter tabs and options

3. **Search bar redesign**
   - Full width with Filter button on right
   - Filter button shows badge when filters active

4. **Drawer height**
   - Desktop: h-[65vh]
   - Mobile: h-[75vh] (more screen coverage for touch)

5. **Remove split-panel layout on mobile**
   - Desktop: Keep existing side-by-side layout
   - Mobile: Stack vertically, toggle between views

**New Component Structure:**
```jsx
// Mobile layout (< 640px)
<MobileDrawerContent>
  <SelectedIngredientsBar />
  <SearchWithFilterToggle />
  {showFilters ? (
    <MobileFilterPanel />
  ) : (
    <SuggestionsGrid />
  )}
</MobileDrawerContent>

// Desktop layout (≥ 640px)
<DesktopDrawerContent>
  <SelectedIngredientsBar />
  <SideBySide>
    <FilterPanel />
    <SearchAndSuggestions />
  </SideBySide>
</DesktopDrawerContent>
```

### Phase 4: Mobile Filter Panel

**Compact Mobile Filter Design:**

1. **Full-width tabs** instead of sidebar
2. **Scrollable content** within fixed height
3. **Active filter indicators** (badges on tabs)
4. **Clear all button** prominently placed

```jsx
// Mobile filter tabs
<div className="flex border-b">
  <button className="flex-1 py-3 text-center">
    Categories {categoryCount > 0 && `(${categoryCount})`}
  </button>
  <button className="flex-1 py-3 text-center">
    Taste {tasteCount > 0 && `(${tasteCount})`}
  </button>
  <button className="flex-1 py-3 text-center">
    Dietary {dietaryCount > 0 && `(${dietaryCount})`}
  </button>
</div>
```

---

## File Modifications

### Files to Modify

| File | Changes |
|------|---------|
| `MinimalHeader.jsx` | Add responsive classes, hide Recipes on mobile |
| `HeroIngredientDisplay.jsx` | Adjust padding, font sizes, min-height |
| `HeroIngredient.jsx` | Ensure font weight/sizing works on mobile |
| `IngredientDrawer.jsx` | Complete mobile layout redesign |
| `EmptySlotIndicator.jsx` | Verify styling works at larger mobile sizes |

### New Files (Optional)

| File | Purpose |
|------|---------|
| `MobileFilterPanel.jsx` | Extracted mobile-specific filter UI |
| `SearchWithFilterToggle.jsx` | Search bar with filter button for mobile |

---

## Detailed Code Changes

### 1. MinimalHeader.jsx

```jsx
// Key responsive changes:

<header 
  className="
    fixed top-0 left-0 right-0
    flex items-center justify-between
    px-4 sm:px-8 py-3 sm:py-5
    bg-white z-50
  "
>
  {/* Logo - responsive sizing */}
  <div className="flex-shrink-0 w-16 sm:w-24">
    <img 
      src="/flavor-finder-1.png" 
      alt="ff" 
      className="h-7 sm:h-8 w-auto"
      ...
    />
  </div>
  
  {/* Controls - responsive sizing */}
  <div className="flex items-center gap-2 sm:gap-3">
    {/* -/+ Buttons - smaller on mobile */}
    <button
      className={`
        w-10 h-10 sm:w-14 sm:h-14
        flex items-center justify-center
        rounded-full border-2
        ...
      `}
    >
      <Minus size={16} className="sm:hidden" />
      <Minus size={20} className="hidden sm:block" />
    </button>
    
    {/* Generate Button - compact on mobile */}
    <button
      className={`
        px-6 sm:px-10 py-2.5 sm:py-3.5
        rounded-full border-2 border-gray-900
        text-base sm:text-lg
        ...
      `}
    >
      Generate
    </button>
    
    {/* + button similar to - */}
  </div>
  
  {/* Recipes - hide on mobile */}
  <div className="hidden sm:block w-24 text-right">
    <button className="text-gray-300 font-medium text-lg">
      Recipes
    </button>
  </div>
  
  {/* Mobile: Show menu icon or nothing */}
  <div className="sm:hidden w-10" />
</header>
```

### 2. HeroIngredientDisplay.jsx

```jsx
// Key responsive changes:

<div 
  className="
    flex items-center justify-center
    min-h-[40vh] sm:min-h-[50vh]
    px-4 sm:px-6 md:px-12 lg:px-20
    text-center
  "
>
  <div 
    className="
      font-black
      text-[2.5rem] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl
      leading-[1.2] sm:leading-[1.15]
      tracking-tight
      max-w-[95vw] sm:max-w-[90vw]
    "
    ...
  >
    {/* Ingredient rendering stays the same */}
  </div>
</div>
```

### 3. IngredientDrawer.jsx - Major Restructure

```jsx
// Add state for filter visibility
const [showFilters, setShowFilters] = useState(false);

// Add hook for screen size detection
const isMobile = useMediaQuery('(max-width: 639px)');

// Active filter count for badge
const activeFilterCount = useMemo(() => {
  let count = 0;
  if (activeCategory) count++;
  count += selectedSubcategories.length;
  count += activeSliders.size;
  const dietaryCount = Object.values(dietaryRestrictions)
    .filter(v => v === false).length;
  count += dietaryCount;
  return count;
}, [activeCategory, selectedSubcategories, activeSliders, dietaryRestrictions]);

// Render mobile or desktop layout
return (
  <>
    {/* Backdrop */}
    {isOpen && <div className="..." onClick={onClose} />}
    
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Pull Handle */}
      <button onClick={onToggle} className="...">
        <ChevronUp className={isOpen ? 'rotate-180' : ''} />
      </button>
      
      <div className={`bg-white ${isOpen ? 'h-[75vh] sm:h-[65vh]' : 'h-0'}`}>
        {/* Selected Ingredients Bar */}
        <SelectedIngredientsBar ... />
        
        {/* Mobile Layout */}
        {isMobile ? (
          <MobileDrawerContent
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            activeFilterCount={activeFilterCount}
            // ... other props
          />
        ) : (
          <DesktopDrawerContent ... />
        )}
      </div>
    </div>
  </>
);
```

### 4. New: MobileDrawerContent Component

```jsx
const MobileDrawerContent = ({
  showFilters,
  onToggleFilters,
  activeFilterCount,
  searchTerm,
  onSearchChange,
  suggestions,
  onIngredientSelect,
  // Filter props...
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Search bar with filter toggle */}
      <div className="flex-shrink-0 px-4 py-3 flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full border-2 border-gray-200"
          />
        </div>
        
        {/* Filter toggle button */}
        <button
          onClick={onToggleFilters}
          className={`
            px-4 py-2.5 rounded-full border-2
            flex items-center gap-2
            ${showFilters || activeFilterCount > 0
              ? 'border-[#72A8D5] bg-blue-50 text-[#72A8D5]'
              : 'border-gray-200 text-gray-600'
            }
          `}
        >
          <Filter size={18} />
          {activeFilterCount > 0 && (
            <span className="bg-[#72A8D5] text-white text-xs px-1.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
      
      {/* Content: Filters or Suggestions */}
      <div className="flex-1 overflow-y-auto">
        {showFilters ? (
          <MobileFilterPanel
            onBack={() => onToggleFilters()}
            // ... filter props
          />
        ) : (
          <SuggestionsGrid
            suggestions={suggestions}
            onSelect={onIngredientSelect}
            // ... other props
          />
        )}
      </div>
    </div>
  );
};
```

---

## Custom Hook: useMediaQuery

```jsx
// src/hooks/useMediaQuery.js
import { useState, useEffect } from 'react';

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e) => setMatches(e.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
```

---

## Testing Checklist

### Mobile Tests (< 640px)

- [ ] Header fits on screen, no overflow
- [ ] Logo, Generate, +/- buttons visible and functional
- [ ] Hero ingredients display with larger typography
- [ ] Ingredients wrap naturally, centered alignment
- [ ] Drawer opens to 75vh height
- [ ] Search bar is full-width with Filter button
- [ ] Filter button shows active count badge
- [ ] Clicking Filter shows filter panel
- [ ] Suggestions grid is full-width when filters hidden
- [ ] Ingredient selection works and closes drawer
- [ ] Locked ingredients display correctly
- [ ] Hover states work on touch (tap-to-reveal)

### Tablet Tests (640px - 1024px)

- [ ] Header uses desktop sizing
- [ ] Hero uses medium font sizes
- [ ] Drawer uses side-by-side layout

### Desktop Tests (> 1024px)

- [ ] No regression from current functionality
- [ ] All existing features work

---

## Implementation Order

1. **Phase 1**: MinimalHeader responsive sizing (30 min)
2. **Phase 2**: HeroIngredientDisplay responsive sizing (20 min)
3. **Phase 3**: Create useMediaQuery hook (10 min)
4. **Phase 4**: IngredientDrawer mobile layout restructure (2 hours)
5. **Phase 5**: Testing and adjustments (1 hour)

**Total Estimated Time**: ~4 hours

---

## Success Criteria

1. **Mobile header fits** in 375px viewport without overflow
2. **Hero text is readable** - at least 40px on mobile
3. **Drawer is usable** - filters toggleable, suggestions prominent
4. **No regression** on desktop experience
5. **Touch-friendly** - all interactive elements ≥ 44px touch target

---

## Future Considerations

1. **Recipes on mobile**: Add to drawer footer or overflow menu
2. **Swipe gestures**: Swipe down to close drawer
3. **Pull to refresh**: Refresh suggestions with pull gesture
4. **Haptic feedback**: Vibration on ingredient add/remove
5. **Bottom safe area**: Account for iOS home indicator

---

## Files Summary

**Modified Files:**
- `/src/components/v2/MinimalHeader.jsx`
- `/src/components/v2/HeroIngredientDisplay.jsx`
- `/src/components/v2/IngredientDrawer.jsx`

**New Files:**
- `/src/hooks/useMediaQuery.js`

**Optional New Components:**
- `/src/components/v2/MobileDrawerContent.jsx`
- `/src/components/v2/MobileFilterPanel.jsx`
