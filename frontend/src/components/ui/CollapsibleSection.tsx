import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

export const CollapsibleSection: React.FC<{
  title: string;
  infoText?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, infoText, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col mb-6">
      <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-1">
          {open ? (
            <ChevronDown size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors leading-none translate-y-[1px]">
            {title}
          </h3>
        </div>
        {infoText && <InfoTooltip text={infoText} className="" />}
      </div>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
};
