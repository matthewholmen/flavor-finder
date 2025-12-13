import React, { useState, useEffect } from 'react';
import { X, Lock, Unlock } from 'lucide-react';
import { TASTE_COLORS } from '../../utils/colors.ts';
import { useScreenSize } from '../../hooks/useScreenSize.ts';

// Custom Lock icon with white-filled body
const FilledLock = ({ color, size = '100%' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    style={{ width: size, height: size }}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="white" />
    <rect
      x="3" y="11" width="18" height="11" rx="2" ry="2"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
    />
    <path
      d="M7 11V7a5 5 0 0 1 10 0v4"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
    />
  </svg>
);


// Custom Unlock icon
const CustomUnlock = ({ color, size = '100%' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    style={{ width: size, height: size }}
  >
    <rect
      x="3" y="11" width="18" height="11" rx="2" ry="2"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
    />
    <path
      d="M7 11V7a5 5 0 0 1 9.9-1"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
    />
  </svg>
);

// Get dominant taste color for ingredient
const getIngredientColor = (ingredient, ingredientProfiles) => {
  const profile = ingredientProfiles.find(
    p => p.name.toLowerCase() === ingredient.toLowerCase()
  );

  if (!profile?.flavorProfile) return '#374151';

  let dominantTaste = 'sweet';
  let maxValue = -1;

  Object.entries(profile.flavorProfile).forEach(([taste, value]) => {
    if (value > maxValue) {
      maxValue = value;
      dominantTaste = taste;
    }
  });

  return maxValue > 0 ? (TASTE_COLORS[dominantTaste] || '#374151') : '#374151';
};

// Single Ingredient component - handles both hero and compact modes
const Ingredient = ({
  ingredient,
  color,
  isLocked,
  isHovered,
  isFocused,
  isFaded,
  isPerfectMatch = true, // Whether this ingredient pairs with all others
  onHover,
  onHoverEnd,
  onFocus,
  onRemove,
  onLockToggle,
  showComma,
  showAmpersand,
  isLast,
  isTwoIngredientSet,
  isMobile,
  isCompact,
}) => {
  const fadedColor = '#e8e8e8';
  const iconSize = '0.35em';
  const showControls = isHovered;

  const iconContainerStyle = {
    width: iconSize,
    height: iconSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const renderDesktopIconStack = () => (
    <span
      className="inline-flex flex-col items-center relative gap-0"
      style={{ verticalAlign: 'middle', minWidth: iconSize }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
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
      <button
        onClick={(e) => { e.stopPropagation(); onLockToggle(); }}
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
          <FilledLock color={isFaded ? fadedColor : '#1a1a1a'} />
        ) : (
          <CustomUnlock color="#d1d5db" />
        )}
      </button>
    </span>
  );

  return (
    <span
      data-ingredient
      className={`relative inline items-baseline ${showAmpersand ? 'whitespace-nowrap' : ''}`}
      onMouseEnter={!isMobile ? onHover : undefined}
      onMouseLeave={!isMobile ? onHoverEnd : undefined}
    >
      {showAmpersand && (
        <span
          className="font-serif italic transition-all duration-200"
          style={{
            color: isFaded ? fadedColor : '#1a1a1a',
            fontWeight: 400,
            marginRight: '0.15em',
          }}
        >
          &amp;{' '}
        </span>
      )}

      <span
        className={`relative inline-block transition-all duration-200 cursor-pointer ${isMobile ? '' : 'whitespace-nowrap'}`}
        style={{
          fontWeight: isPerfectMatch ? 900 : 400,
          color: isFaded ? fadedColor : color,
          backgroundImage: isLocked ? `linear-gradient(${isFaded ? fadedColor : color}, ${isFaded ? fadedColor : color})` : 'none',
          backgroundSize: isLocked ? '100% 2px' : '0% 2px',
          backgroundPosition: 'left bottom',
          backgroundRepeat: 'no-repeat',
          animation: isLocked ? 'underlineIn 0.3s ease-out forwards' : 'none',
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (isMobile) {
            if (onFocus) onFocus();
            onHover();
          } else {
            onLockToggle();
          }
        }}
        title={isLocked ? "Click to unlock" : "Click to lock"}
      >
        {ingredient}

        {isMobile && isLocked && (
          <span className="inline-flex items-center" style={{ marginLeft: '0.1em', verticalAlign: 'middle' }}>
            <FilledLock color={isFaded ? fadedColor : '#1a1a1a'} size="0.5em" />
          </span>
        )}

        {isMobile && showComma && (
          <span
            style={{
              color: isFaded ? fadedColor : '#1a1a1a',
              fontFamily: 'Georgia, "Times New Roman", Times, serif',
              fontStyle: 'italic',
              fontWeight: 400,
            }}
          >
            ,
          </span>
        )}

        {!isMobile && (
          <span className="inline-flex items-center relative" style={{ verticalAlign: 'middle', marginLeft: '0.02em' }}>
            {!isLocked && !showControls && (
              <span
                style={{
                  color: isFaded ? fadedColor : '#1a1a1a',
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
            {renderDesktopIconStack()}
          </span>
        )}
      </span>

      {!isLast && (
        <span style={{ marginRight: isTwoIngredientSet ? '0.00em' : '0.15em' }}></span>
      )}
    </span>
  );
};

// Empty slot component
const EmptySlot = ({ showAmpersand, showComma, isFaded, onClick, isMobile, isCompact, isSingleSlot }) => {
  const fadedColor = '#e8e8e8';
  const normalColor = '#c0c0c0';
  const underscoreWidth = isMobile ? '2em' : (isCompact ? '2.5em' : '3.5em');

  return (
    <span
      className="inline items-baseline cursor-pointer group whitespace-nowrap"
      onClick={onClick}
      role="button"
      aria-label="Add ingredient"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {showAmpersand && (
        <span
          className="font-serif italic transition-all duration-200"
          style={{ color: isFaded ? fadedColor : '#1a1a1a', fontWeight: 400 }}
        >
          &amp;{' '}
        </span>
      )}

      <span
        className="inline-block border-b-[3px] group-hover:border-gray-500 group-active:border-gray-600 transition-all duration-200"
        style={{
          borderColor: isFaded ? fadedColor : normalColor,
          width: underscoreWidth,
          height: '0.75em',
          verticalAlign: 'baseline',
          marginBottom: '0.05em',
        }}
      />

      {showComma && (
        <span
          className="font-serif italic transition-all duration-200"
          style={{ color: isFaded ? fadedColor : '#1a1a1a', fontWeight: 400 }}
        >
          ,{' '}
        </span>
      )}
    </span>
  );
};

// Main unified component
export const IngredientDisplay = ({
  ingredients,
  lockedIngredients,
  ingredientProfiles,
  maxSlots = 5,
  onRemove,
  onLockToggle,
  onEmptySlotClick,
  isDrawerOpen = false,
  flavorMap = null, // Optional: for showing which ingredients don't pair perfectly
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [focusedIngredientIndex, setFocusedIngredientIndex] = useState(null);
  const { isMobile } = useScreenSize();

  const validIngredients = ingredients.filter(Boolean);
  const emptySlotCount = maxSlots - validIngredients.length;
  const hasHoveredIngredient = hoveredIndex !== null;
  const isTwoIngredientSet = maxSlots === 2;

  // Check if an ingredient pairs with all other ingredients in the set
  const isPerfectMatch = (ingredient) => {
    if (!flavorMap || validIngredients.length <= 1) return true;

    const otherIngredients = validIngredients.filter(ing => ing !== ingredient);
    return otherIngredients.every(other =>
      flavorMap.get(ingredient)?.has(other)
    );
  };

  // Clear focus when drawer closes
  useEffect(() => {
    if (!isDrawerOpen) {
      setFocusedIngredientIndex(null);
      setHoveredIndex(null);
    }
  }, [isDrawerOpen]);

  // Click outside handler for mobile
  useEffect(() => {
    if (!isMobile || focusedIngredientIndex === null) return;

    const handleClickOutside = (e) => {
      if (e.target.closest('[data-action-buttons]')) return;
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

  // Get focused ingredient info for mobile action buttons
  const getFocusedIngredientInfo = () => {
    if (focusedIngredientIndex === null) return null;
    const ingredient = validIngredients[focusedIngredientIndex];
    if (!ingredient) return null;

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

  const handleMobileRemove = () => {
    if (focusedInfo) {
      onRemove(focusedInfo.actualIndex);
      setFocusedIngredientIndex(null);
      setHoveredIndex(null);
    }
  };

  const handleMobileLockToggle = () => {
    if (focusedInfo) {
      onLockToggle(focusedInfo.actualIndex);
      setFocusedIngredientIndex(null);
      setHoveredIndex(null);
    }
  };

  // Punctuation logic - unified for both modes
  const getIngredientDisplayInfo = (displayIndex) => {
    const isLastIngredient = displayIndex === validIngredients.length - 1;
    const hasEmptySlots = emptySlotCount > 0;

    if (isTwoIngredientSet) {
      return {
        showComma: false,
        showAmpersand: isLastIngredient && !hasEmptySlots && validIngredients.length > 1,
        isLastIngredient,
      };
    }

    let showComma = false;
    let showAmpersand = false;

    if (isLastIngredient) {
      showComma = hasEmptySlots;
      showAmpersand = !hasEmptySlots && validIngredients.length > 1;
    } else {
      showComma = true;
    }

    return { showComma, showAmpersand, isLastIngredient };
  };

  const getEmptySlotDisplayInfo = (emptyIndex) => {
    const isLastEmptySlot = emptyIndex === emptySlotCount - 1;

    if (isTwoIngredientSet) {
      return {
        showComma: false,
        showAmpersand: isLastEmptySlot && validIngredients.length >= 1,
      };
    }

    return {
      showAmpersand: isLastEmptySlot && (validIngredients.length >= 1 || emptySlotCount > 1),
      showComma: !isLastEmptySlot,
    };
  };

  // Scale factor for compact mode (transform-based for smooth GPU animation)
  // We render at hero size and scale down, avoiding layout recalculations
  const getScale = () => {
    if (!isDrawerOpen) return 1;
    // Compact mode - larger text that's closer to hero size
    return 0.8;
  };

  // Base font size (hero mode size - always rendered at this size)
  const getBaseFontSize = () => {
    if (isMobile) return '3rem'; // text-5xl
    return 'clamp(2.25rem, 6vw, 6rem)';
  };

  // Calculate vertical position
  // When drawer is open: center between header and drawer
  // When drawer is closed: center in full viewport (below header)
  const getTopPosition = () => {
    if (isDrawerOpen) {
      // Center in the space between header and drawer (drawer is 50vh from bottom)
      return isMobile
        ? 'calc(60px + (50vh - 60px) / 2)'  // mobile: 60px header
        : 'calc(80px + (50vh - 80px) / 2)'; // desktop: 80px header
    }
    // When closed: center in viewport (accounting for header)
    return '50%';
  };

  return (
    <>
      <div
        className={`
          fixed left-0 right-0 z-50
          flex items-center justify-center text-center
          ${isDrawerOpen ? 'pointer-events-none' : ''}
        `}
        style={{
          padding: isDrawerOpen
            ? (isMobile ? '0.625rem 1rem' : '0.75rem 1rem')
            : (isMobile ? '1rem' : '0 3rem'),
          top: getTopPosition(),
          transform: 'translateY(-50%)',
          transition: 'top 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          className={`
            font-black
            tracking-tight
            ${isMobile ? 'max-w-[90vw]' : 'max-w-[95vw] sm:max-w-[90vw]'}
            ${isDrawerOpen ? 'pointer-events-auto' : ''}
          `}
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            wordWrap: 'break-word',
            fontSize: getBaseFontSize(),
            lineHeight: isMobile ? 1.2 : 1.15,
            transform: `scale(${getScale()})`,
            transformOrigin: 'center center',
            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {validIngredients.map((ingredient, displayIndex) => {
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

            const color = getIngredientColor(ingredient, ingredientProfiles);
            const { showComma, showAmpersand, isLastIngredient } = getIngredientDisplayInfo(displayIndex);

            return (
              <Ingredient
                key={`${ingredient}-${displayIndex}`}
                ingredient={ingredient}
                color={color}
                isLocked={lockedIngredients.has(actualIndex)}
                isHovered={hoveredIndex === displayIndex}
                isFocused={isMobile && focusedIngredientIndex === displayIndex}
                isFaded={hasHoveredIngredient && hoveredIndex !== displayIndex}
                isPerfectMatch={isPerfectMatch(ingredient)}
                onHover={() => setHoveredIndex(displayIndex)}
                onHoverEnd={() => setHoveredIndex(null)}
                onFocus={() => setFocusedIngredientIndex(displayIndex)}
                onRemove={() => onRemove(actualIndex)}
                onLockToggle={() => onLockToggle(actualIndex)}
                showComma={showComma}
                showAmpersand={showAmpersand}
                isLast={isLastIngredient && emptySlotCount === 0}
                isTwoIngredientSet={isTwoIngredientSet}
                isMobile={isMobile}
                isCompact={isDrawerOpen}
              />
            );
          })}

          {/* Single empty slot: show clickable tip text instead of underscore */}
          {validIngredients.length === 0 && emptySlotCount === 1 ? (
            <div
              className="w-full text-center cursor-pointer hover:text-gray-400 transition-colors"
              onClick={onEmptySlotClick}
              style={{
                fontSize: isMobile ? '1rem' : '1.125rem',
                color: '#d1d5db',
                fontWeight: 500,
                fontStyle: 'normal',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                letterSpacing: 'normal',
              }}
            >
              search for ingredients or click Generate
            </div>
          ) : (
            Array.from({ length: emptySlotCount }).map((_, emptyIndex) => {
              const { showAmpersand, showComma } = getEmptySlotDisplayInfo(emptyIndex);

              return (
                <EmptySlot
                  key={`empty-${emptyIndex}`}
                  showAmpersand={showAmpersand}
                  showComma={showComma}
                  isFaded={hasHoveredIngredient}
                  onClick={onEmptySlotClick}
                  isMobile={isMobile}
                  isCompact={isDrawerOpen}
                  isSingleSlot={false}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Mobile action buttons - only in hero mode */}
      {isMobile && !isDrawerOpen && focusedInfo && (
        <div
          data-action-buttons
          className="fixed left-1/2 -translate-x-1/2 flex items-center gap-6 z-50"
          style={{ bottom: '120px' }}
        >
          <button
            onClick={handleMobileRemove}
            className="flex items-center justify-center bg-white rounded-full shadow-lg active:bg-gray-100"
            style={{ width: '64px', height: '64px', boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)' }}
            title="Remove ingredient"
          >
            <X size={28} className="text-gray-500" strokeWidth={2} />
          </button>
          <button
            onClick={handleMobileLockToggle}
            className="flex items-center justify-center bg-white rounded-full shadow-lg active:bg-gray-100"
            style={{ width: '64px', height: '64px', boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)' }}
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
    </>
  );
};

export default IngredientDisplay;
