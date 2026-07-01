import { useState, useRef, useEffect, useCallback } from 'react';

interface HistoryEntry {
  ingredients: string[];
  locked: Set<number>;
  targetCount: number;
  // Opaque snapshot of any external state that must be restored together with
  // the ingredients (e.g. Taste Lab slot constraints). Captured by `captureExtra`
  // at save time and handed back to `restoreExtra` on undo.
  extra?: unknown;
}

interface UseIngredientSelectionProps {
  initialTargetCount?: number;
  maxIngredients?: number;
  // Optional hooks to snapshot/restore external state alongside the selection,
  // so undo reverts it in lockstep (Taste Lab uses this for slot constraints).
  captureExtra?: () => unknown;
  restoreExtra?: (extra: unknown) => void;
}

interface UseIngredientSelectionReturn {
  // State
  selectedIngredients: string[];
  lockedIngredients: Set<number>;
  targetIngredientCount: number;
  history: HistoryEntry[];

  // Computed values
  lockedCount: number;
  minTarget: number;
  canDecrementTarget: boolean;
  canIncrementTarget: boolean;
  canUndo: boolean;

  // Actions
  setSelectedIngredients: React.Dispatch<React.SetStateAction<string[]>>;
  setLockedIngredients: React.Dispatch<React.SetStateAction<Set<number>>>;
  setTargetIngredientCount: React.Dispatch<React.SetStateAction<number>>;
  saveToHistory: () => void;
  handleUndo: () => void;
  handleLockToggle: (index: number) => void;
  handleRemove: (index: number) => void;
  handleIngredientSelect: (ingredient: string, closeDrawer?: boolean) => void;
  handleIncrementTarget: (
    flavorMap: Map<string, Set<string>>,
    isIngredientRestricted: (ingredient: string) => boolean
  ) => boolean;
  handleDecrementTarget: () => void;
}

