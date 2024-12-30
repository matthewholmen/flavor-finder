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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white px-4 py-1.5 rounded-full text-sm
          border-2 border-gray-300 hover:border-gray-800 
          transition-colors duration-200 focus:outline-none
          focus:border-gray-500 flex items-center gap-2 min-w-[140px]"
      >
        <span className="flex-grow text-left">
          {SORTING_OPTIONS.find(opt => opt.value === activeSorting)?.label}
        </span>
        <ChevronDown 
    className={`h-4 w-4 text-gray-500 transition-transform ${
      isOpen ? 'rotate-180' : 'hover:rotate-0'
    }`} 
  />
      </button>

      {isOpen && (
        <div className="absolute z-10 bottom-full mb-1 w-full">
          <div className="bg-white rounded-xl border-2 border-gray-300 shadow-lg overflow-hidden">
            {SORTING_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSortingChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50
                  transition-colors duration-150
                  ${activeSorting === option.value ? 'bg-gray-50' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SortingFilter;
