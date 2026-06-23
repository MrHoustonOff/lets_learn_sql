import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, X, Loader2, CheckCircle2, AlertTriangle, AlertCircle, Database, Download } from 'lucide-react';
import { useImportCourse } from './useImportCourse';
import { UploadStep } from '../../../task-wizard/components/import-steps/UploadStep';

interface ImportCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFinished: () => void;
  onBack?: () => void;
}

export const ImportCourseModal: React.FC<ImportCourseModalProps> = ({ 
  isOpen, 
  onClose, 
  onImportFinished,
  onBack
}) => {
  const { t } = useTranslation();
  
  const hook = useImportCourse(isOpen, onClose, onImportFinished);
  const {
    step,
    dragActive, uploadError,
    parsedCourse, courseTitle, setCourseTitle, courseDesc, setCourseDesc,
    processingTotal, processingCurrent, processedResults,
    isPublishing,
    handleCancel, handleDrag, handleDrop, handleFileChange,
    publishCourse
  } = hook;

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isPublishing) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, processedResults, isPublishing]);

  if (!isOpen) return null;

  const successTasks = processedResults.filter(r => r.status === 'success');
  const existingTasks = processedResults.filter(r => r.status === 'existing');
  const missingDbTasks = processedResults.filter(r => r.status === 'missing_db');
  const zeroRowsTasks = processedResults.filter(r => r.status === 'zero_rows');
  const failedTasks = processedResults.filter(r => r.status === 'failed');

  const downloadLog = () => {
    const logs: string[] = [];
    logs.push("=== COURSE IMPORT ERROR LOG ===");
    logs.push(`Course: ${courseTitle}`);
    logs.push(`Date: ${new Date().toLocaleString()}\n`);

    if (missingDbTasks.length > 0) {
      logs.push("--- MISSING DATABASES ---");
      missingDbTasks.forEach(r => {
        logs.push(`Task: ${r.taskData.title}`);
        logs.push(`DB: ${r.dbName}`);
        logs.push(`Error: ${r.errorMessage}\n`);
      });
    }

    if (zeroRowsTasks.length > 0) {
      logs.push("--- ZERO ROWS RETURNED ---");
      zeroRowsTasks.forEach(r => {
        logs.push(`Task: ${r.taskData.title}`);
        logs.push(`DB: ${r.dbName}\n`);
      });
    }

    if (failedTasks.length > 0) {
      logs.push("--- FAILED TESTS ---");
      failedTasks.forEach(r => {
        logs.push(`Task: ${r.taskData.title}`);
        logs.push(`Error: ${r.errorMessage}\n`);
      });
    }

    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-modal-backdrop bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget && !isPublishing) handleCancel(); }}
    >
      <div className="bg-card shadow-2xl border border-glass-border w-full max-w-6xl rounded-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden relative max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground leading-tight">
                {step === 'upload' && t('import_courses.title')}
                {step === 'processing' && t('import_courses.processing')}
                {step === 'review' && t('import_courses.review')}
                {step === 'success' && t('import_courses.success_title')}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isPublishing && (
              <button 
                onClick={handleCancel}
                className="p-2 rounded-xl hover:bg-hover text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          
          {step === 'upload' && (
            <UploadStep 
              dragActive={dragActive}
              handleDrag={handleDrag}
              handleDrop={handleDrop}
              handleFileChange={handleFileChange}
              uploadError={uploadError}
              dropZoneText={t('import_courses.drop_zone')}
              selectFileText={t('import_courses.select_file')}
              isMultiple={false}
              onBack={onBack}
            />
          )}

          {step === 'processing' && (
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
                  style={{ width: `${(processingCurrent / processingTotal) * 100}%` }}
                />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('import_courses.processing_task', { current: processingCurrent, total: processingTotal })}
              </p>
            </div>
          )}

          {step === 'review' && (
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
                      placeholder="Название курса..."
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
                      placeholder="Описание курса..."
                    />
                  </div>
                </div>

                {/* Course TOC Preview */}
                <div>
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Структура курса</h4>
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
                                      {res.errorMessage || "Ошибка проверки"}
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
                    Результаты проверки
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
                    <div className="p-5 rounded-2xl border border-success/30 bg-success/10 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-3 bg-success/20 rounded-xl text-success shrink-0">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <div className="text-success font-bold text-lg mb-1 leading-none">
                          {successTasks.length} {t('import_courses.stat_success')}
                        </div>
                        <p className="text-sm text-success-text/80 leading-relaxed">
                          {t('import_courses.stat_success_desc')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Existing */}
                  {existingTasks.length > 0 && (
                    <div className="p-5 rounded-2xl border border-primary/30 bg-primary/10 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-3 bg-primary/20 rounded-xl text-primary shrink-0">
                        <BookOpen size={24} />
                      </div>
                      <div>
                        <div className="text-primary font-bold text-lg mb-1 leading-none">
                          {existingTasks.length} {t('import_courses.stat_existing')}
                        </div>
                        <p className="text-sm text-primary/80 leading-relaxed">
                          {t('import_courses.stat_existing_desc')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Missing DB */}
                  {missingDbTasks.length > 0 && (
                    <div className="p-5 rounded-2xl border border-destructive/30 bg-destructive/10 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-bl-full -z-0"></div>
                      <div className="p-3 bg-destructive/20 rounded-xl text-destructive shrink-0 relative z-10">
                        <Database size={24} />
                      </div>
                      <div className="relative z-10 flex-1">
                        <div className="text-destructive font-bold text-lg mb-1 leading-none">
                          {missingDbTasks.length} {t('import_courses.stat_missing_db')}
                        </div>
                        <p className="text-sm text-destructive-text/90 leading-relaxed font-medium mb-3">
                          {t('import_courses.stat_missing_db_desc')}
                        </p>
                        <div className="bg-destructive/10 rounded-xl p-3 border border-destructive/20">
                          <p className="text-xs font-bold text-destructive uppercase tracking-wider mb-2">Отсутствующие БД:</p>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(missingDbTasks.map(t => t.dbName).filter(Boolean))).map((db, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-md bg-background/50 border border-destructive/20 text-xs font-mono text-destructive-text/90 shadow-sm">
                                {db}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Zero Rows */}
                  {zeroRowsTasks.length > 0 && (
                    <div className="p-5 rounded-2xl border border-warning/40 bg-warning/10 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-warning/5 rounded-bl-full -z-0"></div>
                      <div className="p-3 bg-warning/20 rounded-xl text-warning-text shrink-0 relative z-10">
                        <AlertTriangle size={24} />
                      </div>
                      <div className="relative z-10">
                        <div className="text-warning-text font-bold text-lg mb-1 leading-none">
                          {zeroRowsTasks.length} {t('import_courses.stat_zero_rows')}
                        </div>
                        <p className="text-sm text-warning-text/90 leading-relaxed font-medium">
                          {t('import_courses.stat_zero_rows_desc')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Failed */}
                  {failedTasks.length > 0 && (
                    <div className="p-5 rounded-2xl border border-destructive/30 bg-destructive/10 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-bl-full -z-0"></div>
                      <div className="p-3 bg-destructive/20 rounded-xl text-destructive shrink-0 relative z-10">
                        <AlertCircle size={24} />
                      </div>
                      <div className="relative z-10">
                        <div className="text-destructive font-bold text-lg mb-1 leading-none">
                          {failedTasks.length} {t('import_courses.stat_failed')}
                        </div>
                        <p className="text-sm text-destructive-text/90 leading-relaxed font-medium">
                          {t('import_courses.stat_failed_desc')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {step === 'success' && (
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
          )}

        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-glass-border bg-glass/10 shrink-0">
          <div>
            {(step === 'review' || step === 'upload') && !isPublishing && (
              <button 
                onClick={handleCancel}
                className="px-5 py-2 text-xs font-bold bg-secondary border border-border text-foreground hover:bg-hover rounded-xl transition-colors focus:outline-none"
              >
                {t('import_courses.cancel')}
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {step === 'review' && (
              <button
                onClick={publishCourse}
                disabled={isPublishing || !courseTitle.trim() || (successTasks.length === 0 && existingTasks.length === 0)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all focus:outline-none ${
                  !isPublishing && courseTitle.trim() && (successTasks.length > 0 || existingTasks.length > 0)
                    ? 'bg-primary text-primary-foreground hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(var(--primary),0.3)]'
                    : 'bg-muted border border-glass-border text-muted-foreground/50 cursor-not-allowed pointer-events-none'
                }`}
              >
                {isPublishing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {t('import_courses.processing')}
                  </>
                ) : (
                  t('import_courses.publish')
                )}
              </button>
            )}

            {step === 'success' && (
              <button
                onClick={() => {
                  onClose();
                }}
                className="px-6 py-2.5 bg-primary text-primary-foreground hover:brightness-110 active:scale-95 rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(var(--primary),0.3)] focus:outline-none transition-all"
              >
                {t('done')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
