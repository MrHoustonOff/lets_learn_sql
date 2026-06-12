import React, { useState } from 'react';
import { useUIStore, type SlotId } from '../../store/uiStore';

interface DroppableSlotProps {
  slotId: SlotId;
  children: React.ReactNode;
}

export const DroppableSlot: React.FC<DroppableSlotProps> = ({ slotId, children }) => {
  const { draggingSlot, swapSlots, maximizedPane, slots } = useUIStore();
  const [isDragOver, setIsDragOver] = useState(false);

  const isDraggingMe = draggingSlot === slotId;
  const isDropTarget = draggingSlot !== null && !isDraggingMe;
  const isMaximized = maximizedPane === slots[slotId];

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (isDropTarget) {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (isDropTarget) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only remove drag over if we're leaving the actual container, not moving between children
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const sourceSlot = e.dataTransfer.getData('application/vnd.llpg.slot') as SlotId;
    if (sourceSlot && sourceSlot !== slotId) {
      // Defer state update so the browser can finish the drag-and-drop sequence naturally
      // before React unmounts the dragged element. This prevents freezes/crashes.
      setTimeout(() => {
        swapSlots(sourceSlot, slotId);
      }, 0);
    }
  };

  return (
    <div
      className={`h-full w-full transition-all duration-300
        ${isMaximized ? '' : 'relative'}
        ${isDraggingMe ? 'opacity-40 blur-[2px] scale-[0.98]' : ''}
      `}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* If this pane is a valid drop target, show an overlay when dragging over */}
      {isDropTarget && isDragOver && (
        <div className="absolute inset-0 z-50 border-2 border-primary bg-primary/10 pointer-events-none transition-all duration-200" />
      )}
      
      {/* If any pane is being dragged, add a slight overlay to others to indicate they are drop zones */}
      {isDropTarget && !isDragOver && (
        <div className="absolute inset-0 z-50 bg-background/10 backdrop-blur-[1px] pointer-events-none transition-all duration-300" />
      )}

      {children}
    </div>
  );
};
