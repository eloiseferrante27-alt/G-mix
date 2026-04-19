import React from 'react';

interface GmixLogoProps {
  size?: number;
  className?: string;
}

export const GmixLogo: React.FC<GmixLogoProps> = ({ size = 48, className = '' }) => {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/gmix-logo.png"
      alt="G-MIX"
      width={size}
      height={size}
      style={{ objectFit: 'contain', width: size, height: size }}
      className={className}
    />
  );
};
