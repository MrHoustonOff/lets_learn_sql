import React from 'react';
import { useUIStore, type SlotId } from '../../store/uiStore';
import { DBVisualizer } from '../../modules/db-visualizer';

interface DBVisualizerPaneProps {
  slotId: SlotId;
}

export const DBVisualizerPane: React.FC<DBVisualizerPaneProps> = ({ slotId }) => {
  const { maximizedPane, setMaximizedPane } = useUIStore();
  const isMaximized = maximizedPane === 'db';

  return (
    <div className={`transition-all duration-300 ${isMaximized ? 'absolute inset-0 z-[100] bg-background rounded-2xl overflow-hidden' : 'h-full w-full relative !overflow-visible'}`}>
      <DBVisualizer 
        isMaximized={isMaximized} 
        onToggleMaximize={() => setMaximizedPane(isMaximized ? null : 'db')}
        slotId={slotId}
      />
    </div>
  );
};
