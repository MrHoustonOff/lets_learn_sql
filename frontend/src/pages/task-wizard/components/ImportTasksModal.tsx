import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FileJson, X, Loader2 } from 'lucide-react';
import { SelectTypeStep } from './import-steps/SelectTypeStep';
import { UploadStep } from './import-steps/UploadStep';
import { ProcessingStep } from './import-steps/ProcessingStep';
import { ReviewStep } from './import-steps/ReviewStep';
import { SuccessStep } from './import-steps/SuccessStep';
import { useImportTasks } from './useImportTasks';

interface ImportTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFinished: () => void;
}

export const ImportTasksModal: React.FC<ImportTasksModalProps> = ({ 
  isOpen, 
  onClose, 
  onImportFinished 
}) => {
  const { t } = useTranslation();
  
  const hook = useImportTasks(isOpen, onClose, onImportFinished);
  const {
    step, setStep,
    dragActive, uploadError,
    tasksToProcess, processingCurrent, processingTotal, processedResults,
    currentTaskIndex, isPublishing, isCopied,
    allDatabases, allCourses,
    currentResult, previewData,
    handleCancel, handleDrag, handleDrop, handleFileChange,
    handleNextOrDone, handleSkipTask, handleCopyResults
  } = hook;

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, processedResults]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-modal-backdrop bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
    >
      <div className="bg-card shadow-2xl border border-glass-border w-full max-w-4xl rounded-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden relative max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg">
              <FileJson size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground leading-tight">
                {step === 'select_type' && t('import_tasks.modal_title')}
                {step === 'upload' && t('import_tasks.title')}
                {step === 'processing' && t('import_tasks.processing')}
                {step === 'review' && t('import_tasks.title')}
                {step === 'success' && t('import_tasks.success_title')}
              </h2>
              {step === 'review' && (
                <p className="text-sm text-muted-foreground mt-0.5 leading-none">
                  {t('import_tasks.processing_task', { current: currentTaskIndex + 1, total: processedResults.length })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCancel}
              className="p-2 rounded-xl hover:bg-hover text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {step === 'select_type' && <SelectTypeStep setStep={setStep} />}

          {step === 'upload' && (
            <UploadStep 
              setStep={setStep} 
              dragActive={dragActive} 
              handleDrag={handleDrag} 
              handleDrop={handleDrop} 
              handleFileChange={handleFileChange} 
              uploadError={uploadError} 
            />
          )}

          {step === 'processing' && (
            <ProcessingStep 
              processingCurrent={processingCurrent} 
              processingTotal={processingTotal} 
              tasksToProcess={tasksToProcess} 
            />
          )}

          {step === 'review' && currentResult && (
            <ReviewStep 
              currentResult={currentResult} 
              previewData={previewData} 
              allDatabases={allDatabases} 
              allCourses={allCourses} 
              isCopied={isCopied} 
              handleCopyResults={handleCopyResults} 
            />
          )}

          {step === 'success' && <SuccessStep processedResults={processedResults} />}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-glass-border bg-glass/10 shrink-0">
          <div>
            {(step === 'review' || step === 'upload') && (
              <button 
                onClick={handleCancel}
                className="px-5 py-2 text-xs font-bold bg-secondary border border-border text-foreground hover:bg-hover rounded-xl transition-colors focus:outline-none"
              >
                {t('import_tasks.cancel')}
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {step === 'review' && currentResult && (
              <>
                <button
                  onClick={handleSkipTask}
                  className="px-5 py-2 text-xs font-bold bg-secondary border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 rounded-xl transition-all focus:outline-none"
                >
                  {t('import_tasks.skip')}
                </button>

                <button
                  onClick={handleNextOrDone}
                  disabled={!currentResult.isValid || isPublishing}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none ${
                    currentResult.isValid && !isPublishing
                      ? 'bg-primary text-primary-foreground hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(var(--primary),0.3)]'
                      : 'bg-muted border border-glass-border text-muted-foreground/50 cursor-not-allowed pointer-events-none'
                  }`}
                >
                  {isPublishing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    currentTaskIndex < processedResults.length - 1 ? t('import_tasks.next') : t('import_tasks.done')
                  )}
                </button>
              </>
            )}

            {step === 'success' && (
              <button
                onClick={() => {
                  onImportFinished();
                  onClose();
                }}
                className="px-5 py-2 bg-primary text-primary-foreground hover:brightness-110 active:scale-95 rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(var(--primary),0.3)] focus:outline-none transition-all"
              >
                {t('close')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
