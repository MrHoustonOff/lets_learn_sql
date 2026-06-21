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
  const [zoom, setZoom] = useState(1);

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
                  <>
                  <div className="flex items-center justify-between shrink-0 mb-2 px-1">
                    <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-primary" />
                        <span>
                          {t('wizard.solution.rows_shown', { count: result.rows.length })}
                          {result.rowCount > result.rows.length && (
                            <span className="text-warning-text ml-1 opacity-100 font-semibold">
                              {t('wizard.solution.limit_exceeded', { shown: result.rows.length, total: result.rowCount })}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span>{t('wizard.solution.execution_time', { ms: result.executionTimeMs })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-hover border border-glass-border rounded-lg px-2 py-1 shadow-sm">
                      <button onClick={() => setZoom(z => Math.max(0.25, z - 0.05))} className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded-md hover:bg-hover" title="Уменьшить">
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <input 
                        min="0.25" max="1.5" step="0.05" 
                        className="w-20 sm:w-24 accent-primary cursor-pointer h-1.5 bg-glass-border rounded-full appearance-none outline-none" 
                        title="Масштаб" type="range" 
                        value={zoom} 
                        onChange={(e) => setZoom(parseFloat(e.target.value))} 
                      />
                      <button onClick={() => setZoom(z => Math.min(1.5, z + 0.05))} className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded-md hover:bg-hover" title="Увеличить">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-center ml-1 pl-1 border-l border-glass-border">
                        <button 
                          onClick={() => setZoom(1)} 
                          disabled={zoom === 1} 
                          className={`p-1 transition-colors rounded-md ${zoom === 1 ? 'opacity-30 cursor-default text-muted-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-hover'}`} 
                          title="Сбросить масштаб (100%)"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                        <span className="text-2xs w-8 text-right font-mono text-muted-foreground">{Math.round(zoom * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 border border-glass-border rounded-xl bg-hover overflow-auto relative custom-scrollbar shadow-inner" style={{ fontSize: `${14 * zoom}px` }}>
                    <table className="text-left whitespace-nowrap w-full">
                      <thead className="bg-black/10 dark:bg-white/10 border-b-2 border-primary/20 text-foreground font-semibold uppercase tracking-wider sticky top-0 z-layout shadow-sm">
                      <tr className="divide-x divide-glass-border">
                        {result.columns.map((col: string, idx: number) => (
                          <th key={idx} className="font-medium relative group select-none transition-colors" style={{ padding: '0.6em 0.8em' }}>
                            <div className="flex items-center justify-between w-full">
                              <div className="truncate flex items-center gap-1.5" style={{ fontSize: '0.85em' }}>
                                <span className="opacity-70 font-mono text-primary/70">{idx + 1}</span>
                                <span className="text-foreground">{col}</span>
                              </div>
                              <div className="relative">
                                <button className="p-1 rounded transition-colors ml-2 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10" title="Фильтр по колонке">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-funnel" aria-hidden="true">
                                    <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary transition-colors z-resize"></div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-glass-border">
                      {result.rows.map((row: any[], rIdx: number) => (
                        <tr key={rIdx} className="even:bg-black/[0.02] dark:even:bg-white/[0.02] hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors divide-x divide-glass-border group">
                          {row.map((cell: any, cIdx: number) => (
                            <td key={cIdx} className="truncate group-hover:border-primary/20 transition-colors" style={{ padding: '0.5em 0.8em', maxWidth: '350px' }}>
                              <div className={typeof cell === 'number' ? "text-right font-mono text-blue-600 dark:text-blue-400 font-medium" : "truncate"} title={String(cell)}>
                                {cell}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                </>
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
