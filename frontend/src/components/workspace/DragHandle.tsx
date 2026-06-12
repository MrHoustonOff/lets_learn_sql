import React, { useState } from 'react';
import { useUIStore, type SlotId } from '../../store/uiStore';
import { DND_FORMATS } from '../../lib/constants';

interface DragHandleProps {
  slotId: SlotId;
  className?: string;
}

export const DragHandle: React.FC<DragHandleProps> = ({ slotId, className = '' }) => {
  const { setDraggingSlot } = useUIStore();
  const [isHovered, setIsHovered] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // Set the dragging state in the global store
    setDraggingSlot(slotId);
    
    // Set data for HTML5 drag and drop using a custom type so text editors don't catch it
    e.dataTransfer.setData(DND_FORMATS.SLOT_ID, slotId);
    // Fallback for some browsers that require standard types, but use an empty string
    e.dataTransfer.setData('text/plain', '');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingSlot(null);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`rounded-full cursor-grab active:cursor-grabbing hover:bg-primary/20 transition-all flex items-center justify-center border border-transparent hover:border-primary/30 ${className}`}
      title="Drag to swap panels"
      style={{
        width: isHovered ? '24px' : '20px',
        height: isHovered ? '24px' : '20px',
      }}
    >
      <div className={`w-2.5 h-2.5 rounded-full bg-muted-foreground transition-all duration-300 flex items-center justify-center ${isHovered ? 'bg-primary scale-125' : ''}`}>
        {isHovered && <div className="w-1 h-1 rounded-full bg-background" />}
      </div>
    </div>
  );
};
