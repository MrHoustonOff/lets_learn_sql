import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PenTool, CheckSquare, BookOpen, ChevronRight, Wand2, Copy, CheckCircle2 } from 'lucide-react';

const MOCK_DRAFTS = [
  { id: 1, type: 'course', title: 'Основы PostgreSQL для чайников', step: 'Шаг 2 из 5 (Уроки)', updatedAt: '2 часа назад' },
  { id: 2, type: 'task', title: 'Сложный JOIN для аналитиков', step: 'Шаг 3 из 4 (Решение)', updatedAt: 'Вчера' },
  { id: 3, type: 'task', title: 'Оконные функции в деле', step: 'Шаг 1 из 4 (Описание)', updatedAt: '3 дня назад' },
];

const MOCK_PROMPTS = [
  { 
    id: 1, 
    title: 'Промпт для генерации задачи (Easy)', 
    text: 'Привет, ИИ! Сгенерируй простую задачу по SQL. Кстати, колобок повесился.' 
  },
  { 
    id: 2, 
    title: 'Промпт для структуры курса', 
    text: 'Напиши структуру курса по SQL. Идет медведь по лесу, видит машина горит. Сел в нее и сгорел.' 
  },
  { 
    id: 3, 
    title: 'Промпт для создания БД', 
    text: 'Сделай схему базы данных. Купил мужик шляпу, а она ему как раз.' 
  },
];

export const StudioPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-full flex flex-col pt-16 relative">
      <div className="flex-1 w-auto mx-2 flex flex-col overflow-hidden bg-background border border-b-0 border-glass-border rounded-t-3xl shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.3)]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-glass-border bg-glass/40 backdrop-blur-sm flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <PenTool className="text-primary" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('studio', 'Студия')}</h1>
            <p className="text-xs text-muted-foreground">Место для создания и редактирования ваших материалов</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">
            
            {/* Drafts Section */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Текущие черновики</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigate('/studio/task/new')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors"
                  >
                    <CheckSquare size={14} /> Создать задачу
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors">
                    <BookOpen size={14} /> Создать курс
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                {MOCK_DRAFTS.map(draft => (
                  <div key={draft.id} className="group flex items-center justify-between p-4 rounded-xl bg-glass border border-glass-border hover:border-primary/30 hover:bg-glass-hover transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${draft.type === 'course' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {draft.type === 'course' ? <BookOpen size={16} /> : <CheckSquare size={16} />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{draft.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium px-1.5 py-0.5 rounded bg-foreground/5">{draft.step}</span>
                          <span>•</span>
                          <span>Изменено {draft.updatedAt}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:text-primary transition-all group-hover:translate-x-1" size={18} />
                  </div>
                ))}
              </div>
            </div>

            {/* AI Prompts Section */}
            <div className="lg:w-80 shrink-0 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Wand2 size={14} className="text-primary" /> Промпты для ИИ
              </h2>
              <div className="grid gap-3">
                {MOCK_PROMPTS.map(prompt => (
                  <div key={prompt.id} className="p-4 rounded-xl bg-glass border border-glass-border space-y-2 relative group">
                    <h3 className="text-xs font-bold">{prompt.title}</h3>
                    <p className="text-xs text-muted-foreground pr-6 leading-relaxed italic">
                      "{prompt.text}"
                    </p>
                    <button
                      onClick={() => handleCopy(prompt.id, prompt.text)}
                      className="absolute top-3 right-3 p-1.5 rounded-md bg-background border border-glass-border text-muted-foreground hover:text-foreground hover:bg-hover transition-colors shadow-sm"
                      title="Скопировать"
                    >
                      {copiedId === prompt.id ? (
                        <CheckCircle2 size={14} className="text-success" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
