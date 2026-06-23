import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Database, Loader2, CheckCircle2, AlertTriangle, AlertCircle, Download } from 'lucide-react';
import type { CourseTaskResult } from './useImportCourse';

interface ImportReviewStepProps {
  courseTitle: string;
  setCourseTitle: (val: string) => void;
  courseDesc: string;
  setCourseDesc: (val: string) => void;
  parsedCourse: any;
  processedResults: CourseTaskResult[];
  successTasks: CourseTaskResult[];
  existingTasks: CourseTaskResult[];
  missingDbTasks: CourseTaskResult[];
  zeroRowsTasks: CourseTaskResult[];
  failedTasks: CourseTaskResult[];
  downloadLog: () => void;
}

export const ImportReviewStep: React.FC<ImportReviewStepProps> = ({
  courseTitle, setCourseTitle,
  courseDesc, setCourseDesc,
  parsedCourse,
  processedResults,
  successTasks,
  existingTasks,
  missingDbTasks,
  zeroRowsTasks,
  failedTasks,
  downloadLog
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Left Column: Course Preview & Details */}
      <div className="flex flex-col gap-6 lg:border-r lg:border-glass-border lg:pr-6 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={20} className="text-primary" />
          <h3 className="text-lg font-bold text-foreground">
            {t('import_courses.review')}
          </h3>
        </div>

        <div className="space-y-4 bg-muted/10 p-5 rounded-2xl border border-glass-border/50">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {t('import_courses.course_title')}
            </label>
            <input
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none shadow-sm"
              placeholder={t('import_courses.course_title_placeholder')}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {t('import_courses.course_desc')}
            </label>
            <textarea
              value={courseDesc}
              onChange={(e) => setCourseDesc(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[100px] resize-y custom-scrollbar shadow-sm"
              placeholder={t('import_courses.course_desc_placeholder')}
            />
          </div>
        </div>

        {/* Course TOC Preview */}
        <div>
          <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">{t('import_courses.course_structure')}</h4>
          <div className="space-y-4">
            {parsedCourse?.sections?.map((sec: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl border border-glass-border bg-glass/20 transition-colors hover:bg-glass/30">
                <div className="font-bold text-foreground mb-4 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-sm shadow-sm border border-primary/20 shrink-0">
                    {idx + 1}
                  </div>
                  <span className="truncate leading-tight">{sec.title}</span>
                </div>
                <div className="space-y-2.5 pl-3 border-l-2 border-primary/20 ml-3.5 relative">
                  {sec.tasks?.map((task: any, tIdx: number) => {
                    const res = processedResults.find(r => r.taskData.title === task.title && r.taskData.description === task.description);
                    
                    let StatusIcon = Loader2;
                    let statusColor = "text-muted-foreground";
                    if (res) {
                      if (res.status === 'success') { StatusIcon = CheckCircle2; statusColor = "text-success"; }
                      else if (res.status === 'existing') { StatusIcon = BookOpen; statusColor = "text-primary"; }
                      else if (res.status === 'missing_db') { StatusIcon = Database; statusColor = "text-destructive"; }
                      else if (res.status === 'zero_rows') { StatusIcon = AlertTriangle; statusColor = "text-warning-text"; }
                      else if (res.status === 'failed') { StatusIcon = AlertCircle; statusColor = "text-destructive"; }
                    }

                    return (
                      <div key={tIdx} className="flex items-start gap-3 group relative before:absolute before:w-3 before:h-[2px] before:bg-primary/20 before:-left-3 before:top-[11px]">
                        <div className={`shrink-0 mt-0.5 ${statusColor} bg-background rounded-full p-0.5 shadow-sm`}>
                          <StatusIcon size={14} className={!res ? "animate-spin" : ""} />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors cursor-default">
                            {task.title || `Task ${tIdx + 1}`}
                          </span>
                          {res && res.status !== 'success' && res.status !== 'existing' && (
                            <span className="text-xs text-destructive-text/80 truncate mt-0.5">
                              {res.errorMessage || t('import_courses.validation_error')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Stats & Errors */}
      <div className="flex flex-col gap-6 lg:pl-2 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Database size={18} className="text-primary" />
            {t('import_courses.validation_results')}
          </h3>
          {(missingDbTasks.length > 0 || zeroRowsTasks.length > 0 || failedTasks.length > 0) && (
            <button
              onClick={downloadLog}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-secondary hover:bg-hover text-secondary-foreground rounded-xl transition-colors focus:outline-none shadow-sm"
            >
              <Download size={14} />
              {t('import_courses.download_log')}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* Success */}
          {successTasks.length > 0 && (
            <div className="p-4 rounded-xl border-l-4 border-l-success border-y border-r border-glass-border bg-card flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-success" />
                <div className="text-foreground font-bold text-base leading-none">
                  {successTasks.length} {t('import_courses.stat_success')}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-7">
                {t('import_courses.stat_success_desc')}
              </p>
            </div>
          )}

          {/* Existing */}
          {existingTasks.length > 0 && (
            <div className="p-4 rounded-xl border-l-4 border-l-primary border-y border-r border-glass-border bg-card flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <BookOpen size={18} className="text-primary" />
                <div className="text-foreground font-bold text-base leading-none">
                  {existingTasks.length} {t('import_courses.stat_existing')}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-7">
                {t('import_courses.stat_existing_desc')}
              </p>
            </div>
          )}

          {/* Missing DB */}
          {missingDbTasks.length > 0 && (
            <div className="p-4 rounded-xl border-l-4 border-l-destructive border-y border-r border-glass-border bg-card flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-destructive" />
                <div className="text-foreground font-bold text-base leading-none">
                  {missingDbTasks.length} {t('import_courses.stat_missing_db')}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-7">
                {t('import_courses.stat_missing_db_desc')}
              </p>
              <div className="pl-7">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('import_courses.missing_dbs_list')}</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(missingDbTasks.map(t => t.dbName).filter(Boolean))).map((db, i) => (
                    <span key={i} className="px-2 py-1 rounded border border-glass-border bg-muted/30 text-xs font-mono text-muted-foreground">
                      {db}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Zero Rows */}
          {zeroRowsTasks.length > 0 && (
            <div className="p-4 rounded-xl border-l-4 border-l-warning-text border-y border-r border-glass-border bg-card flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-warning-text" />
                <div className="text-foreground font-bold text-base leading-none">
                  {zeroRowsTasks.length} {t('import_courses.stat_zero_rows')}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-7">
                {t('import_courses.stat_zero_rows_desc')}
              </p>
            </div>
          )}

          {/* Failed */}
          {failedTasks.length > 0 && (
            <div className="p-4 rounded-xl border-l-4 border-l-destructive border-y border-r border-glass-border bg-card flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} className="text-destructive" />
                <div className="text-foreground font-bold text-base leading-none">
                  {failedTasks.length} {t('import_courses.stat_failed')}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-7">
                {t('import_courses.stat_failed_desc')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
