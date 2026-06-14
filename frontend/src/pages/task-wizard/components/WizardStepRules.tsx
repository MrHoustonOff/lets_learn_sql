import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';
import { FieldLabel, SelectInput, SectionCard, TextInput } from './ui';
import { RULE_CATEGORIES, CONSTRUCT_TARGETS, CONDITIONS_WITH_VALUE, CONDITION_LABELS } from '../mocks';

export interface RuleMock {
  id: string;
  category: string;
  condition: string;
  params: any;
  severity: "blocking" | "warning";
}

interface WizardStepRulesProps {
  data: { rules: RuleMock[] };
  setData: React.Dispatch<React.SetStateAction<any>>;
}

const emptyRule = (): RuleMock => ({
  id: Math.random().toString(36).slice(2, 10),
  category: "construct",
  condition: "required",
  params: { target: "JOIN" },
  severity: "blocking",
});

export const WizardStepRules: React.FC<WizardStepRulesProps> = ({ data, setData }) => {
  const { t } = useTranslation();
  const rules = data.rules || [];

  const addRule = () => {
    setData((p: any) => ({ ...p, rules: [...(p.rules || []), emptyRule()] }));
  };

  const removeRule = (id: string) => {
    setData((p: any) => ({ ...p, rules: (p.rules || []).filter((r: any) => r.id !== id) }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Правила проверки</h2>
          <p className="text-xs text-muted-foreground mt-1">Добавь статические правила (AST) и проверки производительности</p>
        </div>
        <button
          onClick={addRule}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" />
          Добавить правило
        </button>
      </div>

      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <p className="text-sm text-muted-foreground">Нет правил. Запрос будет проверен только на совпадение данных.</p>
          </div>
        ) : (
          rules.map((rule, idx) => (
            <div key={rule.id} className="bg-popover border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div>
                    <FieldLabel>Категория</FieldLabel>
                    <SelectInput
                      value={rule.category}
                      onChange={(v) => { /* Mock */ }}
                      options={RULE_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
                    />
                  </div>
                  <div>
                    <FieldLabel>Условие</FieldLabel>
                    <SelectInput
                      value={rule.condition}
                      onChange={(v) => { /* Mock */ }}
                      options={[{ value: rule.condition, label: CONDITION_LABELS[rule.condition] || rule.condition }]}
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeRule(rule.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors mt-5 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5 flex justify-between items-center">
                <span className="text-xs text-foreground/90">Mock: Параметры правила</span>
                <div className="flex gap-1">
                  <span className={`px-2 py-1 text-[10px] rounded font-bold uppercase ${rule.severity === 'blocking' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning-text'}`}>
                    {rule.severity}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
