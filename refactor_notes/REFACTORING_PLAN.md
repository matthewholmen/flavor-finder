# Flavor Finder Codebase Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring plan for the Flavor Finder codebase. The analysis identified **critical technical debt** including:
- 4 unused deprecated components (600+ lines of dead code)
- 3 monolithic components (1000+ lines each)
- Zero meaningful test coverage
- Severe code duplication across components
- Mixed JavaScript/TypeScript with inconsistent patterns
- 17 useState calls in a single component (no proper state management)

---

## Priority Levels

- **P0 (Critical)**: Blocking issues, dead code, immediate cleanup
- **P1 (High)**: Major architectural improvements
- **P2 (Medium)**: Code quality and consistency
- **P3 (Low)**: Nice-to-have improvements

---

## Phase 1: Dead Code Removal (P0)

### 1.1 Remove Deprecated Components

**Files to delete:**
```
src/components/v2/HeroIngredient.jsx          (300 lines - UNUSED)
src/components/v2/HeroIngredientDisplay.jsx   (306 lines - UNUSED)
src/components/v2/CompactIngredientDisplay.jsx (365 lines - UNUSED)
src/components/v2/EmptySlotIndicator.jsx      (UNUSED)
```

**Update required:**
- `src/components/v2/index.js` - Remove deprecated exports (lines 6-9)

**Validation:** Grep confirms no imports of these components except in index.js

### 1.2 Remove Duplicate Files

**Files to delete:**
```
src/utils/search.ts                           (duplicate of searchUtils.ts)
src/components/mobile/index.js                (duplicate of index.ts)
src/components/mobile/MobileApp_BACKUP.tsx    (empty backup file)
```

### 1.3 Remove Commented Code

**File:** `src/components/v2/IngredientDisplay.jsx`
- Lines 1134-1163: Remove commented mobile action button code

---

## Phase 2: Extract Shared Utilities (P0)

### 2.1 Create Shared Icon Components

**New file:** `src/components/icons/LockIcons.tsx`

Extract from 3 locations:
- `src/components/v2/IngredientDisplay.jsx` (lines 126-161)
- `src/components/v2/HeroIngredient.jsx` (lines 23-104)
- `src/components/v2/CompactIngredientDisplay.jsx` (lines 6-86)

```typescript
// src/components/icons/LockIcons.tsx
export const FilledLock: React.FC<{ color: string; size?: string }>;
export const CustomUnlock: React.FC<{ color: string; size?: string }>;
```

### 2.2 Centralize getIngredientColor Function

**New file:** `src/utils/ingredientColors.ts`

Extract from 4 locations:
- `src/components/v2/IngredientDisplay.jsx` (lines 164-183)
- `src/components/v2/HeroIngredient.jsx` (lines 5-21)
- `src/components/v2/CompactIngredientDisplay.jsx` (lines 102-120)
- `src/FlavorFinder.js`

```typescript
// src/utils/ingredientColors.ts
import { TASTE_COLORS } from './colors';
import { ingredientProfiles } from '../data/ingredientProfiles';

export const getIngredientColor = (ingredient: string): string;
```

### 2.3 Centralize Dietary Ingredient Lists

**New file:** `src/data/dietaryRestrictions.ts`

Extract from `FlavorFinderV2.jsx` (lines 126-175):
```typescript
export const NUT_INGREDIENTS: string[];
export const NIGHTSHADE_INGREDIENTS: string[];
export const HIGH_FODMAP_INGREDIENTS: string[];

export const isIngredientRestricted = (
  ingredient: string,
  restrictions: DietaryRestrictions
): boolean;
```

---

## Phase 3: TypeScript Migration (P1)

### 3.1 Convert Core Files to TypeScript

**Priority order:**
1. `src/App.js` -> `src/App.tsx`
2. `src/FlavorFinderV2.jsx` -> `src/FlavorFinderV2.tsx`
3. `src/contexts/ThemeContext.jsx` -> `src/contexts/ThemeContext.tsx`
4. `src/components/v2/*.jsx` -> `src/components/v2/*.tsx`

