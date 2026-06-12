import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export const InfoTooltip = ({ text }: { text: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Храним стили для точного позиционирования
  const [style, setStyle] = useState<React.CSSProperties>({});

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 288; // w-72 = 18rem = 288px
    
    // Проверяем, есть ли место сверху (предполагаем, что тултип может быть до 200px в высоту)
    const spaceAbove = rect.top;
    const isDown = spaceAbove < 200;

    // Центрируем тултип относительно иконки
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    
    // Если тултип вылезает за экран слева или справа — прижимаем его к краю
    left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));

    if (isDown) {
      // Мало места сверху — показываем СНИЗУ от иконки
      setStyle({
        top: `${rect.bottom + 8}px`,
        left: `${left}px`,
        transformOrigin: 'top center'
      });
    } else {
      // Места сверху достаточно — показываем СВЕРХУ от иконки
      setStyle({
        bottom: `${window.innerHeight - rect.top + 8}px`,
        left: `${left}px`,
        transformOrigin: 'bottom center'
      });
    }
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
          className="fixed z-tooltip w-72 p-3 bg-popover text-popover-foreground text-xs rounded-md shadow-2xl border border-glass-border pointer-events-none whitespace-pre-wrap font-sans font-normal normal-case leading-relaxed animate-in fade-in zoom-in-0 duration-200"
          style={style}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
};
