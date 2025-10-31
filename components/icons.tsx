import React from 'react';

export const BookOpenIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

export const PlusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

export const EditIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

export const TrashIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

export const BackIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

export const SaveIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

export const SparklesIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

// --- Thematic Subject Icons ---

export const MosqueIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 22h20" />
    <path d="M5 22V9.5C5 6.5 7.5 4 10.5 4c1.8 0 3.4.9 4.5 2.3" />
    <path d="M19 22V9.5C19 6.5 16.5 4 13.5 4c-1.8 0-3.4.9-4.5 2.3" />
    <path d="M12 22V2" />
    <path d="M9 4.5C9 3 10.3 2 12 2s3 1 3 2.5" />
  </svg>
);

export const IndonesiaFlagIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24">
        <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z" fill="#FFFFFF" />
        <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7H3V5z" fill="#E13B3D" />
        <rect x="3" y="5" width="18" height="14" rx="2" ry="2" fill="none" stroke="#6b7280" strokeWidth="0.5" />
    </svg>
);

export const UKFlagIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24">
    <path fill="#00247d" d="M0 0h24v24H0z"/>
    <path fill="#fff" d="M24 0v2.09L2.09 24H0v-2.09L21.91 0H24z"/>
    <path fill="#fff" d="M21.91 24L0 2.09V0h2.09L24 21.91V24h-2.09z"/>
    <path fill="#cf142b" d="M9.43 24L0 14.57V9.43L9.43 0h5.14L24 9.43v5.14L14.57 24H9.43z"/>
    <path fill="#fff" d="M10.5 0h3v24h-3zM0 10.5h24v3H0z"/>
    <path fill="#cf142b" d="M11 0h2v24h-2zM0 11h24v2H0z"/>
  </svg>
);

export const AtomIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1"/>
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(45 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-45 12 12)" />
  </svg>
);

export const CalculatorIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <rect x="8" y="6" width="8" height="4" rx="1"/>
    <path d="M8 14h2v2H8z" fill="currentColor"/>
    <path d="M14 14h2v2h-2z" fill="currentColor"/>
    <path d="M8 18h2v2H8z" fill="currentColor"/>
    <path d="M14 18h2v2h-2z" fill="currentColor"/>
  </svg>
);

export const GlobeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

export const CodeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

export const PaletteIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
     <path d="M13.5 2c-5.523 0-10 4.477-10 10s4.477 10 10 10c.827 0 1.631-.102 2.394-.294" />
     <circle cx="15.5" cy="19.5" r="2.5" />
     <circle cx="8.5" cy="10.5" r="1.5" />
     <circle cx="12.5" cy="6.5" r="1.5" />
  </svg>
);

export const DumbbellIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.4 14.4 9.6 9.6" />
    <path d="M18.8 18.8 15 15" />
    <path d="M9 9 5.2 5.2" />
    <path d="m5.2 9-.4.4a5 5 0 0 0 7 7l.4-.4" />
    <path d="m14.4 5.2.4-.4a5 5 0 0 1 7 7l-.4.4" />
    <path d="M9 5.2 5.2 9" />
    <path d="M18.8 15 15 18.8" />
  </svg>
);

export const PancasilaIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const JavaneseIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18c0-5 3-7 6-7s6 2 6 7"/>
    <path d="M10 4c-4 0-4 4-4 4v1"/>
    <path d="M18 9c0-5-2-5-4-5"/>
  </svg>
);