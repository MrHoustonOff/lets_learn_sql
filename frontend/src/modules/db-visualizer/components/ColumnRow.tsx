import React from 'react';
import type { ColumnSchema } from '../types';
import { Key, Link, AlertCircle } from 'lucide-react';

interface ColumnRowProps {
  column: ColumnSchema;
}

export const ColumnRow: React.FC<ColumnRowProps> = ({ column }) => {
  return (
    <div className="flex items-center gap-3 py-2 px-3 text-sm hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0 cursor-default">
      <div className="w-5 flex justify-center text-slate-500 group-hover:text-amber-400 transition-colors">
        {column.isPrimaryKey && <Key size={14} className="text-amber-400" />}
        {!column.isPrimaryKey && column.isForeignKey && <Link size={14} className="text-blue-400" />}
        {!column.isPrimaryKey && !column.isForeignKey && column.isUnique && <AlertCircle size={14} className="text-purple-400" />}
        {!column.isPrimaryKey && !column.isForeignKey && !column.isUnique && <span className="w-3.5 h-3.5 rounded-full border border-slate-600/50 group-hover:border-slate-500"></span>}
      </div>
      <div className="flex-1 font-medium text-slate-200">
        {column.name}
      </div>
      <div className="text-xs font-mono text-slate-400 truncate max-w-[120px]">
        {column.type}
      </div>
      {column.nullable ? (
        <div className="text-[10px] text-slate-500 uppercase tracking-wider w-8 text-center">null</div>
      ) : (
        <div className="text-[10px] text-slate-600 uppercase tracking-wider w-8 text-center">req</div>
      )}
    </div>
  );
};
