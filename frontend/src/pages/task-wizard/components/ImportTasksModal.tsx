import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { 
  Upload, Database, CheckCircle2, ListOrdered, 
  GraduationCap, X, ChevronLeft, AlertTriangle, 
  FileJson, Loader2, FileSpreadsheet, Copy, Check
} from 'lucide-react';
import { MarkdownText } from '../../../components/ui/MarkdownText';
import { InfoTooltip } from '../../../components/ui/InfoTooltip';
import { CollapsibleSection } from '../../../components/ui/CollapsibleSection';
import { SelectTypeStep } from './import-steps/SelectTypeStep';
import { UploadStep } from './import-steps/UploadStep';
import { ProcessingStep } from './import-steps/ProcessingStep';
import { ReviewStep } from './import-steps/ReviewStep';
import { SuccessStep } from './import-steps/SuccessStep';
import { DIFFICULTY_TIERS, DIFFICULTY_LEVELS } from '../mocks';

interface ImportTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFinished: () => void;
}

interface ProcessedTaskResult {
  taskData: any;
  draftId: number | null;
  dbId: number | null;
  dbName: string;
  sqlSuccess: boolean;
  sqlError: string | null;
  sqlResult: {
    solution_sql: string;
    columns: string[];
    rows: any[][];
    row_count: number;
    duration_ms: number;
  } | null;
  rulesResults: any[];
  isValid: boolean;
  isProcessed: boolean;
  processingError: string | null;
}

