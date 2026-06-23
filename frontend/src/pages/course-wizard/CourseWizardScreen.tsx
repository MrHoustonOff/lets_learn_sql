import React, { useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Stepper } from '../../components/ui/Stepper';

import { WizardCourseStepInfo } from './components/WizardCourseStepInfo';
import { WizardCourseStepContent } from './components/WizardCourseStepContent';
import { WizardCourseStepPreview } from './components/WizardCourseStepPreview';
import { PublishSuccessModal } from '../task-wizard/components/PublishSuccessModal';
import { EditExitModal } from '../../components/ui/EditExitModal';

import { useCourseWizard } from './hooks/useCourseWizard';

const getSteps = (t: any) => [
  { id: 1, label: t('wizard_course.steps.info') },
  { id: 2, label: t('wizard_course.steps.content') },
  { id: 3, label: t('wizard_course.steps.preview') },
];

export const CourseWizardScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isFromEdit = location.state?.fromEditCourse === true;

  const {
    courseData,
    setCourseData,
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
    handleNext,
    handleManualSave,
    isEmpty,
    isDuplicate,
    duplicateTitleCount,
    isCheckingDuplicate,
  } = useCourseWizard(id, isFromEdit);

  const STEPS = useMemo(() => getSteps(t), [t]);
  const formatTime = (d: Date | null) => d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const saveStatusLabel = () => {
    if (isSaving) return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Loader2 size={10} className="animate-spin" /> {t('wizard_course.header.saving')}
      </span>
    );
    if (lastSaved) return (
      <span className="flex items-center gap-1 text-success">
        <CheckCircle2 size={10} /> {t('wizard_course.header.saved')}
      </span>
    );
    return (
      <span className="flex items-center gap-1 text-warning-text">
        <AlertTriangle size={10} /> {t('wizard_course.header.not_saved')}
      </span>
    );
  };

  const nextLabel = () => {
    if (currentStep !== 3) return t('wizard_course.footer.next');
    if (publishState === 'saving') return <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('wizard_course.footer.publishing')}</>;
    if (publishState === 'error') return t('wizard_course.footer.error_retry');
    return t('wizard_course.footer.publish');
  };

  return (
    <div className="h-screen w-screen bg-background flex flex-col font-sans text-foreground overflow-hidden">
      {/* HEADER */}
      <header className="h-14 border-b border-glass-border flex items-center px-4 shrink-0 bg-background/80 backdrop-blur z-layout justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (id === 'new' && isEmpty) { navigate('/studio'); return; }
              if (isFromEdit && hasUnsavedChanges) { setShowEditExitModal(true); return; }
              if (isFromEdit) { navigate('/courses'); return; }
              navigate('/studio');
            }}
            className="p-2 hover:bg-hover rounded-xl text-muted-foreground transition-colors outline-none"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="text-sm font-bold tracking-tight">
              {!isFromEdit ? t('wizard_course.header.create_course') : t('wizard_course.header.edit_course')}
            </div>
            <div className="text-mini text-muted-foreground font-medium flex items-center gap-2">
              {!isFromEdit ? saveStatusLabel() : (
                <>
                  <button 
                    onClick={handleManualSave}
                    disabled={!hasUnsavedChanges || isSaving || !canGoNext}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                      hasUnsavedChanges && canGoNext
                        ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                        : 'bg-glass border border-glass-border text-muted-foreground opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? <Loader2 size={12} className="animate-spin inline mr-1"/> : null}
                    {t('wizard_course.header.save_changes')}
                  </button>
                  {lastSaved && (
                    <span className="text-muted-foreground/60">
                      {t('wizard_course.header.last_saved', { time: formatTime(lastSaved) })}
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
            <WizardCourseStepInfo 
              data={courseData} 
              setData={setCourseData} 
              isDuplicate={isDuplicate}
              duplicateTitleCount={duplicateTitleCount}
              isCheckingDuplicate={isCheckingDuplicate}
            />
          )}
          {currentStep === 2 && <WizardCourseStepContent data={courseData} setData={setCourseData} />}
          {currentStep === 3 && <WizardCourseStepPreview data={courseData} />}
        </div>

        {/* FLOATING BUTTONS */}
        <div className="absolute bottom-6 left-6 z-layout">
          <button
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            className={`px-5 py-2 rounded-xl text-sm font-bold bg-background/80 backdrop-blur border border-glass-border shadow-sm transition-all ${
              currentStep > 1
                ? 'text-muted-foreground hover:bg-hover hover:text-foreground'
                : 'opacity-0 pointer-events-none'
            }`}
          >
            {t('wizard_course.footer.back')}
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
        canGoNext={canGoNext}
        lastSaved={lastSaved}
        returnPath="/courses"
      />

      <PublishSuccessModal
        isOpen={isPublishedModalOpen}
        isEditing={isFromEdit}
        onBackToStudio={() => navigate(isFromEdit ? '/courses' : '/studio')}
      />
    </div>
  );
};
