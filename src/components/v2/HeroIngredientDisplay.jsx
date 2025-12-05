import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Unlock } from 'lucide-react';
import { HeroIngredient } from './HeroIngredient';
import { EmptySlotIndicator } from './EmptySlotIndicator';
import { useScreenSize } from '../../hooks/useScreenSize.ts';

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
  const [focusedIngredientIndex, setFocusedIngredientIndex] = useState(null);
  const { isMobile, width } = useScreenSize();
  const containerRef = useRef(null);

  // Filter out undefined ingredients for display
  const validIngredients = ingredients.filter(Boolean);

  // Click outside handler to dismiss mobile action buttons
  useEffect(() => {
    if (!isMobile || focusedIngredientIndex === null) return;

    const handleClickOutside = (e) => {
      // Don't dismiss if clicking on the action buttons themselves
      if (e.target.closest('[data-action-buttons]')) return;
      // Don't dismiss if clicking on an ingredient (it will set its own focus)
      if (e.target.closest('[data-ingredient]')) return;
      setFocusedIngredientIndex(null);
      setHoveredIndex(null);
    };

    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMobile, focusedIngredientIndex]);

  // Get the focused ingredient info for mobile action buttons
  const getFocusedIngredientInfo = () => {
    if (focusedIngredientIndex === null) return null;
    const ingredient = validIngredients[focusedIngredientIndex];
    if (!ingredient) return null;

    // Find actual index in original array
    let actualIndex = focusedIngredientIndex;
    let count = 0;
    for (let i = 0; i < ingredients.length; i++) {
      if (ingredients[i]) {
        if (count === focusedIngredientIndex) {
          actualIndex = i;
          break;
        }
        count++;
      }
    }

    return {
      ingredient,
      actualIndex,
      isLocked: lockedIngredients.has(actualIndex),
    };
  };

  const focusedInfo = getFocusedIngredientInfo();

  // Handle remove with dismiss
  const handleMobileRemove = () => {
    if (focusedInfo) {
      onRemove(focusedInfo.actualIndex);
      setFocusedIngredientIndex(null);
      setHoveredIndex(null);
    }
  };

  // Handle lock toggle with dismiss
  const handleMobileLockToggle = () => {
    if (focusedInfo) {
      onLockToggle(focusedInfo.actualIndex);
      setFocusedIngredientIndex(null);
      setHoveredIndex(null);
    }
  };
  const emptySlotCount = maxSlots - validIngredients.length;
  const totalSlots = maxSlots; // Total positions including empty
  
  // Check if any ingredient is hovered
  const hasHoveredIngredient = hoveredIndex !== null;
  
  // Special case: 2-ingredient set (no commas at all)
  const isTwoIngredientSet = maxSlots === 2;
  
  // For 2-ingredient sets, use tighter spacing
  const useTightSpacing = isTwoIngredientSet;

  // Fixed typography classes - consistent size regardless of ingredient count
  const getTypographyClasses = () => {
    if (isMobile) {
      // Mobile: larger size for bold, impactful appearance matching desktop
      return 'text-5xl';
    }

    // Desktop: fixed size to match original design
    return 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl';
  };

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
      className={`
        flex items-center justify-center
        px-4 sm:px-6 md:px-12 lg:px-20
        text-center
        ${isMobile ? 'min-h-[40vh] py-4' : 'min-h-[50vh]'}
      `}
    >
      <div
        className={`
          font-black
          ${getTypographyClasses()}
          ${isMobile ? 'leading-[1.2]' : 'leading-[1.15]'}
          tracking-tight
          ${isMobile ? 'max-w-[90vw]' : 'max-w-[95vw] sm:max-w-[90vw]'}
        `}
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
              isFocused={isMobile && focusedIngredientIndex === displayIndex}
              isFaded={hasHoveredIngredient && hoveredIndex !== displayIndex}
              onHover={() => setHoveredIndex(displayIndex)}
              onHoverEnd={() => setHoveredIndex(null)}
              onFocus={() => setFocusedIngredientIndex(displayIndex)}
              onRemove={() => onRemove(actualIndex)}
              onLockToggle={() => onLockToggle(actualIndex)}
              showComma={showComma}
              showAmpersand={showAmpersand}
              isLast={isLastIngredient && emptySlotCount === 0}
              isTwoIngredientSet={isTwoIngredientSet}
              useTightSpacing={useTightSpacing}
              isMobile={isMobile}
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
              isMobile={isMobile}
            />
          );
        })}
      </div>

      {/* Mobile action buttons - fixed near bottom of screen, above tray handle */}
      {isMobile && focusedInfo && (
        <div
          data-action-buttons
          className="fixed left-1/2 -translate-x-1/2 flex items-center gap-6 z-50"
          style={{
            bottom: '120px',
            opacity: 1,
            transition: 'opacity 150ms ease',
          }}
        >
          {/* Remove button */}
          <button
            onClick={handleMobileRemove}
            className="flex items-center justify-center bg-white rounded-full shadow-lg active:bg-gray-100"
            style={{
              width: '64px',
              height: '64px',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
            }}
            title="Remove ingredient"
          >
            <X size={28} className="text-gray-500" strokeWidth={2} />
          </button>

          {/* Lock/Unlock button */}
          <button
            onClick={handleMobileLockToggle}
            className="flex items-center justify-center bg-white rounded-full shadow-lg active:bg-gray-100"
            style={{
              width: '64px',
              height: '64px',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
            }}
            title={focusedInfo.isLocked ? "Unlock ingredient" : "Lock ingredient"}
          >
            {focusedInfo.isLocked ? (
              <Lock size={28} className="text-gray-700" strokeWidth={2} />
            ) : (
              <Unlock size={28} className="text-gray-400" strokeWidth={2} />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default HeroIngredientDisplay;
