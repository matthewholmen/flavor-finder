import { useState, useEffect } from 'react';

export interface SavedCombination {
  id: string;
  name: string;
  ingredients: string[];
  createdAt: Date;
  lastUsed: Date;
  tags?: string[];
  notes?: string;
}

export const useSavedCombinations = () => {
  const [combinations, setCombinations] = useState<SavedCombination[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('flavorFinderCombinations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((combo: any) => ({
          ...combo,
          createdAt: new Date(combo.createdAt),
          lastUsed: new Date(combo.lastUsed)
        }));
        setCombinations(parsed);
      } catch (error) {
        console.error('Error parsing saved combinations:', error);
        setCombinations([]);
      }
    }
  }, []);

  // Save to localStorage when combinations change
  useEffect(() => {
    if (combinations.length > 0) {
      localStorage.setItem('flavorFinderCombinations', JSON.stringify(combinations));
    }
  }, [combinations]);

  const saveCombination = (name: string, ingredients: string[], tags?: string[], notes?: string) => {
    const newCombination: SavedCombination = {
      id: Date.now().toString(),
      name: name.trim() || `Combination ${combinations.length + 1}`,
      ingredients: [...ingredients],
      createdAt: new Date(),
      lastUsed: new Date(),
      tags,
      notes
    };
    setCombinations(prev => [newCombination, ...prev]);
    return newCombination.id;
  };

  const loadCombination = (id: string) => {
    const combination = combinations.find(c => c.id === id);
    if (combination) {
      // Update last used timestamp
      setCombinations(prev => 
        prev.map(c => c.id === id ? {...c, lastUsed: new Date()} : c)
      );
      return combination.ingredients;
    }
    return [];
  };

  const deleteCombination = (id: string) => {
    setCombinations(prev => prev.filter(c => c.id !== id));
  };

  const updateCombination = (id: string, updates: Partial<SavedCombination>) => {
    setCombinations(prev => 
      prev.map(c => c.id === id ? {...c, ...updates, lastUsed: new Date()} : c)
    );
  };

  const duplicateCombination = (id: string) => {
    const combination = combinations.find(c => c.id === id);
    if (combination) {
      return saveCombination(
        `${combination.name} (Copy)`,
        combination.ingredients,
        combination.tags,
        combination.notes
      );
    }
    return null;
  };

  const searchCombinations = (query: string) => {
    if (!query.trim()) return combinations;
    
    const searchTerm = query.toLowerCase();
    return combinations.filter(combo => 
      combo.name.toLowerCase().includes(searchTerm) ||
      combo.ingredients.some(ingredient => 
        ingredient.toLowerCase().includes(searchTerm)
      ) ||
      combo.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      combo.notes?.toLowerCase().includes(searchTerm)
    );
  };

  return {
    combinations,
    saveCombination,
    loadCombination,
    deleteCombination,
    updateCombination,
    duplicateCombination,
    searchCombinations
  };
};
