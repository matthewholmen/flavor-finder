import React from 'react';
import { Lock } from 'lucide-react';
import { TASTE_COLORS } from '../../utils/colors.ts';
import { useScreenSize } from '../../hooks/useScreenSize.ts';

export const CompactIngredientDisplay = ({
  ingredients,
  ingredientProfiles,
  maxSlots = 5,
  lockedIngredients = new Set()
}) => {
  const { isMobile } = useScreenSize();

  const validIngredients = ingredients.filter(Boolean);
  const emptySlotCount = maxSlots - validIngredients.length;

  const getIngredientColor = (ingredient) => {
    const profile = ingredientProfiles.find(
      p => p.name.toLowerCase() === ingredient.toLowerCase()
    );

    if (!profile) return '#1f2937';

    let dominantTaste = 'sweet';
    let maxValue = -1;

    Object.entries(profile.flavorProfile).forEach(([taste, value]) => {
      if (value > maxValue) {
        maxValue = value;
        dominantTaste = taste;
      }
    });

    return TASTE_COLORS[dominantTaste] || '#1f2937';
  };

  // Format ingredients with commas and ampersand
  const formatIngredients = () => {
    const items = [];
    const isTwoIngredientSet = maxSlots === 2;

    // Add valid ingredients
    validIngredients.forEach((ingredient, displayIndex) => {
      const color = getIngredientColor(ingredient);
      const isLast = displayIndex === validIngredients.length - 1;
      const hasEmptySlots = emptySlotCount > 0;

      // Find actual index for lock status
      let actualIndex = displayIndex;
      let count = 0;
      for (let i = 0; i < ingredients.length; i++) {
        if (ingredients[i]) {
          if (count === displayIndex) {
            actualIndex = i;
            break;
          }
          count++;
        }
      }

      const isLocked = lockedIngredients.has(actualIndex);

      // Add ampersand BEFORE last ingredient (when there are no empty slots)
      if (!isTwoIngredientSet && isLast && !hasEmptySlots && validIngredients.length > 1) {
        items.push(<span key={`amp-before-${displayIndex}`} className="text-gray-400" style={{ fontFamily: 'Georgia, serif' }}> & </span>);
      }

      items.push(
        <span
          key={`ingredient-${displayIndex}`}
          className="inline-flex items-center gap-1 font-black whitespace-nowrap"
          style={{ color }}
        >
          {ingredient}
          {isLocked && (
            <Lock size={isMobile ? 14 : 16} strokeWidth={2.5} className="inline-block" style={{ color }} />
          )}
        </span>
      );

      // Add separator AFTER ingredient
      if (isTwoIngredientSet) {
        // For 2-ingredient sets, only use ampersand between items, no commas
        if (isLast && hasEmptySlots && validIngredients.length === 1) {
          items.push(<span key={`amp-${displayIndex}`} className="text-gray-400" style={{ fontFamily: 'Georgia, serif' }}> & </span>);
        } else if (!isLast) {
          items.push(<span key={`amp-${displayIndex}`} className="text-gray-400" style={{ fontFamily: 'Georgia, serif' }}> & </span>);
        }
      } else {
        // For 3+ ingredient sets
        if (!isLast) {
          items.push(<span key={`comma-${displayIndex}`} className="text-gray-400" style={{ fontFamily: 'Georgia, serif' }}>, </span>);
        } else if (hasEmptySlots && validIngredients.length > 0) {
          items.push(<span key={`comma-${displayIndex}`} className="text-gray-400" style={{ fontFamily: 'Georgia, serif' }}>, </span>);
        }
      }
    });

    // Add empty slots
    Array.from({ length: emptySlotCount }).forEach((_, index) => {
      const isLastEmpty = index === emptySlotCount - 1;

      // Add ampersand before first empty slot (if there are ingredients before it)
      if (index === 0 && validIngredients.length > 0 && !isTwoIngredientSet) {
        items.push(<span key={`amp-empty`} className="text-gray-400" style={{ fontFamily: 'Georgia, serif' }}> & </span>);
      }

      items.push(
        <span
          key={`empty-${index}`}
          className="text-gray-300 font-black"
        >
          ____
        </span>
      );

      if (!isLastEmpty) {
        items.push(<span key={`comma-empty-${index}`} className="text-gray-400" style={{ fontFamily: 'Georgia, serif' }}>, </span>);
      }
    });

    return items;
  };

  return (
    <div
      className={`
        fixed left-0 right-0 z-50
        px-4
        flex items-center justify-center
        transition-all duration-300
        ${isMobile ? 'text-3xl py-2.5' : 'text-2xl md:text-3xl lg:text-4xl py-3'}
      `}
      style={{
        // Center between header (~10vh) and drawer (~50vh from bottom)
        // Available space is roughly 10vh to 50vh, so center is ~30vh from top
        top: isMobile ? '25%' : '30%',
        backgroundColor: '#f9fafb',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div className="w-full max-w-7xl text-center leading-tight tracking-tight px-2">
        {formatIngredients()}
      </div>
    </div>
  );
};

export default CompactIngredientDisplay;
