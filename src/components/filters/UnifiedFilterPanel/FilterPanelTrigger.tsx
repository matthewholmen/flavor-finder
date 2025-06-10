import React from 'react';
import { Filter } from 'lucide-react';

interface FilterPanelTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  activeFilterCount: number;
  className?: string;
}

const FilterPanelTrigger: React.FC<FilterPanelTriggerProps> = ({
  isOpen,
  onToggle,
  activeFilterCount,
  className = ''
}) => {
  return (
    <button
      onClick={onToggle}
      className={`
        relative flex items-center justify-center
        px-4 rounded-full border-2 transition-all duration-200
        ${isOpen 
          ? 'bg-blue-50 border-[#72A8D5] text-[#72A8D5]' 
          : 'bg-white border-gray-300 text-gray-600 hover:border-gray-500 hover:text-gray-800'
        }
        ${className}
      `}
      aria-expanded={isOpen}
      aria-label={`${isOpen ? 'Close' : 'Open'} filters panel`}
    >
      <Filter size={20} className="mr-2" />
      <span className="font-medium">Filters</span>
      
      {/* Active filter count badge */}
      {activeFilterCount > 0 && (
        <span className={`
          absolute -top-2 -right-2 
          flex items-center justify-center
          min-w-5 h-5 px-1.5 rounded-full text-xs font-bold
          ${isOpen 
            ? 'bg-[#72A8D5] text-white' 
            : 'bg-red-500 text-white'
          }
          transition-colors duration-200
        `}>
          {activeFilterCount > 99 ? '99+' : activeFilterCount}
        </span>
      )}
    </button>
  );
};

export default FilterPanelTrigger;