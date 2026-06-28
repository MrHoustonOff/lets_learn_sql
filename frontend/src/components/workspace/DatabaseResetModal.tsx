import React, { useState, useEffect } from 'react';
import { X, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface DumpInfo {
  filename: string;
  size: number;
  created_at: number;
  is_init: boolean;
}

interface DatabaseResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  databaseName: string | null;
  onRestore: (filename: string) => Promise<void>;
}

export const DatabaseResetModal: React.FC<DatabaseResetModalProps> = ({ isOpen, onClose, databaseName, onRestore }) => {
  const { t } = useTranslation();
  const [dumps, setDumps] = useState<DumpInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (isOpen && databaseName) {
      setLoading(true);
      fetch(`/api/databases/${databaseName}/dumps`)
        .then(res => res.json())
        .then(data => setDumps(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, databaseName]);

  const handleRestore = async (filename: string) => {
    setRestoring(true);
    try {
      await onRestore(filename);
      onClose();
    } finally {
      setRestoring(false);
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts * 1000).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal-top bg-background/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-glass w-full max-w-md rounded-2xl border border-glass-border shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-glass-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <RotateCcw className="text-primary" size={24} />
              {t('db_details:reset_modal_title')}
            </h2>
            <button 
              onClick={onClose}
              disabled={restoring}
              className="p-2 rounded-xl hover:bg-hover transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed flex gap-2">
            <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={16} />
            {t('db_details:reset_modal_desc')}
          </p>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto primary-scrollbar flex flex-col gap-3">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : dumps.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No dumps found</div>
          ) : (
            dumps.map((dump) => (
              <div 
                key={dump.filename} 
                className="p-4 rounded-xl border border-glass-border bg-background hover:border-primary/50 transition-colors flex flex-col gap-3 group"
              >
                <div className="flex items-start justify-between">
                  <div className="font-medium text-foreground flex items-center gap-2">
                    {dump.is_init ? t('db_details:dump_init') : dump.filename}
                    {dump.is_init && (
                      <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-2xs uppercase font-bold tracking-wider">
                        {t('db_details:dump_init_tag')}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestore(dump.filename)}
                    disabled={restoring}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-medium text-xs transition-colors disabled:opacity-50"
                  >
                    {restoring ? t('db_details:restoring') : t('db_details:restore_btn')}
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{t('db_details:dump_size', { size: Math.round(dump.size / 1024) })}</span>
                  <span>{t('db_details:dump_time', { time: formatTime(dump.created_at) })}</span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
