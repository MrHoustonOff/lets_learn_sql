import React from 'react';
import { createPortal } from 'react-dom';
import { useUIStore, type SlotId } from '../../store/uiStore';
import { DBVisualizer } from '../../modules/db-visualizer';

interface DBVisualizerPaneProps {
  slotId: SlotId;
}

export const DBVisualizerPane: React.FC<DBVisualizerPaneProps> = ({ slotId }) => {
  const { maximizedPane, setMaximizedPane } = useUIStore();
  const isMaximized = maximizedPane === 'db';

  const content = (
    <div className={`transition-all duration-300 ${isMaximized ? 'fixed inset-4 z-modal bg-background rounded-2xl shadow-2xl border border-glass-border overflow-hidden' : 'h-full w-full relative overflow-hidden'}`}>
      <DBVisualizer 
        isMaximized={isMaximized} 
        onToggleMaximize={() => setMaximizedPane(isMaximized ? null : 'db')}
        slotId={slotId}
      />
    </div>
  );

  if (isMaximized) {
    return createPortal(
      <div className="fixed inset-0 z-modal-backdrop bg-background/80 backdrop-blur-sm">
        {content}
      </div>,
      document.body
    );
  }

  return content;
};
