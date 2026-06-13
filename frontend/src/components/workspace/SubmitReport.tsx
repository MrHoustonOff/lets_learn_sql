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
import { MOCK_STAGE1_REPORT, MOCK_STAGE2_REPORT, MOCK_HISTORY } from './submit/submitReportMocks';

interface SubmitReportProps {
  report?: GradeReport | null;
  isSubmitting?: boolean;
  submitError?: string | null;
}

export const SubmitReport: React.FC<SubmitReportProps> = (_props) => {
  const { t } = useTranslation('submit_report');
  const { report, isSubmitting, submitError } = _props;

  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [showReference, setShowReference] = useState(false);

  const stage1Data = report ? report.stage1 : MOCK_STAGE1_REPORT;
  const stage2Data = report ? report.stage2 : MOCK_STAGE2_REPORT;
  const historyData = MOCK_HISTORY;

  const isPassed = report ? report.verdict : false;
  const duration = report ? report.duration_ms : 42.5;
  const sqlError = report?.error || stage1Data?.sql_error;

  const MOCK_ERRORS = [
    'PREFLIGHT:SYNTAX|column "ordr_id" does not exist\nLINE 1: SELECT ordr_id, customer_id FROM orders',
    'PREFLIGHT:COL_COUNT|11|2',
    'PREFLIGHT:COL_TYPES|[{"pos": 1, "name": "order_id", "u_type": "integer", "r_type": "integer", "match": true}, {"pos": 2, "name": "order_date", "u_type": "text", "r_type": "date", "match": false}]',
    'PREFLIGHT:TIMEOUT'
  ];

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

      {/* Temporarily showing 4 mocks to verify layout as requested by the user */}
      <div className="flex flex-col gap-3">
        {MOCK_ERRORS.map((err, i) => (
          <SqlErrorBanner key={i} error={err} duration={28.4 + i * 5} />
        ))}
      </div>

      {sqlError && !MOCK_ERRORS.length ? (
        <SqlErrorBanner error={sqlError} duration={duration} />
      ) : (
        <>
          {/* Hidden stages during mock display */}
        </>
      )}

      {/* ======= Verdict Banner ======= */}
      {isPassed ? (
        <div className="rounded-lg border px-4 py-3 flex items-center gap-3.5 border-success/40 bg-success/10">
          <ShieldCheck size={28} className="text-success shrink-0" />
          <div>
            <p className="text-base font-bold text-success tracking-tight">{t('all_checks_passed', 'Все проверки успешно пройдены!')}</p>
            <p className="text-2xs text-muted-foreground mt-0.5 font-mono">
              {duration} ms
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border px-4 py-3 flex items-center gap-3.5 border-destructive/40 bg-destructive/10">
          <ShieldX size={28} className="text-destructive shrink-0" />
          <div>
            <p className="text-base font-bold text-destructive tracking-tight">
              {report 
                ? (report.stage1?.passed ? t('stage2_check_failed', 'Не пройдены дополнительные проверки') : t('basic_check_failed', 'Базовая проверка не пройдена')) 
                : t('basic_check_failed', 'Базовая проверка не пройдена')}
            </p>
            <p className="text-2xs text-muted-foreground mt-0.5 font-mono">
              {duration} ms
            </p>
          </div>
        </div>
      )}

      {/* Primary and Secondary Tests (Mocked for review) */}
      <div className="flex flex-col gap-2 my-2">
        <Stage1Report report={MOCK_STAGE1_REPORT} />
        <Stage2Report report={MOCK_STAGE2_REPORT} />
      </div>

      <HistoryPanel history={historyData} onOpenAttempt={setSelectedAttempt} />

      <div className="h-px bg-glass-border w-full my-2 opacity-50" />

      {(!report) && (
        <div className="text-center pt-6 pb-2 text-muted-foreground opacity-60">
          <p className="text-tiny">{t('empty_state_desc', 'Оно открывается после того, как вы совершите хотя бы одну попытку решения.')}</p>
        </div>
      )}

      {/* ======= Reference Solution Button ======= */}
      <div className="flex justify-center mb-8 mt-2">
        <button 
          onClick={() => setShowReference(true)}
          className="px-4 py-2 bg-background border border-glass-border hover:bg-hover text-foreground font-medium rounded-md text-xs transition-colors flex items-center gap-2 shadow-sm"
        >
          <KeyRound size={14} className="text-muted-foreground" />
          {t('show_author_solution', 'Показать решение автора')}
        </button>
      </div>

      {/* ======= Modals ======= */}
      <AttemptModal attempt={selectedAttempt} onClose={() => setSelectedAttempt(null)} />
      <ReferenceModal isOpen={showReference} onClose={() => setShowReference(false)} />
    </div>
  );
};
