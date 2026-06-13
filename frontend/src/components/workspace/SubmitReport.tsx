import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldX, ShieldCheck, KeyRound, Loader2, AlertTriangle } from 'lucide-react';
import type { GradeReport } from '../../store/queryStore';
import { Stage1Report } from './submit/Stage1Report';
import { Stage2Report } from './submit/Stage2Report';
import { SqlErrorBanner } from './submit/SqlErrorBanner';
import { HistoryPanel } from './submit/HistoryPanel';
import { AttemptModal } from './submit/AttemptModal';
import { ReferenceModal } from './submit/ReferenceModal';
import { useQueryStore } from '../../store/queryStore';

interface SubmitReportProps {
  taskId: number;
  report?: GradeReport | null;
  isSubmitting?: boolean;
  submitError?: string | null;
}

export const SubmitReport: React.FC<SubmitReportProps> = (_props) => {
  const { t } = useTranslation('submit_report');
  const { report, isSubmitting, submitError } = _props;

  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [showReference, setShowReference] = useState(false);

  const { history, deleteAttempt, deleteAllAttempts } = useQueryStore();

  const isPassed = report ? report.verdict : false;
  const duration = report ? report.duration_ms : 0;
  const sqlError = report?.error || report?.stage1?.sql_error;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-10 relative">
      
      {isSubmitting && (
        <div className="absolute inset-0 z-10 flex items-start justify-center pt-20 bg-background/50 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 px-4 py-2 bg-background border border-glass-border shadow-md rounded-full text-sm font-medium text-foreground">
            <Loader2 className="animate-spin text-primary shrink-0" size={16} />
            {t('submitting', 'Проверка решения...')}
          </div>
        </div>
      )}

      {submitError && (
        <div className="rounded-lg border px-4 py-3 flex flex-col gap-1 border-destructive/40 bg-destructive/10 text-destructive text-sm">
          <p className="font-bold">{t('submit_error_title', 'Ошибка отправки')}</p>
          <p className="opacity-80 break-words">{submitError}</p>
        </div>
      )}

      {/* Top Empty State Hint */}
      {!report && (
        <div className="rounded-xl border px-5 py-4 flex flex-col items-center justify-center text-center gap-2 border-glass-border bg-card shadow-sm">
           <AlertTriangle size={24} className="text-muted-foreground/50" />
           <p className="text-sm font-medium text-foreground">{t('no_analysis_yet', 'Отчет о проверке недоступен')}</p>
           <p className="text-xs text-muted-foreground max-w-[280px]">
             {t('no_analysis_desc', 'Нажмите «Проверить», чтобы получить подробный разбор вашего решения.')}
           </p>
        </div>
      )}

      {/* Primary and Secondary Tests */}
      {report && !sqlError && (
        <div className="flex flex-col gap-2 my-2">
          {report.stage1 && <Stage1Report report={report.stage1} />}
          {report.stage2 && <Stage2Report report={report.stage2} />}
        </div>
      )}

      {/* ======= Verdict Banner ======= */}
      {report && (
        isPassed ? (
          <div className="rounded-lg border px-4 py-3 flex items-center gap-3.5 border-success/40 bg-success/10">
            <ShieldCheck size={28} className="text-success shrink-0" />
            <div>
              <p className="text-base font-bold text-success tracking-tight">{t('verdict_passed', 'Зачтено')}</p>
              <p className="text-2xs text-muted-foreground mt-0.5 font-mono">
                {duration} ms
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border px-4 py-3 flex items-center gap-3.5 border-destructive/60 bg-destructive/20 shadow-sm shadow-destructive/10">
            <ShieldX size={28} className="text-destructive shrink-0" />
            <div>
              <p className="text-base font-bold text-destructive tracking-tight">
                {t('verdict_failed', 'Не зачтено')}
              </p>
              <p className="text-2xs text-muted-foreground mt-0.5 font-mono">
                {duration} ms
              </p>
            </div>
          </div>
        )
      )}

      {/* Show real SQL error if backend returned it */}
      {report && sqlError && (
        <div className="flex flex-col gap-3">
          <SqlErrorBanner error={sqlError} duration={duration} />
        </div>
      )}

      <div className="mt-4 border-t border-glass-border pt-4">
        <HistoryPanel 
          history={history} 
          onOpenAttempt={setSelectedAttempt}
          onDeleteAll={(type) => deleteAllAttempts(_props.taskId, type)}
        />
      </div>

      <div className="h-px bg-glass-border w-full my-2 opacity-50" />

      {/* ======= Reference Solution Button ======= */}
      <div className="flex flex-col items-center gap-2 mb-8 mt-4">
        <button 
          onClick={() => setShowReference(true)}
          className="px-4 py-2 bg-background border border-glass-border hover:bg-hover text-foreground font-medium rounded-md text-xs transition-colors flex items-center gap-2 shadow-sm"
        >
          <KeyRound size={14} className="text-muted-foreground" />
          {t('show_author_solution', 'Показать решение автора')}
        </button>
        <p className="text-2xs text-muted-foreground/60 text-center max-w-[220px]">
          {t('author_solution_hint', 'Подсмотрите оригинальное решение, если застряли или хотите себя проверить.')}
        </p>
      </div>

      {/* ======= Modals ======= */}
      {selectedAttempt && (
        <AttemptModal 
          attempt={selectedAttempt} 
          onClose={() => setSelectedAttempt(null)}
          onDelete={() => {
            deleteAttempt(_props.taskId, selectedAttempt.id || selectedAttempt.attempt_id);
            setSelectedAttempt(null);
          }}
        />
      )}
      <ReferenceModal isOpen={showReference} onClose={() => setShowReference(false)} />
    </div>
  );
};
