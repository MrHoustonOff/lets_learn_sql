import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { StatusIcon } from '../../ui/StatusIcon';

type SortField = 'date' | 'verdict' | 'duration';
type SortOrder = 'asc' | 'desc';

export const HistoryPanel: React.FC<{
  history: any[];
  onOpenAttempt: (attempt: any) => void;
}> = ({ history, onOpenAttempt }) => {
  const { t } = useTranslation('submit_report');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(history.length / itemsPerPage);

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'duration' ? 'asc' : 'desc'); // duration default is asc (fastest)
    }
  };

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      // User specific rule: when sorting by duration, ALWAYS put correct attempts first
      if (sortField === 'duration') {
        if (a.verdict !== b.verdict) {
           return a.verdict ? -1 : 1; // Correct first
        }
        return sortOrder === 'asc' ? a.durationMs - b.durationMs : b.durationMs - a.durationMs;
      }
      
      let comparison = 0;
      if (sortField === 'date') {
        comparison = a.date.getTime() - b.date.getTime();
      } else if (sortField === 'verdict') {
        comparison = (a.verdict === b.verdict) ? 0 : (a.verdict ? 1 : -1);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [history, sortField, sortOrder]);

  const currentHistory = sortedHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (d: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-40" />;
    return sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const getSortBtnClass = (field: SortField) => 
    `flex items-center gap-1 transition-colors focus:outline-none ${sortField === field ? 'text-primary' : 'hover:text-foreground'}`;

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
          {/* Table Header for Sorting */}
          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold border-b border-glass-border/50 mb-1">
            <button onClick={() => handleSort('verdict')} className={getSortBtnClass('verdict')}>
              {t('sort_status', 'Статус')} <SortIcon field="verdict" />
            </button>
            <div className="flex items-center gap-6">
              <button onClick={() => handleSort('date')} className={getSortBtnClass('date')}>
                {t('sort_date', 'Дата')} <SortIcon field="date" />
              </button>
              <button onClick={() => handleSort('duration')} className={getSortBtnClass('duration')}>
                {t('sort_time', 'Время')} <SortIcon field="duration" />
              </button>
            </div>
          </div>

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
              <div className="flex items-center gap-4 text-2xs text-muted-foreground font-mono w-32 justify-end">
                <span>{formatDate(attempt.date)}</span>
                <span className="w-12 text-right">{attempt.durationMs} ms</span>
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
