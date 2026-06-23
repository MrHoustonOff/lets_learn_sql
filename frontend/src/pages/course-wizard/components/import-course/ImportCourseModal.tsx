import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, X, Loader2, UploadCloud, CheckCircle2, AlertTriangle, AlertCircle, Database, Download } from 'lucide-react';
import { useImportCourse } from './useImportCourse';

interface ImportCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFinished: () => void;
}

export const ImportCourseModal: React.FC<ImportCourseModalProps> = ({ 
  isOpen, 
  onClose, 
  onImportFinished 
}) => {
  const { t } = useTranslation();
  
  const hook = useImportCourse(isOpen, onClose, onImportFinished);
  const {
    step,
    dragActive, uploadError,
    courseTitle, setCourseTitle, courseDesc, setCourseDesc,
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
      <div className="bg-card shadow-2xl border border-glass-border w-full max-w-4xl rounded-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden relative max-h-[90vh]">
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
            <div className="py-10 max-w-lg mx-auto">
              <p className="text-center text-muted-foreground mb-8">
                {t('import_courses.description')}
              </p>

              <form 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl transition-all duration-200 ${
                  dragActive 
                    ? 'border-primary bg-primary/10 scale-[1.02]' 
                    : uploadError 
                      ? 'border-destructive/50 bg-destructive/5' 
                      : 'border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/50'
                }`}
              >
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className={`p-4 rounded-full mb-4 ${dragActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <UploadCloud size={32} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 text-center">
                  {t('import_courses.drop_zone')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('import_courses.select_file')}
                </p>
              </form>

              {uploadError && (
                <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                  <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive-text font-medium">{uploadError}</p>
                </div>
              )}
            </div>
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
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Course details */}
              <div className="space-y-4 bg-muted/20 p-5 rounded-2xl border border-glass-border">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {t('import_courses.course_title')}
                  </label>
                  <input
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    placeholder="Название курса..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {t('import_courses.course_desc')}
                  </label>
                  <textarea
                    value={courseDesc}
                    onChange={(e) => setCourseDesc(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[100px] resize-y custom-scrollbar"
                    placeholder="Описание курса..."
                  />
                </div>
              </div>

              {/* Statistics */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Database size={18} className="text-primary" />
                    {t('import_courses.stats')}
                  </h3>
                  {(missingDbTasks.length > 0 || zeroRowsTasks.length > 0 || failedTasks.length > 0) && (
                    <button
                      onClick={downloadLog}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-secondary hover:bg-hover text-secondary-foreground rounded-xl transition-colors focus:outline-none"
                    >
                      <Download size={14} />
                      {t('import_courses.download_log')}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Success */}
                  <div className="p-4 rounded-xl border border-success/20 bg-success/5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-success font-bold text-lg">
                      <CheckCircle2 size={20} />
                      {successTasks.length} {t('import_courses.stat_success')}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('import_courses.stat_success_desc')}
                    </p>
                  </div>

                  {/* Existing */}
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-primary font-bold text-lg">
                      <BookOpen size={20} />
                      {existingTasks.length} {t('import_courses.stat_existing')}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('import_courses.stat_existing_desc')}
                    </p>
                  </div>

                  {/* Missing DB */}
                  <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-destructive font-bold text-lg">
                      <Database size={20} />
                      {missingDbTasks.length} {t('import_courses.stat_missing_db')}
                    </div>
                    <p className="text-xs text-destructive-text/80 leading-relaxed font-medium">
                      {t('import_courses.stat_missing_db_desc')}
                    </p>
                  </div>

                  {/* Zero Rows */}
                  <div className="p-4 rounded-xl border border-warning/30 bg-warning/10 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-warning-text font-bold text-lg">
                      <AlertTriangle size={20} />
                      {zeroRowsTasks.length} {t('import_courses.stat_zero_rows')}
                    </div>
                    <p className="text-xs text-warning-text/80 leading-relaxed font-medium">
                      {t('import_courses.stat_zero_rows_desc')}
                    </p>
                  </div>

                  {/* Failed */}
                  <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col gap-2 sm:col-span-2">
                    <div className="flex items-center gap-2 text-destructive font-bold text-lg">
                      <AlertCircle size={20} />
                      {failedTasks.length} {t('import_courses.stat_failed')}
                    </div>
                    <p className="text-xs text-destructive-text/80 leading-relaxed font-medium">
                      {t('import_courses.stat_failed_desc')}
                    </p>
                  </div>
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
