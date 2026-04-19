import React from 'react';

interface GmixLogoProps {
  size?: number;
  className?: string;
}

export const GmixLogo: React.FC<GmixLogoProps> = ({ size = 48, className = '' }) => {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <linearGradient id="gmixGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7B3FF2" />
            <stop offset="100%" stopColor="#5B21B6" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#gmixGradient)" />
        <text
          x="50"
          y="62"
          fontSize="36"
          fontWeight="bold"
          fill="white"
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
        >
          G
        </text>
      </svg>
    </div>
  );
};