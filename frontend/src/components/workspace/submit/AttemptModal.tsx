import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { ShieldCheck, ShieldX, Copy, Check, Trash2 } from 'lucide-react';
import { ModalBase } from '../../ui/ModalBase';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { SqlCodeViewer } from '../../ui/SqlCodeViewer';

export const AttemptModal: React.FC<{
  attempt: any | null;
  onClose: () => void;
}> = ({ attempt, onClose }) => {
  const { t } = useTranslation('submit_report');
  const [copiedCode, setCopiedCode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const formatDate = (d: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <ModalBase 
      isOpen={!!attempt} 
      onClose={onClose}
      title={`Попытка ${attempt?.id?.split('-').pop() || attempt?.attempt_id}`}
    >
      <div className="flex h-full bg-background flex-1 overflow-hidden">
        {/* Left: Code */}
        <div className="w-7/12 border-r border-glass-border flex flex-col bg-background">
          {/* Header inside the dark area for the code */}
          <div className="h-10 border-b border-glass-border flex items-center justify-between px-4 shrink-0 bg-hover">
            <div className="text-xs font-mono text-muted-foreground">SQL Запрос</div>
            <button
              title={copiedCode ? t('copied', 'Скопировано') : t('copy', 'Копировать')}
              onClick={() => handleCopy(attempt?.sql || '')}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center relative"
            >
              {copiedCode ? <Check size={16} className="text-success" /> : <Copy size={16} />}
            </button>
          </div>
          
          <div className="flex-1 min-h-0 relative">
             <SqlCodeViewer sqlCode={attempt?.sql || ''} />
          </div>

          <div className="h-10 border-t border-glass-border flex items-center justify-between px-4 shrink-0 bg-hover">
            <div className="text-xs font-mono text-muted-foreground">
              {t('run_at', 'Запущено:')} {attempt && formatDate(attempt.date || new Date(attempt.created_at))}
            </div>
            <button 
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors border border-transparent"
            >
              <Trash2 size={12} /> {t('delete_attempt', 'Удалить попытку')}
            </button>
          </div>
        </div>
        
        {/* Right: Report Mini */}
        <div className="w-5/12 p-6 overflow-y-auto bg-background flex flex-col pt-10">
          <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-3 mb-6 ${attempt?.verdict ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${attempt?.verdict ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
              {attempt?.verdict ? <ShieldCheck size={24} /> : <ShieldX size={24} />}
            </div>
            <p className={`font-bold ${attempt?.verdict ? 'text-success' : 'text-destructive'}`}>
              {attempt?.verdict ? t('verdict_passed', 'Зачтено') : t('verdict_failed', 'Не зачтено')}
            </p>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => {
          console.log('Delete single mocked');
          setDeleteConfirm(false);
          onClose();
        }}
        title={attempt?.verdict ? t('delete_single_correct_title', 'Удаление верной попытки') : t('delete_single_incorrect_title', 'Удаление неверной попытки')}
        confirmText={t('delete_single_confirm_btn', 'Да, удаляй её!')}
        cancelText={t('cancel_single', 'Нет, оставь её.')}
        variant="destructive"
      >
        {attempt?.verdict ? (
          <Trans 
            i18nKey="delete_single_correct_confirm"
            ns="submit_report"
            defaults="Вы уверены, что хотите удалить эту <span1>верную</span1> попытку? Это действие необратимо."
            components={{
              span1: <span className="text-success font-bold" />
            }}
          />
        ) : (
          <Trans 
            i18nKey="delete_single_incorrect_confirm"
            ns="submit_report"
            defaults="Вы уверены, что хотите удалить эту <span1>неверную</span1> попытку? Это действие необратимо."
            components={{
              span1: <span className="text-destructive font-bold" />
            }}
          />
        )}
      </ConfirmModal>
    </ModalBase>
  );
};
