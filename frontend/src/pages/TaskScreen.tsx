import React, { useEffect } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { DBVisualizer } from '../modules/db-visualizer';
import { TaskPane } from '../components/workspace/TaskPane';
import { SqlEditorPane } from '../components/workspace/SqlEditorPane';
import { ResultsPane } from '../components/workspace/ResultsPane';
import { GripVertical, GripHorizontal } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

export const TaskScreen: React.FC = () => {
  const { maximizedPane, setMaximizedPane } = useUIStore();
  
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

  const isTaskMaximized = maximizedPane === 'task';
  const isEditorMaximized = maximizedPane === 'editor';
  const isDbMaximized = maximizedPane === 'db';
  const isResultsMaximized = maximizedPane === 'results';

  const isLeftMaximized = isTaskMaximized || isEditorMaximized;
  const isRightMaximized = isDbMaximized || isResultsMaximized;

  return (
    <div className="h-full w-full flex flex-col px-2 pb-2 pt-0 gap-2">
      {/* 
        Horizontal PanelGroup splits screen into Left Half and Right Half.
        We use id to persist sizes in localStorage under the 'llpg_panel_layout' key context.
      */}
      <div className="h-full w-full rounded-2xl border border-glass-border bg-background shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden relative">
        <PanelGroup 
          orientation="horizontal" 
          id="llpg_main_horizontal" 
          className="h-full w-full relative z-10 !overflow-visible"
        >
        
        {/* ================= LEFT HALF ================= */}
        <Panel defaultSize={40} minSize={20} className={`!overflow-visible transition-all duration-300 ${isLeftMaximized ? 'z-[100]' : ''}`}>
          <PanelGroup orientation="vertical" id="llpg_left_vertical" className="!overflow-visible">
            
            {/* Panel 1: Task / Reference */}
            <Panel defaultSize={50} minSize={20} className={`!overflow-visible transition-all duration-300 ${isTaskMaximized ? 'z-[100]' : ''}`}>
              <TaskPane />
            </Panel>

            <PanelResizeHandle className="h-[2px] bg-glass-border hover:bg-primary/50 transition-colors relative flex items-center justify-center group cursor-row-resize z-40 outline-none">
              <div className="absolute -inset-y-3 inset-x-0 z-40"></div>
              <div className="absolute z-50 bg-background/90 backdrop-blur-md border border-glass-border rounded flex items-center justify-center px-1 py-[1px] text-muted-foreground group-hover:text-primary group-hover:border-primary/50 transition-colors shadow-sm">
                <GripHorizontal size={12} />
              </div>
            </PanelResizeHandle>

            {/* Panel 3: SQL Editor */}
            <Panel defaultSize={50} minSize={20} className={`!overflow-visible transition-all duration-300 ${isEditorMaximized ? 'z-[100]' : ''}`}>
              <SqlEditorPane />
            </Panel>
            
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="w-[2px] bg-glass-border hover:bg-primary/50 transition-colors relative flex items-center justify-center group cursor-col-resize z-40 outline-none">
          <div className="absolute inset-y-0 -inset-x-3 z-40"></div>
          <div className="absolute z-50 bg-background/90 backdrop-blur-md border border-glass-border rounded flex items-center justify-center py-1 px-[1px] text-muted-foreground group-hover:text-primary group-hover:border-primary/50 transition-colors shadow-sm">
            <GripVertical size={12} />
          </div>
        </PanelResizeHandle>

        {/* ================= RIGHT HALF ================= */}
        <Panel defaultSize={60} minSize={30} className={`!overflow-visible transition-all duration-300 ${isRightMaximized ? 'z-[100]' : ''}`}>
          <PanelGroup orientation="vertical" id="llpg_right_vertical" className="!overflow-visible">
            
            {/* Panel 2: DB Viewer */}
            <Panel defaultSize={50} minSize={20} className={`!overflow-visible transition-all duration-300 ${isDbMaximized ? 'z-[100]' : ''}`}>
               <div className={`transition-all duration-300 ${isDbMaximized ? 'absolute inset-0 z-[100] bg-background rounded-2xl overflow-hidden' : 'h-full w-full relative !overflow-visible'}`}>
                  <DBVisualizer 
                    isMaximized={isDbMaximized} 
                    onToggleMaximize={() => setMaximizedPane(isDbMaximized ? null : 'db')}
                  />
               </div>
            </Panel>

            <PanelResizeHandle className="h-[2px] bg-glass-border hover:bg-primary/50 transition-colors relative flex items-center justify-center group cursor-row-resize z-40 outline-none">
              <div className="absolute -inset-y-3 inset-x-0 z-40"></div>
              <div className="absolute z-50 bg-background/90 backdrop-blur-md border border-glass-border rounded flex items-center justify-center px-1 py-[1px] text-muted-foreground group-hover:text-primary group-hover:border-primary/50 transition-colors shadow-sm">
                <GripHorizontal size={12} />
              </div>
            </PanelResizeHandle>

            {/* Panel 4: Results / Explain */}
            <Panel defaultSize={50} minSize={20} className={`!overflow-visible transition-all duration-300 ${isResultsMaximized ? 'z-[100]' : ''}`}>
              <ResultsPane />
            </Panel>

            </PanelGroup>
        </Panel>

        </PanelGroup>
      </div>
    </div>
  );
};
