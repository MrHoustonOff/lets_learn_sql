import React from 'react';
import { createPortal } from 'react-dom';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { keymap, EditorView } from '@codemirror/view';
import { Play, Maximize2, Minimize2, Loader2, SendHorizonal, ShieldAlert } from 'lucide-react';
import { useTheme } from '../../components/theme-provider';
import { useUIStore, type SlotId } from '../../store/uiStore';
import { useQueryStore } from '../../store/queryStore';
import { useTaskStore } from '../../store/taskStore';
import { useTranslation } from 'react-i18next';
import { DragHandle } from './DragHandle';
import { AdminConfirmationModal } from './AdminConfirmationModal';

interface SqlEditorPaneProps {
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  slotId?: SlotId;
  databaseOverride?: string;
}

export const SqlEditorPane: React.FC<SqlEditorPaneProps> = ({ 
  isMaximized: propIsMaximized, 
  onToggleMaximize: propOnToggleMaximize,
  slotId,
  databaseOverride
}) => {
  const { t } = useTranslation();
  const { sql: query, setSql: setQuery, executeQuery, isLoading, submitQuery, isSubmitting, isAdminMode, setAdminMode } = useQueryStore();
  const { activeTask, setTaskPaneTab } = useTaskStore();
  const { theme } = useTheme();
  const { 
    maximizedPane, 
    setMaximizedPane,
    editorFontSize,
    editorWordWrap
  } = useUIStore();
  
  const [isAdminModalOpen, setAdminModalOpen] = React.useState(false);

  const isMaximized = propIsMaximized !== undefined ? propIsMaximized : maximizedPane === 'editor';
  
  const handleToggleMaximize = () => {
    if (propOnToggleMaximize) {
      propOnToggleMaximize();
    } else {
      setMaximizedPane(isMaximized ? null : 'editor');
    }
  };

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoading) {
          executeQuery(databaseOverride || activeTask?.dbName || 'northwind');
        }
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [executeQuery, isLoading, activeTask]);

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  const content = (
    <div className={`h-full flex flex-col transition-all duration-300 min-h-0 min-w-0 ${isMaximized ? 'fixed inset-4 z-modal bg-background rounded-2xl shadow-2xl overflow-hidden' : 'bg-transparent overflow-hidden'} ${isAdminMode ? 'border-2 border-destructive shadow-[0_0_15px_rgba(239,68,68,0.3)]' : isMaximized ? 'border border-glass-border' : ''}`}>
      <div className={`h-10 border-b flex items-center justify-between px-3 shrink-0 relative z-layout min-w-0 transition-colors ${isAdminMode ? 'border-destructive bg-destructive/10' : 'border-glass-border bg-hover'}`}>
        <span className={`text-mini font-semibold uppercase tracking-wider truncate mr-2 min-w-0 shrink ${isAdminMode ? 'text-destructive opacity-100' : 'text-foreground opacity-70'}`}>
          {isAdminMode ? 'Admin Mode' : t('sql_editor:title')}
        </span>
        <div className="flex items-center gap-1.5 shrink min-w-0 ml-auto">
          <div className="group relative flex items-center">
            <button 
              onClick={() => isAdminMode ? setAdminMode(false) : setAdminModalOpen(true)}
              className={`flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors min-w-0 ${isAdminMode ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-destructive/10 text-destructive hover:bg-destructive/20'}`}
            >
              <ShieldAlert size={14} className="shrink-0" />
              <span className="truncate">{t('sql_editor:admin_mode_btn', 'Admin Mode')}</span>
            </button>
            <div className="absolute top-full mt-2 right-0 w-64 p-2 bg-popover text-popover-foreground text-xs rounded-lg border border-border shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-tooltip text-center leading-relaxed">
              {isAdminMode 
                ? t('sql_editor:admin_mode_tip_on', 'Нажмите, чтобы отключить режим администратора.')
                : t('sql_editor:admin_mode_tip_off', 'Включить режим коммита. Следующий запрос навсегда сохранит изменения в базе данных.')}
            </div>
          </div>
          <button 
            onClick={() => executeQuery(databaseOverride || activeTask?.dbName || 'northwind')}
            disabled={isLoading || isSubmitting}
            className={`flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-0 ${isAdminMode ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-success/10 text-success hover:bg-success/20'}`}
          >
            {isLoading ? <Loader2 size={12} className="animate-spin shrink-0" /> : <Play size={12} className="fill-current shrink-0" />}
            <span className="truncate">{t('sql_editor:run')}</span>
            <span className="opacity-50 font-normal hidden sm:inline ml-1 shrink-0">({isMac ? 'Cmd' : 'Ctrl'}+Enter)</span>
          </button>

          {/* Submit / Проверить button — only shown when inside a task */}
          {activeTask && !isAdminMode && !databaseOverride && (
            <button
              onClick={() => {
                executeQuery(activeTask.dbName || 'northwind');
                submitQuery(activeTask.id, activeTask.dbName || 'northwind');
                setTaskPaneTab('solution');
              }}
              disabled={isLoading || isSubmitting}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
            >
              {isSubmitting ? <Loader2 size={12} className="animate-spin shrink-0" /> : <SendHorizonal size={12} className="shrink-0" />}
              <span className="truncate">{t('sql_editor:submit')}</span>
            </button>
          )}
          <div className={`w-px h-4 mx-1 shrink-0 ${isAdminMode ? 'bg-destructive/30' : 'bg-glass-border'}`} />
          <button 
            onClick={handleToggleMaximize}
            className={`p-1.5 rounded-md transition-colors outline-none focus:outline-none shrink-0 ${isAdminMode ? 'text-destructive hover:bg-destructive/20' : 'text-muted-foreground hover:text-foreground hover:bg-hover'}`}
            title={isMaximized ? t('sql_editor:collapse') : t('sql_editor:expand')}
          >
            {isMaximized ? <Minimize2 size={14} className="shrink-0" /> : <Maximize2 size={14} className="shrink-0" />}
          </button>
          {slotId && !isMaximized && <DragHandle slotId={slotId} className="ml-1 shrink-0" />}
        </div>
      </div>
      <div className={`flex-1 overflow-hidden relative code-editor-wrapper min-h-0 min-w-0 ${isAdminMode ? '[&_.cm-scroller]:bg-destructive/5' : ''}`}>
        <CodeMirror
          value={query}
          height="100%"
          theme={theme === 'dark' ? 'dark' : 'light'}
          extensions={[
            sql(),
            keymap.of([{
              key: 'Mod-Enter',
              run: () => {
                executeQuery(activeTask?.dbName || 'northwind');
                return true;
              }
            }]),
            ...(editorWordWrap ? [EditorView.lineWrapping] : [])
          ]}
          onChange={(val) => setQuery(val)}
          className="h-full"
          style={{ fontSize: `${editorFontSize}px` }}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
        />
      </div>
      <AdminConfirmationModal 
        isOpen={isAdminModalOpen} 
        onClose={() => setAdminModalOpen(false)} 
        onConfirm={() => setAdminMode(true)} 
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
