import React, { useEffect } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { DBVisualizerPane } from '../components/workspace/DBVisualizerPane';
import { TaskPane } from '../components/workspace/TaskPane';
import { SqlEditorPane } from '../components/workspace/SqlEditorPane';
import { ResultsPane } from '../components/workspace/ResultsPane';
import { GripVertical, GripHorizontal } from 'lucide-react';
import { useUIStore, type SlotId, type PaneType } from '../store/uiStore';
import { DroppableSlot } from '../components/workspace/DroppableSlot';
import { ResizeHandle } from '../components/workspace/ResizeHandle';

export const TaskScreen: React.FC = () => {
  const { maximizedPane, setMaximizedPane, slots } = useUIStore();
  
  // Обработка Esc для выхода из полноэкранного режима панелей
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && maximizedPane) {
        setMaximizedPane(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [maximizedPane, setMaximizedPane]);

  const renderPane = (slotId: SlotId) => {
    const paneType = slots[slotId];
    const isMaximized = maximizedPane === paneType;
    
    let content: React.ReactNode = null;
    switch (paneType) {
      case 'task': 
        content = <TaskPane slotId={slotId} />; 
        break;
      case 'editor': 
        content = <SqlEditorPane slotId={slotId} />; 
        break;
      case 'db': 
        content = <DBVisualizerPane slotId={slotId} />;
        break;
      case 'results': 
        content = <ResultsPane slotId={slotId} />; 
        break;
      default: 
        content = null;
    }

    return (
      <DroppableSlot slotId={slotId}>
        {content}
      </DroppableSlot>
    );
  };

  const maximizedSlot = Object.entries(slots).find(([_, paneType]) => paneType === maximizedPane)?.[0] as SlotId | undefined;
  const isLeftMaximized = maximizedSlot === 'topLeft' || maximizedSlot === 'bottomLeft';
  const isRightMaximized = maximizedSlot === 'topRight' || maximizedSlot === 'bottomRight';

  return (
    <div className="h-full w-full flex flex-col px-2 pb-2 pt-0 gap-2">
      {/* 
        Horizontal PanelGroup splits screen into Left Half and Right Half.
        We use id to persist sizes in localStorage under the 'llpg_panel_layout' key context.
      */}
      <div className="h-full w-full rounded-2xl border border-glass-border bg-background shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden relative">
        <PanelGroup 
          orientation="horizontal" 
          id="llpg_main_horizontal_v4" 
          className="h-full w-full relative z-10 !overflow-visible"
        >
        
        {/* ================= LEFT HALF ================= */}
        <Panel defaultSize={40} minSize={20} className={`!overflow-visible transition-all duration-300 ${isLeftMaximized ? 'z-[100]' : ''}`}>
          <PanelGroup orientation="vertical" id="llpg_left_vertical_v4" className="!overflow-visible">
            
            {/* Top Left Slot */}
            <Panel defaultSize={50} minSize={20} className={`!overflow-visible transition-all duration-300 ${maximizedPane === slots.topLeft ? 'z-[100]' : ''}`}>
              {renderPane('topLeft')}
            </Panel>

            <ResizeHandle direction="horizontal" />

            {/* Bottom Left Slot */}
            <Panel defaultSize={50} minSize={20} className={`!overflow-visible transition-all duration-300 ${maximizedPane === slots.bottomLeft ? 'z-[100]' : ''}`}>
              {renderPane('bottomLeft')}
            </Panel>
            
          </PanelGroup>
        </Panel>

        <ResizeHandle direction="vertical" />

        {/* ================= RIGHT HALF ================= */}
        <Panel defaultSize={60} minSize={30} className={`!overflow-visible transition-all duration-300 ${isRightMaximized ? 'z-[100]' : ''}`}>
          <PanelGroup orientation="vertical" id="llpg_right_vertical_v4" className="!overflow-visible">
            
            {/* Top Right Slot */}
            <Panel defaultSize={50} minSize={20} className={`!overflow-visible transition-all duration-300 ${maximizedPane === slots.topRight ? 'z-[100]' : ''}`}>
              {renderPane('topRight')}
            </Panel>

            <ResizeHandle direction="horizontal" />

            {/* Bottom Right Slot */}
            <Panel defaultSize={50} minSize={20} className={`!overflow-visible transition-all duration-300 ${maximizedPane === slots.bottomRight ? 'z-[100]' : ''}`}>
              {renderPane('bottomRight')}
            </Panel>

            </PanelGroup>
        </Panel>

        </PanelGroup>
      </div>
    </div>
  );
};
