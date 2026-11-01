import React from 'react';

/**
 * Magnus Golden King Chess Piece Logo
 */
export const MagnusChessLogo: React.FC<{ className?: string; size?: number }> = ({ 
  className = "w-10 h-10", 
  size = 40 
}) => (
  <svg 
    viewBox="0 0 512 512" 
    width={size} 
    height={size} 
    className={className} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="512" height="512" rx="110" fill="#0b1120" />
    <rect width="508" height="508" x="2" y="2" rx="108" stroke="#fbbf24" strokeWidth="6" strokeOpacity="0.4" />
    
    {/* King Chess Piece Top Crown & Cross */}
    <path d="M256 80 L296 120 L256 160 L216 120 Z" fill="#fbbf24" />
    <path d="M236 120 H276" stroke="#fbbf24" strokeWidth="20" strokeLinecap="round" />
    
    {/* Body Crown */}
    <path d="M176 200 L196 360 H316 L336 200 L256 240 L176 200 Z" fill="none" stroke="#fbbf24" strokeWidth="30" strokeLinejoin="round" />
    <path d="M256 160 V240" stroke="#fbbf24" strokeWidth="20" />
    
    {/* Base Pedestal */}
    <path d="M156 360 H356 V400 H156 Z" fill="#fbbf24" />
    <path d="M136 400 H376 V432 H136 Z" fill="#fbbf24" />
    
    {/* Jewels */}
    <circle cx="176" cy="200" r="25" fill="#fbbf24" />
    <circle cx="336" cy="200" r="25" fill="#fbbf24" />
    <circle cx="256" cy="180" r="25" fill="#fbbf24" />
  </svg>
);

/**
 * Providence Cosmic Planet & Solar Amber Star Logo
 */
export const ProvidenceLogo: React.FC<{ className?: string; size?: number }> = ({ 
  className = "w-6 h-6", 
  size = 24 
}) => (
  <svg 
    viewBox="0 0 64 64" 
    width={size} 
    height={size} 
    className={className} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <radialGradient id="prov-solar-amber-grad" cx="75%" cy="25%" r="70%">
        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.85" />
        <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.4" />
        <stop offset="70%" stopColor="#b45309" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#02040a" stopOpacity="0.95" />
      </radialGradient>
      <radialGradient id="prov-star-amber-halo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
        <stop offset="40%" stopColor="#fef08a" stopOpacity="0.8" />
        <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
    </defs>
    
    {/* Orbit Ring */}
    <circle cx="32" cy="32" r="27" fill="none" stroke="#ffffff" strokeWidth="2.2" opacity="0.45" />
    {/* Dark Celestial Sphere */}
    <circle cx="32" cy="32" r="19" fill="#04060e" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
    {/* Solar Amber Atmospheric Crescent */}
    <circle cx="32" cy="32" r="18.5" fill="url(#prov-solar-amber-grad)" />
    {/* Star Halo & Core at 45° */}
    <circle cx="51.1" cy="12.9" r="9.5" fill="url(#prov-star-amber-halo)" />
    <circle cx="51.1" cy="12.9" r="4.6" fill="#ffffff" />
  </svg>
);
