import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { WizardStepInfo } from './components/WizardStepInfo';
import { WizardStepSolution } from './components/WizardStepSolution';
import { WizardStepRules } from './components/WizardStepRules';
import { WizardStepPreview } from './components/WizardStepPreview';

const STEPS = [
  { id: 1, label: "Информация" },
  { id: 2, label: "Решение" },
  { id: 3, label: "Правила проверки" },
  { id: 4, label: "Превью и публикация" },
];

export const TaskWizardScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams(); // 'new' or UUID
  const [currentStep, setCurrentStep] = useState(1);
  const [draftData, setDraftData] = useState({
    title: "",
    description: "",
    author: "TestUser",
    referenceLink: "",
    tags: [] as string[],
    difficulty: null as string | null,
    database: null as string | null,
    course: null as string | null,
    referenceSql: "",
    orderMatters: false,
  });

  return (
    <div className="h-screen w-screen bg-background flex flex-col font-sans text-foreground overflow-hidden">
      {/* HEADER */}
      <header className="h-14 border-b border-glass-border flex items-center px-4 shrink-0 bg-background/80 backdrop-blur z-20 justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/studio')}
            className="p-2 hover:bg-hover rounded-xl text-muted-foreground transition-colors outline-none"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="text-sm font-bold tracking-tight">Создание задачи</div>
            <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-2">
              <span className="text-warning-text flex items-center gap-1">
                <AlertTriangle size={10}/> Не сохранено
              </span>
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

        <div className="flex items-center gap-2">
           <button className="px-4 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-hover transition-colors">
              Отмена
           </button>
           <button className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              Сохранить
           </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative overflow-hidden bg-muted/30">
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-6">
           {currentStep === 1 && <WizardStepInfo data={draftData} setData={setDraftData} />}
           {currentStep === 2 && <WizardStepSolution data={draftData} setData={setDraftData} />}
           {currentStep === 3 && <WizardStepRules data={draftData as any} setData={setDraftData} />}
           {currentStep === 4 && <WizardStepPreview data={draftData} setData={setDraftData} />}
        </div>
      </main>

      {/* FOOTER NAV */}
      <footer className="h-16 border-t border-glass-border bg-background flex items-center justify-between px-6 shrink-0 z-20">
        <button
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
            currentStep === 1 
              ? "opacity-50 cursor-not-allowed text-muted-foreground bg-glass" 
              : "text-foreground hover:bg-hover bg-glass border border-glass-border"
          }`}
        >
          Назад
        </button>

        <button
          onClick={() => setCurrentStep(prev => Math.min(STEPS.length, prev + 1))}
          className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:brightness-110 shadow-[0_4px_16px_rgba(var(--primary),0.3)] transition-all"
        >
          {currentStep === STEPS.length ? "Опубликовать задачу" : "Далее"}
        </button>
      </footer>
    </div>
  );
};
