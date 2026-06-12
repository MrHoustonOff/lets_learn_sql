import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table2, Activity, Maximize2, Minimize2, Loader2, AlertCircle, Play } from 'lucide-react';
import { MiniExplainPanel } from './explain/MiniExplainPanel';
import { useUIStore, type SlotId } from '../../store/uiStore';
import { useQueryStore } from '../../store/queryStore';
import { DragHandle } from './DragHandle';

import { DataTable } from '../ui/DataTable';

interface ResultsPaneProps {
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  slotId?: SlotId;
}

export const ResultsPane: React.FC<ResultsPaneProps> = ({
  isMaximized: propIsMaximized,
  onToggleMaximize: propOnToggleMaximize,
  slotId
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'result' | 'explain'>('result');
  const { maximizedPane, setMaximizedPane } = useUIStore();
  const { result, isLoading, error, maxRowsToDisplay } = useQueryStore();
  
  const isMaximized = propIsMaximized !== undefined ? propIsMaximized : maximizedPane === 'results';

  const handleToggleMaximize = () => {
    if (propOnToggleMaximize) {
      propOnToggleMaximize();
    } else {
      setMaximizedPane(isMaximized ? null : 'results');
    }
  };

  return (
    <div className={`h-full flex flex-col transition-all duration-300 min-h-0 min-w-0 ${isMaximized ? 'absolute inset-0 z-[100] bg-background rounded-2xl' : 'bg-transparent relative'}`}>
      {/* Header Tabs */}
      <div className="h-10 border-b border-glass-border flex items-center justify-between px-2 shrink-0 bg-hover relative z-50 min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <button 
            onClick={() => setActiveTab('result')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all min-w-0 ${
              activeTab === 'result' 
                ? 'bg-background text-foreground shadow-sm border border-border/40' 
                : 'text-muted-foreground hover:text-foreground hover:bg-hover border border-transparent'
            }`}
          >
            <Table2 size={14} className="shrink-0" />
            <span className="truncate">{t('result')}</span>
            {result && !isLoading && !error && <span className="ml-1 text-[10px] opacity-50 bg-foreground/10 px-1.5 rounded-full shrink-0">{result.row_count}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('explain')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all min-w-0 ${
              activeTab === 'explain' 
                ? 'bg-warning/10 text-warning-text shadow-sm border border-warning/20' 
                : 'text-muted-foreground hover:text-warning-text hover:bg-hover border border-transparent'
            }`}
          >
            <Activity size={14} className={`shrink-0 ${activeTab === 'explain' ? "fill-current" : ""}`} />
            <span className="truncate">{t('explain')}</span>
          </button>
        </div>
        
        <div className="flex items-center gap-1 shrink min-w-0 ml-1">
          {/* Removed full_analysis button */}
          {result?.duration_ms && !isLoading && !error && (
            <span className="text-[10px] text-muted-foreground mr-2 font-mono">
              {result.duration_ms.toFixed(1)} ms
            </span>
          )}
          <div className="w-px h-4 bg-glass-border mx-1 shrink-0" />
          <button 
            onClick={handleToggleMaximize}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-hover rounded-md transition-colors outline-none focus:outline-none shrink-0"
            title={isMaximized ? t('sql_results:minimize') : t('sql_results:maximize')}
          >
            {isMaximized ? <Minimize2 size={14} className="shrink-0" /> : <Maximize2 size={14} className="shrink-0" />}
          </button>
          {slotId && !isMaximized && <DragHandle slotId={slotId} className="ml-1 shrink-0" />}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative bg-background min-h-0 min-w-0">
        {activeTab === 'result' ? (
          <>
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-background/50 backdrop-blur-sm z-50">
                <Loader2 size={32} className="animate-spin text-primary mb-4" />
                <p>{t('sql_results:running')}</p>
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle size={32} className="text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('sql_results:error')}</h3>
                <p className="text-sm text-muted-foreground bg-destructive/5 border border-destructive/20 p-4 rounded-xl max-w-lg font-mono text-left break-all">
                  {error}
                </p>
              </div>
            ) : !result ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <Play size={32} className="mb-2" />
                <p>{t('sql_results:empty')}</p>
              </div>
            ) : result.rows.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <Table2 size={32} className="mb-2" />
                <p>{t('sql_results:success_empty', 'Query executed successfully, but returned 0 rows.')}</p>
              </div>
            ) : (
              <div className="h-full w-full p-2">
                <DataTable 
                  columns={result.columns} 
                  rows={result.rows.slice(0, maxRowsToDisplay)} 
                  executionTimeMs={result.duration_ms} 
                  totalRowCount={result.row_count}
                  isTruncated={result.truncated || result.rows.length > maxRowsToDisplay}
                />
              </div>
            )}
          </>
        ) : (
          <MiniExplainPanel />
        )}
      </div>
    </div>
  );
};
