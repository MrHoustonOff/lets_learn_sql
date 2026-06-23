import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';

interface ImportSuccessStepProps {
  courseTitle: string;
}

export const ImportSuccessStep: React.FC<ImportSuccessStepProps> = ({ courseTitle }) => {
  const { t } = useTranslation();

  return (
    <div className="py-16 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 size={40} className="text-success" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-3">
        {t('import_courses.success_title')}
      </h2>
      <p className="text-muted-foreground max-w-sm">
        {t('import_courses.success_desc', { title: courseTitle })}
      </p>
    </div>
  );
};