### 3.2 Fix `any` Type Usage (52 instances)

**Key files to address:**
- `src/utils/searchUtils.ts` - Replace `any[]` with `IngredientProfile[]`
- `src/utils/compatibility.ts` - Add proper typing
- `src/components/filters/UnifiedFilterPanel/*.tsx` - Type filter values

### 3.3 Create Comprehensive Type Definitions

**Extend:** `src/types.ts`

```typescript
// Add missing types
export interface IngredientProfile {
  name: string;
  category: string;
  subcategory?: string;
  tasteProfile: TasteProfile;
  dietary?: DietaryInfo;
}

export interface DietaryRestrictions {
  nutFree: boolean;
  nightshadeFree: boolean;
  lowFodmap: boolean;
  // ...
}

export interface FilterState {
  category: string;
  subcategories: string[];
  tasteValues: TasteProfile;
  activeSliders: Set<string>;
  dietaryRestrictions: DietaryRestrictions;
}
```

---

## Phase 4: State Management Refactor (P1)

### 4.1 Extract State to Custom Hooks

**Current problem:** FlavorFinderV2.jsx has 17 useState calls

**New hooks to create:**

```typescript
// src/hooks/useIngredientSelection.ts
export const useIngredientSelection = () => {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [lockedIngredients, setLockedIngredients] = useState(new Set());
  const [history, setHistory] = useState([]);

  return {
    selectedIngredients,
    lockedIngredients,
    history,
    selectIngredient,
    lockIngredient,
    unlockIngredient,
    undo,
    clear,
  };
};

// src/hooks/useFilters.ts
export const useFilters = () => {
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [tasteValues, setTasteValues] = useState({...});
  const [activeSliders, setActiveSliders] = useState(new Set());
  const [dietaryRestrictions, setDietaryRestrictions] = useState({});

  return { /* filter state and actions */ };
};

// src/hooks/useCompatibility.ts
export const useCompatibility = () => {
  const [compatibilityMode, setCompatibilityMode] = useState('perfect');
  const [showPartialMatches, setShowPartialMatches] = useState(false);

  return { /* compatibility state and actions */ };
};
```

### 4.2 Consider useReducer for Complex State

**Alternative approach for ingredient selection:**

```typescript
// src/reducers/ingredientReducer.ts
type IngredientAction =
  | { type: 'SELECT'; ingredient: string }
  | { type: 'REMOVE'; ingredient: string }
  | { type: 'LOCK'; ingredient: string }
  | { type: 'UNLOCK'; ingredient: string }
  | { type: 'CLEAR' }
  | { type: 'UNDO' }
  | { type: 'GENERATE'; ingredients: string[] };

const ingredientReducer = (state: IngredientState, action: IngredientAction): IngredientState;
```

---

## Phase 5: Component Decomposition (P1)

### 5.1 Split FlavorFinderV2 (1056 lines)

**Current structure:**
```
FlavorFinderV2.jsx (1056 lines)
|- State management (17 useState calls)
|- Flavor map creation
|- Generation algorithms (3 modes)
|- Filtering logic
|- Keyboard shortcuts (7+ handlers)
|- Undo/history management
|- All rendering logic
```

**Target structure:**
```
FlavorFinderV2/
|- index.tsx                    # Main container (state + composition)
|- FlavorFinderView.tsx         # Pure view component
|- GenerationControls.tsx       # Generate button + mode selector
|- KeyboardShortcuts.tsx        # Keyboard handler component
|- hooks/
    |- useFlavorMap.ts          # Flavor map creation & caching
    |- useGeneration.ts         # Generation algorithms
    |- useKeyboardShortcuts.ts  # Keyboard handling hook
```

### 5.2 Split IngredientDrawer (1624 lines)

**Target structure:**
```
IngredientDrawer/
|- index.tsx                    # Main container
|- DrawerHeader.tsx             # Search + collapse toggle
|- FilterSection.tsx            # Category/taste filters
|- SuggestionsList.tsx          # Ingredient suggestions
|- DrawerFooter.tsx             # Action buttons
```

