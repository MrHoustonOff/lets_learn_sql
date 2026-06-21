import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Loader2, Database, LayoutTemplate, DatabaseZap, ZoomIn, ZoomOut, RotateCcw, Clock } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';
import { useTheme } from '../../../components/theme-provider';
import { DBViewerModal } from '../../../components/workspace/DBViewerModal';
import { Panel, Group as PanelGroup } from 'react-resizable-panels';
import { ResizeHandle } from '../../../components/workspace/ResizeHandle';
import { DataTable } from '../../../components/ui/DataTable';

interface WizardStepSolutionData {
  referenceSql: string;
  orderMatters: boolean;
  isQueryValid?: boolean;
}

interface WizardStepSolutionProps {
  data: WizardStepSolutionData;
  setData: React.Dispatch<React.SetStateAction<WizardStepSolutionData>>;
}

export const WizardStepSolution: React.FC<WizardStepSolutionProps> = ({ data, setData }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isDbViewerOpen, setIsDbViewerOpen] = useState(false);

  const { id } = useParams(); // Need to import from react-router-dom

  const handleExecute = async () => {
    if (!data.referenceSql.trim() || !id || id === 'new') return;
    setIsExecuting(true);
    setResult(null);
    setData(p => ({ ...p, isQueryValid: false }));

    try {
      // 1. Force save the current SQL
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_sql: data.referenceSql, order_matters: data.orderMatters })
      });

      // 2. Execute
      const res = await fetch(`/api/tasks/${id}/execute-reference`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Execution failed');
      }
      
      const executionResult = await res.json();
      setResult({
        columns: executionResult.columns,
        rows: executionResult.rows,
        rowCount: executionResult.row_count,
        executionTimeMs: executionResult.duration_ms,
        error: null
      });
      setData(p => ({ ...p, isQueryValid: true }));
    } catch (err: any) {
      setResult({
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: err.message
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Auto-execute query on mount if it's not a new task and has sql
  React.useEffect(() => {
    if (id && id !== 'new' && data.referenceSql?.trim()) {
      handleExecute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="max-w-6xl mx-auto w-full h-[calc(100vh-12rem)] min-h-[500px]">
        <PanelGroup direction="horizontal" className="flex flex-col lg:flex-row gap-2">
        {/* LEFT: SQL Editor */}
        <Panel defaultSize={50} minSize={30} className="flex-1 flex flex-col bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
          <div className="h-12 border-b border-border/60 bg-muted/30 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">{t('wizard.solution.correct_answer')}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDbViewerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 text-foreground hover:bg-secondary text-xs font-bold transition-all border border-border/60 shadow-sm"
                title={t('wizard.solution.schema_tooltip')}
              >
                <DatabaseZap className="w-3.5 h-3.5 text-primary" />
                {t('wizard.solution.schema')}
              </button>
              <button
                onClick={handleExecute}
                disabled={isExecuting || !data.referenceSql.trim()}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_2px_10px_rgba(var(--primary),0.3)]"
              >
                {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                {t('wizard.solution.execute')}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar bg-background">
            <CodeMirror
              value={data.referenceSql}
              height="100%"
              extensions={[sql(), EditorView.lineWrapping]}
              theme={theme === 'dark' ? 'dark' : 'light'}
              onChange={(value) => setData(p => ({ ...p, referenceSql: value, isQueryValid: false }))}
              className="text-sm h-full"
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightSpecialChars: true,
                foldGutter: false,
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
                foldKeymap: false,
                completionKeymap: true,
                lintKeymap: true,
              }}
            />
          </div>
        </Panel>

        <ResizeHandle direction="vertical" />

        {/* RIGHT: Results Pane Mock */}
        <Panel defaultSize={50} minSize={30} className="flex-1 flex flex-col bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
          <div className="h-12 border-b border-border/60 bg-muted/30 px-4 flex items-center gap-2 shrink-0">
            <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold text-muted-foreground">{t('wizard.solution.execution_result')}</span>
          </div>
          
          <div className="flex-1 overflow-hidden p-2 bg-background relative flex flex-col">
            {!result && !isExecuting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/50 p-6 text-center z-10">
                <Database className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm whitespace-pre-wrap">{t('wizard.solution.empty_placeholder')}</p>
              </div>
            )}

            {isExecuting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-primary p-6 z-10 bg-background/50 backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm font-medium animate-pulse">{t('wizard.solution.executing')}</p>
              </div>
            )}

            {result && (
              <div className="flex flex-col h-full overflow-hidden">
                {result.error ? (
                  <div className="flex-1 p-4 bg-destructive/10 text-destructive text-sm font-mono overflow-auto rounded-xl">
                    <div className="font-bold mb-2">{t('wizard.solution.execution_error')}</div>
                    <div className="whitespace-pre-wrap">{result.error}</div>
                  </div>
                ) : (
                  <DataTable 
                    columns={result.columns}
                    rows={result.rows}
                    executionTimeMs={result.executionTimeMs}
                    totalRowCount={result.rowCount}
                    isTruncated={result.rowCount > result.rows.length}
                    className="flex-1"
                  />
                )}
              </div>
            )}
          </div>
        </Panel>
        </PanelGroup>
      </div>

      <DBViewerModal isOpen={isDbViewerOpen} onClose={() => setIsDbViewerOpen(false)} />
    </>
  );
};

