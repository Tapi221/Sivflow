import React from 'react';

// Simple face icons matching the uploaded reference image style
export const FaceIcons = {
  // Score 0: Forgot - Sad face (red)
  Forgot: ({ className, size = 48 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FFE5E5" stroke="#FF5A65" strokeWidth="2"/>
      <circle cx="16" cy="20" r="2" fill="#FF5A65"/>
      <circle cx="32" cy="20" r="2" fill="#FF5A65"/>
      <path d="M16 32 Q24 28 32 32" stroke="#FF5A65" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  
  // Score 1: Vague - Neutral face (yellow)
  Vague: ({ className, size = 48 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FFF9E5" stroke="#FFC107" strokeWidth="2"/>
      <circle cx="16" cy="20" r="2" fill="#FFC107"/>
      <circle cx="32" cy="20" r="2" fill="#FFC107"/>
      <line x1="16" y1="30" x2="32" y2="30" stroke="#FFC107" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  
  // Score 2: Good - Slight smile (blue)
  Good: ({ className, size = 48 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#E3F2FD" stroke="#42A5F5" strokeWidth="2"/>
      <circle cx="16" cy="20" r="2" fill="#42A5F5"/>
      <circle cx="32" cy="20" r="2" fill="#42A5F5"/>
      <path d="M16 28 Q24 32 32 28" stroke="#42A5F5" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  
  // Score 3: Easy - Happy face (green)
  Easy: ({ className, size = 48 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#E8F5E9" stroke="#4CAF50" strokeWidth="2"/>
      <circle cx="16" cy="20" r="2" fill="#4CAF50"/>
      <circle cx="32" cy="20" r="2" fill="#4CAF50"/>
      <path d="M16 26 Q24 34 32 26" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  )
};
