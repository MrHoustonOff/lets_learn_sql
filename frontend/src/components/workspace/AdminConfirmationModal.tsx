import React, { useEffect } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AdminConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const AdminConfirmationModal: React.FC<AdminConfirmationModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal-top bg-background/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-glass w-full max-w-md rounded-2xl border border-destructive/50 shadow-[0_8px_32px_0_rgba(239,68,68,0.2)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-glass-border bg-destructive/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-destructive">
              <ShieldAlert size={24} />
              {t('sql_editor:admin_mode_title', 'Внимание: Режим Администратора')}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-hover transition-colors text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-foreground leading-relaxed flex gap-2">
            <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={16} />
            {t('sql_editor:admin_mode_desc', 'Вы собираетесь включить Admin Mode. Следующий выполненный запрос будет закоммичен в базу данных навсегда! Это позволяет наполнять БД новыми данными, но также может повредить структуру.')}
          </p>
        </div>

        <div className="p-6 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-medium text-sm transition-colors border border-glass-border hover:bg-hover"
          >
            {t('sql_editor:admin_mode_cancel', 'Отмена')}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl font-medium text-sm transition-colors bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
          >
            {t('sql_editor:admin_mode_confirm', 'Я понимаю риски, включить')}
          </button>
        </div>
      </div>
    </div>
  );
};
