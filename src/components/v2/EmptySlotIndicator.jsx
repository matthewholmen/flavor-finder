import React from 'react';

export const EmptySlotIndicator = ({
  showAmpersand = false,
  showComma = false,
  isFaded = false,
  onClick,
}) => {
  // Match mockup: faded state for empty slot when another ingredient is hovered
  const fadedColor = '#e8e8e8';
  const normalColor = '#c0c0c0'; // Light gray for the underscore
  const ampersandColor = isFaded ? fadedColor : '#1a1a1a'; // Black ampersand when not faded
  const commaColor = isFaded ? fadedColor : '#1a1a1a'; // Black comma when not faded
  
  return (
    <span 
      className="inline items-baseline cursor-pointer group"
      onClick={onClick}
    >
      {/* Ampersand before empty slot (only for the last slot) */}
      {showAmpersand && (
        <span 
          className="font-serif italic transition-all duration-200"
          style={{ 
            color: ampersandColor,
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
          transition-all duration-200
        "
        style={{ 
          borderColor: isFaded ? fadedColor : normalColor,
          width: '3.5em',
          height: '0.75em',
          verticalAlign: 'baseline',
          marginBottom: '0.05em',
        }}
      />
      
      {/* Comma after empty slot - use serif italic to match ingredient commas */}
      {showComma && (
        <span 
          className="font-serif italic transition-all duration-200"
          style={{ 
            color: commaColor,
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
