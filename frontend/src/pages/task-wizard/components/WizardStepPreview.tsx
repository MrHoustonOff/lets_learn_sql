import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Database, CheckCircle2, ListOrdered, GraduationCap } from 'lucide-react';
import { MarkdownText } from '../../../components/ui/MarkdownText';
import { DIFFICULTY_TIERS } from '../mocks';

interface WizardStepPreviewProps {
  data: any;
  setData: React.Dispatch<React.SetStateAction<any>>;
  allCourses: any[];
  allDatabases: any[];
}

export const WizardStepPreview: React.FC<WizardStepPreviewProps> = ({ data, allCourses, allDatabases }) => {
  const { t } = useTranslation();

  const diffInt = typeof data.difficulty === 'number' ? data.difficulty : parseInt(data.difficulty || '1', 10);
  const tierIdx = Math.floor((diffInt - 1) / 3);
  const diffTier = DIFFICULTY_TIERS[tierIdx >= 0 && tierIdx < DIFFICULTY_TIERS.length ? tierIdx : 0];
  const diffLevel = ((diffInt - 1) % 3) + 1;
  const db = allDatabases.find(d => d.id.toString() === data.database?.toString());
  const course = allCourses.find(c => c.id.toString() === data.course?.toString());

  return (
    <div className="max-w-3xl mx-auto space-y-8 mt-4">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{t('wizard.preview.ready_title')}</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t('wizard.preview.ready_desc')}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-5">
          <div>
            <h3 className="text-xl font-bold mb-1.5 text-foreground">{data.title || <span className="text-muted-foreground italic">{t('wizard.preview.no_title')}</span>}</h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
              <span>{t('wizard.preview.author')} {data.author || t('wizard.preview.unknown')}</span>
              {data.referenceLink && (
                <a href={data.referenceLink} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  {t('wizard.preview.source_link')}
                </a>
              )}
            </div>
          </div>
          {diffTier && (
            <div className="flex items-center gap-1 shrink-0 p-2 rounded-lg bg-secondary/50 border border-border/50" title={`${t(`wizard.info.difficulty_tiers.${diffTier.key}`)} ${diffLevel}/3`}>
              {[1, 2, 3].map((i) => (
                <span key={i} className={`w-2 h-2 rounded-full shadow-sm ${i <= diffLevel ? diffTier.color : "bg-muted"}`} />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6 pb-5 border-b border-border/50">
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground w-20">{t('wizard.preview.database')}</span>
              <span className="font-medium text-foreground">{db?.display_name || t('wizard.preview.not_selected')}</span>
            </div>
            {course && (
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground w-20">{t('wizard.preview.course')}</span>
                <span className="font-medium text-foreground">{course.title}</span>
              </div>
            )}
          </div>
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground w-24">{t('wizard.preview.ast_rules')}</span>
              <span className="font-medium text-foreground">{t('wizard.preview.count_pcs', { count: data.rules?.length || 0 })}</span>
            </div>
            <div className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground w-24">{t('wizard.preview.order_matters')}</span>
              <span className="font-medium text-foreground">{data.orderMatters ? t('wizard.preview.important') : t('wizard.preview.not_important')}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">{t('wizard.preview.description_title')}</h4>
          <div className="prose dark:prose-invert max-w-none text-sm bg-muted/20 rounded-xl p-4 border border-border/40">
            {data.description ? (
              <MarkdownText text={data.description} />
            ) : (
              <span className="text-muted-foreground italic">{t('wizard.preview.no_description')}</span>
            )}
          </div>
          
          {data.tags?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.tags.map((t: string) => (
                <span key={t} className="px-2.5 py-1 rounded-md bg-secondary border border-border text-foreground text-xs font-medium shadow-sm">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