export const ImportTasksModal: React.FC<ImportTasksModalProps> = ({ 
  isOpen, 
  onClose, 
  onImportFinished 
}) => {
  const { t } = useTranslation();
  
  const [step, setStep] = useState<'select_type' | 'upload' | 'processing' | 'review' | 'success'>('select_type');
  const [allDatabases, setAllDatabases] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Processing state
  const [tasksToProcess, setTasksToProcess] = useState<any[]>([]);
  const [processingCurrent, setProcessingCurrent] = useState(0);
  const [processingTotal, setProcessingTotal] = useState(0);
  const [processedResults, setProcessedResults] = useState<ProcessedTaskResult[]>([]);
  
  // Review state
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Fetch databases and courses for mapping names to IDs & Reset state on open
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset state variables to defaults
    setStep('select_type');
    setDragActive(false);
    setUploadError(null);
    setTasksToProcess([]);
    setProcessingCurrent(0);
    setProcessingTotal(0);
    setProcessedResults([]);
    setCurrentTaskIndex(0);
    setIsPublishing(false);
    
    fetch('/api/tasks?page_size=1')
      .then(res => res.json())
      .then(data => {
        setAllDatabases(data.databases || []);
        setAllCourses(data.courses || []);
      })
      .catch(console.error);
  }, [isOpen]);

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

  // Clean up drafts on cancel
  const handleCancel = async () => {
    processedResults.forEach(r => {
      if (r.draftId) {
        fetch(`/api/tasks/${r.draftId}`, { method: 'DELETE' }).catch(console.error);
      }
    });
    onClose();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (fileList: FileList) => {
    setUploadError(null);
    const parsedTasks: any[] = [];
    
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const text = await file.text();
        let parsed: any;
        
        try {
          parsed = JSON.parse(text);
        } catch (jsonErr: any) {
          throw new Error(t('import_tasks.parsing_error', { error: jsonErr.message }));
        }

        // Determine format: single task object or list/export schema
        if (Array.isArray(parsed)) {
          parsedTasks.push(...parsed);
        } else if (parsed && Array.isArray(parsed.tasks)) {
          parsedTasks.push(...parsed.tasks);
        } else if (parsed && parsed.task && typeof parsed.task === 'object') {
          const tObj = parsed.task;
          if (!tObj.title || !tObj.reference_sql) {
            throw new Error(t('import_tasks.wrong_format'));
          }
          parsedTasks.push(tObj);
        } else if (parsed && typeof parsed === 'object') {
          // Verify it's a valid task object
          if (!parsed.title || !parsed.reference_sql) {
            throw new Error(t('import_tasks.wrong_format'));
          }
          parsedTasks.push(parsed);
        } else {
          throw new Error(t('import_tasks.wrong_format'));
        }
      }
      
      if (parsedTasks.length === 0) {
        throw new Error(t('import_tasks.wrong_format'));
      }
      
      setTasksToProcess(parsedTasks);
      startProcessing(parsedTasks);
      
    } catch (err: any) {
      setUploadError(err.message || t('import_tasks.wrong_format'));
    }
  };

  const startProcessing = async (tasksList: any[]) => {
    setStep('processing');
    setProcessingTotal(tasksList.length);
    setProcessingCurrent(0);
    
    const results: ProcessedTaskResult[] = [];
    const seenSignatures = new Set<string>();
    
    for (let i = 0; i < tasksList.length; i++) {
      setProcessingCurrent(i + 1);
      const rawTask = tasksList[i];
      
      // Determine db_name from the task JSON
      const dbName = rawTask.db_name || rawTask.database_technical_name || rawTask.database || 'northwind';
      
      const resultItem: ProcessedTaskResult = {
        taskData: rawTask,
        draftId: null,
        dbId: null,
        dbName,
        sqlSuccess: false,
        sqlError: null,
        sqlResult: null,
        rulesResults: [],
        isValid: false,
        isProcessed: false,
        processingError: null
      };
      
      try {
        // 0. Check for duplicates
        const taskTitle = (rawTask.title || '').trim();
        const taskDesc = (rawTask.description || '').trim();
        const signature = `${taskTitle.toLowerCase()}|${taskDesc.toLowerCase()}`;
        
        if (seenSignatures.has(signature)) {
          throw new Error(t('import_tasks.errors.duplicate_task'));
        }
        seenSignatures.add(signature);

        if (taskTitle) {
          const checkRes = await fetch(`/api/tasks?search=${encodeURIComponent(taskTitle)}&page_size=100`);
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            const matchingTasks = checkData.tasks.filter((t: any) => 
              (t.title || '').trim().toLowerCase() === taskTitle.toLowerCase()
            );
            
            for (const match of matchingTasks) {
              const detailRes = await fetch(`/api/tasks/${match.id}`);
              if (detailRes.ok) {
                const detailData = await detailRes.json();
                if ((detailData.description || '').trim().toLowerCase() === taskDesc.toLowerCase()) {
                  throw new Error(t('import_tasks.errors.duplicate_task'));
                }
              }
            }
          }
        }

        // 1. Resolve DB Name to DB ID
        const dbNameLower = dbName.toLowerCase();
        const foundDb = allDatabases.find((d: any) => 
          d.technical_name?.toLowerCase() === dbNameLower || 
          d.display_name?.toLowerCase() === dbNameLower
        );
        
        if (!foundDb) {
          throw new Error(t('import_tasks.errors.db_not_found', { name: dbName }));
        }
        resultItem.dbId = foundDb.id;
        
        // 2. Create task draft
        const draftRes = await fetch('/api/tasks/draft', { method: 'POST' });
        if (!draftRes.ok) {
          let errorDetail = '';
          try {
            const errJson = await draftRes.json();
            if (Array.isArray(errJson.detail)) {
              errorDetail = ':\n' + errJson.detail.map((e: any) => `- ${e.loc?.join('.')} : ${e.msg}`).join('\n');
            } else {
              errorDetail = ': ' + (typeof errJson.detail === 'object' ? JSON.stringify(errJson.detail) : errJson.detail);
            }
          } catch (e) {
            errorDetail = ` (${draftRes.status} ${draftRes.statusText})`;
          }
          throw new Error(t('import_tasks.errors.draft_create_failed') + errorDetail);
        }
        const draftDataJson = await draftRes.json();
        const draftId = draftDataJson.id;
        resultItem.draftId = draftId;
        
        // 3. Update task draft with imported fields
        const mappedRules = (rawTask.rules || []).map((r: any) => ({
          category: r.category,
          condition: r.condition,
          params: r.params || {},
          severity: r.severity || 'blocking',
          message: r.message || ''
        }));

        // Handle string vs number difficulty safely
        let parsedDifficulty = 0;
        if (typeof rawTask.difficulty === 'number') {
          parsedDifficulty = rawTask.difficulty;
          if (parsedDifficulty > 8) parsedDifficulty = 8;
          if (parsedDifficulty < 0) parsedDifficulty = 0;
        } else if (typeof rawTask.difficulty === 'string') {
          const diffStr = rawTask.difficulty.toLowerCase();
          if (diffStr.includes('easy')) parsedDifficulty = 0;
          else if (diffStr.includes('medium')) parsedDifficulty = 3;
          else if (diffStr.includes('hard')) parsedDifficulty = 6;
        }
        
        const updatePayload = {
          title: rawTask.title || '',
          description: rawTask.description || '',
          author_name: rawTask.author_name || 'ImportedUser',
          source_url: rawTask.source_url || rawTask.author_url || null,
          difficulty: String(parsedDifficulty), // FIXED: Must be string to match FastAPI schema
          database_id: foundDb.id,
          reference_sql: rawTask.reference_sql || '',
          order_matters: rawTask.order_matters || false,
          tags: rawTask.tags || [],
          rules: mappedRules
        };
        
        const updateRes = await fetch(`/api/tasks/${draftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });
        if (!updateRes.ok) {
          let errorDetail = '';
          try {
            const errJson = await updateRes.json();
            if (Array.isArray(errJson.detail)) {
              errorDetail = ':\n' + errJson.detail.map((e: any) => `- ${e.loc?.join('.')} : ${e.msg}`).join('\n');
            } else {
              errorDetail = ': ' + (typeof errJson.detail === 'object' ? JSON.stringify(errJson.detail) : errJson.detail);
            }
          } catch (e) {
            errorDetail = ` (${updateRes.status} ${updateRes.statusText})`;
          }
          throw new Error(t('import_tasks.errors.draft_update_failed') + errorDetail);
        }
        
        // Update local data view with resolved structure
        resultItem.taskData = {
          ...rawTask,
          difficulty: parsedDifficulty,
          database: String(foundDb.id),
          rules: mappedRules
        };

        // 4. Test reference SQL execution
        const solutionRes = await fetch(`/api/tasks/${draftId}/solution`, { method: 'POST' });
        if (!solutionRes.ok) {
          let errMsg = 'SQL syntax or execution error';
          try {
            const errData = await solutionRes.json();
            errMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail || errData);
          } catch (e) {
            errMsg = `${solutionRes.status} ${solutionRes.statusText}`;
          }
          resultItem.sqlSuccess = false;
          resultItem.sqlError = errMsg;
        } else {
          const solData = await solutionRes.json();
          resultItem.sqlSuccess = true;
          resultItem.sqlResult = solData;
        }
        
        // 5. Check rules
        const rulesCheckRes = await fetch(`/api/tasks/${draftId}/check_rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rules: mappedRules })
        });
        
        if (!rulesCheckRes.ok) {
          let errMsg = 'Rules check failed';
          try {
            const errData = await rulesCheckRes.json();
            errMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail || errData);
          } catch (e) {
            errMsg = `${rulesCheckRes.status} ${rulesCheckRes.statusText}`;
          }
          throw new Error(errMsg);
        }
        
        const rulesCheckData = await rulesCheckRes.json();
        const rulesWithResults = mappedRules.map((rule: any, idx: number) => {
          const checkResult = (rulesCheckData.rules || []).find((cr: any) => cr.rule_id === idx) || { passed: false, detail_msg: '' };
          return {
            ...rule,
            passed: checkResult.passed,
            detail: checkResult.detail_msg || checkResult.message || rule.message
          };
        });
        
        resultItem.rulesResults = rulesWithResults;
        
        // 6. Final verification status
        const hasBlockingRuleFailed = rulesWithResults.some((r: any) => !r.passed && r.severity === 'blocking');
        resultItem.isValid = resultItem.sqlSuccess && !hasBlockingRuleFailed;
        
      } catch (err: any) {
        resultItem.isValid = false;
        resultItem.processingError = err.message || 'Unknown processing error';
      } finally {
        resultItem.isProcessed = true;
        results.push(resultItem);
      }
      
      // Artificial delay for smooth loading visuals
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    setProcessedResults(results);
    setStep('review');
    setCurrentTaskIndex(0);
  };

  const handleNextOrDone = async () => {
    const currentResult = processedResults[currentTaskIndex];
    if (!currentResult || !currentResult.draftId) return;
    
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/tasks/${currentResult.draftId}/publish`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to publish task');
      
      // Advance or complete
      if (currentTaskIndex < processedResults.length - 1) {
        setCurrentTaskIndex(currentTaskIndex + 1);
      } else {
        setStep('success');
      }
    } catch (e) {
      console.error(e);
      alert(t('import_tasks.errors.draft_publish_failed'));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSkipTask = async () => {
    const currentResult = processedResults[currentTaskIndex];
    if (currentResult && currentResult.draftId) {
      // Delete draft on skip
      fetch(`/api/tasks/${currentResult.draftId}`, { method: 'DELETE' }).catch(console.error);
    }
    
    if (currentTaskIndex < processedResults.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    } else {
      // If it was the last task, check if we imported anything successfully
      const importedCount = processedResults.filter((r, idx) => r.isValid && idx < currentTaskIndex).length;
      if (importedCount > 0) {
        setStep('success');
      } else {
        onClose();
      }
    }
  };

  // Preview properties
  const currentResult = processedResults[currentTaskIndex];
  const previewData = currentResult?.taskData;

  const handleCopyResults = () => {
    if (!currentResult) return;

    let text = `Task: ${currentResult.taskData?.title || 'Unknown'}\n`;
    text += `Status: ${currentResult.isValid ? 'Valid (Ready for import)' : 'Invalid (Cannot be imported)'}\n\n`;

    text += `--- Test Results ---\n`;
    text += `SQL Execution: ${currentResult.sqlSuccess ? 'Passed' : 'Failed'}\n`;
    
    const passedRules = currentResult.rulesResults.filter((r: any) => r.passed).length;
    const totalRules = currentResult.rulesResults.length;
    if (totalRules > 0) {
      text += `Rules Check: ${passedRules} out of ${totalRules} passed\n`;
    } else {
      text += `Rules Check: No rules defined\n`;
    }

    if (!currentResult.isValid) {
      text += `\n--- Errors ---\n`;
      if (currentResult.processingError) {
        text += `Processing Error:\n${currentResult.processingError}\n\n`;
      }
      if (!currentResult.sqlSuccess && currentResult.sqlError) {
        text += `SQL Error:\n${currentResult.sqlError}\n\n`;
      }
      const failedRules = currentResult.rulesResults.filter((r: any) => !r.passed);
      if (failedRules.length > 0) {
        text += `Failed Rules:\n`;
        failedRules.forEach((r: any) => {
          text += `- [${r.severity === 'blocking' ? 'BLOCKING' : 'WARNING'}] ${r.message || `${r.category}.${r.condition}`}\n`;
          if (r.detail) text += `  Detail: ${r.detail}\n`;
          if (r.hint) text += `  Hint: ${r.hint}\n`;
        });
      }
    }

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
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
          {/* STEP 1: Select type */}
          {step === 'select_type' && <SelectTypeStep setStep={setStep} />}

          {/* STEP 2: Drag and drop upload */}
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

          {/* STEP 3: Processing progress screen */}
          {step === 'processing' && (
            <ProcessingStep 
              processingCurrent={processingCurrent} 
              processingTotal={processingTotal} 
              tasksToProcess={tasksToProcess} 
            />
          )}

          {/* STEP 4: Review and test results screen */}
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

          {/* STEP 5: Success Summary screen */}
          {step === 'success' && <SuccessStep processedResults={processedResults} />}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-glass-border bg-glass/10 shrink-0">
          <div>
            {step === 'review' && (
              <button 
                onClick={handleCancel}
                className="px-5 py-2 text-xs font-bold bg-secondary border border-border text-foreground hover:bg-hover rounded-xl transition-colors focus:outline-none"
              >
                {t('import_tasks.cancel')}
              </button>
            )}
            {step === 'upload' && (
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
                {/* Skip button for invalid or skipped tasks */}
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
