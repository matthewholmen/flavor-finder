import { useState, useEffect } from 'react';
import { FlavorPreset } from '../data/flavorPresets.ts';
import { SlotTaste } from './useSlots.ts';

const STORAGE_KEY = 'flavorFinderCustomPresets';

// User-built Flavor Presets, persisted to localStorage. They live in the
// gallery's "Your pairings" tier alongside the built-in presets. This is the
// local-first primitive behind the eventual community sharing — a custom preset
// is just a FlavorPreset, so it serializes/links the same way.
export const useCustomPresets = () => {
  const [customPresets, setCustomPresets] = useState<FlavorPreset[]>([]);
  // Don't persist until the initial load runs, or the mount effect would clobber
  // stored data with the empty initial state.
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCustomPresets(JSON.parse(saved));
    } catch (error) {
      console.error('Error parsing custom presets:', error);
      setCustomPresets([]);
    }
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
    } catch {
      // Ignore storage write errors (e.g. quota / private mode)
    }
  }, [customPresets, hasLoaded]);

  // Add a pairing from the builder. Returns the saved preset (with its id) so the
  // caller can immediately load it.
  const addCustomPreset = (name: string, slots: SlotTaste[]): FlavorPreset => {
    const preset: FlavorPreset = {
      id: `custom-${Date.now()}`,
      name: name.trim() || 'Untitled pairing',
      description: 'Your pairing',
      tier: 'custom',
      slots: slots.map(s => ({ ...s })),
    };
    setCustomPresets(prev => [preset, ...prev]);
    return preset;
  };

  const deleteCustomPreset = (id: string) => {
    setCustomPresets(prev => prev.filter(p => p.id !== id));
  };

  return { customPresets, addCustomPreset, deleteCustomPreset };
};

export default useCustomPresets;
