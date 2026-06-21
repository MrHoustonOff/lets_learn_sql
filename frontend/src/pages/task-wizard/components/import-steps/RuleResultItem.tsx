import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, X, AlertTriangle } from 'lucide-react';

interface RuleResultItemProps {
  rule: {
    passed: boolean;
    severity: string;
    category: string;
    condition: string;
    message?: string;
    detail?: string;
    hint?: string;
  };
}

export const RuleResultItem: React.FC<RuleResultItemProps> = ({ rule }) => {
  const { t } = useTranslation();
  
  const isError = !rule.passed && rule.severity === 'blocking';
  const isSuccess = rule.passed;

  return (
    <div className="bg-card rounded-xl border border-glass-border p-3.5 sm:px-5">
      <div className="flex items-start gap-2.5">
        {isSuccess ? (
          <CheckCircle2 size={18} className="text-success mt-[1px] shrink-0" />
        ) : isError ? (
          <X size={18} className="text-destructive mt-[1px] shrink-0" />
        ) : (
          <AlertTriangle size={18} className="text-warning-text mt-[1px] shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium m-0 text-foreground">
            {rule.message || `${rule.category}.${rule.condition}`}
          </p>
          <p className="text-xs text-muted-foreground m-0 mt-1">
            {rule.detail || (isSuccess ? t('import_tasks.rule_passed') : (rule.severity === 'blocking' ? t('import_tasks.blocking_rule_failed') : t('import_tasks.rule_failed')))}
          </p>
          {!rule.passed && rule.hint && (
            <div className={`mt-2 p-2 rounded-md bg-opacity-10 border ${isError ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-warning/10 border-warning/20 text-warning-text'}`}>
              <p className="text-xs m-0">{rule.hint}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
