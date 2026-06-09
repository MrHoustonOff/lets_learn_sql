import React, { useState } from 'react';
import type { TableSchema } from '../types';
import { X, Database, Key, Link, AlertCircle, Hash, TableProperties, Fingerprint } from 'lucide-react';

interface TableDetailsModalProps {
  table: TableSchema;
  onClose: () => void;
}

export const TableDetailsModal: React.FC<TableDetailsModalProps> = ({ table, onClose }) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'data'>('schema');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl min-h-[60vh] max-h-[85vh] flex flex-col bg-glass backdrop-blur-2xl border border-glass-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border bg-black/10 dark:bg-white/5">
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
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-glass-border bg-black/5 dark:bg-white/5">
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
            <div className="w-1/2 h-full overflow-y-auto custom-scrollbar p-6">
              <div className="space-y-8">
                
                {/* Columns Table */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <TableProperties size={16} className="text-primary" /> Столбцы
                  </h3>
                  <div className="border border-glass-border rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 max-h-[45vh] flex flex-col">
                    <div className="overflow-y-auto overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-sm relative">
                        <thead className="bg-black/10 dark:bg-white/10 text-muted-foreground text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md shadow-sm">
                          <tr>
                            <th className="px-4 py-3 font-medium">Ключи</th>
                            <th className="px-4 py-3 font-medium">Имя</th>
                            <th className="px-4 py-3 font-medium">Тип</th>
                            <th className="px-4 py-3 font-medium">Null</th>
                            <th className="px-4 py-3 font-medium">По умолчанию</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-glass-border">
                        {table.columns?.map(col => (
                          <tr key={col.name} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {col.isPrimaryKey && <span title="Primary Key"><Key size={14} className="text-amber-500" /></span>}
                                {col.isForeignKey && <span title="Foreign Key"><Link size={14} className="text-blue-500" /></span>}
                                {!col.isPrimaryKey && !col.isForeignKey && col.isUnique && <span title="Unique"><AlertCircle size={14} className="text-purple-500" /></span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground">{col.name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{col.type}</td>
                            <td className="px-4 py-3">
                              {col.nullable 
                                ? <span className="text-muted-foreground">Да</span>
                                : <span className="font-semibold text-foreground">Нет</span>}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-emerald-600 dark:text-emerald-400">
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
                        <Hash size={16} className="text-amber-500" /> Индексы
                      </h3>
                      <div className="space-y-2">
                        {table.indexes?.map(idx => (
                          <div key={idx.name} className="p-3 bg-black/5 dark:bg-white/5 border border-glass-border rounded-xl">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-sm">{idx.name}</span>
                              <div className="flex gap-1">
                                {idx.isPrimary && <span className="text-[10px] uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">Primary</span>}
                                {idx.isUnique && <span className="text-[10px] uppercase bg-purple-500/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded">Unique</span>}
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
                        <Link size={16} className="text-blue-500" /> Внешние ключи
                      </h3>
                      <div className="space-y-2">
                        {table.foreignKeys?.map(fk => (
                          <div key={fk.name} className="p-3 bg-black/5 dark:bg-white/5 border border-glass-border rounded-xl">
                            <div className="font-semibold text-sm mb-1 break-all">{fk.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-x-2 gap-y-1">
                              <span className="font-mono text-foreground">{fk.column}</span>
                              <span>→</span>
                              <span className="font-mono text-foreground">{fk.targetTable}.{fk.targetColumn}</span>
                            </div>
                            <div className="mt-2 flex gap-2 text-[10px] uppercase font-medium">
                              <span className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-muted-foreground">ON DEL: {fk.onDelete}</span>
                              <span className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-muted-foreground">ON UPD: {fk.onUpdate}</span>
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
                        <Fingerprint size={16} className="text-emerald-500" /> Ссылаются на эту таблицу
                      </h3>
                      <div className="space-y-2">
                        {table.referencedBy?.map(ref => (
                          <div key={ref.constraint} className="p-3 bg-black/5 dark:bg-white/5 border border-glass-border rounded-xl">
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
            <div className="w-1/2 h-full overflow-y-auto custom-scrollbar p-6">
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground min-h-[300px]">
                <Database size={48} className="opacity-20 mb-4" />
                <p className="text-lg font-medium text-foreground mb-1">Пример данных</p>
                <p className="text-sm max-w-sm text-center">
                  Здесь будут отображаться первые 10 строк таблицы, полученные напрямую из API базы данных.
                </p>
                <button className="mt-6 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">
                  Запросить данные (Скоро)
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
