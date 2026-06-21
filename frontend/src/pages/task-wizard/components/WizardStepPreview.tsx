import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Database, CheckCircle2, ListOrdered, GraduationCap } from 'lucide-react';
import { MarkdownText } from '../../../components/ui/MarkdownText';
import { DIFFICULTY_TIERS, DIFFICULTY_LEVELS } from '../mocks';

interface WizardStepPreviewProps {
  data: any;
  setData?: React.Dispatch<React.SetStateAction<any>>;
  allCourses?: any[];
  allDatabases?: any[];
  isEditing?: boolean;
}

export const WizardStepPreview: React.FC<WizardStepPreviewProps> = ({ 
  data, 
  allCourses = [], 
  allDatabases = [], 
  isEditing 
}) => {
  const { t } = useTranslation();

  const author = data.author || t('wizard.preview.unknown');
  const diffTier = data.difficulty ? DIFFICULTY_TIERS.find(t => t.key === DIFFICULTY_LEVELS[data.difficulty]?.tier) : null;
  const diffLevel = data.difficulty ? DIFFICULTY_LEVELS[data.difficulty]?.level : null;
  
  const rulesCount = (data.rules || []).length;
  const db = (allDatabases || []).find(d => d?.id?.toString() === data.database?.toString());
  const course = (allCourses || []).find(c => c?.id?.toString() === data.course?.toString());

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full animate-in fade-in zoom-in-95 duration-200">
      
      {/* 1. Header Hero */}
      <div className="bg-card border border-border/60 rounded-2xl p-8 relative overflow-hidden flex flex-col items-center justify-center text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
            <Sparkles size={32} />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isEditing ? t('wizard.preview.ready_edit_title') : t('wizard.preview.ready_title')}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {isEditing ? t('wizard.preview.ready_edit_desc') : t('wizard.preview.ready_desc')}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-5">
          <div>
            <h3 className="text-xl font-bold mb-1.5 text-foreground whitespace-pre-wrap">{data.title || <span className="text-muted-foreground italic">{t('wizard.preview.no_title')}</span>}</h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
              <span>{t('wizard.preview.author')} {author}</span>
              {data.referenceLink && (
                <a href={data.referenceLink} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  {t('wizard.preview.source_link')}
                </a>
              )}
            </div>
          </div>
          {diffTier && diffLevel !== null && (
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
              <span className="font-medium text-foreground">{t('wizard.preview.count_pcs', { count: rulesCount })}</span>
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
