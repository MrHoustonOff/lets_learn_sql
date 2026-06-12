import React, { useEffect, useRef } from 'react';
import { Panel, Group as PanelGroup, useDefaultLayout } from 'react-resizable-panels';
import type { GroupImperativeHandle } from 'react-resizable-panels';
import { DBVisualizerPane } from '../components/workspace/DBVisualizerPane';
import { TaskPane } from '../components/workspace/TaskPane';
import { SqlEditorPane } from '../components/workspace/SqlEditorPane';
import { ResultsPane } from '../components/workspace/ResultsPane';
import { useUIStore, type SlotId } from '../store/uiStore';
import { DroppableSlot } from '../components/workspace/DroppableSlot';
import { ResizeHandle } from '../components/workspace/ResizeHandle';
import { ViewMenu } from '../components/workspace/ViewMenu';

export const TaskScreen: React.FC = () => {
  const { maximizedPane, setMaximizedPane, slots } = useUIStore();

  // Dynamic minSize calculation to enforce hard pixel limits
  const [minHorizontalPct, setMinHorizontalPct] = React.useState(30);
  const [minVerticalPct, setMinVerticalPct] = React.useState(25);

  React.useEffect(() => {
    const calculateLimits = () => {
      // For horizontal (left/right panes), we want at least 320px
      const w = window.innerWidth || 1000;
      const h = window.innerHeight || 800;
      
      const horizPct = Math.ceil((320 / w) * 100);
      setMinHorizontalPct(Math.min(Math.max(horizPct, 20), 45));

      // For vertical (top/bottom panes), we want at least 200px
      const vertPct = Math.ceil((200 / h) * 100);
      setMinVerticalPct(Math.min(Math.max(vertPct, 15), 45));
    };

    calculateLimits();
    window.addEventListener('resize', calculateLimits);
    return () => window.removeEventListener('resize', calculateLimits);
  }, []);
  
  const mainGroupRef = useRef<GroupImperativeHandle>(null);
  const leftGroupRef = useRef<GroupImperativeHandle>(null);
  const rightGroupRef = useRef<GroupImperativeHandle>(null);

  const { defaultLayout: mainLayout, onLayoutChanged: mainOnLayout } = useDefaultLayout({ id: 'llpg_main_horizontal_v5' });
  const { defaultLayout: leftLayout, onLayoutChanged: leftOnLayout } = useDefaultLayout({ id: 'llpg_left_vertical_v5' });
  const { defaultLayout: rightLayout, onLayoutChanged: rightOnLayout } = useDefaultLayout({ id: 'llpg_right_vertical_v5' });

  const handleResetProportions = () => {
    mainGroupRef.current?.setLayout([50, 50]);
    leftGroupRef.current?.setLayout([50, 50]);
    rightGroupRef.current?.setLayout([50, 50]);
  };
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
      <div className="flex-1 w-full relative">
        <ViewMenu onResetProportions={handleResetProportions} />

      {/* 
        Horizontal PanelGroup splits screen into Left Half and Right Half.
        We use id to persist sizes in localStorage under the 'llpg_panel_layout' key context.
      */}
      <div className="h-full w-full rounded-2xl border border-glass-border bg-background shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden relative">
        <PanelGroup 
          groupRef={mainGroupRef}
          defaultLayout={mainLayout}
          onLayoutChanged={mainOnLayout}
          orientation="horizontal" 
          id="llpg_main_horizontal_v5" 
          className="h-full w-full relative z-10"
        >
        
        {/* ================= LEFT HALF ================= */}
        <Panel id="main_left" defaultSize={50} minSize={minHorizontalPct} className={`!overflow-visible ${isLeftMaximized ? 'z-[100]' : ''}`}>
          <PanelGroup groupRef={leftGroupRef} defaultLayout={leftLayout} onLayoutChanged={leftOnLayout} orientation="vertical" id="llpg_left_vertical_v5" className="w-full h-full !overflow-visible">
            
            {/* Top Left Slot */}
            <Panel id="left_top" defaultSize={50} minSize={minVerticalPct} className={`!overflow-visible ${maximizedPane === slots.topLeft ? 'z-[100]' : ''}`}>
              {renderPane('topLeft')}
            </Panel>

            <ResizeHandle direction="horizontal" />

            {/* Bottom Left Slot */}
            <Panel id="left_bottom" defaultSize={50} minSize={minVerticalPct} className={`!overflow-visible ${maximizedPane === slots.bottomLeft ? 'z-[100]' : ''}`}>
              {renderPane('bottomLeft')}
            </Panel>
            
          </PanelGroup>
        </Panel>

        <ResizeHandle direction="vertical" />

        {/* ================= RIGHT HALF ================= */}
        <Panel id="main_right" defaultSize={50} minSize={minHorizontalPct} className={`!overflow-visible ${isRightMaximized ? 'z-[100]' : ''}`}>
          <PanelGroup groupRef={rightGroupRef} defaultLayout={rightLayout} onLayoutChanged={rightOnLayout} orientation="vertical" id="llpg_right_vertical_v5" className="w-full h-full !overflow-visible">
            
            {/* Top Right Slot */}
            <Panel id="right_top" defaultSize={50} minSize={minVerticalPct} className={`!overflow-visible ${maximizedPane === slots.topRight ? 'z-[100]' : ''}`}>
              {renderPane('topRight')}
            </Panel>

            <ResizeHandle direction="horizontal" />

            {/* Bottom Right Slot */}
            <Panel id="right_bottom" defaultSize={50} minSize={minVerticalPct} className={`!overflow-visible ${maximizedPane === slots.bottomRight ? 'z-[100]' : ''}`}>
              {renderPane('bottomRight')}
            </Panel>

            </PanelGroup>
        </Panel>

        </PanelGroup>
      </div>
      </div>
    </div>
  );
};
