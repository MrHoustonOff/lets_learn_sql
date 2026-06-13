import React, { useState, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { StatusIcon } from '../../ui/StatusIcon';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { formatDateTime } from '../../../lib/utils';

type SortField = 'date' | 'verdict' | 'duration';
type SortOrder = 'asc' | 'desc';

export const HistoryPanel: React.FC<{
  history: any[];
  onOpenAttempt: (attempt: any) => void;
  onDeleteAll?: (type: 'all' | 'correct' | 'incorrect') => void;
}> = ({ history, onOpenAttempt, onDeleteAll }) => {
  const { t } = useTranslation('submit_report');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(history.length / itemsPerPage);

  const [deleteConfirm, setDeleteConfirm] = useState<'incorrect' | 'correct' | null>(null);

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

  const getAttemptDate = (a: any) => new Date(a.date || a.created_at);
  const getAttemptDuration = (a: any) => a.durationMs ?? a.duration_ms ?? 0;

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      // User specific rule: when sorting by duration, ALWAYS put correct attempts first
      if (sortField === 'duration') {
        if (a.verdict !== b.verdict) {
           return a.verdict ? -1 : 1; // Correct first
        }
        return sortOrder === 'asc' ? getAttemptDuration(a) - getAttemptDuration(b) : getAttemptDuration(b) - getAttemptDuration(a);
      }
      
      let comparison = 0;
      if (sortField === 'date') {
        comparison = getAttemptDate(a).getTime() - getAttemptDate(b).getTime();
      } else if (sortField === 'verdict') {
        comparison = (a.verdict === b.verdict) ? 0 : (a.verdict ? 1 : -1);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [history, sortField, sortOrder]);

  const currentHistory = sortedHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        {history.length === 0 ? (
          <div className="text-center py-6 px-4 bg-muted/10 rounded-xl border border-dashed border-glass-border">
            <p className="text-sm text-muted-foreground">{t('no_history_yet', 'Решений пока не было. Отправьте свой первый запрос!')}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              {/* Table Header for Sorting */}
              <div className="flex items-center justify-between px-3 py-1.5 text-2xs text-muted-foreground uppercase tracking-wider font-semibold border-b border-glass-border mb-1">
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
                  key={attempt.attempt_id || attempt.id}
                  onClick={() => onOpenAttempt(attempt)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-md border border-transparent transition-all w-full text-left focus:outline-none ${attempt.verdict ? 'bg-success/10 hover:bg-success/20' : 'bg-destructive/10 hover:bg-destructive/20'}`}
                >
                  <div className="flex items-center gap-2">
                    <StatusIcon passed={attempt.verdict} size={14} />
                    <span className="text-xs font-medium text-foreground">
                      {t('attempt_prefix', 'Попытка №')}{String(attempt.attempt_id || attempt.id).split('-').pop()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="tabular-nums font-mono">
                      {formatDateTime(getAttemptDate(attempt))}
                    </span>
                    <span className="w-12 text-right tabular-nums font-mono opacity-60">
                      {getAttemptDuration(attempt)}ms
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination & Mass Delete */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-glass-border">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setDeleteConfirm('incorrect')}
                  disabled={!history.some(a => !a.verdict)}
                  className="px-2 py-1 text-xs text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  title={t('delete_incorrect_attempts', 'Удалить все неудачные попытки')}
                >
                  {t('delete_incorrect_btn', 'Очистить ошибки')}
                </button>
                <div className="w-px h-3 bg-glass-border" />
                <button 
                  onClick={() => setDeleteConfirm('correct')}
                  disabled={!history.some(a => a.verdict)}
                  className="px-2 py-1 text-xs text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  title={t('delete_correct_attempts', 'Удалить все правильные попытки')}
                >
                  {t('delete_correct_btn', 'Очистить верные')}
                </button>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1 px-1.5 py-1 bg-card border border-glass-border rounded-full shadow-sm">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-1 rounded-full hover:bg-hover disabled:opacity-30 transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-2xs font-semibold text-foreground px-2 font-mono">
                    {currentPage} <span className="text-muted-foreground/40 mx-0.5">/</span> {totalPages}
                  </span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-1 rounded-full hover:bg-hover disabled:opacity-30 transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteConfirm === 'incorrect'}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (onDeleteAll) {
            onDeleteAll('incorrect');
          }
          setDeleteConfirm(null);
        }}
        title={t('delete_incorrect_title', 'Удаление неверных попыток')}
        confirmText={t('delete_confirm_btn', 'Да, удаляй их все!')}
        cancelText={t('cancel', 'Нет, оставь их.')}
        variant="destructive"
      >
        <Trans 
          i18nKey="delete_incorrect_confirm"
          ns="submit_report"
          defaults="Вы уверены, что хотите удалить ВСЕ <span1>неверные</span1> попытки? Это действие нельзя отменить."
          components={{
            span1: <span className="text-destructive font-bold uppercase" />,
            span2: <span className="text-foreground font-black underline" />
          }}
        />
      </ConfirmModal>

      <ConfirmModal
        isOpen={deleteConfirm === 'correct'}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (onDeleteAll) {
            onDeleteAll('correct');
          }
          setDeleteConfirm(null);
        }}
        title={t('delete_correct_title', 'Удаление верных попыток')}
        confirmText={t('delete_confirm_btn', 'Да, удаляй их все!')}
        cancelText={t('cancel', 'Нет, оставь их.')}
        variant="destructive"
      >
        <Trans 
          i18nKey="delete_correct_confirm"
          ns="submit_report"
          defaults="Вы уверены, что хотите удалить ВСЕ <span1>верные</span1> попытки? Это действие нельзя отменить."
          components={{
            span1: <span className="text-success font-bold uppercase" />,
            span2: <span className="text-foreground font-black underline" />
          }}
        />
      </ConfirmModal>
    </CollapsibleSection>
  );
};
