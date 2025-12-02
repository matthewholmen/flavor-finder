import React, { useState } from 'react';
import { HeroIngredient } from './HeroIngredient';
import { EmptySlotIndicator } from './EmptySlotIndicator';

export const HeroIngredientDisplay = ({
  ingredients,
  lockedIngredients,
  ingredientProfiles,
  maxSlots = 5,
  onRemove,
  onLockToggle,
  onEmptySlotClick,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  // Filter out undefined ingredients for display
  const validIngredients = ingredients.filter(Boolean);
  const emptySlotCount = maxSlots - validIngredients.length;
  const totalSlots = maxSlots; // Total positions including empty
  
  // Check if any ingredient is hovered
  const hasHoveredIngredient = hoveredIndex !== null;
  
  // Special case: 2-ingredient set (no commas at all)
  const isTwoIngredientSet = maxSlots === 2;
  
  // For 2-ingredient sets, use tighter spacing
  const useTightSpacing = isTwoIngredientSet;

  // Determine punctuation for each ingredient based on position
  // For 2-ingredient sets: no commas, just "a & b" or "a & ____"
  // For 3+ ingredient sets: "a, b, c, & d" pattern with commas
  const getIngredientDisplayInfo = (displayIndex) => {
    const isLastIngredient = displayIndex === validIngredients.length - 1;
    const hasEmptySlots = emptySlotCount > 0;
    
    // For 2-ingredient sets, hide all commas
    if (isTwoIngredientSet) {
      return {
        showComma: false,
        showAmpersand: isLastIngredient && !hasEmptySlots && validIngredients.length > 1,
        isLastIngredient,
      };
    }
    
    // For 3+ ingredient sets
    let showComma = false;
    let showAmpersand = false;
    
    if (isLastIngredient) {
      // Last ingredient: 
      // - If there are empty slots after it, show comma
      // - If no empty slots and more than 1 ingredient, show ampersand before it
      showComma = hasEmptySlots;
      showAmpersand = !hasEmptySlots && validIngredients.length > 1;
    } else {
      // All other ingredients get commas
      showComma = true;
      showAmpersand = false;
    }
    
    return { showComma, showAmpersand, isLastIngredient };
  };
  
  // Determine punctuation for each empty slot
  const getEmptySlotDisplayInfo = (emptyIndex) => {
    const isLastEmptySlot = emptyIndex === emptySlotCount - 1;
    
    // For 2-ingredient sets, no commas
    if (isTwoIngredientSet) {
      return {
        showComma: false,
        showAmpersand: isLastEmptySlot && validIngredients.length >= 1,
      };
    }
    
    // For 3+ ingredient sets
    return {
      // Last empty slot gets ampersand (if there's at least one ingredient before it)
      showAmpersand: isLastEmptySlot && (validIngredients.length >= 1 || emptySlotCount > 1),
      // Non-last empty slots get commas
      showComma: !isLastEmptySlot,
    };
  };

  return (
    <div 
      className="
        flex items-center justify-center
        min-h-[50vh]
        px-6 md:px-12 lg:px-20
        text-center
      "
    >
      <div 
        className="
          font-black
          text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl
          leading-[1.15]
          tracking-tight
          max-w-[90vw]
        "
        style={{ 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          wordWrap: 'break-word',
        }}
      >
        {/* Render valid ingredients */}
        {validIngredients.map((ingredient, displayIndex) => {
          // Find the actual index in the original array for proper lock tracking
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
          
          const profile = ingredientProfiles.find(
            p => p.name.toLowerCase() === ingredient.toLowerCase()
          );
          
          const { showComma, showAmpersand, isLastIngredient } = getIngredientDisplayInfo(displayIndex);
          
          return (
            <HeroIngredient
              key={`${ingredient}-${displayIndex}`}
              ingredient={ingredient}
              profile={profile}
              isLocked={lockedIngredients.has(actualIndex)}
              isHovered={hoveredIndex === displayIndex}
              isFaded={hasHoveredIngredient && hoveredIndex !== displayIndex}
              onHover={() => setHoveredIndex(displayIndex)}
              onHoverEnd={() => setHoveredIndex(null)}
              onRemove={() => onRemove(actualIndex)}
              onLockToggle={() => onLockToggle(actualIndex)}
              showComma={showComma}
              showAmpersand={showAmpersand}
              isLast={isLastIngredient && emptySlotCount === 0}
              isTwoIngredientSet={isTwoIngredientSet}
              useTightSpacing={useTightSpacing}
            />
          );
        })}
        
        {/* Render ALL empty slots */}
        {Array.from({ length: emptySlotCount }).map((_, emptyIndex) => {
          const { showAmpersand, showComma } = getEmptySlotDisplayInfo(emptyIndex);
          
          return (
            <EmptySlotIndicator
              key={`empty-${emptyIndex}`}
              showAmpersand={showAmpersand}
              showComma={showComma}
              isFaded={hasHoveredIngredient}
              onClick={onEmptySlotClick}
              useTightSpacing={useTightSpacing}
            />
          );
        })}
      </div>
    </div>
  );
};

export default HeroIngredientDisplay;
