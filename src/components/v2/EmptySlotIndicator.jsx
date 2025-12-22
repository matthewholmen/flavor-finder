import React from 'react';

export const EmptySlotIndicator = ({
  showAmpersand = false,
  showComma = false,
  isFaded = false,
  onClick,
  useTightSpacing = false,
  isMobile = false,
}) => {
  // Match mockup: faded state for empty slot when another ingredient is hovered
  const fadedColor = '#e8e8e8';
  const normalColor = '#c0c0c0'; // Light gray for the underscore
  
  // Adjust underscore width for mobile - tighter to match text size
  const underscoreWidth = isMobile ? '2em' : '3.5em';

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
      {/* Ampersand before empty slot (only for the last slot) */}
      {showAmpersand && (
        <span
          className={`font-serif italic transition-all duration-200 ${isFaded ? '' : 'text-gray-900 dark:text-white'}`}
          style={{
            color: isFaded ? fadedColor : undefined,
            fontWeight: 400,
          }}
        >
          &amp;{' '}
        </span>
      )}
      
      {/* Underscore placeholder - styled as a clean underline */}
      <span 
        className="
          inline-block
          border-b-[3px]
          group-hover:border-gray-500
          group-active:border-gray-600
          transition-all duration-200
        "
        style={{ 
          borderColor: isFaded ? fadedColor : normalColor,
          width: underscoreWidth,
          height: '0.75em',
          verticalAlign: 'baseline',
          marginBottom: '0.05em',
        }}
      />
      
      {/* Comma after empty slot - use serif italic to match ingredient commas */}
      {showComma && (
        <span
          className={`font-serif italic transition-all duration-200 ${isFaded ? '' : 'text-gray-900 dark:text-white'}`}
          style={{
            color: isFaded ? fadedColor : undefined,
            fontWeight: 400,
          }}
        >
          ,{' '}
        </span>
      )}
    </span>
  );
};

export default EmptySlotIndicator;
