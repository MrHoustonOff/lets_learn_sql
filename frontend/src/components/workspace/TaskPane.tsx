import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore, type SlotId } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { Maximize2, Minimize2, Check, Bookmark, Loader2 } from 'lucide-react';
import { DragHandle } from './DragHandle';

interface TaskPaneProps {
  slotId: SlotId;
}

export const TaskPane: React.FC<TaskPaneProps> = ({ slotId }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'task' | 'solution'>('task');
  const { activeTask, toggleBookmark, toggleSolved } = useTaskStore();
  const { maximizedPane, setMaximizedPane } = useUIStore();
  const isMaximized = maximizedPane === 'task';

  const [solutionData, setSolutionData] = useState<{ solution_sql: string } | null>(null);
  const [loadingSolution, setLoadingSolution] = useState(false);
  const [solutionError, setSolutionError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'solution' && !solutionData && activeTask) {
      setLoadingSolution(true);
      setSolutionError(null);
      fetch(`/api/tasks/${activeTask.id}/solution`, { method: 'POST' })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch task solution');
          return res.json();
        })
        .then(data => {
          setSolutionData(data);
          setLoadingSolution(false);
        })
        .catch(err => {
          setSolutionError(err.message);
          setLoadingSolution(false);
        });
    }
  }, [activeTab, activeTask, solutionData]);

  // Reset solution data when task changes
  useEffect(() => {
    setSolutionData(null);
    setSolutionError(null);
    setActiveTab('task');
  }, [activeTask?.id]);

  if (!activeTask) return null;

  const isSolved = activeTask.isSolved;
  const isBookmarked = activeTask.isBookmarked;

  const renderFormattedText = (text: string | null) => {
    if (!text) return null;
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx}>{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const content = (
    <div className={`h-full flex flex-col transition-all duration-300 min-h-0 min-w-0 ${isMaximized ? 'fixed inset-4 z-modal bg-background rounded-2xl shadow-2xl border border-glass-border overflow-hidden' : 'bg-transparent overflow-hidden'}`}>
      <div className="h-10 border-b border-glass-border flex items-center px-2 shrink-0 bg-hover justify-between relative z-layout min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <button 
          onClick={() => setActiveTab('task')}
          className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md transition-all min-w-0 ${
            activeTab === 'task' 
              ? 'bg-background text-foreground shadow-sm border border-border/40' 
              : 'text-muted-foreground hover:text-foreground hover:bg-hover border border-transparent'
          }`}
        >
          <span className="truncate">{t('task')}</span>
        </button>
        <button 
          onClick={() => setActiveTab('solution')}
          className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md transition-all min-w-0 ${
            activeTab === 'solution' 
              ? 'bg-background text-foreground shadow-sm border border-border/40' 
              : 'text-muted-foreground hover:text-foreground hover:bg-hover border border-transparent'
          }`}
        >
          <span className="truncate">{t('solution')}</span>
        </button>
      </div>
      <div className="flex items-center gap-1 shrink min-w-0 ml-1">
        <button 
          onClick={toggleSolved}
          className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-md transition-all border min-w-0 ${
            isSolved 
              ? 'bg-success/10 border-success/30 text-success shadow-sm' 
              : 'bg-transparent border-transparent text-muted-foreground hover:bg-hover hover:text-foreground'
          }`}
          title={t('task_pane:mark_solved_tooltip')}
        >
          <Check size={14} className={`shrink-0 ${isSolved ? 'opacity-100' : 'opacity-40'}`} strokeWidth={isSolved ? 3 : 2} />
          <span className="text-xs font-medium truncate hidden sm:inline">{t('task_pane:solved')}</span>
        </button>

        <button 
          onClick={toggleBookmark}
          className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-md transition-all border min-w-0 ${
            isBookmarked 
              ? 'bg-warning/10 border-warning/30 text-warning-text shadow-sm' 
              : 'bg-transparent border-transparent text-muted-foreground hover:bg-hover hover:text-foreground'
          }`}
          title={t('task_pane:bookmark_tooltip')}
        >
          <Bookmark size={14} className={`shrink-0 ${isBookmarked ? 'opacity-100 fill-current' : 'opacity-40'}`} />
          <span className="text-xs font-medium truncate hidden sm:inline">{t('task_pane:bookmark')}</span>
        </button>

        <div className="w-[1px] h-4 bg-glass-border mx-1"></div>

        <button 
          onClick={() => setMaximizedPane(isMaximized ? null : 'task')}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-hover rounded-md transition-colors outline-none focus:outline-none shrink-0"
          title={isMaximized ? t('task_pane:collapse') : t('task_pane:expand')}
        >
          {isMaximized ? <Minimize2 size={14} className="shrink-0" /> : <Maximize2 size={14} className="shrink-0" />}
        </button>
        
        {!isMaximized && <DragHandle slotId={slotId} className="ml-1" />}
      </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 overflow-y-auto prose dark:prose-invert max-w-none text-sm scrollbar-thin min-h-0">
        {activeTab === 'task' ? (
          <div className="animate-in fade-in duration-300">
            <h3 className="mt-0 mb-4 text-lg font-bold">{activeTask.title}</h3>
            <p className="leading-relaxed">
              {renderFormattedText(activeTask.description)}
            </p>
            
            {activeTask.hint && (
              <div className="mt-6 p-4 bg-info/10 border border-info/20 rounded-xl">
                <p className="text-info m-0 leading-relaxed">
                  <strong className="block mb-1">{t('task_pane:mock_hint_title')}</strong> 
                  <span>
                    {renderFormattedText(activeTask.hint)}
                  </span>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-300 h-full flex flex-col">
            <h3 className="mt-0 mb-4 text-lg font-bold">{t('task_pane:mock_solution_title')}</h3>
            {loadingSolution ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                <span>{t('common:loading')}</span>
              </div>
            ) : solutionError ? (
              <div className="text-destructive font-semibold">Error: {solutionError}</div>
            ) : solutionData ? (
              <>
                <p>{t('task_pane:mock_solution_description')}</p>
                <pre className="bg-hover p-4 rounded-xl mt-4 border border-glass-border/50 shadow-inner overflow-x-auto">
                  <code className="text-success font-mono text-tiny">
                    {solutionData.solution_sql}
                  </code>
                </pre>
              </>
            ) : null}
          </div>
        )}
      </div>
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
