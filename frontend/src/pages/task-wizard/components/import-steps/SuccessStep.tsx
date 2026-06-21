import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';

interface SuccessStepProps {
  processedResults: any[];
}

export const SuccessStep: React.FC<SuccessStepProps> = ({ processedResults }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-10 gap-5 text-center">
      <div className="w-14 h-14 rounded-full bg-success/15 text-success flex items-center justify-center animate-bounce">
        <CheckCircle2 size={32} />
      </div>
      <div className="space-y-1">
        <h4 className="text-base font-bold text-foreground">{t('import_tasks.success_title')}</h4>
        <p className="text-xs text-muted-foreground">
          {t('import_tasks.success_desc', { count: processedResults.filter((r: any) => r.isValid).length })}
        </p>
      </div>
    </div>
  );
};
