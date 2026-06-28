import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DatabaseMock } from '../../pages/DatabasesListPage';

interface DatabaseDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  database: DatabaseMock | null;
  onDeleted: () => void;
}

export const DatabaseDeleteModal: React.FC<DatabaseDeleteModalProps> = ({ 
  isOpen, 
  onClose, 
  database,
  onDeleted
}) => {
  const { t } = useTranslation();
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !database) return null;

  const isMatch = confirmName === database.technicalName;

  const handleDelete = async () => {
    if (!isMatch || isDeleting) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/databases/${database.technicalName}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to delete database');
      }
      
      onDeleted();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm z-modal-backdrop"
        onClick={onClose}
      />
      
      <div className="relative z-modal w-full max-w-md bg-background rounded-2xl shadow-2xl border border-destructive/20 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-destructive/10 text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} />
            <h2 className="font-semibold">{t('db_details:delete_db_title', 'Удаление базы данных')}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 hover:bg-destructive/20 rounded-lg transition-colors text-destructive"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 text-destructive">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">
                {t('db_details:delete_warning_title', 'Это действие необратимо')}
              </p>
              <p className="opacity-90 leading-relaxed">
                {t('db_details:delete_warning_text', 'Будет удалена физическая база данных Postgres, все резервные копии и все задачи (включая решения), связанные с этой базой.')}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground block">
              {t('db_details:type_to_confirm', 'Введите ')} 
              <span className="font-mono font-bold px-1.5 py-0.5 bg-muted rounded text-foreground select-all">
                {database.technicalName}
              </span> 
              {t('db_details:type_to_confirm_suffix', ' для подтверждения:')}
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={database.technicalName}
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm outline-none focus:border-destructive transition-colors font-mono"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-xl border border-destructive/20">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors text-muted-foreground"
          >
            {t('common:cancel', 'Отмена')}
          </button>
          <button
            onClick={handleDelete}
            disabled={!isMatch || isDeleting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isDeleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            {t('db_details:btn_delete_confirm', 'Я понимаю, удалить базу')}
          </button>
        </div>
      </div>
    </div>
  );
};
