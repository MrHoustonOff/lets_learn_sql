import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { TableSchema } from '../types';
import { X, Database, Key, Link, AlertCircle, Hash, TableProperties, Fingerprint, Zap, Play } from 'lucide-react';

interface TableDetailsModalProps {
  table: TableSchema;
  onClose: () => void;
}

export const TableDetailsModal: React.FC<TableDetailsModalProps> = ({ table, onClose }) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'data'>('schema');
  const [limitStr, setLimitStr] = useState<string>('5');
  const [data, setData] = useState<{ columns: string[], rows: any[][] } | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Состояние для ресайза колонок
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const tableRef = useRef<HTMLTableElement>(null);
  const resizingCol = useRef<{ index: number, startX: number, startWidth: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Получаем текущие ширины, если их еще нет в стейте
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
    const newWidth = Math.max(40, startWidth + diff); // Минимальная ширина 40px

    setColWidths(prev => ({ ...prev, [index]: newWidth }));
  };

  const handleMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    // Очистка событий при анмаунте
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const isResized = Object.keys(colWidths).length > 0;
  const totalTableWidth = isResized ? Object.values(colWidths).reduce((a, b) => a + b, 0) : undefined;

  const fetchSampleData = async (overrideLimit?: string) => {
    setLoadingData(true);
    setDataError(null);

    const limitToUse = overrideLimit !== undefined ? overrideLimit : limitStr;
    const limitNum = parseInt(limitToUse);
    if (isNaN(limitNum) || limitNum < 0 || limitNum > 100) {
      setLoadingData(false);
      setDataError('Доступны только цифры от 0 до 100 для LIMIT');
      return;
    }

    if (overrideLimit !== undefined) {
      setLimitStr(overrideLimit);
    }

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: `SELECT * FROM "${table.schema}"."${table.name}" LIMIT ${limitNum}`,
          database: 'northwind' // TODO: Get active DB from context
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to fetch data');
      }
      const result = await response.json();
      setData({ columns: result.columns, rows: result.rows });
    } catch (e: any) {
      setDataError(e.message);
    } finally {
      setLoadingData(false);
    }
  };

  // Автоматическая загрузка данных при переключении на вкладку
  useEffect(() => {
    if (activeTab === 'data' && !data && !loadingData && !dataError) {
      fetchSampleData();
    }
  }, [activeTab, data, loadingData, dataError]);

  const modalWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Фокусируемся на модалке при открытии, чтобы перехватывать нажатия клавиш
    modalWrapperRef.current?.focus();
  }, []);

  const modalContent = (
    <div 
      ref={modalWrapperRef}
      tabIndex={-1}
      style={{ outline: 'none' }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200 select-text"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl min-h-[75vh] max-h-[90vh] flex flex-col bg-glass backdrop-blur-2xl border border-glass-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border bg-hover">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg">
              <Database size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{table.name}</h2>
                <span className="text-[10px] uppercase tracking-wider bg-badge text-badge-foreground px-2 py-0.5 rounded-full">
                  {table.schema}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {table.columns?.length || 0} columns, {table.indexes?.length || 0} indexes
              </p>
            </div>
          </div>
          <button 
            onClick={() => onClose()}
            className="p-2 rounded-xl hover:bg-hover text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-glass-border bg-hover">
          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'schema' 
                ? 'text-primary border-primary' 
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            <TableProperties size={16} />
            Структура
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'data' 
                ? 'text-primary border-primary' 
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            <Database size={16} />
            Пример данных
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative min-h-0">
          <div 
            className={`absolute inset-y-0 left-0 flex w-[200%] transition-transform duration-300 ease-in-out ${
              activeTab === 'schema' ? 'translate-x-0' : '-translate-x-1/2'
            }`}
          >
            {/* Schema Pane */}
            <div className="w-1/2 h-full overflow-y-auto p-6">
              <div className="space-y-8">
                
                {/* Columns Table */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <TableProperties size={16} className="text-primary" /> Столбцы
                  </h3>
                  <div className="border border-glass-border rounded-xl overflow-hidden bg-hover max-h-[45vh] flex flex-col">
                    <div className="overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left text-sm relative">
                        <thead className="bg-hover text-muted-foreground text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md shadow-sm">
                          <tr className="divide-x divide-glass-border/50">
                            <th className="px-4 py-3 font-medium">Ключи</th>
                            <th className="px-4 py-3 font-medium">Имя</th>
                            <th className="px-4 py-3 font-medium">Тип</th>
                            <th className="px-4 py-3 font-medium">Null</th>
                            <th className="px-4 py-3 font-medium">По умолчанию</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-glass-border">
                        {table.columns?.map(col => (
                          <tr key={col.name} className="hover:bg-hover transition-colors divide-x divide-glass-border/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {col.isPrimaryKey && <span title="Primary Key"><Key size={14} className="text-warning" /></span>}
                                {col.isForeignKey && <span title="Foreign Key"><Link size={14} className="text-info" /></span>}
                                {!col.isPrimaryKey && !col.isForeignKey && col.isUnique && <span title="Unique"><AlertCircle size={14} className="text-accent-alt" /></span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground">{col.name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{col.type}</td>
                            <td className="px-4 py-3">
                              {col.nullable 
                                ? <span className="text-muted-foreground">Да</span>
                                : <span className="font-semibold text-foreground">Нет</span>}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-success">
                              {col.default || <span className="text-muted-foreground opacity-50">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </section>

                {/* Indexes & Keys Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Indexes */}
                  {(table.indexes?.length || 0) > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Hash size={16} className="text-warning" /> Индексы
                      </h3>
                      <div className="space-y-2">
                        {table.indexes?.map(idx => (
                          <div key={idx.name} className="p-3 bg-hover border border-glass-border rounded-xl">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-sm">{idx.name}</span>
                              <div className="flex gap-1">
                                {idx.isPrimary && <span className="text-[10px] uppercase bg-warning/20 text-warning-text px-1.5 py-0.5 rounded">Primary</span>}
                                {idx.isUnique && <span className="text-[10px] uppercase bg-accent-alt/20 text-accent-alt-text px-1.5 py-0.5 rounded">Unique</span>}
                              </div>
                            </div>
                            <code className="text-xs text-muted-foreground font-mono block break-all">{idx.definition}</code>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Foreign Keys */}
                  {(table.foreignKeys?.length || 0) > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Link size={16} className="text-info" /> Внешние ключи
                      </h3>
                      <div className="space-y-2">
                        {table.foreignKeys?.map(fk => (
                          <div key={fk.name} className="p-3 bg-hover border border-glass-border rounded-xl">
                            <div className="font-semibold text-sm mb-1 break-all">{fk.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-x-2 gap-y-1">
                              <span className="font-mono text-foreground">{fk.column}</span>
                              <span>→</span>
                              <span className="font-mono text-foreground">{fk.targetTable}.{fk.targetColumn}</span>
                            </div>
                            <div className="mt-2 flex gap-2 text-[10px] uppercase font-medium">
                              <span className="bg-hover px-1.5 py-0.5 rounded text-muted-foreground">ON DEL: {fk.onDelete}</span>
                              <span className="bg-hover px-1.5 py-0.5 rounded text-muted-foreground">ON UPD: {fk.onUpdate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Referenced By */}
                  {(table.referencedBy?.length || 0) > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Fingerprint size={16} className="text-success" /> Ссылаются на эту таблицу
                      </h3>
                      <div className="space-y-2">
                        {table.referencedBy?.map(ref => (
                          <div key={ref.constraint} className="p-3 bg-hover border border-glass-border rounded-xl">
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span className="font-mono text-foreground">{ref.table}.{ref.column}</span>
                              <span>→</span>
                              <span>сюда</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

              </div>
            </div>

            {/* Data Pane */}
            <div className="w-1/2 h-full overflow-y-auto p-6">
              {loadingData ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground min-h-[300px]">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                  <p>Загрузка данных...</p>
                </div>
              ) : dataError ? (
                <div className="h-full flex flex-col items-center justify-center text-destructive min-h-[300px] gap-4">
                  <AlertCircle size={48} className="opacity-50" />
                  <p className="text-center font-medium">{dataError}</p>
                  <button 
                    onClick={() => fetchSampleData('5')}
                    className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors"
                  >
                    Попробовать снова
                  </button>
                </div>
              ) : data ? (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4 shrink-0 bg-hover p-2 rounded-xl border border-glass-border">
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <div className="flex items-center gap-2 px-2 shrink-0">
                        <Database size={16} className="text-primary" /> 
                        <span className="text-sm font-semibold text-foreground uppercase tracking-wider hidden sm:inline-block">Данные</span>
                      </div>
                      
                      <div className="h-6 w-px bg-glass-border shrink-0"></div>
                      
                      {/* Слева-выровненный SQL с выделенным полем LIMIT */}
                      <div className="flex-1 flex justify-start font-mono text-[11px] sm:text-xs overflow-hidden bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg ml-2 border border-glass-border">
                        <div className="inline-flex items-center gap-2 w-full justify-start whitespace-nowrap overflow-x-auto">
                          <span className="text-blue-500 dark:text-blue-400">SELECT</span> 
                          <span>*</span> 
                          <span className="text-blue-500 dark:text-blue-400">FROM</span> 
                          <span className="text-orange-500 dark:text-orange-400">"{table.schema}"</span>.<span className="text-orange-500 dark:text-orange-400">"{table.name}"</span> 
                          <span className="text-blue-500 dark:text-blue-400">LIMIT</span> 
                          <input
                            type="text"
                            value={limitStr}
                            onChange={(e) => setLimitStr(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') fetchSampleData();
                            }}
                            title="Введите LIMIT от 0 до 100"
                            className="w-12 bg-background/50 text-green-600 dark:text-green-400 font-bold outline-none border border-glass-border shadow-inner hover:border-green-500/50 focus:border-green-500 focus:bg-background text-center rounded-md transition-all py-0.5"
                          />
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => fetchSampleData()}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all rounded-lg text-xs font-medium ml-3"
                    >
                      <Play size={14} fill="currentColor" /> Выполнить
                    </button>
                  </div>
                  
                  {data.rows.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50 border border-dashed border-glass-border rounded-xl mt-4">
                      <Database size={32} className="mb-2" />
                      <p>Таблица пуста</p>
                    </div>
                  ) : (
                    <div className="flex-1 border border-glass-border rounded-xl bg-hover overflow-auto relative">
                      <table 
                        ref={tableRef}
                        className={`text-left text-sm whitespace-nowrap ${isResized ? 'table-fixed' : 'w-full'}`} 
                        style={isResized ? { width: `${totalTableWidth}px` } : {}}
                      >
                        <thead className="bg-hover text-muted-foreground text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md shadow-sm">
                          <tr className="divide-x divide-glass-border/50">
                            {data.columns.map((col, i) => (
                              <th 
                                key={i} 
                                className="px-4 py-3 font-medium border-b border-glass-border relative group select-none"
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
                          {data.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors divide-x divide-glass-border/50">
                              {row.map((cell, cellIndex) => (
                                <td 
                                  key={cellIndex} 
                                  className="px-4 py-2.5 truncate"
                                  style={isResized ? { width: `${colWidths[cellIndex]}px` } : { maxWidth: '300px' }}
                                >
                                  {cell === null ? (
                                    <span className="text-muted-foreground italic opacity-50">NULL</span>
                                  ) : typeof cell === 'boolean' ? (
                                    <span className={cell ? 'text-success' : 'text-destructive'}>{cell ? 'true' : 'false'}</span>
                                  ) : (
                                    <span className="text-foreground">{String(cell)}</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground min-h-[300px]">
                  <Database size={48} className="opacity-20 mb-4" />
                  <p className="text-lg font-medium text-foreground mb-1">Пример данных</p>
                  <button onClick={() => fetchSampleData()} className="mt-6 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">
                    Запросить данные
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
