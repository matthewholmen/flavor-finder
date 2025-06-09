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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-[250px] flex flex-col">
      {/* Panel Header with Tabs */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                text-sm font-medium pb-1 border-b-2 transition-colors
                ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close filters panel"
        >
          <X size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-3 flex-1 min-h-0">
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