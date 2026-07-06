import {
  Amphora,
  Apple,
  Beef,
  Carrot,
  Leaf,
  Milk,
  Wheat,
  Wine,
  LucideIcon,
} from 'lucide-react';
import { CategoryKey } from '../hooks/useSlots.ts';

// One icon per top-level category. The visual contract after the role-indicator
// rework: COLOR always means taste (TASTE_COLORS); CATEGORY is an icon. Keep
// these two axes from bleeding into each other — don't tint these icons with
// CATEGORY_COLORS in indicator contexts.
export const CATEGORY_ICONS: Record<CategoryKey, LucideIcon> = {
  Proteins: Beef,
  Vegetables: Carrot,
  Fruits: Apple,
  Dairy: Milk,
  Seasonings: Leaf,
  Pantry: Amphora,
  Grains: Wheat,
  Alcohol: Wine,
};
