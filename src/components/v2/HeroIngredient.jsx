import React from 'react';
import { X } from 'lucide-react';
import { TASTE_COLORS } from '../../utils/colors.ts';

const getIngredientColor = (profile) => {
  if (!profile) return '#374151'; // gray-700 default
  
  let dominantTaste = 'sweet';
  let maxValue = -1;
  
  Object.entries(profile.flavorProfile).forEach(([taste, value]) => {
    if (value > maxValue) {
      maxValue = value;
      dominantTaste = taste;
    }
  });

  if (maxValue <= 0) return '#374151';
  
  return TASTE_COLORS[dominantTaste] || '#374151';
};

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

export const HeroIngredient = ({
  ingredient,
  profile,
  isLocked,
  isHovered,
  isFocused = false,
  isFaded,
  onHover,
  onHoverEnd,
  onFocus,
  onRemove,
  onLockToggle,
  showComma = false,
  showAmpersand = false,
  isLast = false,
  isTwoIngredientSet = false,
  isMobile = false,
}) => {
  const color = getIngredientColor(profile);

  // Match mockup: heavily faded state is almost completely washed out
  const fadedTextColor = '#e8e8e8';
  const fadedPunctuation = '#e8e8e8';

  // Desktop icon sizes
  const iconSize = '0.35em';

  // Icon container style for desktop
  const iconContainerStyle = {
    width: iconSize,
    height: iconSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // Show controls if hovered (desktop) - mobile uses parent-controlled focus
  const showControls = isHovered;

  // Desktop icon stack (inline with text)
  const renderDesktopIconStack = () => (
    <span
      className="inline-flex flex-col items-center relative gap-0"
      style={{
        verticalAlign: 'middle',
        minWidth: iconSize,
      }}
    >
      {/* X icon - shows on hover for both locked and unlocked */}
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

      {/* Lock/Unlock icon */}
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
          <FilledLock color={isFaded ? '#e8e8e8' : '#1a1a1a'} />
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
      {/* Ampersand before ingredient (if needed - for last ingredient with 5 total) */}
      {showAmpersand && (
        <span
          className="font-serif italic transition-all duration-200"
          style={{
            color: isFaded ? fadedPunctuation : '#1a1a1a',
            fontWeight: 400,
            marginRight: '0.15em',
          }}
        >
          &amp;{' '}
        </span>
      )}

      {/* Ingredient container */}
      <span
        className={`relative inline-block transition-all duration-200 cursor-pointer ${isMobile ? '' : 'whitespace-nowrap'}`}
        style={{
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 900,
          color: isFaded ? fadedTextColor : color,
          // Only show border when locked
          border: isLocked ? (isMobile ? '2px solid' : '3px solid') : 'none',
          borderColor: isLocked ? (isFaded ? '#e8e8e8' : '#1a1a1a') : 'transparent',
          borderRadius: isLocked ? '9999px' : '0',
          // Only add padding when locked
          padding: isLocked ? (isMobile ? '0.02em 0.12em 0.02em 0.18em' : '0 0 0 0.2em') : '0',
          // Compensate for border + padding shift with margin when locked
          margin: isLocked ? (isMobile ? 'calc(-2px - 0.02em) 0' : 'calc(-3px - 0.035em) 0') : '0',
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (isMobile) {
            // Mobile: trigger focus to show action buttons
            if (onFocus) onFocus();
            onHover();
          } else {
            // Desktop: toggle lock
            onLockToggle();
          }
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
            <FilledLock color={isFaded ? '#e8e8e8' : '#1a1a1a'} size="0.5em" />
          </span>
        )}

        {/* Mobile: Comma inside the span to prevent line break separation */}
        {isMobile && showComma && (
          <span
            style={{
              color: isFaded ? fadedPunctuation : '#1a1a1a',
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
                  color: isFaded ? fadedPunctuation : '#1a1a1a',
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

      {/* Space after ingredient (for non-last ingredients) */}
      {!isLast && (
        <span style={{ marginRight: isTwoIngredientSet ? '0.00em' : '0.15em' }}></span>
      )}
    </span>
  );
};

export default HeroIngredient;
