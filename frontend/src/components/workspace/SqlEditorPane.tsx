import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { keymap } from '@codemirror/view';
import { Play, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import { useTheme } from '../../components/theme-provider';
import { useUIStore, type SlotId } from '../../store/uiStore';
import { useQueryStore } from '../../store/queryStore';
import { useTranslation } from 'react-i18next';
import { DragHandle } from './DragHandle';

interface SqlEditorPaneProps {
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  slotId?: SlotId;
}

export const SqlEditorPane: React.FC<SqlEditorPaneProps> = ({ 
  isMaximized: propIsMaximized, 
  onToggleMaximize: propOnToggleMaximize,
  slotId
}) => {
  const { t } = useTranslation();
  const { sql: query, setSql: setQuery, executeQuery, isLoading } = useQueryStore();
  const { theme } = useTheme();
  const { maximizedPane, setMaximizedPane } = useUIStore();
  
  const isMaximized = propIsMaximized !== undefined ? propIsMaximized : maximizedPane === 'editor';
  
  const handleToggleMaximize = () => {
    if (propOnToggleMaximize) {
      propOnToggleMaximize();
    } else {
      setMaximizedPane(isMaximized ? null : 'editor');
    }
  };

  return (
    <div className={`h-full flex flex-col transition-all duration-300 ${isMaximized ? 'absolute inset-0 z-[100] bg-background rounded-2xl' : 'bg-transparent'}`}>
      <div className="h-10 border-b border-glass-border flex items-center justify-between px-3 shrink-0 bg-hover relative z-50">
        <span className="text-sm font-semibold text-foreground uppercase tracking-wider text-[11px] opacity-70">{t('sql_editor:title')}</span>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => executeQuery()}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs font-semibold bg-success/10 text-success hover:bg-success/20 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} className="fill-current" />}
            {t('sql_editor:run')} <span className="opacity-50 font-normal hidden sm:inline ml-1">(Ctrl+Enter)</span>
          </button>
          <div className="w-px h-4 bg-glass-border mx-1" />
          <button 
            onClick={handleToggleMaximize}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-hover rounded-md transition-colors outline-none focus:outline-none"
            title={isMaximized ? t('sql_editor:collapse') : t('sql_editor:expand')}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          {slotId && !isMaximized && <DragHandle slotId={slotId} className="ml-1" />}
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative code-editor-wrapper">
        <CodeMirror
          value={query}
          height="100%"
          theme={theme === 'dark' ? 'dark' : 'light'}
          extensions={[
            sql(),
            keymap.of([{
              key: 'Mod-Enter',
              run: () => {
                executeQuery();
                return true;
              }
            }])
          ]}
          onChange={(val) => setQuery(val)}
          className="h-full text-[14px]"
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
    </div>
  );
};
