import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';




// Using the same color scheme as SelectedIngredients for consistency
const TASTE_COLORS = {
  sweet: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    hover: 'hover:bg-orange-50',
    color: '#f97316'
  },
  salty: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    hover: 'hover:bg-blue-50',
    color: '#3b82f6'
  },
  sour: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    hover: 'hover:bg-green-50',
    color: '#22c55e'
  },
  bitter: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    hover: 'hover:bg-purple-50',
    color: '#a855f7'
  },
  umami: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    hover: 'hover:bg-red-50',
    color: '#ef4444'
  },
  fat: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    hover: 'hover:bg-yellow-50',
    color: '#facc15'
  },
  spicy: {
    bg: 'bg-pink-100',
    text: 'text-pink-800',
    hover: 'hover:bg-pink-50',
    color: '#ec4899'
  }
};

export interface TasteFilter {
  taste: keyof typeof TASTE_COLORS;
  minIntensity: number;
}

interface TasteFilterProps {
  selectedTastes: TasteFilter[];
  onChange: (tastes: TasteFilter[]) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function TasteFilter({
  selectedTastes,
  onChange
}: TasteFilterProps) {
  const [intensityValues, setIntensityValues] = useState<Record<string, number>>(
    Object.fromEntries(
      Object.keys(TASTE_COLORS).map(taste => [taste, 5])
    )
  );

  const toggleTaste = (taste: keyof typeof TASTE_COLORS, intensity: number) => {
    const existingIndex = selectedTastes.findIndex(t => t.taste === taste);
    
    if (existingIndex !== -1) {
      // Remove if already selected
      onChange(selectedTastes.filter(t => t.taste !== taste));
    } else {
      // Add with current intensity
      onChange([...selectedTastes, { taste, minIntensity: intensity }]);
    }
  };

  const updateIntensity = (taste: keyof typeof TASTE_COLORS, intensity: number) => {
    setIntensityValues(prev => ({ ...prev, [taste]: intensity }));
    
    const existingIndex = selectedTastes.findIndex(t => t.taste === taste);
    if (existingIndex !== -1) {
      const newTastes = [...selectedTastes];
      newTastes[existingIndex] = { taste, minIntensity: intensity };
      onChange(newTastes);
    }
  };

  return (
    <div className="space-y-4">
      
      <div className="space-y-1">
      {(Object.keys(TASTE_COLORS) as Array<keyof typeof TASTE_COLORS>).map(taste => (
  <div key={taste} className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={selectedTastes.some(t => t.taste === taste)}
          onChange={() => toggleTaste(taste, intensityValues[taste])}
          className="rounded border-gray-300"
        />
        <span className="capitalize">{taste}</span>
      </label>
      <span>{intensityValues[taste]}</span>
    </div>
<input
  type="range"
  min="1"
  max="10"
  value={intensityValues[taste]}
  onChange={(e) => updateIntensity(taste, parseInt(e.target.value))}
  className="w-full"
  style={{
    accentColor: TASTE_COLORS[taste].color,
    background: '#e5e7eb',  // Use `background` instead of just `backgroundColor`
  }}
  
/>


  </div>
))}
      </div>
    </div>
  );
}