### 5.3 Split IngredientDisplay (1168 lines)

**Target structure:**
```
IngredientDisplay/
|- index.tsx                    # Main container
|- HeroLayout.tsx               # Full-screen layout
|- CompactLayout.tsx            # Drawer-open layout
|- IngredientCard.tsx           # Single ingredient display
|- IngredientControls.tsx       # Lock/remove actions
|- hooks/
    |- useLayoutTransition.ts   # CSS transform logic
```

---

## Phase 6: Performance Optimizations (P2)

### 6.1 Memoize Flavor Map at Module Level

**Current:** Created via useMemo on each mount
**Proposed:**

```typescript
// src/data/flavorMap.ts
import { flavorPairings } from './flavorPairings';
import { experimentalPairings } from './experimentalPairings';

// Create once at module load
export const flavorMap = createFlavorMap();

function createFlavorMap(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  // ... build bidirectional map
  return map;
}
```

### 6.2 Optimize Dietary Restriction Checks

**Current:** O(n*m) lookup on every filter operation
**Proposed:**

```typescript
// Pre-compute Sets for O(1) lookup
const NUT_INGREDIENTS_SET = new Set(NUT_INGREDIENTS);
const NIGHTSHADE_SET = new Set(NIGHTSHADE_INGREDIENTS);
const HIGH_FODMAP_SET = new Set(HIGH_FODMAP_INGREDIENTS);

export const isIngredientRestricted = (ingredient: string, restrictions: DietaryRestrictions): boolean => {
  const lower = ingredient.toLowerCase();
  if (restrictions.nutFree && NUT_INGREDIENTS_SET.has(lower)) return true;
  if (restrictions.nightshadeFree && NIGHTSHADE_SET.has(lower)) return true;
  if (restrictions.lowFodmap && HIGH_FODMAP_SET.has(lower)) return true;
  return false;
};
```

### 6.3 Use React.memo for Pure Components

**Components to wrap:**
- `IngredientCard`
- `SuggestionItem`
- `FilterPill`
- `TasteSlider`

### 6.4 Virtualize Long Lists

**Install:** `react-window` or `@tanstack/react-virtual`

**Apply to:**
- Ingredient suggestions list (can have 500+ items)
- Saved combinations list

---

## Phase 7: Testing Infrastructure (P1)

### 7.1 Set Up Testing Framework

**Install:**
```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest
```

### 7.2 Priority Test Coverage

**Critical paths to test first:**

1. **Utility functions:**
   - `src/utils/compatibility.ts` - Pairing logic
   - `src/utils/searchUtils.ts` - Search/filter logic
   - `src/utils/tasteAnalysis.ts` - Taste calculations

2. **Core hooks:**
   - `useIngredientSelection` - Selection/lock/unlock
   - `useFilters` - Filter state management
   - `useSavedCombinations` - localStorage persistence

3. **Component behavior:**
   - Ingredient selection flow
   - Filter application
   - Generation modes

### 7.3 Test File Structure

```
src/
|- utils/
|   |- compatibility.ts
|   |- compatibility.test.ts
|   |- searchUtils.ts
|   |- searchUtils.test.ts
|- hooks/
|   |- useIngredientSelection.ts
|   |- useIngredientSelection.test.ts
|- components/
    |- IngredientCard/
        |- index.tsx
        |- IngredientCard.test.tsx
```

---

## Phase 8: Code Consistency (P2)

### 8.1 Add Error Boundaries

**Files needing try/catch:**
- `src/contexts/ThemeContext.jsx` line 18 (JSON.parse without try/catch)
- `src/utils/urlEncoding.js` (decode without validation)

```typescript
// ThemeContext fix
const getInitialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('theme');
    return saved ? JSON.parse(saved) : 'light';
  } catch {
    return 'light';
  }
};
```

### 8.2 Standardize Component Patterns

