import React, { useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { WizardStepInfo } from './components/WizardStepInfo';
import { WizardStepSolution } from './components/WizardStepSolution';
import { WizardStepRules } from './components/WizardStepRules';
import { WizardStepPreview } from './components/WizardStepPreview';
import { PublishSuccessModal } from './components/PublishSuccessModal';
import { EditExitModal } from '../../components/ui/EditExitModal';
import { Stepper } from '../../components/ui/Stepper';

import { useTaskWizard } from './hooks/useTaskWizard';

const getSteps = (t: any) => [
  { id: 1, label: t('wizard.steps.info') },
  { id: 2, label: t('wizard.steps.solution') },
  { id: 3, label: t('wizard.steps.rules') },
  { id: 4, label: t('wizard.steps.preview') },
];

export const TaskWizardScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isFromEditTask = location.state?.fromEditTask === true;

  const {
    draftData,
    setDraftData,
    currentStep,
    setCurrentStep,
    isSaving,
    lastSaved,
    publishState,
    hasUnsavedChanges,
    showEditExitModal,
    setShowEditExitModal,
    isPublishedModalOpen,
    setIsPublishedModalOpen,
    canGoNext,
    needsCheckRules,
    footerNextText,
    handleManualSave,
    publishTask,
    checkRules,
    isEmpty,
    allTags,
    allCourses,
    allDatabases,
    rulesValidationStatus,
    rulesValidationResults,
    isDuplicate,
    duplicateTitleCount,
    isCheckingDuplicate
  } = useTaskWizard(id, isFromEditTask);

  const STEPS = useMemo(() => getSteps(t), [t]);
  const formatTime = (d: Date | null) => d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const saveStatusLabel = () => {
    if (isSaving) return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Loader2 size={10} className="animate-spin" /> Сохранение...
      </span>
    );
    if (lastSaved) return (
      <span className="flex items-center gap-1 text-success">
        <CheckCircle2 size={10} /> Сохранено
      </span>
    );
    return (
      <span className="flex items-center gap-1 text-warning-text">
        <AlertTriangle size={10} /> {t('wizard.header.not_saved')}
      </span>
    );
  };

  const nextLabel = () => {
    if (currentStep !== 4) return t(footerNextText);
    if (publishState === 'saving') return <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Публикация...</>;
    if (publishState === 'error') return 'Ошибка — повторить';
    return t(footerNextText);
  };

  const handleNext = async () => {
    if (currentStep === 3 && needsCheckRules) {
      await checkRules();
      return;
    }
    if (currentStep < 4) {
      setCurrentStep((s) => s + 1);
      return;
    }
    await publishTask();
  };

  return (
    <div className="h-screen w-screen bg-background flex flex-col font-sans text-foreground overflow-hidden">
      {/* HEADER */}
      <header className="h-14 border-b border-glass-border flex items-center px-4 shrink-0 bg-background/80 backdrop-blur z-layout justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={async () => {
              if (id === 'new' && isEmpty) { navigate('/studio'); return; }
              if (isFromEditTask && hasUnsavedChanges) { setShowEditExitModal(true); return; }
              if (isFromEditTask) { navigate('/tasks'); return; }
              
              if (id !== 'new' && isEmpty && !isFromEditTask) {
                try {
                  await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
                } catch (e) {}
              }
              navigate('/studio');
            }}
            className="p-2 hover:bg-hover rounded-xl text-muted-foreground transition-colors outline-none"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="text-sm font-bold tracking-tight">
              {!isFromEditTask ? t('wizard.header.create_task') : t('wizard.header.edit_task')}
            </div>
            <div className="text-mini text-muted-foreground font-medium flex items-center gap-2">
              {!isFromEditTask ? saveStatusLabel() : (
                <>
                  <button 
                    onClick={handleManualSave}
                    disabled={!hasUnsavedChanges || isSaving || (!draftData.title || !draftData.description)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                      hasUnsavedChanges && (draftData.title && draftData.description)
                        ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                        : 'bg-glass border border-glass-border text-muted-foreground opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? <Loader2 size={12} className="animate-spin inline mr-1"/> : null}
                    {t('wizard.header.save_changes', 'Сохранить изменения')}
                  </button>
                  {lastSaved && (
                    <span className="text-muted-foreground/60">
                      {t('wizard.header.last_saved', { time: formatTime(lastSaved) })}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <Stepper 
          steps={STEPS} 
          currentStep={currentStep} 
          onStepClick={(stepId) => setCurrentStep(stepId)} 
        />
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative overflow-hidden bg-muted/30">
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-6 pb-48">
          {currentStep === 1 && (
            <WizardStepInfo 
              data={draftData} 
              setData={setDraftData}
              allTags={allTags}
              allCourses={allCourses}
              allDatabases={allDatabases}
              isDuplicate={isDuplicate}
              duplicateTitleCount={duplicateTitleCount}
              isCheckingDuplicate={isCheckingDuplicate}
            />
          )}
          {currentStep === 2 && (
            <WizardStepSolution 
              data={draftData} 
              setData={setDraftData} 
            />
          )}
          {currentStep === 3 && (
            <WizardStepRules 
              data={draftData} 
              setData={setDraftData}
              validationStatus={rulesValidationStatus}
              validationResults={rulesValidationResults}
            />
          )}
          {currentStep === 4 && (
            <WizardStepPreview 
              data={draftData} 
              allCourses={allCourses}
              allDatabases={allDatabases}
              isEditing={isFromEditTask}
            />
          )}
        </div>

        {/* FLOATING BUTTONS */}
        <div className="absolute bottom-6 left-6 z-layout">
          <button 
            onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
            className={`px-5 py-2 rounded-xl text-sm font-bold bg-background/80 backdrop-blur border border-glass-border shadow-sm transition-all ${
              currentStep > 1 
                ? 'text-muted-foreground hover:bg-hover hover:text-foreground' 
                : 'opacity-0 pointer-events-none'
            }`}
          >
            {t('wizard.footer.back')}
          </button>
        </div>

        <div className="absolute bottom-6 right-6 z-layout">
          <button 
            onClick={handleNext}
            disabled={!canGoNext || publishState === 'saving'}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              canGoNext
                ? 'bg-primary text-primary-foreground hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(var(--primary),0.3)]'
                : 'bg-background/80 backdrop-blur border border-glass-border text-muted-foreground/60 shadow-sm cursor-not-allowed pointer-events-none'
            }`}
          >
            {nextLabel()}
          </button>
        </div>
      </main>

      <EditExitModal
        isOpen={showEditExitModal}
        onClose={() => setShowEditExitModal(false)}
        onSaveAndLeave={handleManualSave}
        canGoNext={!!draftData.title && !!draftData.description}
        lastSaved={lastSaved}
        returnPath="/tasks"
      />

      <PublishSuccessModal 
        isOpen={isPublishedModalOpen} 
        isEditing={isFromEditTask}
        onBackToStudio={() => navigate(isFromEditTask ? '/tasks' : '/studio')} 
      />
    </div>
  );
};
