import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useUIStore, type SlotId } from '../../store/uiStore';
import { Maximize2, Minimize2, Check, Bookmark } from 'lucide-react';
import { DragHandle } from './DragHandle';

interface TaskPaneProps {
  slotId: SlotId;
}

export const TaskPane: React.FC<TaskPaneProps> = ({ slotId }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'task' | 'solution'>('task');
  const [isSolved, setIsSolved] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { maximizedPane, setMaximizedPane } = useUIStore();
  const isMaximized = maximizedPane === 'task';

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
          onClick={() => setIsSolved(!isSolved)}
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
          onClick={() => setIsBookmarked(!isBookmarked)}
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
            <h3 className="mt-0 mb-4 text-lg font-bold">{t('task_pane:mock_title')}</h3>
            <p>
              <Trans i18nKey="task_pane:mock_description" components={{ code: <code /> }} />
            </p>
            
            <div className="mt-6 p-4 bg-info/10 border border-info/20 rounded-xl">
              <p className="text-info m-0 leading-relaxed">
                <strong className="block mb-1">{t('task_pane:mock_hint_title')}</strong> 
                <span>
                  <Trans i18nKey="task_pane:mock_hint_text" components={{ code: <code /> }} />
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <h3 className="mt-0 mb-4 text-lg font-bold">{t('task_pane:mock_solution_title')}</h3>
            <p>{t('task_pane:mock_solution_description')}</p>
            <pre className="bg-hover p-4 rounded-xl mt-4 border border-glass-border/50 shadow-inner">
              <code className="text-success font-mono text-tiny">
                SELECT * FROM public.customers;
              </code>
            </pre>
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
