import React from 'react';
import type { ColumnSchema } from '../types';
import { Key, Link, AlertCircle } from 'lucide-react';

interface ColumnRowProps {
  column: ColumnSchema;
}

export const ColumnRow: React.FC<ColumnRowProps> = ({ column }) => {
  return (
    <div className="flex items-center gap-3 py-2 px-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors group border-b border-glass-border last:border-0 cursor-default">
      <div className="w-5 flex justify-center text-muted-foreground group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
        {column.isPrimaryKey && <Key size={14} className="text-amber-500 dark:text-amber-400" />}
        {!column.isPrimaryKey && column.isForeignKey && <Link size={14} className="text-blue-500 dark:text-blue-400" />}
        {!column.isPrimaryKey && !column.isForeignKey && column.isUnique && <AlertCircle size={14} className="text-purple-500 dark:text-purple-400" />}
        {!column.isPrimaryKey && !column.isForeignKey && !column.isUnique && <span className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/20 group-hover:border-black/50 dark:group-hover:border-white/50"></span>}
      </div>
      <div className="flex-1 font-medium text-foreground">
        {column.name}
      </div>
      <div className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
        {column.type}
      </div>
      {column.nullable ? (
        <div className="text-[10px] opacity-60 uppercase tracking-wider w-8 text-center">null</div>
      ) : (
        <div className="text-[10px] opacity-80 uppercase tracking-wider w-8 text-center font-bold">req</div>
      )}
    </div>
  );
};
