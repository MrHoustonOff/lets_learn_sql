import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';
import { useTheme } from '../theme-provider';

export const SqlCodeViewer: React.FC<{ sqlCode: string; height?: string }> = ({ sqlCode, height = '100%' }) => {
  const { theme } = useTheme();

  return (
    <div className="relative h-full flex flex-col overflow-hidden bg-transparent">
      <div className="flex-1 overflow-auto custom-scrollbar">
         <CodeMirror
          value={sqlCode}
          height={height}
          theme={theme === 'dark' ? 'dark' : 'light'}
          extensions={[sql(), EditorView.lineWrapping]}
          readOnly={true}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: false,
          }}
          className="text-sm font-mono h-full"
        />
      </div>
    </div>
  );
};
