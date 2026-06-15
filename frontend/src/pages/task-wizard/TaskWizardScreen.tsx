import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { WizardStepInfo } from './components/WizardStepInfo';
import { WizardStepSolution } from './components/WizardStepSolution';
import { WizardStepRules } from './components/WizardStepRules';
import { WizardStepPreview } from './components/WizardStepPreview';

const getSteps = (t: any) => [
  { id: 1, label: t('wizard.steps.info') },
  { id: 2, label: t('wizard.steps.solution') },
  { id: 3, label: t('wizard.steps.rules') },
  { id: 4, label: t('wizard.steps.preview') },
];

export const TaskWizardScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams(); // 'new' or UUID (which is actually INTEGER id)
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isPublishedModalOpen, setIsPublishedModalOpen] = useState(false);
  
  const STEPS = useMemo(() => getSteps(t), [t]);
  
  const [allTags, setAllTags] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [allDatabases, setAllDatabases] = useState([]);

  const [draftData, setDraftData] = useState({
    title: "",
    description: "",
    author: "TestUser",
    referenceLink: "",
    tags: [] as string[],
    difficulty: null as number | null,
    database: null as string | null,
    course: null as string | null,
    referenceSql: "",
    orderMatters: false,
    isQueryValid: false,
    rules: [] as any[],
  });

  const [rulesValidationStatus, setRulesValidationStatus] = useState<'idle' | 'checking' | 'checked'>('idle');
  const [rulesValidationResults, setRulesValidationResults] = useState<Record<string, { passed: boolean, detail: string }>>({});

  // Fetch metadata
  React.useEffect(() => {
    fetch('/api/tasks?page_size=1')
      .then(res => res.json())
      .then(data => {
        setAllTags(data.tags || []);
        setAllCourses(data.courses || []);
        setAllDatabases(data.databases || []);
      })
      .catch(console.error);
  }, []);

  // Fetch task draft
  React.useEffect(() => {
    if (!id || id === 'new') return;
    fetch(`/api/tasks/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch draft');
        return res.json();
      })
      .then(data => {
        setDraftData(prev => ({
          ...prev,
          title: data.title || "",
          description: data.description || "",
          author: data.author_name || "TestUser",
          referenceLink: data.source_url || "",
          difficulty: data.difficulty || null,
          database: data.database_id ? String(data.database_id) : null,
          course: data.courses?.[0]?.id ? String(data.courses[0].id) : null,
          referenceSql: data.reference_sql || "",
          orderMatters: data.order_matters || false,
          tags: data.tags || [],
          rules: (data.rules || []).map((r: any) => ({
            id: Math.random().toString(36).slice(2, 10),
            category: r.category,
            condition: r.condition,
            params: r.params || {},
            severity: r.severity || "blocking",
            message: r.message || ""
          }))
        }));
      })
      .catch(console.error);
  }, [id]);

  // Auto-save logic
  React.useEffect(() => {
    if (!id || id === 'new') return;
    
    const handler = setTimeout(() => {
      setIsSaving(true);
      
      const payload = {
        title: draftData.title || undefined,
        description: draftData.description || undefined,
        author_name: draftData.author || undefined,
        source_url: draftData.referenceLink || undefined,
        difficulty: draftData.difficulty?.toString() || undefined, // backend expects string in PUT although DB is int? Wait!
        database_id: draftData.database ? parseInt(draftData.database) : undefined,
        reference_sql: draftData.referenceSql || undefined,
        order_matters: draftData.orderMatters,
        tags: draftData.tags,
        rules: draftData.rules || [],
      };

      fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => {
        if (res.ok) setLastSaved(new Date());
      })
      .finally(() => setIsSaving(false));

    }, 1500);

    return () => clearTimeout(handler);
  }, [draftData, id]);

  const isStepValid = useMemo(() => {
    if (currentStep === 1) {
      return !!(draftData.title && draftData.description && draftData.author && draftData.difficulty && draftData.database);
    }
    if (currentStep === 2) {
      return !!draftData.isQueryValid;
    }
    if (currentStep === 3) {
      if ((draftData.rules || []).length > 0) {
        if (rulesValidationStatus !== 'checked') return false;
        return (draftData.rules || []).every((r: any) => rulesValidationResults[r.id]?.passed === true);
      }
      return true;
    }
    return true;
  }, [currentStep, draftData, rulesValidationStatus, rulesValidationResults]);

  const checkRules = async () => {
    if (!id || id === 'new') return;
    setRulesValidationStatus('checking');
    try {
      const res = await fetch(`/api/tasks/${id}/check_rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: draftData.rules || [] }),
      });
      if (!res.ok) throw new Error('Check rules failed');
      const data = await res.json();
      
      const results: Record<string, any> = {};
      data.rules.forEach((r: any) => {
        const frontendRule = (draftData.rules || [])[r.rule_id];
        if (frontendRule) {
          results[frontendRule.id] = { passed: r.passed, detail: r.detail_msg || r.message };
        }
      });
      setRulesValidationResults(results);
      setRulesValidationStatus('checked');
    } catch (e) {
      console.error(e);
      setRulesValidationStatus('idle');
    }
  };

  const publishTask = async () => {
    if (!id || id === 'new') return;
    try {
      const res = await fetch(`/api/tasks/${id}/publish`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Publish failed');
      setIsPublishedModalOpen(true);
    } catch (e) {
      console.error(e);
      alert('Ошибка при публикации задачи');
    }
  };

  return (
    <div className="h-screen w-screen bg-background flex flex-col font-sans text-foreground overflow-hidden">
      {/* HEADER */}
      <header className="h-14 border-b border-glass-border flex items-center px-4 shrink-0 bg-background/80 backdrop-blur z-layout justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/studio')}
            className="p-2 hover:bg-hover rounded-xl text-muted-foreground transition-colors outline-none"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="text-sm font-bold tracking-tight">{id === 'new' ? t('wizard.header.create_task') : t('wizard.header.edit_task')}</div>
            <div className="text-mini text-muted-foreground font-medium flex items-center gap-2">
              {isSaving ? (
                <span className="text-muted-foreground flex items-center gap-1">
                  {t('wizard.header.saving')}
                </span>
              ) : lastSaved ? (
                <span className="text-success flex items-center gap-1">
                  {t('wizard.header.saved')}
                </span>
              ) : (
                <span className="text-warning-text flex items-center gap-1">
                  <AlertTriangle size={10}/> {t('wizard.header.not_saved')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* STEPPER */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          {STEPS.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isPassed = currentStep > step.id;
            
            return (
              <React.Fragment key={step.id}>
                <div 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(var(--primary),0.4)]" 
                      : isPassed
                        ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                        : "bg-glass text-muted-foreground"
                  }`}
                  onClick={() => isPassed && setCurrentStep(step.id)}
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isActive ? 'bg-white/20' : isPassed ? 'bg-primary/20' : 'bg-background'}`}>
                    {step.id}
                  </div>
                  {step.label}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-6 h-px ${isPassed ? 'bg-primary/50' : 'bg-glass-border'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
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
             />
           )}
           {currentStep === 2 && <WizardStepSolution data={draftData} setData={setDraftData} />}
           {currentStep === 3 && (
             <WizardStepRules 
               data={draftData as any} 
               setData={setDraftData} 
               validationStatus={rulesValidationStatus}
               validationResults={rulesValidationResults}
               setValidationStatus={setRulesValidationStatus}
             />
           )}
           {currentStep === 4 && <WizardStepPreview data={draftData} setData={setDraftData} allCourses={allCourses} allDatabases={allDatabases} />}
        </div>

        {/* FOOTER NAV (FLOATING) */}
        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none z-menu">
        <button
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className={`pointer-events-auto px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
            currentStep === 1 
              ? "opacity-50 cursor-not-allowed text-muted-foreground bg-popover border border-border" 
              : "text-foreground hover:bg-hover bg-popover border border-border hover:border-foreground/20"
          }`}
        >
          {t('wizard.footer.back')}
        </button>

        <button
          onClick={() => {
            const allPassed = (draftData.rules || []).every((r: any) => rulesValidationResults[r.id]?.passed === true);
            const needsCheck = currentStep === 3 && (draftData.rules || []).length > 0 && (rulesValidationStatus !== 'checked' || !allPassed);
            if (needsCheck) {
              checkRules();
            } else if (currentStep === STEPS.length) {
              publishTask();
            } else {
              setCurrentStep(prev => Math.min(STEPS.length, prev + 1));
            }
          }}
          disabled={
            rulesValidationStatus === 'checking' || 
            (!isStepValid && !(currentStep === 3 && (draftData.rules || []).length > 0 && (rulesValidationStatus !== 'checked' || !(draftData.rules || []).every((r: any) => rulesValidationResults[r.id]?.passed === true))))
          }
          className={`pointer-events-auto px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-md ${
            (isStepValid || (currentStep === 3 && (draftData.rules || []).length > 0 && (rulesValidationStatus !== 'checked' || !(draftData.rules || []).every((r: any) => rulesValidationResults[r.id]?.passed === true)))) && rulesValidationStatus !== 'checking'
              ? "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_4px_16px_rgba(var(--primary),0.3)]"
              : "bg-muted border border-border text-muted-foreground opacity-50 cursor-not-allowed"
          }`}
        >
          {(() => {
            if (currentStep === 3 && (draftData.rules || []).length > 0) {
              const allPassed = (draftData.rules || []).every((r: any) => rulesValidationResults[r.id]?.passed === true);
              if (rulesValidationStatus !== 'checked' || !allPassed) {
                return rulesValidationStatus === 'checking' ? t('wizard.footer.checking') : t('wizard.footer.check');
              }
            }
            return currentStep === STEPS.length ? t('wizard.footer.publish') : t('wizard.footer.next');
          })()}
        </button>
        </div>
      </main>

      {isPublishedModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-modal-backdrop flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-background border border-glass-border rounded-2xl p-6 w-[400px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center mb-4">
              <Check size={24} />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('wizard.publishSuccess.title')}</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {t('wizard.publishSuccess.description')}
            </p>
            <button
              onClick={() => navigate('/studio')}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl font-medium transition-colors outline-none"
            >
              {t('wizard.publishSuccess.backToStudio')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
