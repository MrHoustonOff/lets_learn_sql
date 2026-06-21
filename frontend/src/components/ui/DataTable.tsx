import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, Database, Clock, Filter, Search, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DataTableProps {
  columns: string[];
  rows: any[][];
  className?: string;
  executionTimeMs?: number;
  totalRowCount?: number;
  isTruncated?: boolean;
}

const ColumnFilterPopover = ({ 
  colIndex, 
  colName, 
  allRows, 
  activeFilterSet, 
  onFilterChange, 
  onClose,
  isLastCol
}: {
  colIndex: number;
  colName: string;
  allRows: any[][];
  activeFilterSet?: Set<string>;
  onFilterChange: (colIndex: number, newSet?: Set<string>) => void;
  onClose: () => void;
  isLastCol: boolean;
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  
  const uniqueValues = useMemo(() => {
    const vals = new Set<string>();
    allRows.forEach(r => vals.add(String(r[colIndex])));
    return Array.from(vals).sort();
  }, [allRows, colIndex]);

  const displayValues = useMemo(() => {
    if (!search) return uniqueValues;
    const lowerSearch = search.toLowerCase();
    return uniqueValues.filter(v => v.toLowerCase().includes(lowerSearch));
  }, [uniqueValues, search]);

  const MAX_RENDER = 200;
  const renderedValues = displayValues.slice(0, MAX_RENDER);
  const isTruncated = displayValues.length > MAX_RENDER;

  const currentSet = activeFilterSet || new Set<string>(uniqueValues);
  // If there's a search, "All Selected" means all *search results* are selected.
  // Otherwise, it means all unique values are selected.
  const isAllSelected = search 
    ? displayValues.length > 0 && displayValues.every(v => currentSet.has(v))
    : currentSet.size === uniqueValues.length;

  const toggleAll = () => {
    if (search) {
      // Toggle only the searched values
      const nextSet = new Set(currentSet);
      if (isAllSelected) {
        displayValues.forEach(v => nextSet.delete(v));
      } else {
        displayValues.forEach(v => nextSet.add(v));
      }
      onFilterChange(colIndex, nextSet.size === uniqueValues.length ? undefined : nextSet);
    } else {
      // Toggle all values
      if (isAllSelected) {
        onFilterChange(colIndex, new Set<string>());
      } else {
        onFilterChange(colIndex, undefined);
      }
    }
  };

  const toggleValue = (val: string) => {
    const nextSet = new Set(currentSet);
    if (nextSet.has(val)) {
      nextSet.delete(val);
    } else {
      nextSet.add(val);
    }
    
    if (nextSet.size === uniqueValues.length) {
      onFilterChange(colIndex, undefined);
    } else {
      onFilterChange(colIndex, nextSet);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <div 
        className="absolute top-full mt-1 z-dropdown bg-popover border border-glass-border shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-xl p-2 min-w-[220px] max-w-[300px] flex flex-col gap-2 font-sans text-foreground normal-case"
        style={{
          right: isLastCol ? 0 : 'auto',
          left: isLastCol ? 'auto' : 0,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative">
          <Search size={14} className="absolute left-2 top-2 text-muted-foreground" />
          <input 
            type="text"
            autoFocus
            placeholder={t('data_table:search_in', { col: colName })}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background border border-glass-border rounded-md pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary transition-colors text-foreground font-normal"
          />
        </div>
        
        <div className="flex flex-col max-h-48 overflow-y-auto custom-scrollbar pr-1 gap-1">
          {!search && (
            <label className="flex items-center gap-2 px-1 py-1 hover:bg-hover rounded cursor-pointer transition-colors text-xs font-semibold border-b border-glass-border pb-1.5 mb-1">
              <input 
                type="checkbox" 
                checked={isAllSelected}
                onChange={toggleAll}
                className="rounded border-glass-border text-primary focus:ring-primary accent-primary w-3.5 h-3.5 cursor-pointer"
              />
              {t('data_table:select_all')}
            </label>
          )}
          {search && displayValues.length > 0 && (
            <label className="flex items-center gap-2 px-1 py-1 hover:bg-hover rounded cursor-pointer transition-colors text-xs font-semibold border-b border-glass-border pb-1.5 mb-1 text-primary">
              <input 
                type="checkbox" 
                checked={isAllSelected}
                onChange={toggleAll}
                className="rounded border-glass-border text-primary focus:ring-primary accent-primary w-3.5 h-3.5 cursor-pointer"
              />
              {t('data_table:select_results', { count: displayValues.length })}
            </label>
          )}
          
          {renderedValues.map(val => (
            <label key={val} className="flex items-center gap-2 px-1 py-1 hover:bg-hover rounded cursor-pointer transition-colors text-xs">
              <input 
                type="checkbox" 
                checked={currentSet.has(val)}
                onChange={() => toggleValue(val)}
                className="rounded border-glass-border text-primary focus:ring-primary accent-primary w-3.5 h-3.5 cursor-pointer shrink-0"
              />
              <span className="truncate max-w-[200px]" title={val}>
                {val === 'null' ? <span className="italic text-muted-foreground opacity-70">NULL</span> : val}
              </span>
            </label>
          ))}
          {isTruncated && (
            <div className="text-center text-2xs text-muted-foreground py-1.5 mt-1 border-t border-glass-border bg-muted/30 rounded">
              {t('data_table:shown_limit', { max: MAX_RENDER, total: displayValues.length })}
            </div>
          )}
          {displayValues.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-2 opacity-50">{t('data_table:no_results')}</div>
          )}
        </div>
      </div>
    </>
  );
};

export const DataTable: React.FC<DataTableProps> = ({ columns, rows, className = '', executionTimeMs, totalRowCount, isTruncated }) => {
  const { t } = useTranslation();
  // --- Scale / Zoom ---
  const [scale, setScale] = useState(1);
  const handleZoomOut = () => setScale(s => Math.max(0.25, s - 0.1));
  const handleZoomIn = () => setScale(s => Math.min(1.5, s + 0.1));

  // --- Filtering ---
  const [filters, setFilters] = useState<Record<number, Set<string>>>({});
  const [openFilterIndex, setOpenFilterIndex] = useState<number | null>(null);
  
  const filteredRows = useMemo(() => {
    if (Object.keys(filters).length === 0) return rows;
    return rows.filter(row => {
      return Object.entries(filters).every(([colIdxStr, filterSet]) => {
        if (!filterSet) return true;
        const cellVal = String(row[Number(colIdxStr)]);
        return filterSet.has(cellVal);
      });
    });
  }, [rows, filters]);

  // --- Virtual Scrolling (Removed due to table reflow lag) ---
  // Native rendering up to 1000 rows is much faster because the browser only calculates the table layout once.

  // --- Column Resize ---
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const tableRef = useRef<HTMLTableElement>(null);
  const resizingCol = useRef<{ index: number, startX: number, startWidth: number } | null>(null);

  const lockColumnWidths = () => {
    let currentWidths = { ...colWidths };
    if (Object.keys(currentWidths).length === 0 && tableRef.current) {
      const ths = tableRef.current.querySelectorAll('th');
      ths.forEach((t, i) => {
        currentWidths[i] = t.getBoundingClientRect().width / scale;
      });
      setColWidths(currentWidths);
    }
    return currentWidths;
  };

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentWidths = lockColumnWidths();

    const startWidth = currentWidths[index] || 100;
    resizingCol.current = { index, startX: e.pageX, startWidth };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    const { index, startX, startWidth } = resizingCol.current;
    const diff = (e.pageX - startX) / scale;
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
  const totalTableWidth = isResized ? Object.values(colWidths).reduce((a, b) => a + b, 0) * scale : undefined;

  // --- Cell Formatting Helpers ---
  const getCellType = (val: any) => {
    if (val === null) return 'null';
    if (typeof val === 'boolean') return 'boolean';
    if (typeof val === 'number') return 'number';
    // Настоящего парсинга дат тут нет (можно добавить), но пока все остальное - string
    return 'string';
  };

  return (
    <div className={`flex flex-col h-full w-full ${className}`}>
      
      {/* Toolbar */}
      <div className="flex items-center justify-between shrink-0 mb-2 px-1">
        <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <Database size={14} className="text-primary" />
            <span>
              {filteredRows.length !== rows.length 
                ? t('data_table:shown_filtered_count', { filtered: filteredRows.length, total: rows.length })
                : t('data_table:shown_count', { count: rows.length })}
              {isTruncated && totalRowCount !== undefined && (
                <span className="text-warning-text ml-1 opacity-100 font-semibold">
                  {t('data_table:limit_exceeded', { limit: rows.length, total: totalRowCount })}
                </span>
              )}
            </span>
          </div>
          {executionTimeMs !== undefined && (
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-primary" />
              <span>{t('data_table:execution_time', { time: executionTimeMs.toFixed(1) })}</span>
            </div>
          )}
        </div>
        
        {/* Scale Slider */}
        <div className="flex items-center gap-2 bg-hover border border-glass-border rounded-lg px-2 py-1 shadow-sm">
          <button 
            onClick={handleZoomOut}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded-md hover:bg-hover"
            title={t('data_table:zoom_out')}
          >
            <ZoomOut size={14} />
          </button>
          <input 
            type="range" 
            min="0.25" 
            max="1.5" 
            step="0.05"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-20 sm:w-24 accent-primary cursor-pointer h-1.5 bg-glass-border rounded-full appearance-none outline-none"
            title={t('data_table:zoom_level')}
          />
          <button 
            onClick={handleZoomIn}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded-md hover:bg-hover"
            title={t('data_table:zoom_in')}
          >
            <ZoomIn size={14} />
          </button>
          
          <div className="flex items-center ml-1 pl-1 border-l border-glass-border">
            <button 
              onClick={() => setScale(1)}
              disabled={scale === 1}
              className={`p-1 transition-colors rounded-md ${scale === 1 ? 'opacity-30 cursor-default' : 'hover:bg-hover hover:text-foreground'} text-muted-foreground`}
              title={t('data_table:zoom_reset')}
            >
              <RotateCcw size={12} />
            </button>
            <span className="text-2xs w-8 text-right font-mono text-muted-foreground">
              {Math.round(scale * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Table Wrapper */}
      {rows.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50 border border-dashed border-glass-border rounded-xl">
          <Database size={32} className="mb-2" />
          <p>{t('data_table:no_data')}</p>
        </div>
      ) : (
        <div 
          className="flex-1 border border-glass-border rounded-xl bg-hover overflow-auto relative custom-scrollbar shadow-inner"
          style={{ fontSize: `${14 * scale}px` }}
        >
          <table 
            ref={tableRef}
            className={`text-left whitespace-nowrap ${isResized ? 'table-fixed' : 'w-full'}`} 
            style={isResized ? { width: `${totalTableWidth}px` } : {}}
          >
            <thead className="bg-muted border-b-2 border-primary/20 text-foreground font-semibold uppercase tracking-wider sticky top-0 z-layout shadow-sm">
              <tr className="divide-x divide-glass-border">
                {columns.map((col, i) => (
                  <th 
                    key={i} 
                    className="font-medium relative group select-none transition-colors"
                    style={{ 
                      padding: '0.6em 0.8em',
                      width: isResized ? `${colWidths[i] * scale}px` : undefined 
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="truncate flex items-center gap-1.5" style={{ fontSize: '0.85em' }}>
                        <span className="opacity-70 font-mono text-primary/70">{i+1}</span>
                        <span className="text-foreground">{col}</span>
                      </div>
                      
                      {/* Filter Button */}
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            lockColumnWidths();
                            setOpenFilterIndex(openFilterIndex === i ? null : i);
                          }}
                          className={`p-1 rounded transition-colors ml-2 shrink-0 ${
                            filters[i] ? 'text-primary bg-primary/10' : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10'
                          }`}
                          title={t('data_table:column_filter')}
                        >
                          <Filter size={12} />
                        </button>

                        {openFilterIndex === i && (
                          <ColumnFilterPopover 
                            colIndex={i}
                            colName={col}
                            allRows={rows}
                            activeFilterSet={filters[i]}
                            onFilterChange={(colIdx, newSet) => {
                              setFilters(prev => {
                                const next = { ...prev };
                                if (newSet) {
                                  next[colIdx] = newSet;
                                } else {
                                  delete next[colIdx];
                                }
                                return next;
                              });
                            }}
                            onClose={() => setOpenFilterIndex(null)}
                            isLastCol={i === columns.length - 1}
                          />
                        )}
                      </div>
                    </div>

                    {/* Resizer */}
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary transition-colors z-resize"
                      onMouseDown={(e) => handleMouseDown(e, i)}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-glass-border">
              {filteredRows.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className="even:bg-black/[0.02] dark:even:bg-white/[0.02] hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors divide-x divide-glass-border group"
                >
                  {row.map((cell, cellIndex) => {
                    const cType = getCellType(cell);
                    return (
                      <td 
                        key={cellIndex} 
                        className="truncate group-hover:border-primary/20 transition-colors"
                        style={{ 
                          padding: '0.5em 0.8em',
                          width: isResized ? `${colWidths[cellIndex] * scale}px` : undefined,
                          maxWidth: isResized ? undefined : `${350 * scale}px` 
                        }}
                      >
                        {cType === 'null' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground/50 text-mini font-semibold tracking-widest uppercase shadow-sm border border-glass-border">
                            NULL
                          </span>
                        ) : cType === 'boolean' ? (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-mini font-bold uppercase shadow-sm border ${
                            cell ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                          }`}>
                            {cell ? 'true' : 'false'}
                          </span>
                        ) : cType === 'number' ? (
                          <div className="text-right font-mono text-blue-600 dark:text-blue-400 font-medium">
                            {cell}
                          </div>
                        ) : (
                          // String
                          <div className="truncate" title={String(cell)}>
                            {String(cell)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