export const useIngredientSelection = ({
  initialTargetCount = 2,
  maxIngredients = 5,
  captureExtra,
  restoreExtra,
}: UseIngredientSelectionProps = {}): UseIngredientSelectionReturn => {
  // Core state
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [lockedIngredients, setLockedIngredients] = useState<Set<number>>(new Set());
  const [targetIngredientCount, setTargetIngredientCount] = useState(initialTargetCount);

  // History state for undo functionality
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const isUndoing = useRef(false);

  // Keep the latest capture/restore callbacks in refs so saveToHistory/handleUndo
  // can call them without being recreated (and without stale closures) on every
  // change to the external state they snapshot.
  const captureExtraRef = useRef(captureExtra);
  const restoreExtraRef = useRef(restoreExtra);
  captureExtraRef.current = captureExtra;
  restoreExtraRef.current = restoreExtra;

  // Computed values
  const lockedCount = lockedIngredients.size;
  const minTarget = lockedCount; // Can't go below locked count (can be 0)

  // Can decrement if:
  // 1. There are empty slots that can be removed (target > ingredients count)
  // 2. There are unlocked ingredients that can be removed (ingredients > minTarget)
  const hasRemovableEmptySlots = targetIngredientCount > selectedIngredients.length;
  const hasRemovableIngredients = selectedIngredients.length > minTarget;
  const canDecrementTarget = hasRemovableEmptySlots || hasRemovableIngredients;
  const canIncrementTarget = targetIngredientCount < maxIngredients;
  const canUndo = history.length > 0;

  // Auto-adjust target if locked count exceeds current target
  useEffect(() => {
    if (lockedIngredients.size > targetIngredientCount) {
      setTargetIngredientCount(lockedIngredients.size);
    }
  }, [lockedIngredients.size, targetIngredientCount]);

  // Save current state to history (call before making changes)
  const saveToHistory = useCallback(() => {
    if (isUndoing.current) return; // Don't save while undoing
    // Snapshot the external state EAGERLY, at call time — not lazily inside the
    // setHistory updater. React runs that updater in a later render pass, by which
    // point captureExtraRef points at a newer closure, so a lazy read would store
    // a slotTastes snapshot one step ahead of the ingredients (undo would lag a
    // step behind on color/constraint). Reading it here pins it to this instant.
    const extra = captureExtraRef.current?.();
    setHistory(prev => [...prev, {
      ingredients: [...selectedIngredients],
      locked: new Set(lockedIngredients),
      targetCount: targetIngredientCount,
      extra,
    }]);
  }, [selectedIngredients, lockedIngredients, targetIngredientCount]);

  // Undo to previous state
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    isUndoing.current = true;
    const prevState = history[history.length - 1];

    setSelectedIngredients(prevState.ingredients);
    setLockedIngredients(prevState.locked);
    setTargetIngredientCount(prevState.targetCount);
    restoreExtraRef.current?.(prevState.extra);
    setHistory(prev => prev.slice(0, -1));

    // Reset flag after state updates
    setTimeout(() => {
      isUndoing.current = false;
    }, 0);
  }, [history]);

  // Handle lock toggle
  const handleLockToggle = useCallback((index: number) => {
    setLockedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Handle ingredient removal
  const handleRemove = useCallback((index: number) => {
    saveToHistory();

    setSelectedIngredients(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });

    // Also remove lock if exists and adjust indices
    setLockedIngredients(prev => {
      const next = new Set(prev);
      next.delete(index);
      // Adjust indices for items after removed one
      const adjusted = new Set<number>();
      next.forEach(i => {
        if (i > index) adjusted.add(i - 1);
        else adjusted.add(i);
      });
      return adjusted;
    });

    // Reduce target count if it's greater than the new ingredient count
    setTargetIngredientCount(prev => {
      const newIngredientCount = selectedIngredients.length - 1;
      // Only reduce if current target is greater than new ingredient count
      if (prev > newIngredientCount) {
        return Math.max(1, newIngredientCount);
      }
      return prev;
    });
  }, [saveToHistory, selectedIngredients.length]);

  // Handle ingredient selection from drawer
  const handleIngredientSelect = useCallback((ingredient: string) => {
    if (selectedIngredients.length >= maxIngredients) return;
    if (selectedIngredients.includes(ingredient)) return;

    saveToHistory();

    setSelectedIngredients(prev => {
      const newIngredients = [...prev, ingredient];
      // Update target count to match new ingredient count if it exceeds current target
      if (newIngredients.length > targetIngredientCount) {
        setTargetIngredientCount(newIngredients.length);
      }
      return newIngredients;
    });
  }, [selectedIngredients, maxIngredients, targetIngredientCount, saveToHistory]);

  // Increment target count (for + button)
  // Tries to add a compatible ingredient; if none available, adds an empty slot
  const handleIncrementTarget = useCallback((
    flavorMap: Map<string, Set<string>>,
    isIngredientRestricted: (ingredient: string) => boolean
  ) => {
    if (targetIngredientCount >= maxIngredients) return false;

    // Find a compatible ingredient to add
    let newIngredient: string | undefined;
    if (selectedIngredients.length > 0) {
      // Get all ingredients compatible with current selection
      const compatibleIngredients = Array.from(flavorMap.keys()).filter(candidate => {
        // Skip if already selected
        if (selectedIngredients.includes(candidate)) return false;
        // Skip if restricted by dietary settings
        if (isIngredientRestricted(candidate)) return false;
        // Must be compatible with ALL currently selected ingredients
        return selectedIngredients.every(existing =>
          flavorMap.get(existing)?.has(candidate)
        );
      });

      // No compatible ingredient exists - signal failure so the UI can give feedback
      if (compatibleIngredients.length === 0) return false;

      // Pick a random compatible ingredient
      const randomIndex = Math.floor(Math.random() * compatibleIngredients.length);
      newIngredient = compatibleIngredients[randomIndex];
    } else {
      // No ingredients selected yet - pick any random ingredient
      const allAvailable = Array.from(flavorMap.keys()).filter(
        candidate => !isIngredientRestricted(candidate)
      );

      if (allAvailable.length === 0) return false;

      const randomIndex = Math.floor(Math.random() * allAvailable.length);
      newIngredient = allAvailable[randomIndex];
    }

    saveToHistory();

    // Add the ingredient
    setSelectedIngredients(prev => [...prev, newIngredient!]);
    // Only increment target if we're already at capacity (no empty slots)
    if (selectedIngredients.length >= targetIngredientCount) {
      setTargetIngredientCount(prev => prev + 1);
    }
    return true;
  }, [selectedIngredients, targetIngredientCount, maxIngredients, saveToHistory]);

  // Decrement: Remove empty slot first, then remove last unlocked ingredient (for - button)
  const handleDecrementTarget = useCallback(() => {
    saveToHistory();

    // If there are empty slots (target > actual ingredients), just reduce the target count
    // But don't go below the number of current ingredients (minimum 1 for UI)
    if (targetIngredientCount > selectedIngredients.length) {
      const newTarget = targetIngredientCount - 1;
      // Only reduce if we stay at or above the current ingredient count
      if (newTarget >= selectedIngredients.length && newTarget >= 1) {
        setTargetIngredientCount(newTarget);
        return;
      }
    }

    // Otherwise, find and remove the last unlocked ingredient
    for (let i = selectedIngredients.length - 1; i >= 0; i--) {
      if (!lockedIngredients.has(i)) {
        // Calculate what the new ingredient count will be after removal
        const newIngredientCount = selectedIngredients.length - 1;

        // Inline removal logic to avoid double history save from handleRemove
        setSelectedIngredients(prev => {
          const next = [...prev];
          next.splice(i, 1);
          return next;
        });

        // Also remove lock if exists and adjust indices
        setLockedIngredients(prev => {
          const next = new Set(prev);
          next.delete(i);
          // Adjust indices for items after removed one
          const adjusted = new Set<number>();
          next.forEach(idx => {
            if (idx > i) adjusted.add(idx - 1);
            else adjusted.add(idx);
          });
          return adjusted;
        });

        // Set target to the new ingredient count (maintaining the count after removal)
        setTargetIngredientCount(Math.max(1, newIngredientCount));
        return;
      }
    }
  }, [selectedIngredients, lockedIngredients, targetIngredientCount, saveToHistory]);

  return {
    // State
    selectedIngredients,
    lockedIngredients,
    targetIngredientCount,
    history,

    // Computed values
    lockedCount,
    minTarget,
    canDecrementTarget,
    canIncrementTarget,
    canUndo,

    // Actions
    setSelectedIngredients,
    setLockedIngredients,
    setTargetIngredientCount,
    saveToHistory,
    handleUndo,
    handleLockToggle,
    handleRemove,
    handleIngredientSelect,
    handleIncrementTarget,
    handleDecrementTarget,
  };
};

export default useIngredientSelection;
