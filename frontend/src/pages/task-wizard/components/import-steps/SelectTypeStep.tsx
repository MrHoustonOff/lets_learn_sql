import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, GraduationCap } from 'lucide-react';

interface SelectTypeStepProps {
  setStep: (step: any) => void;
  onSelectCourse?: () => void;
}

export const SelectTypeStep: React.FC<SelectTypeStepProps> = ({ setStep, onSelectCourse }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6 py-4">
      <p className="text-sm text-muted-foreground">{t('import_tasks.select_type')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setStep('upload')}
          className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-glass-border bg-glass/20 hover:bg-glass-hover hover:border-primary/50 text-center transition-all duration-200 group focus:outline-none"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground mb-1">{t('import_tasks.tasks')}</h4>
            <p className="text-2xs text-muted-foreground">{t('import_tasks.tasks_desc')}</p>
          </div>
        </button>

        <button
          onClick={() => {
            if (onSelectCourse) onSelectCourse();
          }}
          className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-glass-border bg-glass/20 hover:bg-glass-hover hover:border-primary/50 text-center transition-all duration-200 group focus:outline-none"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
            <GraduationCap size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground mb-1">{t('import_tasks.course')}</h4>
            <p className="text-2xs text-muted-foreground">{t('import_courses.description')}</p>
          </div>
        </button>
      </div>
    </div>
  );
};
