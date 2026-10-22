import React from 'react';

interface BrandMarkProps {
  className?: string;
  dark?: boolean;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ className = '', dark = false }) => (
  <img
    src={dark ? '/assets/Logo_light.png' : '/assets/aurastudy-mark.png'}
    alt=""
    aria-hidden="true"
    className={`inline-block shrink-0 object-contain ${dark ? 'mix-blend-screen' : ''} ${className}`}
  />
);
