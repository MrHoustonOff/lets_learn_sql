import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FilterSectionProps {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-1.5 mb-2 outline-none group"
      >
        {Icon && <Icon size={11} className="text-muted-foreground/60" />}
        <span className="flex-1 text-left text-2xs font-bold uppercase tracking-widest text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
          {title}
        </span>
        <ChevronDown
          size={11}
          className={`text-muted-foreground/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && children}
    </div>
  );
};
