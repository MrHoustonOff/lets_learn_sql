import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldX, KeyRound } from 'lucide-react';
import type { GradeReport } from '../../store/queryStore';
import { Stage1Report } from './submit/Stage1Report';
import { Stage2Report } from './submit/Stage2Report';
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

  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [showReference, setShowReference] = useState(false);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-10">
      
      <Stage1Report report={MOCK_STAGE1_REPORT} />
      <Stage2Report report={MOCK_STAGE2_REPORT} />

      {/* ======= Verdict Banner ======= */}
      <div className="rounded-lg border px-4 py-3 flex items-center gap-3.5 border-destructive/40 bg-destructive/10">
        <ShieldX size={28} className="text-destructive shrink-0" />
        <div>
          <p className="text-base font-bold text-destructive tracking-tight">{t('basic_check_failed', 'Базовая проверка не пройдена')}</p>
          <p className="text-2xs text-muted-foreground mt-0.5 font-mono">
            42.5 ms
          </p>
        </div>
      </div>

      <HistoryPanel history={MOCK_HISTORY} onOpenAttempt={setSelectedAttempt} />

      <div className="h-px bg-glass-border w-full my-2 opacity-50" />

      <div className="text-center pt-6 pb-2 text-muted-foreground opacity-60">
        <p className="text-tiny">{t('empty_state_desc', 'Оно открывается после того, как вы совершите хотя бы одну попытку решения.')}</p>
      </div>

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
