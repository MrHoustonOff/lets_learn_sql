import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table2, Activity, Maximize2, Minimize2, Loader2, AlertCircle, Play } from 'lucide-react';
import { ExplainModal } from './ExplainModal';
import { useUIStore } from '../../store/uiStore';
import { useQueryStore } from '../../store/queryStore';

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
  
  // Ресайз колонок
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const tableRef = useRef<HTMLTableElement>(null);
  const resizingCol = useRef<{ index: number, startX: number, startWidth: number } | null>(null);

  // Сброс ширин колонок при новом результате
  useEffect(() => {
    setColWidths({});
  }, [result]);

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    let currentWidths = { ...colWidths };
    if (Object.keys(currentWidths).length === 0 && tableRef.current) {
      const ths = tableRef.current.querySelectorAll('th');
      ths.forEach((t, i) => {
        currentWidths[i] = t.getBoundingClientRect().width;
      });
      setColWidths(currentWidths);
    }

    const startWidth = currentWidths[index] || 100;
    resizingCol.current = { index, startX: e.pageX, startWidth };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    const { index, startX, startWidth } = resizingCol.current;
    const diff = e.pageX - startX;
    const newWidth = Math.max(40, startWidth + diff);
    setColWidths(prev => ({ ...prev, [index]: newWidth }));
  };

  const handleMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const isResized = Object.keys(colWidths).length > 0;
  const totalTableWidth = isResized ? Object.values(colWidths).reduce((a, b) => a + b, 0) : undefined;

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
              <table 
                ref={tableRef}
                className={`text-left text-sm whitespace-nowrap ${isResized ? 'table-fixed' : 'w-full'}`}
                style={isResized ? { width: `${totalTableWidth}px` } : {}}
              >
                <thead className="text-xs uppercase bg-hover text-muted-foreground sticky top-0 z-10 backdrop-blur-md shadow-sm">
                  <tr className="divide-x divide-glass-border/50">
                    {result.columns.map((col, i) => (
                      <th 
                        key={i} 
                        className="px-4 py-2.5 border-b border-glass-border font-semibold relative group select-none"
                        style={isResized ? { width: `${colWidths[i]}px` } : undefined}
                      >
                        <div className="truncate">{col}</div>
                        <div 
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 transition-colors z-20"
                          onMouseDown={(e) => handleMouseDown(e, i)}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {result.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors divide-x divide-glass-border/50">
                      {row.map((cell, cellIndex) => (
                        <td 
                          key={cellIndex} 
                          className="px-4 py-2 truncate"
                          style={isResized ? { width: `${colWidths[cellIndex]}px` } : { maxWidth: '300px' }}
                        >
                          {cell === null ? (
                            <span className="text-muted-foreground italic opacity-50">NULL</span>
                          ) : typeof cell === 'boolean' ? (
                            <span className={cell ? "text-success" : "text-destructive"}>{cell.toString()}</span>
                          ) : typeof cell === 'number' ? (
                            <span className="text-blue-500 dark:text-blue-400 font-mono">{cell}</span>
                          ) : (
                            <span>{String(cell)}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
