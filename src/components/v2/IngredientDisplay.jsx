import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Unlock, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { TASTE_COLORS, getIngredientColorWithContrast } from '../../utils/colors.ts';
import { useScreenSize } from '../../hooks/useScreenSize.ts';
import { useTheme } from '../../contexts/ThemeContext';

// Custom hook for swipe-to-delete gesture
const useSwipeToDelete = ({ onDelete, enabled = true }) => {
  const [swipeX, setSwipeX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isSwipingRef = useRef(false);

  const SWIPE_THRESHOLD = 80; // pixels to trigger delete
  const MAX_SWIPE = 120; // max swipe distance

  const handleTouchStart = (e) => {
    if (!enabled) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (!enabled) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Only register as swipe if horizontal movement is greater than vertical
    if (!isSwipingRef.current && Math.abs(deltaX) > 10) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        isSwipingRef.current = true;
      }
    }

    if (isSwipingRef.current && deltaX < 0) {
      // Swiping left - limit the swipe distance with resistance
      const resistance = 0.6;
      const constrainedX = Math.max(-MAX_SWIPE, deltaX * resistance);
      setSwipeX(constrainedX);
      e.preventDefault(); // Prevent scrolling while swiping
    }
  };

  const handleTouchEnd = () => {
    if (!enabled) return;

    if (swipeX < -SWIPE_THRESHOLD) {
      // Trigger delete - animate off screen first
      setIsDeleting(true);
      setSwipeX(-300); // Slide fully off screen
      setTimeout(() => {
        onDelete();
        setSwipeX(0);
        setIsDeleting(false);
      }, 200);
    } else {
      // Snap back
      setSwipeX(0);
    }
    isSwipingRef.current = false;
  };

  return {
    swipeX,
    isDeleting,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};

