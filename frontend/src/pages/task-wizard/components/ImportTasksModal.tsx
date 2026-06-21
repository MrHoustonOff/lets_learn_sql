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
import { RuleResultItem } from './import-steps/RuleResultItem';
import { SqlResultPreview } from './import-steps/SqlResultPreview';
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
  
  const diffTier = previewData?.difficulty !== undefined && previewData?.difficulty !== null 
    ? DIFFICULTY_TIERS.find(t => t.key === DIFFICULTY_LEVELS[previewData.difficulty]?.tier) 
    : null;
  const diffLevel = previewData?.difficulty !== undefined && previewData?.difficulty !== null 
    ? DIFFICULTY_LEVELS[previewData.difficulty]?.level 
    : null;
    
  const db = allDatabases.find(d => d.id.toString() === previewData?.database?.toString());
  const course = allCourses.find(c => c.id.toString() === previewData?.course?.toString());

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
          {/* STEP 1: Select type */}
          {step === 'select_type' && (
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
                  disabled
                  className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-glass-border bg-muted/5 opacity-50 text-center cursor-not-allowed transition-all duration-200 relative group focus:outline-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted/10 border border-muted/20 flex items-center justify-center text-muted-foreground">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground mb-1">{t('import_tasks.course')}</h4>
                    <p className="text-2xs text-muted-foreground/60">{t('import_tasks.course_todo')}</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Drag and drop upload */}
          {step === 'upload' && (
            <div className="flex flex-col gap-6">
              <button 
                onClick={() => setStep('select_type')}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground self-start font-medium focus:outline-none transition-colors"
              >
                <ChevronLeft size={14} /> {t('import_tasks.back')}
              </button>

              <div 
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[250px] relative ${
                  dragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-glass-border bg-glass/10 hover:bg-glass-hover hover:border-border/80'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('task-json-file-input')?.click()}
              >
                <input 
                  type="file" 
                  multiple 
                  accept=".json" 
                  onChange={handleFileChange} 
                  className="hidden" 
                  id="task-json-file-input" 
                />
                
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                  <Upload size={28} />
                </div>
                
                <h4 className="text-sm font-bold mb-1.5 text-foreground">{t('import_tasks.drop_zone')}</h4>
                <p className="text-xs text-muted-foreground">{t('import_tasks.select_file')}</p>
              </div>

              {uploadError && (
                <div className="flex items-start gap-2.5 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs leading-relaxed animate-in fade-in duration-200">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div className="whitespace-pre-wrap">{uploadError}</div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Processing progress screen */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-10 gap-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary relative">
                <Loader2 size={28} className="animate-spin" />
              </div>
              <div className="text-center space-y-1.5">
                <h4 className="text-sm font-bold text-foreground">{t('import_tasks.processing')}</h4>
                <p className="text-xs text-muted-foreground">
                  {t('import_tasks.processing_task', { current: processingCurrent, total: processingTotal })}
                </p>
              </div>
              <div className="w-full max-w-sm h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-200" 
                  style={{ width: `${(processingCurrent / processingTotal) * 100}%` }}
                />
              </div>
              {tasksToProcess[processingCurrent - 1] && (
                <p className="text-2xs font-mono text-muted-foreground truncate max-w-xs">
                  {t('import_tasks.current_task')}: {tasksToProcess[processingCurrent - 1].title || t('wizard.preview.no_title')}
                </p>
              )}
            </div>
          )}

          {/* STEP 4: Review and test results screen */}
          {step === 'review' && currentResult && (
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
          )}

          {/* STEP 5: Success Summary screen */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 gap-5 text-center">
              <div className="w-14 h-14 rounded-full bg-success/15 text-success flex items-center justify-center animate-bounce">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-foreground">{t('import_tasks.success_title')}</h4>
                <p className="text-xs text-muted-foreground">
                  {t('import_tasks.success_desc', { count: processedResults.filter(r => r.isValid).length })}
                </p>
              </div>
            </div>
          )}
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
