import React, { useState, useEffect } from 'react';
import { Database, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DatabaseDetailsModal } from '../components/workspace/DatabaseDetailsModal';

export interface DatabaseMock {
  technicalName: string;
  name: string;
  isDefault?: boolean;
}

export const DatabasesListPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedDb, setSelectedDb] = useState<DatabaseMock | null>(null);
  const [databases, setDatabases] = useState<DatabaseMock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/databases')
      .then((res) => res.json())
      .then((data) => {
        const dbs: DatabaseMock[] = data.map((db: any) => ({
          technicalName: db.technical_name,
          name: db.display_name,
          isDefault: db.is_builtin === 1 || db.is_builtin === true
        }));
        setDatabases(dbs);
      })
      .catch((err) => console.error("Failed to fetch databases", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 h-full w-full overflow-y-auto p-8 max-w-5xl mx-auto animate-in fade-in duration-300 custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{t('databases')}</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-colors font-medium shadow-sm">
          <Plus size={18} />
          {t('db_list:connect_db')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {loading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">Загрузка...</div>
        ) : (
          databases.map((db) => (
            <div 
              key={db.technicalName}
              onClick={() => setSelectedDb(db)}
              className="group relative bg-glass backdrop-blur-md border border-glass-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col h-full hover:border-primary/50"
            >
              {/* Hover Background Glow */}
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors pointer-events-none" />
              
              <div className="flex items-start gap-4 relative z-layout">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Database size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate text-lg">
                    {db.name}
                  </h3>
                  <div className="text-xs text-muted-foreground font-mono truncate mt-1 flex items-center gap-2">
                    <span>{db.technicalName}</span>
                    {db.isDefault && (
                      <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-2xs uppercase font-bold tracking-wider">
                        Default
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <DatabaseDetailsModal 
        isOpen={!!selectedDb} 
        onClose={() => setSelectedDb(null)} 
        database={selectedDb} 
      />
    </div>
  );
};
