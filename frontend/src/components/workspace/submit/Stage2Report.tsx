import React from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { StatusIcon } from '../../ui/StatusIcon';
import { InfoTooltip } from '../../ui/InfoTooltip';

export const Stage2Report: React.FC<{ report: any }> = ({ report }) => {
  const { t } = useTranslation('submit_report');

  if (!report) return null;

  return (
    <CollapsibleSection 
      title={t('stage2_rules_title', 'Дополнительные тесты')}
      infoText="Автоматические тесты структуры вашего запроса."
    >
      <div className="flex flex-col gap-1.5">
        {report.rules.map((r: any) => {
          const isWarning = !r.passed && r.severity === 'warning';
          return (
            <div key={r.rule_id} className={`flex items-center gap-2 py-1.5 px-2.5 rounded-md border transition-colors ${!r.passed ? (isWarning ? 'bg-warning/5 border-warning/20 hover:border-warning/40' : 'bg-destructive/5 border-destructive/20 hover:border-destructive/40') : 'bg-success/5 border-success/20 hover:border-success/40'}`}>
              <StatusIcon passed={r.passed} warning={isWarning} size={14} />
              <span className={`text-xs font-mono ${r.passed ? 'text-foreground' : isWarning ? 'text-warning-text' : 'text-destructive'}`}>
                {r.message}
              </span>
              {!r.passed && (
                <span className="text-2xs text-muted-foreground ml-2 opacity-80 max-w-[50%] truncate font-mono" title={r.detail_msg}>
                  — {r.detail_msg}
                </span>
              )}
              <InfoTooltip text="Lorem ipsum dolor sit amet, consectetur adipiscing elit." className="ml-1" />
              <span className="ml-auto text-2xs text-muted-foreground font-mono">1 ms</span>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
};
