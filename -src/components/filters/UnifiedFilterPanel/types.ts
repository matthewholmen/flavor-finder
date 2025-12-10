export interface TasteValues {
  sweet: number;
  salty: number;
  sour: number;
  bitter: number;
  umami: number;
  fat: number;
  spicy: number;
}

export interface CategoryFilters {
  category: string;
  subcategories: string[];
}

export interface UnifiedFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Category filters (PRIMARY)
  activeCategory: string;
  selectedSubcategories: string[];
  onCategoryChange: (filters: CategoryFilters) => void;
  
  // Taste filters (SECONDARY)
  tasteValues: TasteValues;
  activeSliders: Set<string>;
  onTasteChange: (values: TasteValues) => void;
  onSliderToggle: (taste: string) => void;
  
  // Dietary filters (TERTIARY - subset of settings)
  dietaryRestrictions: Record<string, boolean>;
  onDietaryChange: (restrictions: Record<string, boolean>) => void;
}

export interface CategorySectionProps {
  activeCategory: string;
  selectedSubcategories: string[];
  onFiltersChange: (filters: CategoryFilters) => void;
  compact?: boolean;
}

export interface TasteSectionProps {
  values: TasteValues;
  activeSliders: Set<string>;
  onChange: (values: TasteValues) => void;
  onToggleSlider: (taste: string) => void;
  compact?: boolean;
}

export interface DietarySectionProps {
  restrictions: Record<string, boolean>;
  onChange: (restrictions: Record<string, boolean>) => void;
  quickToggles?: string[];
}

export interface FilterSummaryProps {
  activeFilters: {
    category: string;
    subcategories: string[];
    activeSliders: Set<string>;
    dietaryExclusions: string[];
  };
  onRemoveFilter: (filterType: string, filterId: string) => void;
  onClearAll: () => void;
}