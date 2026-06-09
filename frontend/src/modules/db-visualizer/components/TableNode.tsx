import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { TableSchema } from '../types';
import { Database } from 'lucide-react';
import { ColumnRow } from './ColumnRow';

interface TableNodeProps {
  data: {
    table: TableSchema;
  };
}

export const TableNode: React.FC<TableNodeProps> = ({ data }) => {
  const { table } = data;

  return (
    <div className="relative group rounded-xl bg-glass border border-glass-border backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] hover:border-primary/50 transition-all duration-300 min-w-[300px]">
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-glass-border flex items-center gap-3 rounded-t-xl bg-black/10 dark:bg-white/5">
        <Database size={16} className="text-emerald-500 dark:text-emerald-400" />
        <h3 className="font-semibold text-foreground tracking-wide">{table.name}</h3>
        {table.schema !== 'public' && (
          <span className="ml-auto text-[10px] uppercase tracking-wider bg-badge text-badge-foreground px-2 py-0.5 rounded-full">
            {table.schema}
          </span>
        )}
      </div>

      {/* Columns List */}
      <div className="flex flex-col relative">
        {table.columns.map(col => (
          <div key={col.name} className="relative">
            {/* Target Handle (Left) */}
            <Handle 
              type="target" 
              position={Position.Left} 
              id={`${col.name}-target`} 
              className="w-1 h-1 opacity-0 pointer-events-none" 
            />
            
            <ColumnRow column={col} />
            
            {/* Source Handle (Right) */}
            <Handle 
              type="source" 
              position={Position.Right} 
              id={`${col.name}-source`} 
              className="w-1 h-1 opacity-0 pointer-events-none" 
            />
          </div>
        ))}
      </div>

      {/* Extra Info (Indexes/Foreign Keys) */}
      {(table.indexes.length > 0 || table.foreignKeys.length > 0) && (
        <div className="px-4 py-3 border-t border-glass-border bg-black/5 dark:bg-black/20 rounded-b-xl text-xs text-muted-foreground">
          {table.indexes.length > 0 && (
            <div className="mb-2 last:mb-0">
              <span className="uppercase tracking-wider text-[10px] opacity-70 mb-1 block">Indexes</span>
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
