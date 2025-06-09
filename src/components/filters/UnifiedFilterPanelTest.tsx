import React, { useState } from 'react';
import { FilterPanelTrigger, FilterPanel } from './UnifiedFilterPanel';
import type { TasteValues, CategoryFilters } from './UnifiedFilterPanel/types';

// Test component to verify our UnifiedFilterPanel works
const UnifiedFilterPanelTest: React.FC = () => {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  
  // Category state
  const [activeFilters, setActiveFilters] = useState<CategoryFilters>({
    category: '',
    subcategories: []
  });
  
  // Taste state
  const [tasteValues, setTasteValues] = useState<TasteValues>({
    sweet: 5,
    salty: 5,
    sour: 5,
    bitter: 5,
    umami: 5,
    fat: 5,
    spicy: 5
  });
  const [activeSliders, setActiveSliders] = useState(new Set<string>());
  
  // Dietary state (simplified for testing)
  const [dietaryRestrictions, setDietaryRestrictions] = useState<Record<string, boolean>>({
    'Proteins:Plant Proteins': true,
    'Proteins:Fish': true,
    'Grains:Bread': true,
    'Dairy': true
  });

  // Calculate active filter count
  const activeFilterCount = 
    (activeFilters.category ? 1 : 0) +
    activeFilters.subcategories.length +
    activeSliders.size +
    Object.values(dietaryRestrictions).filter(enabled => !enabled).length;

  const handleSliderToggle = (taste: string) => {
    setActiveSliders(prev => {
      const next = new Set(prev);
      if (next.has(taste)) {
        next.delete(taste);
      } else {
        next.add(taste);
      }
      return next;
    });
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Unified Filter Panel Test</h1>
      
      {/* Test the trigger and panel */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <FilterPanelTrigger
            isOpen={isFilterPanelOpen}
            onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            activeFilterCount={activeFilterCount}
          />
          <div className="text-sm text-gray-600">
            Active filters: {activeFilterCount}
          </div>
        </div>
        
        {isFilterPanelOpen && (
          <FilterPanel
            isOpen={isFilterPanelOpen}
            onClose={() => setIsFilterPanelOpen(false)}
            
            activeCategory={activeFilters.category}
            selectedSubcategories={activeFilters.subcategories}
            onCategoryChange={setActiveFilters}
            
            tasteValues={tasteValues}
            activeSliders={activeSliders}
            onTasteChange={setTasteValues}
            onSliderToggle={handleSliderToggle}
            
            dietaryRestrictions={dietaryRestrictions}
            onDietaryChange={setDietaryRestrictions}
          />
        )}
        
        {/* Debug info */}
        <div className="mt-8 p-4 bg-gray-100 rounded text-sm">
          <h3 className="font-bold mb-2">Current State:</h3>
          <div><strong>Category:</strong> {activeFilters.category || 'None'}</div>
          <div><strong>Subcategories:</strong> {activeFilters.subcategories.join(', ') || 'None'}</div>
          <div><strong>Active Taste Filters:</strong> {Array.from(activeSliders).join(', ') || 'None'}</div>
          <div><strong>Dietary Restrictions:</strong> {Object.entries(dietaryRestrictions).filter(([_, enabled]) => !enabled).map(([key]) => key).join(', ') || 'None'}</div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedFilterPanelTest;