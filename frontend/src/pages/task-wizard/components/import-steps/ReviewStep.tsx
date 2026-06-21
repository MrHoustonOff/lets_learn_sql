import React from 'react';
import { useTranslation } from 'react-i18next';
import { Database, GraduationCap, CheckCircle2, ListOrdered, Copy, Check, AlertTriangle } from 'lucide-react';
import { MarkdownText } from '../../../../components/ui/MarkdownText';
import { SqlResultPreview } from './SqlResultPreview';
import { RuleResultItem } from './RuleResultItem';
import { CollapsibleSection } from '../../../../components/ui/CollapsibleSection';
import { InfoTooltip } from '../../../../components/ui/InfoTooltip';
import { DIFFICULTY_TIERS, DIFFICULTY_LEVELS } from '../../mocks';

interface ReviewStepProps {
  currentResult: any;
  previewData: any;
  allDatabases: any[];
  allCourses: any[];
  isCopied: boolean;
  handleCopyResults: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  currentResult, previewData, allDatabases, allCourses, isCopied, handleCopyResults
}) => {
  const { t } = useTranslation();

  const diffTier = previewData?.difficulty !== undefined && previewData?.difficulty !== null 
    ? DIFFICULTY_TIERS.find(t => t.key === DIFFICULTY_LEVELS[previewData.difficulty]?.tier) 
    : null;
  const diffLevel = previewData?.difficulty !== undefined && previewData?.difficulty !== null 
    ? DIFFICULTY_LEVELS[previewData.difficulty]?.level 
    : null;
    
  const db = allDatabases.find(d => d.id.toString() === previewData?.database?.toString());
  const course = allCourses.find(c => c.id.toString() === previewData?.course?.toString());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch min-h-0 flex-1">
      {/* Left Column: Visual Task Preview */}
      <div className="border border-glass-border bg-glass/5 rounded-2xl p-6 space-y-5 overflow-y-auto custom-scrollbar max-h-[55vh]">
        <div className="flex items-start justify-between gap-4 border-b border-glass-border pb-4">
          <div>
            <h3 className="text-sm font-bold mb-1 text-foreground whitespace-pre-wrap">
              {previewData?.title || <span className="text-muted-foreground italic">{t('wizard.preview.no_title')}</span>}
            </h3>
            <div className="flex items-center gap-3 text-2xs text-muted-foreground font-medium">
              <span>{t('wizard.preview.author')} {previewData?.author_name || t('wizard.preview.unknown')}</span>
              {previewData?.source_url && (
                <a href={previewData.source_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                  {t('wizard.preview.source_link')}
                </a>
              )}
            </div>
          </div>
          
          {diffTier && diffLevel !== null && (
            <div className="flex items-center gap-1 shrink-0 p-1.5 rounded-lg bg-secondary/50 border border-border/50" title={`${t(`wizard.info.difficulty_tiers.${diffTier.key}`)} ${diffLevel}/3`}>
              {[1, 2, 3].map((i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full shadow-sm ${i <= diffLevel ? diffTier.color : "bg-muted"}`} />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-glass-border text-2xs">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground w-16">{t('wizard.preview.database')}</span>
              <span className="font-semibold text-foreground truncate">{db?.display_name || currentResult.dbName}</span>
            </div>
            {course && (
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground w-16">{t('wizard.preview.course')}</span>
                <span className="font-semibold text-foreground truncate">{course.title}</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground w-20">{t('wizard.preview.ast_rules')}</span>
              <span className="font-semibold text-foreground">{t('wizard.preview.count_pcs', { count: previewData?.rules?.length || 0 })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ListOrdered className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground w-20">{t('wizard.preview.order_matters')}</span>
              <span className="font-semibold text-foreground">{previewData?.order_matters ? t('wizard.preview.important') : t('wizard.preview.not_important')}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-2xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{t('wizard.preview.description_title')}</h4>
          <div className="prose dark:prose-invert max-w-none text-xs bg-muted/10 rounded-xl p-3 border border-border/20">
            {previewData?.description ? (
              <MarkdownText text={previewData.description} />
            ) : (
              <span className="text-muted-foreground italic">{t('wizard.preview.no_description')}</span>
            )}
          </div>
          
          {previewData?.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {previewData.tags.map((tag: string) => (
                <span key={tag} className="px-2 py-0.5 rounded bg-secondary border border-border text-foreground text-2xs font-medium shadow-sm">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Execution & Validation test results */}
      <div className={`rounded-2xl p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar max-h-[55vh] border transition-colors ${currentResult.isValid ? 'bg-success/5 border-success/30' : 'bg-destructive/5 border-destructive/30'}`}>
        <div className="flex items-center justify-between border-b border-glass-border pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('import_tasks.test_results')}
            </h4>
            <InfoTooltip text={t('import_tasks.test_results_info')} />
          </div>
          <button
            onClick={handleCopyResults}
            title={t('import_tasks.copy_results')}
            className="p-1.5 rounded-lg hover:bg-hover text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center focus:outline-none"
          >
            {isCopied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
          </button>
        </div>
        
        {/* Database missing / resolution errors */}
        {currentResult.processingError ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-destructive/5 border border-destructive/15 rounded-xl gap-2">
            <AlertTriangle size={32} className="text-destructive animate-bounce" />
            <p className="text-xs font-bold text-destructive">{t('import_tasks.errors.processing_failed')}</p>
            <p className="text-2xs text-muted-foreground max-w-[280px]">{currentResult.processingError}</p>
          </div>
        ) : (
          <div className="space-y-4 flex-1">
            
            {/* 1. SQL Execution Check */}
            <CollapsibleSection title={t('import_tasks.sql_check')} infoText={t('import_tasks.sql_check_info')} defaultOpen={true}>
              <SqlResultPreview 
                sqlSuccess={currentResult.sqlSuccess} 
                sqlError={currentResult.sqlError} 
                sqlResult={currentResult.sqlResult} 
              />
            </CollapsibleSection>

            {/* 2. AST Rules Check */}
            <CollapsibleSection title={t('import_tasks.rules_check')} infoText={t('import_tasks.rules_check_info')} defaultOpen={true}>
              {currentResult.rulesResults.length === 0 ? (
                <div className="p-3 bg-muted/10 rounded-xl text-2xs text-muted-foreground italic">
                  {t('import_tasks.no_rules')}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {currentResult.rulesResults.map((r: any, idx: number) => (
                    <RuleResultItem key={idx} rule={r} />
                  ))}
                </div>
              )}
            </CollapsibleSection>
          </div>
        )}
      </div>
    </div>
  );
};
