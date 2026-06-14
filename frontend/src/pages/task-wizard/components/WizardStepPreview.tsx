import React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Sparkles } from 'lucide-react';
import { MarkdownText } from '../../../components/ui/MarkdownText';

interface WizardStepPreviewProps {
  data: any;
  setData: React.Dispatch<React.SetStateAction<any>>;
}

export const WizardStepPreview: React.FC<WizardStepPreviewProps> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Всё готово к публикации!</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Проверь, как задача выглядит для пользователей. Убедись, что описание понятно, а правила проверки настроены корректно.
        </p>
      </div>

      {/* Фейковое превью задачи */}
      <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {/* Fake Header */}
        <div className="h-14 border-b border-border bg-muted/30 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="px-2 py-1 rounded bg-success/20 text-success text-[10px] font-bold uppercase tracking-wider">
              {data.difficulty || 'EASY-1'}
            </div>
            <span className="text-sm font-bold">{data.title || 'Без названия'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold pointer-events-none">
              <Eye className="w-3.5 h-3.5" /> Превью режима
            </button>
          </div>
        </div>

        {/* Fake Body */}
        <div className="flex-1 grid grid-cols-2 divide-x divide-border">
          <div className="p-5 overflow-y-auto">
            <div className="prose dark:prose-invert max-w-none text-sm">
              <MarkdownText content={data.description || '*Описание отсутствует*'} />
            </div>
            {data.tags?.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {data.tags.map((t: string) => (
                  <span key={t} className="px-2 py-1 rounded bg-secondary text-muted-foreground text-xs">{t}</span>
                ))}
              </div>
            )}
          </div>
          <div className="bg-muted/10 p-5 flex flex-col">
            <div className="flex-1 border border-border rounded bg-background flex items-center justify-center text-muted-foreground text-sm">
              Fake SQL Editor Area
            </div>
            <div className="h-12 mt-4 flex justify-end">
              <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold pointer-events-none opacity-50">
                Запустить код
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
