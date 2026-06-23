import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, X, Loader2, CheckCircle2, AlertTriangle, AlertCircle, Database, Download } from 'lucide-react';
import { useImportCourse } from './useImportCourse';
import { UploadStep } from '../../../task-wizard/components/import-steps/UploadStep';
import { ImportProcessingStep } from './ImportProcessingStep';
import { ImportReviewStep } from './ImportReviewStep';
import { ImportSuccessStep } from './ImportSuccessStep';

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
            <ImportProcessingStep 
              current={processingCurrent} 
              total={processingTotal} 
            />
          )}

          {step === 'review' && (
            <ImportReviewStep
              courseTitle={courseTitle}
              setCourseTitle={setCourseTitle}
              courseDesc={courseDesc}
              setCourseDesc={setCourseDesc}
              parsedCourse={parsedCourse}
              processedResults={processedResults}
              successTasks={successTasks}
              existingTasks={existingTasks}
              missingDbTasks={missingDbTasks}
              zeroRowsTasks={zeroRowsTasks}
              failedTasks={failedTasks}
              downloadLog={downloadLog}
            />
          )}

          {step === 'success' && (
            <ImportSuccessStep courseTitle={courseTitle} />
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
