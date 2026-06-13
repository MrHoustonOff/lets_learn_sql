import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, AlertTriangle } from 'lucide-react';
import { CollapsibleSection } from '../../ui/CollapsibleSection';

export const Stage2Report: React.FC<{ report: any }> = ({ report }) => {
  const { t } = useTranslation('submit_report');

  if (!report || !report.rules || report.rules.length === 0) return null;

  return (
    <CollapsibleSection
      title={t('stage2_rules_title', 'Вторичные тесты')}
      defaultOpen={false}
    >
      <div className="flex flex-col gap-2 mt-2">
        {report.rules.map((r: any) => {
          const isWarning = !r.passed && r.severity === 'warning';
          
          let Icon = Check;
          let iconColor = "text-success";
          
          if (!r.passed) {
            if (isWarning) {
              Icon = AlertTriangle;
              iconColor = "text-warning-text";
            } else {
              Icon = X;
              iconColor = "text-destructive";
            }
          }

          return (
            <div key={r.rule_id} className="bg-card rounded-xl border border-glass-border p-3.5 sm:px-5">
              <div className="flex items-start gap-2.5">
                <Icon size={18} className={`${iconColor} mt-[1px] shrink-0`} />
                <div>
                  <p className="text-sm m-0 text-foreground">{r.message}</p>
                  
                  {r.detail_msg && (
                    <p className="text-xs text-muted-foreground m-0 mt-1">
                      {t('found_lbl', 'Найдено:')} {r.detail_msg}
                    </p>
                  )}
                  
                  {!r.passed && r.hint && (
                    <p className={`text-xs m-0 mt-1.5 ${isWarning ? 'text-warning-text' : 'text-destructive'}`}>
                      {r.hint}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
};
