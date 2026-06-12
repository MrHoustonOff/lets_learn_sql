import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export const InfoTooltip = ({ text }: { text: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, translateY: '0', translateX: '-50%' });

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipHeight = 150; // approximate max height
    const tooltipWidth = 288; // 72 tailwind spacing = 18rem = 288px
    
    let top = rect.top - 8; // Pop upwards by default
    let translateY = '-100%';
    let left = rect.left + rect.width / 2;
    let translateX = '-50%';

    if (top - tooltipHeight < 0) {
      // Not enough space above, pop downwards
      top = rect.bottom + 8;
      translateY = '0';
    }

    if (left - tooltipWidth / 2 < 10) {
      left = 10;
      translateX = '0';
    } else if (left + tooltipWidth / 2 > window.innerWidth - 10) {
      left = window.innerWidth - 10;
      translateX = '-100%';
    }

    setPos({ top, left, translateY, translateX });
    setIsOpen(true);
  };

  return (
    <>
      <div 
        className="inline-flex items-center ml-1 align-middle"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsOpen(false)}
      >
        <Info size={14} className="text-muted-foreground/50 hover:text-primary cursor-help transition-colors" />
      </div>
      {isOpen && createPortal(
        <div 
          className="fixed z-[99999] w-72 p-3 bg-popover text-popover-foreground text-xs rounded-md shadow-2xl border border-glass-border pointer-events-none whitespace-pre-wrap font-sans font-normal normal-case leading-relaxed animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            top: `${pos.top}px`, 
            left: `${pos.left}px`,
            transform: `translate(${pos.translateX}, ${pos.translateY})`
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
};
