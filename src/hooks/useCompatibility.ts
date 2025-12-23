import { useState, useCallback } from 'react';

export type CompatibilityMode = 'perfect' | 'mixed' | 'random';

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
  // Auto-enable partial matches for mixed/random modes, disable for perfect
  const handleCompatibilityChange = useCallback((mode: CompatibilityMode) => {
    setCompatibilityMode(mode);
    if (mode === 'mixed' || mode === 'random') {
      setShowPartialMatches(true);
    } else if (mode === 'perfect') {
      setShowPartialMatches(false);
    }
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
