import React, { useState } from 'react';
import { Database, Plus } from 'lucide-react';
import { DatabaseDetailsModal } from '../components/workspace/DatabaseDetailsModal';

export interface DatabaseMock {
  id: string;
  technicalName: string;
  name: string;
  description?: string;
}

const mockDatabases: DatabaseMock[] = [
  {
    id: 'db1',
    technicalName: 'northwind_db_v1',
    name: 'Northwind Sales',
    description: 'Полная база продаж для курса по PostgreSQL. Содержит таблицы: customers, orders, products, employees и другие. Используется для всех основных задач по DML и DQL.'
  },
  {
    id: 'db2',
    technicalName: 'auth_schema_db',
    name: 'Users & Auth'
  },
  {
    id: 'db3',
    technicalName: 'logs_archive_2023',
    name: 'Logs Archive (2023)'
  },
  {
    id: 'db4',
    technicalName: 'sandbox_777',
    name: 'Test Sandbox',
    description: 'Песочница для тестов. Сюда можно заливать любой мусор и экспериментировать с DDL.'
  }
];

export const DatabasesListPage: React.FC = () => {
  const [selectedDb, setSelectedDb] = useState<DatabaseMock | null>(null);

  return (
    <div className="h-full overflow-y-auto p-8 max-w-5xl mx-auto animate-in fade-in duration-300 primary-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Базы данных</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-colors font-medium shadow-sm">
          <Plus size={18} />
          Подключить БД
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {mockDatabases.map((db) => (
          <div 
            key={db.id}
            onClick={() => setSelectedDb(db)}
            className="group relative bg-glass backdrop-blur-md border border-glass-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col h-full hover:border-primary/50"
          >
            {/* Hover Background Glow */}
            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors pointer-events-none" />
            
            <div className="flex items-start gap-4 mb-4 relative z-10">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <Database size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate text-lg">
                  {db.name}
                </h3>
                <div className="text-xs text-muted-foreground font-mono truncate mt-1">
                  {db.technicalName}
                </div>
              </div>
            </div>
            
            {db.description ? (
              <p className="text-sm text-muted-foreground line-clamp-3 relative z-10 mt-auto">
                {db.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/50 italic relative z-10 mt-auto">
                Нет описания
              </p>
            )}

          </div>
        ))}
      </div>

      <DatabaseDetailsModal 
        isOpen={!!selectedDb} 
        onClose={() => setSelectedDb(null)} 
        database={selectedDb} 
      />
    </div>
  );
};
