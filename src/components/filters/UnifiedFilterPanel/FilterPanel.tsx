import React, { useState } from 'react';
import { X } from 'lucide-react';
import { UnifiedFilterPanelProps } from './types.ts';
import CategorySection from './CategorySection.tsx';
import TasteSection from './TasteSection.tsx';
import DietarySection from './DietarySection.tsx';

type FilterTab = 'categories' | 'taste' | 'dietary';

const FilterPanel: React.FC<UnifiedFilterPanelProps> = ({
  isOpen,
  onClose,
  
  // Category filters
  activeCategory,
  selectedSubcategories,
  onCategoryChange,
  
  // Taste filters
  tasteValues,
  activeSliders,
  onTasteChange,
  onSliderToggle,
  
  // Dietary filters
  dietaryRestrictions,
  onDietaryChange
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('categories');

  if (!isOpen) return null;

  const tabs = [
    { id: 'categories' as FilterTab, label: 'Categories' },
    { id: 'taste' as FilterTab, label: 'Taste' },
    { id: 'dietary' as FilterTab, label: 'Dietary' }
  ];

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
      {/* Panel Header with Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between p-4 pb-0">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-50 transition-colors"
            aria-label="Close filters panel"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-3 text-base font-medium border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-[#6AAFE8] text-[#6AAFE8]'
                  : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-500'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel Content */}
      <div className="p-4">
        {activeTab === 'categories' && (
          <CategorySection
            activeCategory={activeCategory}
            selectedSubcategories={selectedSubcategories}
            onFiltersChange={onCategoryChange}
          />
        )}
        
        {activeTab === 'taste' && (
          <TasteSection
            values={tasteValues}
            activeSliders={activeSliders}
            onChange={onTasteChange}
            onToggleSlider={onSliderToggle}
          />
        )}
        
        {activeTab === 'dietary' && (
          <DietarySection
            restrictions={dietaryRestrictions}
            onChange={onDietaryChange}
          />
        )}
      </div>
    </div>
  );
};

export default FilterPanel;