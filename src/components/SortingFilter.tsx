import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export type SortingOption = 'alphabetical' | 'category' | 'taste';

interface SortingFilterProps {
  activeSorting: SortingOption;
  onSortingChange: (sorting: SortingOption) => void;
}

const SORTING_OPTIONS: { value: SortingOption; label: string }[] = [
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'category', label: 'Category' },
  { value: 'taste', label: 'Primary Taste' },
];

const SortingFilter: React.FC<SortingFilterProps> = ({
  activeSorting,
  onSortingChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          bg-white px-6 py-2 
          rounded-full text-md
          border-2 border-gray-200 
          hover:border-gray-400
          transition-all duration-200 
          focus:outline-none
          focus:border-gray-400 
          flex items-center 
          gap-2 min-w-[140px]
          text-gray-700
        "
      >
        <span className="flex-grow text-left">
          {SORTING_OPTIONS.find(opt => opt.value === activeSorting)?.label}
        </span>
        <ChevronDown 
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-30 top-full mb-2 w-[140px]">
          <div className="
            bg-white 
            rounded-2xl
            border-2 border-gray-200
            shadow-lg 
            overflow-hidden
            py-1
          ">
            {SORTING_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSortingChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full text-left py-2 text-md
                  transition-all duration-200
                  ${activeSorting === option.value 
                    ? 'text-gray-900' 
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <span className={`
                  inline-block px-4 relative
                  ${activeSorting === option.value 
                    ? 'font-medium' 
                    : 'hover:font-medium'
                  }
                `}>
                                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SortingFilter;