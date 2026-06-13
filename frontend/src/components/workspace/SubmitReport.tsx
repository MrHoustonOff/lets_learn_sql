import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  Table2, ShieldCheck, ShieldX, AlertCircle, Loader2,
} from 'lucide-react';
import type { GradeReport, RuleResult, RowSample } from '../../store/queryStore';

interface SubmitReportProps {
  report: GradeReport | null;
  isSubmitting: boolean;
  submitError: string | null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const StatusIcon: React.FC<{ passed: boolean; warning?: boolean; size?: number }> = ({
  passed, warning = false, size = 16
}) => {
  if (passed) return <CheckCircle2 size={size} className="text-success shrink-0" />;
  if (warning) return <AlertTriangle size={size} className="text-warning shrink-0" />;
  return <XCircle size={size} className="text-destructive shrink-0" />;
};

const CollapsibleRowSample: React.FC<{ sample: RowSample; label: string; accent: string }> = ({
  sample, label, accent
}) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation('submit_report');

  if (sample.total === 0) return null;

  return (
    <div className={`rounded-lg border ${accent} overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-tiny font-medium hover:bg-hover transition-colors"
      >
        <span className="flex items-center gap-2">
          <Table2 size={12} className="shrink-0 opacity-70" />
          {label}
          <span className="opacity-60 font-normal">
            {t('stage1_total_count', { count: sample.total })}
          </span>
        </span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {open && sample.rows.length > 0 && (
        <div className="overflow-x-auto border-t border-inherit">
          <table className="w-full text-2xs font-mono">
            <tbody>
              {sample.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-glass-border/30 last:border-b-0 hover:bg-hover/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1 whitespace-nowrap">
                      {cell === null ? (
                        <span className="opacity-40 italic">NULL</span>
                      ) : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {sample.total > sample.rows.length && (
            <p className="px-3 py-1.5 text-2xs text-muted-foreground opacity-60">
              {t('shown_of', { shown: sample.rows.length, total: sample.total })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const RuleCard: React.FC<{ rule: RuleResult }> = ({ rule }) => {
  const { t } = useTranslation('submit_report');
  const isWarning = !rule.passed && rule.severity === 'warning';

  return (
    <div className={`rounded-xl border px-4 py-3 flex flex-col gap-1.5 ${
      rule.passed
        ? 'border-success/20 bg-success/5'
        : isWarning
          ? 'border-warning/30 bg-warning/5'
          : 'border-destructive/30 bg-destructive/5'
    }`}>
      <div className="flex items-start gap-2">
        <StatusIcon passed={rule.passed} warning={isWarning} />
        <div className="flex-1 min-w-0">
          <p className="text-tiny font-medium leading-snug">
            {rule.passed
              ? t('rule_passed')
              : isWarning
                ? t('rule_failed_warning')
                : t('rule_failed_blocking')}
            {' — '}
            <span className="opacity-70">{rule.detail_msg}</span>
          </p>

          {!rule.passed && rule.message && (
            <div className="mt-1.5 flex items-start gap-1.5">
              <AlertCircle size={11} className="text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-2xs text-muted-foreground leading-snug">
                <span className="font-medium">{t('rule_hint')}:</span>{' '}
                {rule.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const SubmitReport: React.FC<SubmitReportProps> = ({
  report, isSubmitting, submitError
}) => {
  const { t } = useTranslation('submit_report');

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="text-tiny font-medium">{t('checking')}</p>
      </div>
    );
  }

  if (submitError) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <XCircle size={24} className="text-destructive" />
        </div>
        <p className="text-sm text-destructive font-semibold">{submitError}</p>
      </div>
    );
  }

  if (!report) return null;

  const { stage1, stage2, verdict } = report;

  const failedBlocking = stage2.rules.filter(r => !r.passed && r.severity === 'blocking');
  const failedWarning = stage2.rules.filter(r => !r.passed && r.severity === 'warning');
  const passedRules = stage2.rules.filter(r => r.passed);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">

      {/* ======= Verdict Banner ======= */}
      <div className={`rounded-2xl border-2 px-5 py-4 flex items-center gap-4 ${
        verdict
          ? 'border-success/40 bg-success/10'
          : 'border-destructive/40 bg-destructive/10'
      }`}>
        {verdict
          ? <ShieldCheck size={32} className="text-success shrink-0" />
          : <ShieldX size={32} className="text-destructive shrink-0" />
        }
        <div>
          <p className={`text-lg font-bold ${verdict ? 'text-success' : 'text-destructive'}`}>
            {verdict ? t('verdict_passed') : t('verdict_failed')}
          </p>
          <p className="text-2xs text-muted-foreground mt-0.5">
            {report.duration_ms.toFixed(1)} ms
          </p>
        </div>
      </div>

      {/* ======= Stage 1: Data Comparison ======= */}
      <section>
        <h4 className="text-mini font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
          <StatusIcon passed={stage1.passed} size={13} />
          {t('stage1_title')}
        </h4>

        <div className="rounded-xl border border-glass-border bg-glass/30 px-4 py-3 flex flex-col gap-2">

          {/* Row counts */}
          <div className="flex items-center gap-4 text-tiny">
            <span className="text-muted-foreground">{t('stage1_rows_user')}:</span>
            <span className="font-mono font-medium">{stage1.user_row_count}</span>
            <span className="text-muted-foreground">{t('stage1_rows_ref')}:</span>
            <span className="font-mono font-medium">{stage1.ref_row_count}</span>
          </div>

          {/* Hash step (if ran) */}
          {stage1.hash_match !== null && (
            <p className="text-2xs text-muted-foreground flex items-center gap-1.5">
              <StatusIcon passed={!!stage1.hash_match} size={11} />
              {stage1.hash_match ? t('stage1_hash_match') : t('stage1_hash_mismatch')}
            </p>
          )}

          {/* Data match/mismatch */}
          <p className={`text-tiny font-semibold flex items-center gap-2 ${stage1.passed ? 'text-success' : 'text-destructive'}`}>
            <StatusIcon passed={stage1.passed} size={13} />
            {stage1.passed ? t('stage1_data_match') : t('stage1_data_mismatch')}
          </p>

          {/* Order check */}
          {stage1.order_matters && stage1.order_passed !== null && (
            <p className={`text-tiny flex items-center gap-2 ${stage1.order_passed ? 'text-success' : 'text-warning-text'}`}>
              <StatusIcon passed={stage1.order_passed} warning={!stage1.order_passed} size={13} />
              {stage1.order_passed ? t('stage1_order_ok') : t('stage1_order_fail')}
            </p>
          )}

          {/* Discrepancy samples */}
          {stage1.extra_rows && (
            <CollapsibleRowSample
              sample={stage1.extra_rows}
              label={t('stage1_extra_rows')}
              accent="border-destructive/20 bg-destructive/5"
            />
          )}
          {stage1.missing_rows && (
            <CollapsibleRowSample
              sample={stage1.missing_rows}
              label={t('stage1_missing_rows')}
              accent="border-warning/20 bg-warning/5"
            />
          )}
        </div>
      </section>

      {/* ======= Stage 2: Rules ======= */}
      {stage2.ran && stage2.rules.length > 0 && (
        <section>
          <h4 className="text-mini font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
            <StatusIcon passed={stage2.all_blocking_passed} warning={failedWarning.length > 0 && failedBlocking.length === 0} size={13} />
            {t('stage2_title')}
          </h4>

          {/* Status summary */}
          <p className={`text-tiny mb-2 font-medium ${stage2.all_blocking_passed ? 'text-success' : 'text-destructive'}`}>
            {failedBlocking.length === 0 && failedWarning.length === 0
              ? t('stage2_all_passed')
              : failedBlocking.length > 0
                ? t('stage2_failed_count', { count: failedBlocking.length, total: stage2.rules.length })
                : t('stage2_warnings')
            }
          </p>

          <div className="flex flex-col gap-2">
            {/* Failed blocking first */}
            {failedBlocking.map(r => <RuleCard key={r.rule_id} rule={r} />)}
            {/* Warnings */}
            {failedWarning.map(r => <RuleCard key={r.rule_id} rule={r} />)}
            {/* Passed rules */}
            {passedRules.map(r => <RuleCard key={r.rule_id} rule={r} />)}
          </div>
        </section>
      )}
    </div>
  );
};
