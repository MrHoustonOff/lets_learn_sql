import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, AlertTriangle } from 'lucide-react';
import { CollapsibleSection } from '../../ui/CollapsibleSection';

export const Stage2Report: React.FC<{ report: any }> = ({ report }) => {
  const { t } = useTranslation('submit_report');
  const { t: tRules } = useTranslation('rules_i18n');

  if (!report || !report.rules || report.rules.length === 0) return null;

  return (
    <CollapsibleSection
      title={t('stage2_title', 'Дополнительные тесты')}
      infoText={t('stage2_info', 'Эти тесты пишутся вручную самим составителем задачи для проверки логики, производительности или использования конкретных операторов.')}
      defaultOpen={true}
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

          // Generate dynamic rule description
          const ruleKey = `${r.category}.${r.condition}`;
          
          const translateParam = (key: string, val: string) => {
            if (key === 'target' || key === 'object_type' || key === 'scope') {
              return tRules(`enums.${val}`, { defaultValue: val });
            }
            return val;
          };

          const translatedParams: any = {};
          if (r.params) {
            Object.keys(r.params).forEach(k => {
              translatedParams[k] = translateParam(k, r.params[k]);
            });
          }

          const ruleDescription = tRules(ruleKey, translatedParams);

          // Get translated result message, fallback to backend's detail_msg
          const resultStatus = r.passed ? 'passed' : 'failed';
          const resultKey = `result.${r.category}.${r.condition}.${resultStatus}`;
          const detailMessage = tRules(resultKey, {
            ...translatedParams,
            actual: r.actual_value,
            defaultValue: r.detail_msg
          });

          return (
            <div key={r.rule_id} className="bg-card rounded-xl border border-glass-border p-3.5 sm:px-5">
              <div className="flex items-start gap-2.5">
                <Icon size={18} className={`${iconColor} mt-[1px] shrink-0`} />
                <div>
                  <p className="text-sm font-medium m-0 text-foreground">{ruleDescription}</p>
                  
                  {detailMessage && (
                    <p className="text-xs text-muted-foreground m-0 mt-1">
                      {detailMessage}
                    </p>
                  )}
                  
                  {!r.passed && r.message && (
                    <div className={`mt-2 p-2 rounded-md bg-opacity-10 border ${isWarning ? 'bg-warning/10 border-warning/20 text-warning-text' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                      <p className="text-xs m-0">
                        {r.message}
                      </p>
                    </div>
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
