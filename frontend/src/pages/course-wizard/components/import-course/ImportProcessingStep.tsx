import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface ImportProcessingStepProps {
  current: number;
  total: number;
}

export const ImportProcessingStep: React.FC<ImportProcessingStepProps> = ({ current, total }) => {
  const { t } = useTranslation();

  return (
    <div className="py-20 max-w-md mx-auto flex flex-col items-center text-center">
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-full border-4 border-muted flex items-center justify-center">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" style={{ animationDuration: '2s' }}></div>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">
        {t('import_courses.processing')}
      </h3>
      <p className="text-muted-foreground mb-6">
        {t('import_courses.processing_desc')}
      </p>
      
      <div className="w-full bg-muted rounded-full h-2 mb-2 overflow-hidden">
        <div 
          className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        {t('import_courses.processing_task', { current, total })}
      </p>
    </div>
  );
};
