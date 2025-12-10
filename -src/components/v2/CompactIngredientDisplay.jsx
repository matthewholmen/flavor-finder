import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TASTE_COLORS } from '../../utils/colors.ts';
import { useScreenSize } from '../../hooks/useScreenSize.ts';

// Custom Lock icon with white-filled body (matches Lucide lock structure)
const FilledLock = ({ color, size = '100%' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    style={{
      width: size,
      height: size
    }}
  >
    {/* White fill for the lock body (rectangle portion) */}
    <rect
      x="3"
      y="11"
      width="18"
      height="11"
      rx="2"
      ry="2"
      fill="white"
    />
    {/* Lock body outline */}
    <rect
      x="3"
      y="11"
      width="18"
      height="11"
      rx="2"
      ry="2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Lock shackle (closed - attached to body) */}
    <path
      d="M7 11V7a5 5 0 0 1 10 0v4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// Custom Unlock icon (matches FilledLock but with open shackle)
const CustomUnlock = ({ color, size = '100%' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    style={{
      width: size,
      height: size
    }}
  >
    {/* Lock body outline */}
    <rect
      x="3"
      y="11"
      width="18"
      height="11"
      rx="2"
      ry="2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Unlock shackle (open - shifted up) */}
    <path
      d="M7 11V7a5 5 0 0 1 9.9-1"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const CompactIngredientDisplay = ({
  ingredients,
  ingredientProfiles,
  maxSlots = 5,
  lockedIngredients = new Set(),
  onLockToggle,
  onRemove
}) => {
  const { isMobile } = useScreenSize();
  const [hoveredIndex, setHoveredIndex] = useState(null);

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

      const isHovered = hoveredIndex === actualIndex;
      const showControls = isHovered;
      const iconSize = '0.35em';
      const iconContainerStyle = {
        width: iconSize,
        height: iconSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      };

      // Determine if we should show a comma after this ingredient
      let showComma = false;
      if (isTwoIngredientSet) {
        // For 2-ingredient sets, no commas
        showComma = false;
      } else {
        // For 3+ ingredient sets: show comma if not last, or if there are empty slots after
        if (!isLast) {
          showComma = true;
        } else if (hasEmptySlots && validIngredients.length > 0) {
          showComma = true;
        }
      }

      items.push(
        <span
          key={`ingredient-${displayIndex}`}
          data-ingredient
          className={`relative inline items-baseline`}
          onMouseEnter={() => setHoveredIndex(actualIndex)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Ingredient container */}
          <span
            className={`relative inline-block transition-all duration-200 cursor-pointer ${isMobile ? '' : 'whitespace-nowrap'}`}
            style={{
              fontWeight: 900,
              color,
              backgroundImage: isLocked ? `linear-gradient(${color}, ${color})` : 'none',
              backgroundSize: isLocked ? '100% 2px' : '0% 2px',
              backgroundPosition: 'left bottom',
              backgroundRepeat: 'no-repeat',
              animation: isLocked ? 'underlineIn 0.3s ease-out forwards' : 'none',
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onLockToggle) onLockToggle(actualIndex);
            }}
            title={isLocked ? "Click to unlock" : "Click to lock"}
          >
            {/* Ingredient name */}
            {ingredient}

            {/* Mobile: Lock icon inside pill when locked */}
            {isMobile && isLocked && (
              <span
                className="inline-flex items-center"
                style={{ marginLeft: '0.1em', verticalAlign: 'middle' }}
              >
                <FilledLock color="#1a1a1a" size="0.5em" />
              </span>
            )}

            {/* Mobile: Comma inside the span to prevent line break separation */}
            {isMobile && showComma && (
              <span
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'Georgia, "Times New Roman", Times, serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                }}
              >
                ,
              </span>
            )}

            {/* Desktop: Icons inline with text */}
            {!isMobile && (
              <span
                className="inline-flex items-center relative"
                style={{ verticalAlign: 'middle', marginLeft: '0.02em' }}
              >
                {/* For unlocked state: show comma when not hovered */}
                {!isLocked && !showControls && (
                  <span
                    style={{
                      color: '#1a1a1a',
                      fontFamily: 'Georgia, "Times New Roman", Times, serif',
                      fontStyle: 'italic',
                      fontWeight: 400,
                      position: 'absolute',
                      left: 0,
                    }}
                  >
                    {showComma ? ',' : '\u00A0'}
                  </span>
                )}
                <span
                  className="inline-flex flex-col items-center relative gap-0"
                  style={{
                    verticalAlign: 'middle',
                    minWidth: iconSize,
                  }}
                >
                  {/* X icon - shows on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); if (onRemove) onRemove(actualIndex); }}
                    className="p-0 transition-opacity"
                    title="Remove ingredient"
                    style={{
                      lineHeight: 0,
                      ...iconContainerStyle,
                      opacity: showControls ? 1 : 0,
                      pointerEvents: showControls ? 'auto' : 'none',
                    }}
                  >
                    <X style={{ color: '#9ca3af', width: '100%', height: '100%' }} strokeWidth={2} />
                  </button>

                  {/* Lock/Unlock icon */}
                  <button
                    onClick={(e) => { e.stopPropagation(); if (onLockToggle) onLockToggle(actualIndex); }}
                    className="p-0 transition-opacity"
                    title={isLocked ? "Unlock ingredient" : "Lock ingredient"}
                    style={{
                      lineHeight: 0,
                      marginTop: '-0.06em',
                      ...iconContainerStyle,
                      opacity: isLocked ? 1 : (showControls ? 1 : 0),
                      pointerEvents: (isLocked || showControls) ? 'auto' : 'none',
                    }}
                  >
                    {isLocked ? (
                      <FilledLock color="#1a1a1a" />
                    ) : (
                      <CustomUnlock color="#d1d5db" />
                    )}
                  </button>
                </span>
              </span>
            )}
          </span>

          {/* Space after ingredient (for non-last ingredients) */}
          {!isLast && (
            <span style={{ marginRight: isTwoIngredientSet ? '0.00em' : '0.15em' }}></span>
          )}
        </span>
      );

      // Add ampersand AFTER ingredient for two-ingredient sets
      if (isTwoIngredientSet) {
        if (isLast && hasEmptySlots && validIngredients.length === 1) {
          items.push(<span key={`amp-${displayIndex}`} className="text-gray-400" style={{ fontFamily: 'Georgia, serif' }}> & </span>);
        } else if (!isLast) {
          items.push(<span key={`amp-${displayIndex}`} className="text-gray-400" style={{ fontFamily: 'Georgia, serif' }}> & </span>);
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