// Swipeable row wrapper for mobile ingredients
const SwipeableRow = ({ children, onDelete, enabled = true, isLocked = false }) => {
  const { swipeX, isDeleting, handlers } = useSwipeToDelete({ onDelete, enabled });

  return (
    <div
      style={{
        width: '100%',
        position: 'relative',
        // Allow overflow on left (for backgrounds extending to edge), clip on right only
        overflow: 'visible',
      }}
      {...handlers}
    >
      <div
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isDeleting ? 'transform 200ms ease-out' : (swipeX === 0 ? 'transform 200ms ease-out' : 'none'),
          opacity: isDeleting ? 0 : 1,
        }}
      >
        {children}
      </div>
      {/* Delete indicator - fades in when swiping, positioned below content */}
      {swipeX < -10 && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: '1rem',
            color: '#ef4444',
            fontWeight: 600,
            fontSize: '0.875rem',
            opacity: Math.min(1, Math.abs(swipeX) / 80),
            zIndex: -1, // Behind the swipeable content (below colored rectangle)
          }}
        >
          <X size={24} strokeWidth={2} />
        </div>
      )}
    </div>
  );
};

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
const getIngredientColor = (ingredient, ingredientProfiles, isHighContrast, isDarkMode) => {
  const profile = ingredientProfiles.find(
    p => p.name.toLowerCase() === ingredient.toLowerCase()
  );

  if (!profile?.flavorProfile) return getIngredientColorWithContrast('#374151', isHighContrast, isDarkMode);

  let dominantTaste = 'sweet';
  let maxValue = -1;

  Object.entries(profile.flavorProfile).forEach(([taste, value]) => {
    if (value > maxValue) {
      maxValue = value;
      dominantTaste = taste;
    }
  });

  const baseColor = maxValue > 0 ? (TASTE_COLORS[dominantTaste] || '#374151') : '#374151';
  return getIngredientColorWithContrast(baseColor, isHighContrast, isDarkMode);
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
  isMobile,
  isCompact,
  isHighContrast,
  isDarkMode,
}) => {
  const fadedColor = '#e8e8e8';
  const iconSize = '0.35em';
  const showControls = isHovered;

  // For locked ingredients in compact mode (drawer open), background is the ingredient color
  // In dark mode, the background is light so we need dark text for contrast
  // In light mode, background is the vibrant color so white text works
  const lockedTextColor = isDarkMode ? '#1f2937' : 'white';
  const lockedIconColor = isDarkMode ? '#1f2937' : 'white';

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

  // Mobile with drawer open and locked: colored background with lock icon on right
  // This matches the closed-drawer visualization style
  if (isMobile && isCompact && isLocked) {
    // Match the closed-drawer locked style:
    // - Dark mode (with or without high contrast): dark text matching gray-900 background (#111827)
    // - Light mode: white text against vibrant colored backgrounds
    const compactLockedTextColor = isDarkMode ? '#111827' : 'white';

    return (
      <span
        data-ingredient
        className="relative inline items-baseline"
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {showAmpersand && (
          <span
            className="font-serif italic transition-all duration-200 text-gray-900 dark:text-white"
            style={{
              fontWeight: 400,
              marginRight: '0.2em',
            }}
          >
            &amp;
          </span>
        )}
        <span
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLockToggle();
          }}
          className="relative inline transition-all duration-200 cursor-pointer"
          style={{
            fontWeight: 900,
            color: compactLockedTextColor,
            backgroundColor: color,
            padding: '0.05em 0.25em',
          }}
          title="Click to unlock"
        >
          {/* Split ingredient: allow wrapping but keep last word + lock together */}
          {(() => {
            const words = ingredient.split(' ');
            if (words.length === 1) {
              return (
                <span className="whitespace-nowrap">
                  {ingredient}
                  <span className="inline-flex items-center" style={{ marginLeft: '0.15em', verticalAlign: 'middle' }}>
                    <Lock size="0.45em" style={{ color: compactLockedTextColor, flexShrink: 0, marginBottom: '0.05em' }} strokeWidth={2.5} />
                  </span>
                </span>
              );
            }
            const firstWords = words.slice(0, -1).join(' ');
            const lastWord = words[words.length - 1];
            return (
              <>
                {firstWords}{' '}
                <span className="whitespace-nowrap">
                  {lastWord}
                  <span className="inline-flex items-center" style={{ marginLeft: '0.15em', verticalAlign: 'middle' }}>
                    <Lock size="0.45em" style={{ color: compactLockedTextColor, flexShrink: 0, marginBottom: '0.05em' }} strokeWidth={2.5} />
                  </span>
                </span>
              </>
            );
          })()}
        </span>
      </span>
    );
  }

  return (
    <span
      data-ingredient
      className="relative inline items-baseline"
      onMouseEnter={!isMobile ? onHover : undefined}
      onMouseLeave={!isMobile ? onHoverEnd : undefined}
    >
      {showAmpersand && (
        <span
          className={`font-serif italic transition-all duration-200 ${isFaded ? '' : 'text-gray-900 dark:text-white'}`}
          style={{
            color: isFaded ? fadedColor : undefined,
            fontWeight: 400,
            marginRight: '0.2em',
          }}
        >
          &amp;
        </span>
      )}

      <span
        className="relative inline transition-all duration-200 cursor-pointer"
        style={{
          fontWeight: isPerfectMatch ? 900 : 400,
          color: isFaded ? fadedColor : color,
          textDecoration: isLocked ? 'underline' : 'none',
          textDecorationColor: isFaded ? fadedColor : color,
          textDecorationThickness: '0.06em',
          textUnderlineOffset: '0.08em',
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Both mobile and desktop: tap/click toggles lock
          onLockToggle();
        }}
        title={isLocked ? "Click to unlock" : "Click to lock"}
      >
        {/* Split ingredient: allow wrapping but keep last word + comma together */}
        {(() => {
          const words = ingredient.split(' ');
          if (words.length === 1) {
            // Single word - render with trailing elements in nowrap span
            return (
              <span className="whitespace-nowrap">
                {ingredient}
                {isMobile && isLocked && (
                  <span className="inline-flex items-center" style={{ marginLeft: '0.1em', verticalAlign: 'middle' }}>
                    <FilledLock color={isFaded ? fadedColor : '#1a1a1a'} size="0.5em" />
                  </span>
                )}
                {isMobile && showComma && (
                  <span
                    className={isFaded ? '' : 'text-gray-900 dark:text-white'}
                    style={{
                      color: isFaded ? fadedColor : undefined,
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
                        className={isFaded ? '' : 'text-gray-900 dark:text-white'}
                        style={{
                          color: isFaded ? fadedColor : undefined,
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
            );
          }
          // Multi-word: first words can wrap, last word + punctuation stays together
          const firstWords = words.slice(0, -1).join(' ');
          const lastWord = words[words.length - 1];
          return (
            <>
              {firstWords}{' '}
              <span className="whitespace-nowrap">
                {lastWord}
                {isMobile && isLocked && (
                  <span className="inline-flex items-center" style={{ marginLeft: '0.1em', verticalAlign: 'middle' }}>
                    <FilledLock color={isFaded ? fadedColor : '#1a1a1a'} size="0.5em" />
                  </span>
                )}
                {isMobile && showComma && (
                  <span
                    className={isFaded ? '' : 'text-gray-900 dark:text-white'}
                    style={{
                      color: isFaded ? fadedColor : undefined,
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
                        className={isFaded ? '' : 'text-gray-900 dark:text-white'}
                        style={{
                          color: isFaded ? fadedColor : undefined,
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
            </>
          );
        })()}
      </span>

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
      className="inline-flex items-baseline cursor-pointer group whitespace-nowrap"
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
          className={`font-serif italic transition-all duration-200 ${isFaded ? '' : 'text-gray-900 dark:text-white'}`}
          style={{ color: isFaded ? fadedColor : undefined, fontWeight: 400 }}
        >
          {' '}&amp;{' '}
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
          className={`font-serif italic transition-all duration-200 ${isFaded ? '' : 'text-gray-900 dark:text-white'}`}
          style={{ color: isFaded ? fadedColor : undefined, fontWeight: 400 }}
        >
          ,{' '}
        </span>
      )}
    </span>
  );
};

// Mobile Ingredient Info Component
const MobileIngredientInfo = ({ ingredient, ingredientProfiles, flavorMap, selectedIngredients, isHighContrast, isDarkMode }) => {
  const profile = ingredientProfiles?.find(
    p => p.name.toLowerCase() === ingredient.toLowerCase()
  );

  const getTasteTags = (profile) => {
    if (!profile || !profile.flavorProfile) return [];
    return Object.entries(profile.flavorProfile)
      .filter(([_, value]) => value >= 5)
      .map(([taste, _]) => taste);
  };

  const getNonPairingIngredients = (ingredient) => {
    if (!flavorMap || selectedIngredients.length <= 1) return [];
    const otherIngredients = selectedIngredients.filter(ing => ing !== ingredient);
    return otherIngredients.filter(other =>
      !flavorMap.get(ingredient)?.has(other)
    );
  };

  const tasteTags = getTasteTags(profile);
  const nonPairingIngredients = getNonPairingIngredients(ingredient);

  return (
    <div className="px-1 pt-3 pb-2">
      {/* Category & Subcategory */}
      {profile && (
        <p className="text-base text-gray-500 dark:text-gray-400 mb-3 tracking-wide" style={{ fontWeight: 400 }}>
          {profile.category.toLowerCase()}
          {profile.subcategory && ` — ${profile.subcategory.toLowerCase()}`}
        </p>
      )}

      {/* Description */}
      {profile?.description && (
        <p
          className="text-base leading-relaxed mb-4 tracking-wide text-gray-700 dark:text-gray-300"
          style={{ fontWeight: 400 }}
        >
          {profile.description}
        </p>
      )}

      {/* Non-pairing warning */}
      {nonPairingIngredients.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
          <p className="text-base text-amber-800 dark:text-amber-200 font-light">
            <span className="font-medium">Not a suggested pairing with: </span>
            {nonPairingIngredients.join(', ')}
          </p>
        </div>
      )}

      {/* Taste Tags */}
      {tasteTags.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {tasteTags.map((taste) => (
            <span
              key={taste}
              className="px-5 py-1.5 rounded-full text-base font-medium text-white capitalize tracking-wide"
              style={{ backgroundColor: getIngredientColorWithContrast(TASTE_COLORS[taste], isHighContrast, isDarkMode) }}
            >
              {taste}
            </span>
          ))}
        </div>
      )}
    </div>
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
  onCloseDrawer,
  isDrawerOpen = false,
  flavorMap = null, // Optional: for showing which ingredients don't pair perfectly
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [focusedIngredientIndex, setFocusedIngredientIndex] = useState(null);
  const [layoutMode, setLayoutMode] = useState(isDrawerOpen ? 'compact' : 'full');
  const [isVisible, setIsVisible] = useState(true); // For fade in/out animation
  const [expandedInfoIndex, setExpandedInfoIndex] = useState(null); // For mobile ingredient info expansion
  const { isMobile } = useScreenSize();
  const { isHighContrast, isDarkMode } = useTheme(); // Force re-render when high contrast changes

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

  // Fade out → change layout → fade in animation
  useEffect(() => {
    const targetMode = isDrawerOpen ? 'compact' : 'full';
    if (layoutMode === targetMode) return;

    // Step 1: Fade out
    setIsVisible(false);

    // Step 2: After fade out completes, change layout mode
    const layoutTimer = setTimeout(() => {
      setLayoutMode(targetMode);

      // Step 3: After a brief moment for layout to settle, fade back in
      setTimeout(() => {
        setIsVisible(true);
      }, 50);
    }, 150); // Wait for fade out (150ms)

    return () => clearTimeout(layoutTimer);
  }, [isDrawerOpen, layoutMode]);

  // Clear focus when drawer closes
  useEffect(() => {
    if (!isDrawerOpen) {
      setFocusedIngredientIndex(null);
      setHoveredIndex(null);
    }
  }, [isDrawerOpen]);

  // Clear expanded info when the ingredient is unlocked or removed
  useEffect(() => {
    if (expandedInfoIndex !== null && !lockedIngredients.has(expandedInfoIndex)) {
      setExpandedInfoIndex(null);
    }
  }, [lockedIngredients, expandedInfoIndex]);

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

    // On mobile with drawer closed, show commas but ampersand will be on separate line
    if (isMobile && layoutMode === 'full') {
      const isSecondToLast = displayIndex === validIngredients.length - 2;
      // Show comma on all except last ingredient and second-to-last (which gets ampersand instead)
      const showComma = !isLastIngredient && !isSecondToLast;

      return {
        showComma,
        showAmpersand: false, // Ampersand will be rendered separately
        isLastIngredient,
      };
    }

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

    // On mobile with drawer closed, hide all punctuation (each slot on its own line)
    if (isMobile && layoutMode === 'full') {
      return {
        showComma: false,
        showAmpersand: false,
      };
    }

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

  // Get font size - changes based on layout mode for proper text reflow
  const getFontSize = () => {
    if (isMobile) {
      // Mobile: smaller font when in compact mode so text fits in the strip
      return layoutMode === 'compact' ? '1.25rem' : '3rem'; // 20px when open, 48px when closed
    }
    // Desktop: use clamp for responsive sizing
    return layoutMode === 'compact'
      ? 'clamp(1.5rem, 4vw, 3rem)'
      : 'clamp(2.25rem, 6vw, 6rem)';
  };

  // Calculate vertical position
  // Mobile with drawer open: centered between header and drawer top, skewing slightly up
  // Mobile with drawer closed: aligned to top below header
  // Desktop: centered between header and drawer (or viewport center when closed)
  const getTopPosition = () => {
    if (isMobile) {
      if (layoutMode === 'compact') {
        // Drawer is open - center between header (56px) and drawer top (140px)
        // Available space: 140px - 56px = 84px
        // True center: 56px + 42px = 98px
        // Skew slightly up: use 45% of the space instead of 50%
        return 'calc(56px + (140px - 56px) * 0.45)';
      }
      // Drawer closed - aligned to top below header
      return '80px';
    }
    // Desktop behavior unchanged
    if (layoutMode === 'compact') {
      return 'calc(80px + (50vh - 80px) / 2)';
    }
    return '50%';
  };

  // Get transform based on state
  const getTransform = () => {
    if (isMobile) {
      if (layoutMode === 'compact') {
        // Center vertically around the calculated top position
        return 'translateY(-50%)';
      }
      return 'translateY(0)'; // No transform when drawer closed - align to top
    }
    return 'translateY(-50%)'; // Center vertically on desktop
  };

  // On mobile with drawer closed, use relative positioning so content flows naturally
  // This allows the page to scroll when ingredient info is expanded
  const usesFlowLayout = isMobile && layoutMode === 'full';

  return (
    <>
      <div
        className={`
          ${usesFlowLayout ? 'relative' : 'fixed left-0 right-0 z-50'}
          flex text-center
        `}
        style={{
          padding: layoutMode === 'compact'
            ? (isMobile ? '0.75rem 1.5rem' : '0.75rem 1rem')
            : (isMobile ? '1rem' : '0 3rem'),
          // Only use top/transform for fixed positioning
          ...(usesFlowLayout ? {} : {
            top: getTopPosition(),
            transform: getTransform(),
          }),
          alignItems: usesFlowLayout ? 'flex-start' : 'center',
          justifyContent: usesFlowLayout ? 'flex-start' : 'center',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 150ms ease-out',
          pointerEvents: 'none',
          // For flow layout, add width
          ...(usesFlowLayout ? { width: '100%' } : {}),
        }}
      >
        <div
          className={`
            font-black
            tracking-tight
            ${usesFlowLayout ? 'w-full' : (isMobile ? 'max-w-[90vw]' : 'max-w-[95vw] sm:max-w-[90vw]')}
            pointer-events-auto
          `}
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: getFontSize(),
            lineHeight: usesFlowLayout ? 1.04 : (isMobile ? 1.3 : 1.15),
            textAlign: usesFlowLayout ? 'left' : 'center',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: usesFlowLayout ? 'flex-start' : 'center',
            alignItems: 'baseline',
            gap: isMobile ? '0 0.2em' : '0 0.15em',
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

            const color = getIngredientColor(ingredient, ingredientProfiles, isHighContrast, isDarkMode);
            const { showComma, showAmpersand, isLastIngredient } = getIngredientDisplayInfo(displayIndex);

            const ingredientElement = (
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
                isMobile={isMobile}
                isCompact={layoutMode === 'compact'}
                isHighContrast={isHighContrast}
                isDarkMode={isDarkMode}
              />
            );

            // On mobile with drawer closed (flow layout), wrap each ingredient in a full-width swipeable container
            if (usesFlowLayout) {
              const isSecondToLast = displayIndex === validIngredients.length - 2;
              const shouldShowAmpersandAfter = isSecondToLast && validIngredients.length >= 2 && emptySlotCount === 0;
              const isLocked = lockedIngredients.has(actualIndex);
              const isExpanded = expandedInfoIndex === actualIndex;

              return (
                <React.Fragment key={`${ingredient}-${displayIndex}`}>
                  <SwipeableRow onDelete={() => onRemove(actualIndex)} isLocked={isLocked}>
                    <div style={{
                      paddingLeft: '0.1em',
                      position: 'relative',
                      width: '100%',
                      zIndex: 10 - displayIndex, // Higher z-index for earlier ingredients (first = 10, second = 9, etc.)
                    }}>
                      {/* Background rectangle - aligns with text, extends left when swiping */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-0.1em', // Slight overhang to left of text
                          right: 0,
                          top: '0.05em',
                          bottom: '0em',
                          backgroundColor: color,
                          transformOrigin: 'left center',
                          transform: isLocked ? 'scaleX(1)' : 'scaleX(0)',
                          transition: 'transform 250ms ease-out',
                        }}
                      />
                      {isLocked ? (
                        // Locked ingredient with contrasting text, lock icon, and chevron
                        (() => {
                          // Dark mode: dark text matching gray-900 background (#111827)
                          // Light mode: white text against vibrant colored backgrounds
                          const lockedTextColor = isDarkMode ? '#111827' : 'white';
                          return (
                            <span
                              style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingRight: '0.3em',
                              }}
                            >
                              <span
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onLockToggle(actualIndex);
                                }}
                                style={{
                                  fontWeight: 900,
                                  color: lockedTextColor,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                {ingredient}
                                <span className="inline-flex items-center whitespace-nowrap" style={{ marginLeft: '0.2em', verticalAlign: 'baseline' }}>
                                  <Lock size="0.45em" style={{ color: lockedTextColor, flexShrink: 0, marginBottom: '0.05em' }} strokeWidth={2.5} />
                                </span>
                              </span>
                              {/* Chevron button to expand/collapse info */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setExpandedInfoIndex(isExpanded ? null : actualIndex);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: '0.1em',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  marginLeft: '0.2em',
                                }}
                                aria-label={isExpanded ? "Collapse ingredient info" : "Expand ingredient info"}
                              >
                                {isExpanded ? (
                                  <ChevronUp size="0.55em" style={{ color: lockedTextColor }} strokeWidth={2.5} />
                                ) : (
                                  <ChevronDown size="0.55em" style={{ color: lockedTextColor }} strokeWidth={2.5} />
                                )}
                              </button>
                            </span>
                          );
                        })()
                      ) : (
                        // Unlocked ingredient (normal display)
                        ingredientElement
                      )}
                    </div>
                  </SwipeableRow>
                  {/* Expandable ingredient info - shown below the ingredient when expanded */}
                  {isLocked && (
                    <div
                      style={{
                        width: '100%',
                        overflow: 'hidden',
                        maxHeight: isExpanded ? '300px' : '0px',
                        opacity: isExpanded ? 1 : 0,
                        transition: 'max-height 300ms ease-out, opacity 200ms ease-out',
                      }}
                    >
                      <MobileIngredientInfo
                        ingredient={ingredient}
                        ingredientProfiles={ingredientProfiles}
                        flavorMap={flavorMap}
                        selectedIngredients={validIngredients}
                        isHighContrast={isHighContrast}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                  )}
                  {shouldShowAmpersandAfter && (
                    <div style={{ width: '100%', paddingLeft: '0.1em' }}>
                      <span
                        className="font-serif italic text-gray-900 dark:text-white"
                        style={{
                          fontWeight: 400,
                        }}
                      >
                        &
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            }

            return ingredientElement;
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
              search for ingredients or click {isMobile && <Sparkles size={16} strokeWidth={1.5} className="inline-block align-middle mr-0.5" style={{ marginTop: '-2px' }} />}Generate
            </div>
          ) : (
            Array.from({ length: emptySlotCount }).map((_, emptyIndex) => {
              const { showAmpersand, showComma } = getEmptySlotDisplayInfo(emptyIndex);

              const emptySlotElement = (
                <EmptySlot
                  key={`empty-${emptyIndex}`}
                  showAmpersand={showAmpersand}
                  showComma={showComma}
                  isFaded={hasHoveredIngredient}
                  onClick={onEmptySlotClick}
                  isMobile={isMobile}
                  isCompact={layoutMode === 'compact'}
                  isSingleSlot={false}
                />
              );

              // On mobile with drawer closed (flow layout), wrap each empty slot in a full-width container
              if (usesFlowLayout) {
                return (
                  <div key={`empty-${emptyIndex}`} style={{ width: '100%' }}>
                    {emptySlotElement}
                  </div>
                );
              }

              return emptySlotElement;
            })
          )}
        </div>
      </div>

      {/* Mobile action buttons - commented out, tap now toggles lock directly
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
      */}
    </>
  );
};

export default IngredientDisplay;
