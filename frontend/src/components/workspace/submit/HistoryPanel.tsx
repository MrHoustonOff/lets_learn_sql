import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { StatusIcon } from '../../ui/StatusIcon';

export const HistoryPanel: React.FC<{
  history: any[];
  onOpenAttempt: (attempt: any) => void;
}> = ({ history, onOpenAttempt }) => {
  const { t } = useTranslation('submit_report');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(history.length / itemsPerPage);
  const currentHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (d: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  return (
    <CollapsibleSection 
      title={t('previous_solutions', 'Предыдущие решения')}
      infoText={t('previous_solutions_hint', 'Кликните по попытке, чтобы посмотреть её код и детали, или удалить. Вы также можете массово удалить все решения ниже.')}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-2xs text-muted-foreground font-mono">{t('page_info', { current: currentPage, total: totalPages })}</span>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-2 py-1 text-2xs rounded bg-card hover:bg-hover disabled:opacity-30 border border-glass-border transition-colors"
            >{t('page_back', 'Назад')}</button>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-2 py-1 text-2xs rounded bg-card hover:bg-hover disabled:opacity-30 border border-glass-border transition-colors"
            >{t('page_forward', 'Вперед')}</button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {currentHistory.map((attempt) => (
            <button
              key={attempt.id}
              onClick={() => onOpenAttempt(attempt)}
              className={`flex items-center justify-between px-3 py-1.5 rounded-md border border-transparent transition-all w-full text-left focus:outline-none ${attempt.verdict ? 'bg-success/10 hover:bg-success/20' : 'bg-destructive/10 hover:bg-destructive/20'}`}
            >
              <div className="flex items-center gap-2">
                <StatusIcon passed={attempt.verdict} size={14} />
                <span className="text-xs font-medium text-foreground">
                  {t('attempt_prefix', 'Попытка №')}{attempt.id.split('-').pop()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-2xs text-muted-foreground font-mono">
                <span>{formatDate(attempt.date)}</span>
                <span>{attempt.durationMs} ms</span>
              </div>
            </button>
          ))}
        </div>

        {/* Danger Zone Management */}
        <div className="flex justify-end gap-2 mt-1">
          <button className="text-[10px] text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors uppercase tracking-wider font-semibold px-2 py-1 rounded">
            {t('delete_incorrect', 'Удалить неверные')}
          </button>
          <button className="text-[10px] text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors uppercase tracking-wider font-semibold px-2 py-1 rounded">
            {t('delete_correct', 'Удалить верные')}
          </button>
        </div>
      </div>
    </CollapsibleSection>
  );
};
