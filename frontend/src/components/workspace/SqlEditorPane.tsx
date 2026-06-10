import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { Play, Zap, Maximize2, Minimize2 } from 'lucide-react';
import { useTheme } from '../../components/theme-provider';
import { useUIStore } from '../../store/uiStore';

export const SqlEditorPane: React.FC = () => {
  const [query, setQuery] = useState('SELECT * FROM customers\nWHERE country = \'UK\';');
  const { theme } = useTheme();
  const { maximizedPane, setMaximizedPane } = useUIStore();
  const isMaximized = maximizedPane === 'editor';

  return (
    <div className={`h-full flex flex-col transition-all duration-300 ${isMaximized ? 'absolute inset-0 z-[100] bg-background rounded-2xl' : 'bg-transparent'}`}>
      <div className="h-10 border-b border-glass-border flex items-center justify-between px-3 shrink-0 bg-hover">
        <span className="text-sm font-semibold text-foreground uppercase tracking-wider text-[11px] opacity-70">Редактор SQL</span>
        <div className="flex gap-2">
          <button 
            className="flex items-center gap-1.5 text-xs font-semibold bg-success/10 text-success hover:bg-success/20 px-3 py-1.5 rounded-md transition-colors"
          >
            <Play size={12} className="fill-current" />
            Run
          </button>
          <button 
            className="flex items-center gap-1.5 text-xs font-semibold bg-warning/10 text-warning-text hover:bg-warning/20 px-3 py-1.5 rounded-md transition-colors"
          >
            <Zap size={12} className="fill-current" />
            Explain
          </button>
          <div className="w-px h-4 bg-glass-border mx-1" />
          <button 
            onClick={() => setMaximizedPane(isMaximized ? null : 'editor')}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-hover rounded-md transition-colors"
            title={isMaximized ? "Свернуть" : "Развернуть"}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative code-editor-wrapper">
        <CodeMirror
          value={query}
          height="100%"
          theme={theme === 'dark' ? 'dark' : 'light'}
          extensions={[sql()]}
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
