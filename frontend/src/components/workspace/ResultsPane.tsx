import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table2, Activity, Maximize2, Minimize2, Loader2, AlertCircle, Play } from 'lucide-react';
import { ExplainModal } from './ExplainModal';
import { useUIStore } from '../../store/uiStore';
import { useQueryStore } from '../../store/queryStore';

import { DataTable } from '../ui/DataTable';

interface ResultsPaneProps {
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export const ResultsPane: React.FC<ResultsPaneProps> = ({
  isMaximized: propIsMaximized,
  onToggleMaximize: propOnToggleMaximize
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'result' | 'explain'>('result');
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);
  const { maximizedPane, setMaximizedPane } = useUIStore();
  const { result, isLoading, error } = useQueryStore();
  
  const isMaximized = propIsMaximized !== undefined ? propIsMaximized : maximizedPane === 'results';

  const handleToggleMaximize = () => {
    if (propOnToggleMaximize) {
      propOnToggleMaximize();
    } else {
      setMaximizedPane(isMaximized ? null : 'results');
    }
  };

  return (
    <div className={`h-full flex flex-col transition-all duration-300 ${isMaximized ? 'absolute inset-0 z-[100] bg-background rounded-2xl' : 'bg-transparent relative'}`}>
      {/* Header Tabs */}
      <div className="h-10 border-b border-glass-border flex items-center justify-between px-2 shrink-0 bg-hover">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setActiveTab('result')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'result' 
                ? 'bg-background text-foreground shadow-sm border border-border/40' 
                : 'text-muted-foreground hover:text-foreground hover:bg-hover border border-transparent'
            }`}
          >
            <Table2 size={14} />
            {t('result')}
            {result && !isLoading && !error && <span className="ml-1 text-[10px] opacity-50 bg-foreground/10 px-1.5 rounded-full">{result.row_count}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('explain')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'explain' 
                ? 'bg-background text-foreground shadow-sm border border-border/40' 
                : 'text-muted-foreground hover:text-foreground hover:bg-hover border border-transparent'
            }`}
          >
            <Activity size={14} />
            {t('explain')}
          </button>
        </div>
        
        <div className="flex items-center gap-1">
          {activeTab === 'explain' && (
            <button 
              onClick={() => setIsExplainModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-warning-text hover:bg-warning/10 px-2 py-1 rounded transition-colors mr-1"
            >
              <Maximize2 size={12} />
              {t('full_analysis')}
            </button>
          )}
          {result?.duration_ms && !isLoading && !error && (
            <span className="text-[10px] text-muted-foreground mr-2 font-mono">
              {result.duration_ms.toFixed(1)} ms
            </span>
          )}
          <div className="w-px h-4 bg-glass-border mx-1" />
          <button 
            onClick={handleToggleMaximize}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-hover rounded-md transition-colors"
            title={isMaximized ? "Свернуть" : "Развернуть"}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative bg-background">
        {activeTab === 'result' ? (
          <>
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-background/50 backdrop-blur-sm z-50">
                <Loader2 size={32} className="animate-spin text-primary mb-4" />
                <p>Выполнение запроса...</p>
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle size={32} className="text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Ошибка выполнения</h3>
                <p className="text-sm text-muted-foreground bg-destructive/5 border border-destructive/20 p-4 rounded-xl max-w-lg font-mono text-left break-all">
                  {error}
                </p>
              </div>
            ) : !result ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <Play size={32} className="mb-2" />
                <p>Напишите SQL запрос и нажмите Run</p>
              </div>
            ) : result.rows.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <Table2 size={32} className="mb-2" />
                <p>Запрос выполнен успешно, но вернул 0 строк.</p>
              </div>
            ) : (
              <div className="h-full w-full p-2">
                <DataTable 
                  columns={result.columns} 
                  rows={result.rows} 
                  executionTimeMs={result.duration_ms} 
                  totalRowCount={result.row_count}
                  isTruncated={result.truncated}
                />
              </div>
            )}
          </>
        ) : (
          <div className="p-4 h-full flex flex-col items-center justify-center text-center">
            <Activity size={32} className="text-warning/50 mb-3" />
            <h4 className="font-semibold text-foreground mb-1">Мини-превью плана выполнения</h4>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Здесь будет отображаться краткая выжимка по Explain. Для детального разбора нажмите "Полный анализ".
            </p>
          </div>
        )}
      </div>

      <ExplainModal 
        isOpen={isExplainModalOpen} 
        onClose={() => setIsExplainModalOpen(false)} 
      />
    </div>
  );
};
