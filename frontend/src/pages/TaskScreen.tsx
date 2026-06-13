import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Panel, Group as PanelGroup } from 'react-resizable-panels';
import type { GroupImperativeHandle } from 'react-resizable-panels';
import { DBVisualizerPane } from '../components/workspace/DBVisualizerPane';
import { TaskPane } from '../components/workspace/TaskPane';
import { SqlEditorPane } from '../components/workspace/SqlEditorPane';
import { ResultsPane } from '../components/workspace/ResultsPane';
import { useUIStore, type SlotId } from '../store/uiStore';
import { useTaskStore } from '../store/taskStore';
import { useQueryStore } from '../store/queryStore';
import { DroppableSlot } from '../components/workspace/DroppableSlot';
import { ResizeHandle } from '../components/workspace/ResizeHandle';
import { ViewMenu } from '../components/workspace/ViewMenu';

const LAYOUT_KEY = 'task_screen_layout_v7';
const MIN_HORIZONTAL_PX = 320;
const MIN_VERTICAL_PX = 150;

type LayoutMap = { [panelId: string]: number };

function clampLayout(layout: LayoutMap | undefined, defaultLayout: LayoutMap): LayoutMap {
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) return defaultLayout;
  const values = Object.values(layout);
  if (values.length !== Object.keys(defaultLayout).length) return defaultLayout;
  // Layout values are percentages (0-100), ensure they are valid numbers
  if (values.some(s => typeof s !== 'number' || s < 0 || s > 100)) return defaultLayout;
  return layout;
}

function useCustomLayout(id: string, defaultLayoutMap: LayoutMap) {
  const defaultLayout = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(`${LAYOUT_KEY}_${id}`);
      if (!raw) return defaultLayoutMap;
      const parsed = JSON.parse(raw);
      return clampLayout(parsed, defaultLayoutMap);
    } catch {
      return defaultLayoutMap;
    }
  }, [id, defaultLayoutMap]);

  const onLayoutChanged = React.useCallback((layout: LayoutMap) => {
    if (Object.values(layout).every(s => typeof s === 'number')) {
      localStorage.setItem(`${LAYOUT_KEY}_${id}`, JSON.stringify(layout));
    }
  }, [id]);

  return { defaultLayout, onLayoutChanged };
}

export const TaskScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { activeTask, fetchTask, isLoading, error, setActiveTask } = useTaskStore();
  const { resetQueryState } = useQueryStore();
  const { maximizedPane, setMaximizedPane, slots } = useUIStore();

  useEffect(() => {
    // Reset state before fetching the new task
    resetQueryState();
    
    if (id) {
      fetchTask(id);
    }
    return () => {
      setActiveTask(null);
      resetQueryState();
    };
  }, [id, fetchTask, setActiveTask, resetQueryState]);


  const mainGroupRef = useRef<GroupImperativeHandle>(null);
  const leftGroupRef = useRef<GroupImperativeHandle>(null);
  const rightGroupRef = useRef<GroupImperativeHandle>(null);

  const { defaultLayout: mainLayout, onLayoutChanged: mainOnLayout } = useCustomLayout('main_horizontal', { main_left: 50, main_right: 50 });
  const { defaultLayout: leftLayout, onLayoutChanged: leftOnLayout } = useCustomLayout('left_vertical', { left_top: 50, left_bottom: 50 });
  const { defaultLayout: rightLayout, onLayoutChanged: rightOnLayout } = useCustomLayout('right_vertical', { right_top: 50, right_bottom: 50 });

  const handleResetProportions = () => {
    mainGroupRef.current?.setLayout({ main_left: 50, main_right: 50 });
    leftGroupRef.current?.setLayout({ left_top: 50, left_bottom: 50 });
    rightGroupRef.current?.setLayout({ right_top: 50, right_bottom: 50 });
  };

  // Cleanup old layout versions
  useEffect(() => {
    ['task_screen_layout_v5', 'task_screen_layout_v6', 'task_screen_layout_v5_main_horizontal', 'task_screen_layout_v6_main_horizontal', 'task_screen_layout_v5_left_vertical', 'task_screen_layout_v6_left_vertical', 'task_screen_layout_v5_right_vertical', 'task_screen_layout_v6_right_vertical', 'llpg_main_horizontal_v5', 'llpg_main_horizontal_v6', 'llpg_left_vertical_v5', 'llpg_left_vertical_v6', 'llpg_right_vertical_v5', 'llpg_right_vertical_v6'].forEach(k => {
      localStorage.removeItem(k);
    });
  }, []);

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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">{t('common:loading') || 'Loading...'}</div>
      </div>
    );
  }

  if (error || !activeTask) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-destructive font-semibold">Error: {error || 'Task not found'}</div>
      </div>
    );
  }

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
          id="llpg_main_horizontal_v7" 
          className="h-full w-full relative z-layout"
        >
        
        {/* ================= LEFT HALF ================= */}
        <Panel id="main_left" defaultSize="50%" minSize={MIN_HORIZONTAL_PX} collapsible={false}>
          <PanelGroup groupRef={leftGroupRef} defaultLayout={leftLayout} onLayoutChanged={leftOnLayout} orientation="vertical" id="llpg_left_vertical_v7" className="w-full h-full">
            
            {/* Top Left Slot */}
            <Panel id="left_top" defaultSize="50%" minSize={MIN_VERTICAL_PX} collapsible={false}>
              {renderPane('topLeft')}
            </Panel>

            <ResizeHandle direction="horizontal" />

            {/* Bottom Left Slot */}
            <Panel id="left_bottom" defaultSize="50%" minSize={MIN_VERTICAL_PX} collapsible={false}>
              {renderPane('bottomLeft')}
            </Panel>
            
          </PanelGroup>
        </Panel>

        <ResizeHandle direction="vertical" />

        {/* ================= RIGHT HALF ================= */}
        <Panel id="main_right" defaultSize="50%" minSize={MIN_HORIZONTAL_PX} collapsible={false}>
          <PanelGroup groupRef={rightGroupRef} defaultLayout={rightLayout} onLayoutChanged={rightOnLayout} orientation="vertical" id="llpg_right_vertical_v7" className="w-full h-full">
            
            {/* Top Right Slot */}
            <Panel id="right_top" defaultSize="50%" minSize={MIN_VERTICAL_PX} collapsible={false}>
              {renderPane('topRight')}
            </Panel>

            <ResizeHandle direction="horizontal" />

            {/* Bottom Right Slot */}
            <Panel id="right_bottom" defaultSize="50%" minSize={MIN_VERTICAL_PX} collapsible={false}>
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
