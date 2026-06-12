import React from 'react';
import { Separator as PanelResizeHandle } from 'react-resizable-panels';
import { GripVertical, GripHorizontal } from 'lucide-react';

interface ResizeHandleProps {
  direction?: 'horizontal' | 'vertical';
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ direction = 'vertical' }) => {
  const isHorizontal = direction === 'horizontal';

  return (
    <PanelResizeHandle 
      className={`bg-glass-border hover:bg-primary/50 transition-colors relative flex items-center justify-center group !cursor-grab active:!cursor-grabbing outline-none
        ${isHorizontal ? 'h-[2px] z-resize' : 'w-[2px] z-resize'}`}
    >
      <div className={`absolute z-resize ${isHorizontal ? '-inset-y-1.5 inset-x-0' : 'inset-y-0 -inset-x-1.5'}`}></div>
      <div className={`absolute z-resize bg-popover border border-glass-border rounded flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/50 transition-colors shadow-sm
        ${isHorizontal ? 'px-1 py-[1px]' : 'py-1 px-[1px]'}`}
      >
        {isHorizontal ? <GripHorizontal size={12} /> : <GripVertical size={12} />}
      </div>
    </PanelResizeHandle>
  );
};
