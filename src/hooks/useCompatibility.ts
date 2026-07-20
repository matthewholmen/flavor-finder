import { useState, useCallback } from 'react';

// 'random' (no pairing requirement) was removed July 2026 — it openly
// contradicted the app's core promise that every combo is mutually compatible.
export type CompatibilityMode = 'perfect' | 'mixed';

interface UseCompatibilityReturn {
  // State
  compatibilityMode: CompatibilityMode;
  showPartialMatches: boolean;

  // Actions
  setCompatibilityMode: React.Dispatch<React.SetStateAction<CompatibilityMode>>;
  setShowPartialMatches: React.Dispatch<React.SetStateAction<boolean>>;

  // Handlers
  handleCompatibilityChange: (mode: CompatibilityMode) => void;
  togglePartialMatches: () => void;
}

export const useCompatibility = (): UseCompatibilityReturn => {
  const [compatibilityMode, setCompatibilityMode] = useState<CompatibilityMode>('perfect');
  const [showPartialMatches, setShowPartialMatches] = useState(false);

  // Handle compatibility mode change
  // Auto-enable partial matches for mixed mode, disable for perfect
  const handleCompatibilityChange = useCallback((mode: CompatibilityMode) => {
    setCompatibilityMode(mode);
    setShowPartialMatches(mode === 'mixed');
  }, []);

  // Toggle partial matches
  const togglePartialMatches = useCallback(() => {
    setShowPartialMatches(prev => !prev);
  }, []);

  return {
    // State
    compatibilityMode,
    showPartialMatches,

    // Actions
    setCompatibilityMode,
    setShowPartialMatches,

    // Handlers
    handleCompatibilityChange,
    togglePartialMatches,
  };
};

export default useCompatibility;
