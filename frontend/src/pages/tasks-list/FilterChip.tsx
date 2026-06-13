import React from 'react';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  dot?: string; // tailwind bg class for a dot indicator
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, active, onClick, dot }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 border outline-none ${
      active
        ? 'bg-primary text-primary-foreground border-transparent shadow-sm'
        : 'bg-card border-glass-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-hover'
    }`}
  >
    {dot && (
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-primary-foreground/80' : dot}`} />
    )}
    {label}
  </button>
);
