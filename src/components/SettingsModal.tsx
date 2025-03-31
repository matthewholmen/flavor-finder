import React, { useEffect, useState } from 'react';
import { X, Check, ChevronDown, Toggle } from 'lucide-react';
import { IngredientSubcategory } from '../types';

interface CategoryRestriction {
  name: string;
  enabled: boolean;
  expanded: boolean;
  subcategories: {
    name: string;
    enabled: boolean;
  }[];
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  restrictions: Record<string, boolean>;
  onRestrictionsChange: (restrictions: Record<string, boolean>) => void;
  useBooleanSearch: boolean;
  onBooleanSearchChange: (value: boolean) => void;
  inMobileContainer?: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  restrictions,
  onRestrictionsChange,
  useBooleanSearch,
  onBooleanSearchChange,
  inMobileContainer = false
}) => {
  const [categories, setCategories] = useState<CategoryRestriction[]>([]);
  
  // Initialize categories based on IngredientSubcategory type
  useEffect(() => {
    const categoryNames = Object.keys(restrictions).reduce<Record<string, string[]>>((acc, key) => {
      // If the key contains a colon, it's a subcategory (format: "category:subcategory")
      if (key.includes(':')) {
        const [category, subcategory] = key.split(':');
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(subcategory);
      }
      return acc;
    }, {});

    const initialCategories = Object.entries(categoryNames).map(([categoryName, subcategories]) => ({
      name: categoryName,
      enabled: !subcategories.some(sub => !restrictions[`${categoryName}:${sub}`]),
      expanded: false, // Start collapsed
      subcategories: subcategories.map(subcategoryName => ({
        name: subcategoryName,
        enabled: restrictions[`${categoryName}:${subcategoryName}`] ?? true
      }))
    }));

    setCategories(initialCategories);
  }, [restrictions]);

  // Handle ESC key press and add modal-open class to body
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Add modal-open class to body when settings modal is open
      document.body.classList.add('modal-open');
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Remove modal-open class when settings modal closes
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, onClose]);

  // Toggle category expanded state
  const toggleCategoryExpanded = (categoryIndex: number) => {
    setCategories(prevCategories => {
      const newCategories = [...prevCategories];
      newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        expanded: !newCategories[categoryIndex].expanded
      };
      return newCategories;
    });
  };

  // Toggle category and all its subcategories
  const toggleCategory = (categoryIndex: number) => {
    setCategories(prevCategories => {
      const newCategories = [...prevCategories];
      const category = newCategories[categoryIndex];
      const newEnabled = !category.enabled;
      
      // Update the category
      newCategories[categoryIndex] = {
        ...category,
        enabled: newEnabled,
        // Also update all subcategories to match
        subcategories: category.subcategories.map(sub => ({
          ...sub,
          enabled: newEnabled
        }))
      };
      
      return newCategories;
    });
  };

  // Toggle a specific subcategory
  const toggleSubcategory = (categoryIndex: number, subcategoryIndex: number) => {
    setCategories(prevCategories => {
      const newCategories = [...prevCategories];
      const category = newCategories[categoryIndex];
      
      // Update the subcategory
      const newSubcategories = [...category.subcategories];
      newSubcategories[subcategoryIndex] = {
        ...newSubcategories[subcategoryIndex],
        enabled: !newSubcategories[subcategoryIndex].enabled
      };
      
      // Check if all subcategories are now enabled or disabled to update the category state
      const allEnabled = newSubcategories.every(sub => sub.enabled);
      const allDisabled = newSubcategories.every(sub => !sub.enabled);
      
      newCategories[categoryIndex] = {
        ...category,
        enabled: allEnabled,
        subcategories: newSubcategories
      };
      
      return newCategories;
    });
  };

  // Reset all filters to default state (all ON)
  const resetFilters = () => {
    setCategories(prevCategories => {
      return prevCategories.map(category => ({
        ...category,
        enabled: true,
        subcategories: category.subcategories.map(sub => ({
          ...sub,
          enabled: true
        }))
      }));
    });
  };

  // Save changes
  const saveChanges = () => {
    const newRestrictions = {...restrictions};
    
    // Update all restriction values based on current state
    categories.forEach(category => {
      category.subcategories.forEach(subcategory => {
        newRestrictions[`${category.name}:${subcategory.name}`] = subcategory.enabled;
      });
    });
    
    onRestrictionsChange(newRestrictions);
    onClose();
  };
  
  if (!isOpen && !inMobileContainer) return null;

  // Render content for mobile container
  const renderMobileContent = () => {
    return (
      <div className="flex flex-col h-full">
        {/* Search Settings Section */}
        <div className="pb-6 border-b border-gray-200">
          <h3 className="font-semibold text-xl mb-3">Search Settings</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Boolean Search</p>
              <p className="text-sm text-gray-500">Add quotes around each ingredient in search queries</p>
            </div>
            <button
              onClick={() => onBooleanSearchChange(!useBooleanSearch)}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${useBooleanSearch ? 'bg-[#8DC25B]' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${useBooleanSearch ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>
        
        {/* Dietary Restrictions Section */}
        <div className="pt-4">
          <h3 className="font-semibold text-xl mb-3">Dietary Restrictions</h3>
          <p className="text-gray-600 mb-6">
            Select the ingredient categories you want to include in your generated flavor combinations. 
            Deselected categories will be excluded when generating new combinations.
          </p>
        </div>
        
        {/* Categories List */}
        <div className="flex-1 pb-6">
          <div className="space-y-6">
            {categories.map((category, categoryIndex) => (
              <div key={category.name} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Category Header */}
                <div className="w-full flex items-center bg-gray-50 hover:bg-gray-100 transition-colors">
                  <button 
                    className="flex-1 flex items-center px-4 py-3 text-left"
                    onClick={() => toggleCategory(categoryIndex)}
                  >
                    <div className={`
                      w-5 h-5 rounded border flex items-center justify-center mr-3
                      ${category.enabled 
                        ? 'bg-[#8DC25B] border-[#8DC25B]' 
                        : 'border-gray-300 bg-white'
                      }
                    `}>
                      {category.enabled && <Check size={14} className="text-white" />}
                    </div>
                    <span className="font-medium text-base">{category.name}</span>
                  </button>
                  
                  <div className="flex items-center px-4">
                    <span className="text-base text-gray-500 mr-3">
                      {category.subcategories.filter(sub => sub.enabled).length} of {category.subcategories.length}
                    </span>
                    <button
                      onClick={() => toggleCategoryExpanded(categoryIndex)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ChevronDown 
                        size={20} 
                        className={`transform transition-transform ${category.expanded ? 'rotate-180' : ''}`} 
                      />
                    </button>
                  </div>
                </div>
                
                {/* Subcategories - only shown when expanded */}
                {category.expanded && (
                  <div className="divide-y divide-gray-100">
                    {category.subcategories.map((subcategory, subcategoryIndex) => (
                      <div 
                        key={subcategory.name}
                        className="px-4 py-3 flex items-center hover:bg-gray-50"
                      >
                        <button 
                          className="flex items-center flex-1"
                          onClick={() => toggleSubcategory(categoryIndex, subcategoryIndex)}
                        >
                          <div className={`
                            w-5 h-5 rounded border flex items-center justify-center mr-3
                            ${subcategory.enabled 
                              ? 'bg-[#8DC25B] border-[#8DC25B]' 
                              : 'border-gray-300 bg-white'
                            }
                          `}>
                            {subcategory.enabled && <Check size={14} className="text-white" />}
                          </div>
                          <span className="text-base">{subcategory.name}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  // Return mobile content if in mobile container
  if (inMobileContainer) {
    return renderMobileContent();
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] h-auto md:h-auto md:max-h-[90vh] overflow-y-auto m-0 md:m-4"
        style={{ height: window.innerWidth < 768 ? '100vh' : 'auto', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Search Settings Section */}
        <div className="px-6 pt-4 pb-6 border-b border-gray-200">
          <h3 className="font-semibold text-xl mb-3">Search Settings</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Boolean Search</p>
              <p className="text-sm text-gray-500">Add quotes around each ingredient in search queries</p>
            </div>
            <button
              onClick={() => onBooleanSearchChange(!useBooleanSearch)}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${useBooleanSearch ? 'bg-[#8DC25B]' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${useBooleanSearch ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>
        
        {/* Dietary Restrictions Section */}
        <div className="px-6 pt-4">
          <h3 className="font-semibold text-xl mb-3">Dietary Restrictions</h3>
          <p className="text-gray-600 mb-6">
            Select the ingredient categories you want to include in your generated flavor combinations. 
            Deselected categories will be excluded when generating new combinations.
          </p>
        </div>
        
        {/* Categories List - removed overflow and maxHeight for single scrollbar */}
        <div className="px-6">
          <div className="space-y-6 pb-16">
            {categories.map((category, categoryIndex) => (
              <div key={category.name} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Category Header */}
                <div className="w-full flex items-center bg-gray-50 hover:bg-gray-100 transition-colors">
                  <button 
                    className="flex-1 flex items-center px-4 py-3 text-left"
                    onClick={() => toggleCategory(categoryIndex)}
                  >
                    <div className={`
                      w-5 h-5 rounded border flex items-center justify-center mr-3
                      ${category.enabled 
                        ? 'bg-[#8DC25B] border-[#8DC25B]' 
                        : 'border-gray-300 bg-white'
                      }
                    `}>
                      {category.enabled && <Check size={14} className="text-white" />}
                    </div>
                    <span className="font-medium text-base">{category.name}</span>
                  </button>
                  
                  <div className="flex items-center px-4">
                    <span className="text-base text-gray-500 mr-3">
                      {category.subcategories.filter(sub => sub.enabled).length} of {category.subcategories.length}
                    </span>
                    <button
                      onClick={() => toggleCategoryExpanded(categoryIndex)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ChevronDown 
                        size={20} 
                        className={`transform transition-transform ${category.expanded ? 'rotate-180' : ''}`} 
                      />
                    </button>
                  </div>
                </div>
                
                {/* Subcategories - only shown when expanded */}
                {category.expanded && (
                  <div className="divide-y divide-gray-100">
                    {category.subcategories.map((subcategory, subcategoryIndex) => (
                      <div 
                        key={subcategory.name}
                        className="px-4 py-3 flex items-center hover:bg-gray-50"
                      >
                        <button 
                          className="flex items-center flex-1"
                          onClick={() => toggleSubcategory(categoryIndex, subcategoryIndex)}
                        >
                          <div className={`
                            w-5 h-5 rounded border flex items-center justify-center mr-3
                            ${subcategory.enabled 
                              ? 'bg-[#8DC25B] border-[#8DC25B]' 
                              : 'border-gray-300 bg-white'
                            }
                          `}>
                            {subcategory.enabled && <Check size={14} className="text-white" />}
                          </div>
                          <span className="text-base">{subcategory.name}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Sticky Footer with Save button */}
        <div className="sticky bottom-0 left-0 right-0 px-6 py-4 bg-white border-t border-gray-200 shadow-md flex justify-between">
          <button
            onClick={resetFilters}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Reset Filters
          </button>
          <button
            onClick={saveChanges}
            className="px-6 py-3 bg-[#8DC25B] border border-[#8DC25B] rounded-lg text-white hover:bg-[#7db14a] transition-colors font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;