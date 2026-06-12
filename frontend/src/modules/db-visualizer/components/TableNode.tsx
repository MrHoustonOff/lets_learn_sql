import React, { useState, useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals, useNodeId } from '@xyflow/react';
import type { TableSchema } from '../types';
import { Database, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ColumnRow } from './ColumnRow';

interface TableNodeProps {
  data: {
    table: TableSchema;
    highlightedColumns?: Set<string>;
    isFaded?: boolean;
  };
  dragging?: boolean;
}

export const TableNode: React.FC<TableNodeProps> = ({ data, dragging }) => {
  const { t } = useTranslation();
  const { table, highlightedColumns } = data;
  const nodeId = useNodeId();
  const updateNodeInternals = useUpdateNodeInternals();
  const [isExpanded, setIsExpanded] = useState(false);

  // Сворачиваем при перетаскивании
  if (dragging && isExpanded) {
    setIsExpanded(false);
  }

  // Обновляем Handle-позиции, когда высота меняется (анимация может занять время, поэтому таймаут или просто сразу)
  useEffect(() => {
    if (nodeId) {
      // Маленький таймаут для плавного рендеринга (если есть transition)
      setTimeout(() => updateNodeInternals(nodeId), 50);
    }
  }, [isExpanded, nodeId, updateNodeInternals]);

  // Используем isFaded, который теперь приходит из кэшированных данных
  const isFaded = data.isFaded;

  return (
    <div className={`relative group rounded-xl bg-glass border border-glass-border backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:bg-glass-hover w-[320px] max-w-[320px] flex flex-col ${
      isFaded ? 'opacity-40 grayscale-[0.8] scale-[0.98]' : ''
    }`}>
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-glass-border flex items-center gap-3 rounded-t-xl bg-black/10 dark:bg-white/5">
        <Database size={16} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
        <h3 className="font-semibold text-foreground tracking-wide truncate flex-1" title={table.name}>{table.name}</h3>
        {table.schema !== 'public' && (
          <span className="shrink-0 ml-auto max-w-[100px] truncate text-2xs uppercase tracking-wider bg-badge text-badge-foreground px-2 py-0.5 rounded-full" title={table.schema}>
            {table.schema}
          </span>
        )}
      </div>

      {/* Columns List */}
      <div className="flex flex-col relative transition-all duration-300">
        {(isExpanded ? table.columns : table.columns.slice(0, 10)).map(col => (
          <div key={col.name} className="relative">
            {/* Target Handle (Left) */}
            <Handle 
              type="target" 
              position={Position.Left} 
              id={`${col.name}-target`} 
              className="w-1 h-1 opacity-0 pointer-events-none" 
            />
            
            <ColumnRow 
              column={col} 
              isHighlighted={highlightedColumns?.has(col.name)}
            />
            
            {/* Source Handle (Right) */}
            <Handle 
              type="source" 
              position={Position.Right} 
              id={`${col.name}-source`} 
              className="w-1 h-1 opacity-0 pointer-events-none" 
            />
          </div>
        ))}
        
        {/* Fallback Handles for hidden columns to prevent React Flow crashes */}
        {!isExpanded && table.columns.slice(10).map(col => (
          <div key={`hidden-${col.name}`} className="absolute bottom-0 left-0 right-0 pointer-events-none opacity-0">
            <Handle type="target" position={Position.Left} id={`${col.name}-target`} className="w-1 h-1" />
            <Handle type="source" position={Position.Right} id={`${col.name}-source`} className="w-1 h-1" />
          </div>
        ))}
        
        {/* Chevron Button */}
        {table.columns.length > 10 && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 border-t border-glass-border transition-colors w-full"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} /> {t('db_visualizer:collapse')}
              </>
            ) : (
              <>
                <ChevronDown size={14} /> {t('db_visualizer:more_columns', { count: table.columns.length - 10 })}
              </>
            )}
          </button>
        )}
      </div>

      {/* Extra Info (Indexes/Foreign Keys) */}
      {(table.indexes.length > 0 || table.foreignKeys.length > 0) && (
        <div className="px-4 py-3 border-t border-glass-border bg-black/5 dark:bg-black/20 rounded-b-xl text-xs text-muted-foreground">
          {table.indexes.length > 0 && (
            <div className="mb-2 last:mb-0">
              <span className="uppercase tracking-wider text-2xs opacity-70 mb-1 block">Indexes</span>
              <ul className="space-y-1">
                {table.indexes.map(idx => (
                  <li key={idx.name} className="flex gap-2 font-mono">
                    <span className="text-emerald-600 dark:text-emerald-500/70">{idx.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
