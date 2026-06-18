import React from 'react';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  dot?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, active, onClick, dot }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-medium transition-all duration-150 outline-none border ${
      active
        ? 'bg-primary/15 border-primary/40 text-primary'
        : 'bg-glass border-glass-border text-muted-foreground hover:text-foreground hover:border-primary/25 hover:bg-hover'
    }`}
  >
    {dot && <span className={`w-1 h-1 rounded-full shrink-0 ${active ? 'bg-primary' : dot}`} />}
    {label}
  </button>
);
