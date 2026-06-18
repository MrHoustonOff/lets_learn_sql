import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore, type SlotId } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useQueryStore } from '../../store/queryStore';
import { Maximize2, Minimize2, Bookmark } from 'lucide-react';
import { MarkdownText } from '../ui/MarkdownText';
import { DragHandle } from './DragHandle';
import { SubmitReport } from './SubmitReport';

interface TaskPaneProps {
  slotId: SlotId;
}

export const TaskPane: React.FC<TaskPaneProps> = ({ slotId }) => {
  const { t } = useTranslation();
  // Use shared tab state from store — SqlEditorPane can switch it on Submit
  const { activeTask, toggleBookmark, taskPaneTab, setTaskPaneTab } = useTaskStore();
  const { submitResult, isSubmitting, submitError, fetchHistory } = useQueryStore();
  const { maximizedPane, setMaximizedPane } = useUIStore();
  const isMaximized = maximizedPane === 'task';

  // Reset tab and fetch history when task changes
  useEffect(() => {
    setTaskPaneTab('task');
    if (activeTask?.id) {
      fetchHistory(activeTask.id);
    }
  }, [activeTask?.id, setTaskPaneTab, fetchHistory]);

  if (!activeTask) return null;


  const isBookmarked = activeTask.isBookmarked;

  const content = (
    <div className={`h-full flex flex-col transition-all duration-300 min-h-0 min-w-0 ${isMaximized ? 'fixed inset-4 z-modal bg-background rounded-2xl shadow-2xl border border-glass-border overflow-hidden' : 'bg-transparent overflow-hidden'}`}>
      <div className="h-10 border-b border-glass-border flex items-center px-2 shrink-0 bg-hover justify-between relative z-layout min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <button 
            onClick={() => setTaskPaneTab('task')}
            className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md transition-all min-w-0 ${
              taskPaneTab === 'task' 
                ? 'bg-background text-foreground shadow-sm border border-border/40' 
                : 'text-muted-foreground hover:text-foreground hover:bg-hover border border-transparent'
            }`}
          >
            <span className="truncate">{t('task')}</span>
          </button>
          <button 
            onClick={() => setTaskPaneTab('solution')}
            className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md transition-all min-w-0 ${
              taskPaneTab === 'solution' 
                ? 'bg-background text-foreground shadow-sm border border-border/40' 
                : 'text-muted-foreground hover:text-foreground hover:bg-hover border border-transparent'
            }`}
          >
            <span className="truncate">{t('solution')}</span>
            {/* Badge: shows if there's a submit result */}
            {submitResult && (
              <span className={`ml-1.5 w-2 h-2 rounded-full shrink-0 ${submitResult.verdict ? 'bg-success' : 'bg-destructive'}`} />
            )}
          </button>
        </div>
        <div className="flex items-center gap-1 shrink min-w-0 ml-1">


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
      <div className="flex-1 p-5 overflow-y-auto prose dark:prose-invert max-w-none text-sm custom-scrollbar min-h-0">
        {taskPaneTab === 'task' ? (
          <div className="animate-in fade-in duration-300">
            <h3 className="mt-0 mb-4 text-lg font-bold">
              <MarkdownText inline text={activeTask.title} />
            </h3>
            <div className="leading-relaxed">
              <MarkdownText text={activeTask.description} />
            </div>
            
            {activeTask.hint && (
              <div className="mt-6 p-4 bg-info/10 border border-info/20 rounded-xl">
                <p className="text-info m-0 leading-relaxed">
                  <strong className="block mb-1">{t('task_pane:mock_hint_title')}</strong> 
                  <div className="text-sm">
                    <MarkdownText text={activeTask.hint} />
                  </div>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-300 flex flex-col gap-5">
            {/* ===== Submit Report (main content of solution tab) ===== */}
            <SubmitReport
              taskId={activeTask.id}
              report={submitResult}
              isSubmitting={isSubmitting}
              submitError={submitError}
            />


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
