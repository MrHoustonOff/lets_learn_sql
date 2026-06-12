import React, { useState, useMemo } from 'react';
import { Search, FilterX, Eye, EyeOff, LayoutList, Columns3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DatabaseSchema } from '../types';

interface FilterPanelProps {
  schema: DatabaseSchema;
  hiddenTables: Set<string>;
  onChangeHiddenTables: (tables: Set<string>) => void;
  highlightedColumns: Set<string>;
  onChangeHighlightedColumns: (columns: Set<string>) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  schema,
  hiddenTables,
  onChangeHiddenTables,
  highlightedColumns,
  onChangeHighlightedColumns,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'tables' | 'columns'>('tables');
  const [searchTables, setSearchTables] = useState('');
  const [searchColumns, setSearchColumns] = useState('');
  
  // -- Tables Logic --
  const allTables = useMemo(() => 
    schema.tables.map(t => ({ id: `${t.schema}.${t.name}`, name: t.name }))
                 .sort((a, b) => a.name.localeCompare(b.name)), 
  [schema]);

  const filteredTables = useMemo(() => 
    allTables.filter(t => t.name.toLowerCase().includes(searchTables.toLowerCase())),
  [allTables, searchTables]);

  const handleToggleTable = (tableId: string) => {
    const next = new Set(hiddenTables);
    if (next.has(tableId)) {
      next.delete(tableId); // Показать
    } else {
      next.add(tableId); // Скрыть
    }
    onChangeHiddenTables(next);
  };

  const handleShowAllTables = () => onChangeHiddenTables(new Set());
  const handleHideAllTables = () => onChangeHiddenTables(new Set(allTables.map(t => t.id)));

  // -- Columns Logic --
  const allColumns = useMemo(() => {
    const cols = schema.tables.flatMap(t => t.columns.map(c => c.name));
    return Array.from(new Set(cols)).sort();
  }, [schema]);
  
  const filteredColumns = useMemo(() => 
    allColumns.filter(c => c.toLowerCase().includes(searchColumns.toLowerCase())),
  [allColumns, searchColumns]);

  const handleToggleColumn = (colName: string) => {
    const next = new Set(highlightedColumns);
    if (next.has(colName)) {
      next.delete(colName);
    } else {
      next.add(colName);
      
      // Авто-показ скрытых таблиц, содержащих выбранный столбец
      let hiddenChanged = false;
      const nextHidden = new Set(hiddenTables);
      schema.tables.forEach(t => {
        const tableId = `${t.schema}.${t.name}`;
        if (nextHidden.has(tableId) && t.columns.some(c => c.name === colName)) {
          nextHidden.delete(tableId);
          hiddenChanged = true;
        }
      });
      
      if (hiddenChanged) {
        onChangeHiddenTables(nextHidden);
      }
    }
    onChangeHighlightedColumns(next);
  };

  const handleResetColumns = () => onChangeHighlightedColumns(new Set());

  return (
    <div className="flex flex-col bg-glass backdrop-blur-xl border border-glass-border shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-xl overflow-hidden w-80 transition-all duration-300">
      
      {/* Header Tabs */}
      <div className="flex bg-hover border-b border-glass-border relative">
        <button
          onClick={() => setActiveTab('tables')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${
            activeTab === 'tables' 
              ? 'text-foreground border-b-2 border-primary bg-background/50' 
              : 'text-muted-foreground hover:text-foreground hover:bg-hover'
          }`}
        >
          <LayoutList size={14} />
          {t('db_visualizer:filter.tables')}
          {hiddenTables.size > 0 && <div className="w-1.5 h-1.5 rounded-full bg-warning" />}
        </button>
        <button
          onClick={() => setActiveTab('columns')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${
            activeTab === 'columns' 
              ? 'text-foreground border-b-2 border-primary bg-background/50' 
              : 'text-muted-foreground hover:text-foreground hover:bg-hover'
          }`}
        >
          <Columns3 size={14} />
          {t('db_visualizer:filter.columns')}
          {highlightedColumns.size > 0 && <div className="w-1.5 h-1.5 rounded-full bg-warning" />}
        </button>
      </div>

      {/* Content Area - Fixed height with Slider animation */}
      <div className="relative w-full h-[350px] overflow-hidden flex flex-col">
        <div 
          className={`flex w-[200%] h-full transition-transform duration-300 ease-in-out ${
            activeTab === 'tables' ? 'translate-x-0' : '-translate-x-1/2'
          }`}
        >
          {/* Tables Pane */}
          <div className="w-1/2 h-full flex flex-col p-3">
            {/* Table Search & Controls */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
              <input 
                type="text" 
                placeholder={t('db_visualizer:filter.search_tables')} 
                value={searchTables}
                onChange={e => setSearchTables(e.target.value)}
                className="w-full bg-hover border border-glass-border rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center justify-between mb-3 px-1">
              <button onClick={handleShowAllTables} className="text-[10px] uppercase tracking-wider text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
                <Eye size={12} /> {t('db_visualizer:filter.show_all')}
              </button>
              <button onClick={handleHideAllTables} className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors">
                <EyeOff size={12} /> {t('db_visualizer:filter.hide_all')}
              </button>
            </div>
            
            {/* Table List */}
            <div className="flex-1 overflow-y-auto pl-2 space-y-1 custom-scrollbar scroll-left">
              {filteredTables.map(t => {
                const isHidden = hiddenTables.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => handleToggleTable(t.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors hover:bg-hover ${isHidden ? 'opacity-50' : ''}`}
                    style={{ direction: 'ltr' }}
                  >
                    <span className="truncate flex-1 font-medium">{t.name}</span>
                    <div className={`shrink-0 w-8 h-4 rounded-full relative transition-colors ${!isHidden ? 'bg-success' : 'bg-hover'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${!isHidden ? 'left-4' : 'left-0.5'}`} />
                    </div>
                  </button>
                );
              })}
              {filteredTables.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">{t('db_visualizer:filter.not_found')}</div>
              )}
            </div>
          </div>

          {/* Columns Pane */}
          <div className="w-1/2 h-full flex flex-col p-3">
            {/* Column Search & Controls */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
              <input 
                type="text" 
                placeholder={t('db_visualizer:filter.search_columns')} 
                value={searchColumns}
                onChange={e => setSearchColumns(e.target.value)}
                className="w-full bg-hover border border-glass-border rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center justify-end mb-3 px-1">
              <button onClick={handleResetColumns} className="text-[10px] uppercase tracking-wider text-warning hover:text-warning-text font-medium flex items-center gap-1 transition-colors">
                <FilterX size={12} /> {t('db_visualizer:filter.reset_filter')}
              </button>
            </div>
            
            {/* Column List */}
            <div className="flex-1 overflow-y-auto pl-2 space-y-1 custom-scrollbar scroll-left">
              {filteredColumns.map(c => {
                const isHighlighted = highlightedColumns.has(c);
                return (
                  <button
                    key={c}
                    onClick={() => handleToggleColumn(c)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      isHighlighted 
                        ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                        : 'text-foreground hover:bg-hover'
                    }`}
                    style={{ direction: 'ltr' }}
                  >
                    <span className={`truncate flex-1 ${isHighlighted ? 'font-semibold' : 'font-medium'}`}>{c}</span>
                    <div className={`shrink-0 w-8 h-4 rounded-full relative transition-colors ${isHighlighted ? 'bg-primary' : 'bg-hover'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${isHighlighted ? 'left-4' : 'left-0.5'}`} />
                    </div>
                  </button>
                );
              })}
              {filteredColumns.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">{t('db_visualizer:filter.not_found')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