**Establish conventions:**
- All components use TypeScript (`.tsx`)
- Named exports only (no default exports)
- Props interface defined above component
- Hooks at top of component, then derived values, then handlers

### 8.3 Remove Unused Exports

**File:** `src/hooks/useScreenSize.ts`
- Remove or mark as deprecated: `useMobileDetection()`, `useDeviceOrientation()`

---

## Phase 9: Remove V1 Legacy Code (P3)

### 9.1 Evaluate V1 Usage

**File:** `src/FlavorFinder.js` (V1 legacy component)

**Questions to answer:**
- Is anyone using `?v1=true` query parameter?
- Is there tracking data on V1 usage?
- Can we safely remove it?

### 9.2 If V1 Not Needed

**Files to delete:**
```
src/FlavorFinder.js
```

**Update:**
- `src/App.js` - Remove version switching logic
- Remove `Ctrl+Shift+V` keyboard shortcut

---

## Implementation Order

### Sprint 1: Cleanup
1. Phase 1.1: Delete deprecated components
2. Phase 1.2: Delete duplicate files
3. Phase 1.3: Remove commented code

### Sprint 2: Extract Utilities
1. Phase 2.1: Create shared icon components
2. Phase 2.2: Centralize getIngredientColor
3. Phase 2.3: Centralize dietary restrictions

### Sprint 3: State Management
1. Phase 4.1: Extract custom hooks
2. Phase 5.1: Split FlavorFinderV2

### Sprint 4: TypeScript & Testing
1. Phase 3.1: Convert core files to TypeScript
2. Phase 7.1: Set up testing framework
3. Phase 7.2: Add priority tests

### Sprint 5: Component Refactoring
1. Phase 5.2: Split IngredientDrawer
2. Phase 5.3: Split IngredientDisplay

### Sprint 6: Polish
1. Phase 6: Performance optimizations
2. Phase 8: Code consistency
3. Phase 3.2: Fix remaining `any` types

---

## Metrics for Success

| Metric | Current | Target |
|--------|---------|--------|
| Dead code (lines) | 1000+ | 0 |
| Max component size | 1624 lines | <300 lines |
| useState calls in FlavorFinderV2 | 17 | 0 (use hooks) |
| Test coverage | 0% | >70% critical paths |
| `any` type usage | 52 | 0 |
| Duplicate code instances | 4+ | 0 |
| JS/JSX files | 25 | 0 (all TypeScript) |

---

## Risk Mitigation

### Before Starting
1. Ensure git history is clean
2. Create a `refactor/cleanup` branch
3. Document current behavior with screenshots/recordings

### During Refactoring
1. Make small, focused commits
2. Run tests (once added) after each change
3. Keep the app running and manually verify
4. Don't mix refactoring with new features

### Rollback Plan
1. Each phase should be a separate PR
2. Keep deprecated code until new code is verified
3. Feature flag new implementations if needed

---

## Appendix: File Change Summary

### Files to Delete (Phase 1)
- `src/components/v2/HeroIngredient.jsx`
- `src/components/v2/HeroIngredientDisplay.jsx`
- `src/components/v2/CompactIngredientDisplay.jsx`
- `src/components/v2/EmptySlotIndicator.jsx`
- `src/utils/search.ts`
- `src/components/mobile/index.js`
- `src/components/mobile/MobileApp_BACKUP.tsx`

### Files to Create (Phases 2-5)
- `src/components/icons/LockIcons.tsx`
- `src/utils/ingredientColors.ts`
- `src/data/dietaryRestrictions.ts`
- `src/hooks/useIngredientSelection.ts`
- `src/hooks/useFilters.ts`
- `src/hooks/useCompatibility.ts`
- `src/hooks/useFlavorMap.ts`
- `src/hooks/useGeneration.ts`
- Multiple component split files

### Files to Migrate (Phase 3)
- All `.js` and `.jsx` files -> `.tsx`

---

*Document generated: December 2024*
*Based on comprehensive codebase analysis*
