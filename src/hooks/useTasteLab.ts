import { useState, useCallback } from 'react';

// The 7 taste dimensions an ingredient profile is scored on (0-10 each).
export type TasteKey =
  | 'sweet'
  | 'salty'
  | 'sour'
  | 'umami'
  | 'fat'
  | 'spicy'
  | 'aromatic';

export const TASTE_KEYS: TasteKey[] = [
  'sweet',
  'salty',
  'sour',
  'umami',
  'fat',
  'spicy',
  'aromatic',
];

// A single Taste Lab slot: the dominant taste it's hunting for and the minimum
// score (0-10) an ingredient must hit on that taste to qualify.
export interface SlotTaste {
  taste: TasteKey;
  threshold: number;
}

// Default to a classic contrast (salty + sweet → e.g. anchovy + plum) at a
// threshold that feels intentional rather than bland.
const DEFAULT_SLOTS: SlotTaste[] = [
  { taste: 'salty', threshold: 5 },
  { taste: 'sweet', threshold: 5 },
];

interface UseTasteLabReturn {
  isTasteLab: boolean;
  setIsTasteLab: React.Dispatch<React.SetStateAction<boolean>>;
  slotTastes: SlotTaste[];
  setSlotTaste: (slotIndex: number, patch: Partial<SlotTaste>) => void;
}

/**
 * State for "Taste Lab" mode: a two-ingredient generation mode where each slot
 * is constrained to a dominant taste above a user-set threshold, and the two
 * results must still pair with each other.
 */
export const useTasteLab = (): UseTasteLabReturn => {
  const [isTasteLab, setIsTasteLab] = useState(false);
  const [slotTastes, setSlotTastes] = useState<SlotTaste[]>(DEFAULT_SLOTS);

  const setSlotTaste = useCallback((slotIndex: number, patch: Partial<SlotTaste>) => {
    setSlotTastes(prev =>
      prev.map((slot, i) => (i === slotIndex ? { ...slot, ...patch } : slot))
    );
  }, []);

  return { isTasteLab, setIsTasteLab, slotTastes, setSlotTaste };
};

export default useTasteLab;
