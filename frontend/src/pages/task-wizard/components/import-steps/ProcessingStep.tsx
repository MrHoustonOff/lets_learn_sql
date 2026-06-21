import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface ProcessingStepProps {
  processingCurrent: number;
  processingTotal: number;
  tasksToProcess: any[];
}

export const ProcessingStep: React.FC<ProcessingStepProps> = ({ processingCurrent, processingTotal, tasksToProcess }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-10 gap-6">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary relative">
        <Loader2 size={28} className="animate-spin" />
      </div>
      <div className="text-center space-y-1.5">
        <h4 className="text-sm font-bold text-foreground">{t('import_tasks.processing')}</h4>
        <p className="text-xs text-muted-foreground">
          {t('import_tasks.processing_task', { current: processingCurrent, total: processingTotal })}
        </p>
      </div>
      <div className="w-full max-w-sm h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-200" 
          style={{ width: `${(processingCurrent / processingTotal) * 100}%` }}
        />
      </div>
      {tasksToProcess[processingCurrent - 1] && (
        <p className="text-2xs font-mono text-muted-foreground truncate max-w-xs">
          {t('import_tasks.current_task')}: {tasksToProcess[processingCurrent - 1].title || t('wizard.preview.no_title')}
        </p>
      )}
    </div>
  );
};
