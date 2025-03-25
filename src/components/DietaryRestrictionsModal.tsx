import React, { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { IngredientSubcategory } from '../types';

interface CategoryRestriction {
  name: string;
  enabled: boolean;
  subcategories: {
    name: string;
    enabled: boolean;
  }[];
}

interface DietaryRestrictionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  restrictions: Record<string, boolean>;
  onRestrictionsChange: (restrictions: Record<string, boolean>) => void;
}

const DietaryRestrictionsModal: React.FC<DietaryRestrictionsModalProps> = ({
  isOpen,
  onClose,
  restrictions,
  onRestrictionsChange
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
      subcategories: subcategories.map(subcategoryName => ({
        name: subcategoryName,
        enabled: restrictions[`${categoryName}:${subcategoryName}`] ?? true
      }))
    }));

    setCategories(initialCategories);
  }, [restrictions]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] h-auto md:h-auto md:max-h-[90vh] overflow-y-auto m-0 md:m-4"
        style={{ height: window.innerWidth < 768 ? '100vh' : 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Dietary Restrictions</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Description */}
        <div className="px-6 pt-4">
          <p className="text-gray-600 mb-6">
            Select the ingredient categories you want to include in your flavor combinations. 
            Deselected categories will be excluded when generating new combinations.
          </p>
        </div>
        
        {/* Categories List - scrollable area */}
        <div className="px-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <div className="space-y-6 pb-24">
            {categories.map((category, categoryIndex) => (
              <div key={category.name} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Category Header */}
                <button 
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  onClick={() => toggleCategory(categoryIndex)}
                >
                  <div className="flex items-center">
                    <div className={`
                      w-5 h-5 rounded border flex items-center justify-center mr-3
                      ${category.enabled 
                        ? 'bg-[#8DC25B] border-[#8DC25B]' 
                        : 'border-gray-300 bg-white'
                      }
                    `}>
                      {category.enabled && <Check size={14} className="text-white" />}
                    </div>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {category.subcategories.filter(sub => sub.enabled).length} of {category.subcategories.length}
                  </span>
                </button>
                
                {/* Subcategories */}
                <div className="divide-y divide-gray-100">
                  {category.subcategories.map((subcategory, subcategoryIndex) => (
                    <div 
                      key={subcategory.name}
                      className="px-4 py-2 flex items-center hover:bg-gray-50"
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
                        <span>{subcategory.name}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Sticky Footer with Save button */}
        <div className="sticky bottom-0 left-0 right-0 px-6 py-4 bg-white border-t border-gray-200 shadow-md flex justify-end">
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

export default DietaryRestrictionsModal;