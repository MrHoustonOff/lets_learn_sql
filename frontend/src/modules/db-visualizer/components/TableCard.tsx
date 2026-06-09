import React from 'react';
import type { TableSchema } from '../types';
import { ColumnRow } from './ColumnRow';
import { Database } from 'lucide-react';

interface TableCardProps {
  table: TableSchema;
}

export const TableCard: React.FC<TableCardProps> = ({ table }) => {
  return (
    <div className="relative group rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.04] hover:border-white/20">
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 bg-white/[0.01] rounded-t-xl">
        <Database size={16} className="text-emerald-400" />
        <h3 className="font-semibold text-slate-100 tracking-wide">{table.name}</h3>
        {table.schema !== 'public' && (
          <span className="ml-auto text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
            {table.schema}
          </span>
        )}
      </div>

      {/* Columns List */}
      <div className="flex flex-col py-1">
        {table.columns.map(col => (
          <ColumnRow key={col.name} column={col} />
        ))}
      </div>

      {/* Extra Info (Indexes/Foreign Keys) */}
      {(table.indexes.length > 0 || table.foreignKeys.length > 0) && (
        <div className="px-4 py-3 border-t border-white/10 bg-black/20 rounded-b-xl text-xs text-slate-400">
          {table.indexes.length > 0 && (
            <div className="mb-2 last:mb-0">
              <span className="uppercase tracking-wider text-[10px] text-slate-500 mb-1 block">Indexes</span>
              <ul className="space-y-1">
                {table.indexes.map(idx => (
                  <li key={idx.name} className="flex gap-2 font-mono">
                    <span className="text-emerald-500/70">{idx.name}</span>
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
