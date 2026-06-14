import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { SectionCard } from './ui';

interface WizardStepSolutionData {
  referenceSql: string;
  orderMatters: boolean;
}

interface WizardStepSolutionProps {
  data: WizardStepSolutionData;
  setData: React.Dispatch<React.SetStateAction<WizardStepSolutionData>>;
}

const SqlEditorMock: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => {
  return (
    <div className="border border-border rounded-lg bg-popover overflow-hidden focus-within:ring-2 focus-within:ring-ring/40 focus-within:border-primary transition-all">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-secondary/40">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">SQL</span>
        <span className="text-[11px] text-muted-foreground">PostgreSQL</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full min-h-[220px] px-4 py-3 text-sm font-mono leading-relaxed bg-transparent resize-y focus:outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
};

export const WizardStepSolution: React.FC<WizardStepSolutionProps> = ({ data, setData }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-6xl mx-auto w-full">
      <div className="lg:col-span-2 space-y-5">
        <SectionCard
          title="Эталонный SQL-запрос"
          description="Этот запрос — точка отсчёта для сравнения ответов пользователей"
        >
          <SqlEditorMock
            value={data.referenceSql}
            onChange={(v) => setData((p) => ({ ...p, referenceSql: v }))}
            placeholder={`SELECT ...\nFROM ...\nWHERE ...`}
          />
        </SectionCard>
      </div>

      <div className="space-y-5">
        <SectionCard title="Порядок строк" description="Влияет на проверку Этапа 1">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input
                type="checkbox"
                checked={data.orderMatters}
                onChange={(e) => setData((p) => ({ ...p, orderMatters: e.target.checked }))}
                className="peer w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring/40 cursor-pointer appearance-none border bg-popover checked:bg-primary checked:border-primary transition-colors"
              />
              <Check className="w-3 h-3 text-primary-foreground absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
            </div>
            <div>
              <p className="text-sm font-medium leading-none mb-1">Порядок вывода важен</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Если включено — после совпадения данных дополнительно проверяется
                совпадение позиций строк (через ROW_NUMBER без внутреннего ORDER BY).
                Несовпадение порядка при верных данных = «данные верны, порядок не совпадает».
              </p>
            </div>
          </label>
        </SectionCard>

        <SectionCard title="Подсказка по проверке">
          <ul className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
            <li className="flex gap-2">
              <span className="text-primary font-semibold shrink-0">1.</span>
              Контрольная сумма (count + md5) — быстрая проверка совпадения.
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-semibold shrink-0">2.</span>
              EXCEPT ALL — точное мультисет-сравнение результатов.
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-semibold shrink-0">3.</span>
              При расхождении — отчёт с примерами строк (до 50) и точным количеством.
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
};
