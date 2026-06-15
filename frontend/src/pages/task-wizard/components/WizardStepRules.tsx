import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { FieldLabel, SelectInput, SectionCard, InfoTooltip } from './ui';
import { RULE_CATEGORIES, CONSTRUCT_TARGETS, CONDITIONS_WITH_VALUE, CONDITION_LABELS } from './rulesConstants';

export interface RuleMock {
  id: string;
  category: string;
  condition: string;
  params: any;
  severity: "blocking" | "warning";
}

interface WizardStepRulesProps {
  data: { rules: RuleMock[]; orderMatters: boolean };
  setData: React.Dispatch<React.SetStateAction<any>>;
  validationStatus?: 'idle' | 'checking' | 'checked';
  validationResults?: Record<string, { passed: boolean, detail: string }>;
  setValidationStatus?: React.Dispatch<React.SetStateAction<'idle' | 'checking' | 'checked'>>;
}

const emptyRule = (): RuleMock => ({
  id: Math.random().toString(36).slice(2, 10),
  category: "construct",
  condition: "required",
  params: { target: "JOIN" },
  severity: "blocking",
});

export const WizardStepRules: React.FC<WizardStepRulesProps> = ({ data, setData, validationStatus, validationResults, setValidationStatus }) => {
  const { t } = useTranslation();
  const rules = data.rules || [];

  const handleModify = () => {
    if (setValidationStatus) setValidationStatus('idle');
  };

  const addRule = () => {
    setData((p: any) => ({ ...p, rules: [...(p.rules || []), emptyRule()] }));
    handleModify();
  };

  const removeRule = (id: string) => {
    setData((p: any) => ({ ...p, rules: (p.rules || []).filter((r: any) => r.id !== id) }));
    handleModify();
  };

  const updateRule = (id: string, field: string, value: any) => {
    setData((p: any) => ({
      ...p,
      rules: (p.rules || []).map((r: any) => r.id === id ? { ...r, [field]: value } : r)
    }));
    handleModify();
  };

  const updateRuleParam = (id: string, paramField: string, value: any) => {
    setData((p: any) => ({
      ...p,
      rules: (p.rules || []).map((r: any) => r.id === id ? { ...r, params: { ...(r.params || {}), [paramField]: value } } : r)
    }));
    handleModify();
  };

  const getConditionOptions = (category: string) => {
    return [
      { value: 'required', label: t('wizard.rules.conditions.required'), info: t(`wizard.rules.condition_info.required`) },
      { value: 'forbidden', label: t('wizard.rules.conditions.forbidden'), info: t(`wizard.rules.condition_info.forbidden`) },
      { value: 'count_min', label: t('wizard.rules.conditions.count_min'), info: t(`wizard.rules.condition_info.count_min`) },
      { value: 'count_max', label: t('wizard.rules.conditions.count_max'), info: t(`wizard.rules.condition_info.count_max`) },
      { value: 'count_exact', label: t('wizard.rules.conditions.count_exact'), info: t(`wizard.rules.condition_info.count_exact`) },
    ];
  };

  const handleCategoryChange = (ruleId: string, newCategory: string) => {
    const condition = 'required';
    let params: any = {};
    if (newCategory === 'construct') params = { target: 'JOIN' };
    if (newCategory === 'object' || newCategory === 'alias') params = { object_name: '' };
    if (newCategory === 'function') params = { function_name: '' };
    
    updateRule(ruleId, 'category', newCategory);
    updateRule(ruleId, 'condition', condition);
    updateRule(ruleId, 'params', params);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Order Matters Rule */}
      <SectionCard>
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative flex items-center justify-center mt-0.5">
            <input
              type="checkbox"
              checked={data.orderMatters}
              onChange={(e) => setData((p: any) => ({ ...p, orderMatters: e.target.checked }))}
              className="peer w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring/40 cursor-pointer appearance-none border bg-popover checked:bg-primary checked:border-primary transition-colors"
            />
            <Check className="w-3 h-3 text-primary-foreground absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-sm font-medium leading-none">{t('wizard.rules.order_matters')}</p>
              <InfoTooltip text={t('wizard.rules.order_matters_tooltip')} />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('wizard.rules.order_matters_desc')}
            </p>
          </div>
        </label>
      </SectionCard>

      <div className="flex items-center justify-between mt-8 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">{t('wizard.rules.ast_rules_title')}</h2>
            <InfoTooltip text={t('wizard.rules.ast_info')} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t('wizard.rules.ast_rules_desc')}</p>
        </div>
        <button
          onClick={addRule}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" />
          {t('wizard.rules.add_rule')}
        </button>
      </div>

      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border/60 rounded-xl bg-muted/10">
            <p className="text-sm text-muted-foreground">{t('wizard.rules.no_rules')}</p>
          </div>
        ) : (
          rules.map((rule, idx) => (
            <div key={rule.id} className="bg-popover border border-border rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div>
                    <FieldLabel>
                      {t('wizard.rules.category')} 
                      <InfoTooltip text={t(`wizard.rules.category_info.${rule.category}`)} />
                    </FieldLabel>
                    <SelectInput
                      value={rule.category}
                      onChange={(v) => handleCategoryChange(rule.id, v)}
                      options={RULE_CATEGORIES.map((c) => ({ value: c.key, label: t(`wizard.rules.categories.${c.key}`), info: t(`wizard.rules.category_info.${c.key}`) }))}
                    />
                  </div>
                  <div>
                    <FieldLabel>
                      {t('wizard.rules.condition')} 
                      <InfoTooltip text={t(`wizard.rules.condition_info.${rule.condition}`)} />
                    </FieldLabel>
                    <SelectInput
                      value={rule.condition}
                      onChange={(v) => updateRule(rule.id, 'condition', v)}
                      options={getConditionOptions(rule.category)}
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
              <div className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5 flex justify-between items-center flex-wrap gap-3">
                <div className="flex gap-2 items-center flex-1">
                  {rule.category === 'construct' && (
                    <SelectInput
                      value={rule.params?.target || ''}
                      onChange={(v) => updateRuleParam(rule.id, 'target', v)}
                      options={CONSTRUCT_TARGETS.map(t => ({ value: t, label: t }))}
                      className="min-w-[220px]"
                    />
                  )}
                  {(rule.category === 'object' || rule.category === 'alias') && (
                    <input 
                      type="text" 
                      placeholder={t('wizard.rules.params.object_name_placeholder')} 
                      value={rule.params?.object_name || ''}
                      onChange={e => updateRuleParam(rule.id, 'object_name', e.target.value)}
                      className="h-9 min-w-[220px] rounded-lg bg-background border border-glass-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  )}
                  {rule.category === 'function' && (
                    <input 
                      type="text" 
                      placeholder={t('wizard.rules.params.function_name_placeholder')} 
                      value={rule.params?.function_name || ''}
                      onChange={e => updateRuleParam(rule.id, 'function_name', e.target.value)}
                      className="h-9 min-w-[220px] rounded-lg bg-background border border-glass-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  )}
                  {rule.category === 'alias' && (
                    <input 
                      type="text" 
                      placeholder={t('wizard.rules.params.required_alias_placeholder')} 
                      value={rule.params?.required_alias || ''}
                      onChange={e => updateRuleParam(rule.id, 'required_alias', e.target.value)}
                      className="h-9 min-w-[160px] rounded-lg bg-background border border-glass-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  )}
                  {CONDITIONS_WITH_VALUE.includes(rule.condition) && (
                    <input 
                      type="number" 
                      placeholder={t('wizard.rules.params.count_placeholder')} 
                      min="1"
                      value={rule.params?.count || ''}
                      onChange={e => updateRuleParam(rule.id, 'count', parseInt(e.target.value))}
                      className="h-9 w-24 min-w-[100px] rounded-lg bg-background border border-glass-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  )}
                  <input
                    type="text"
                    placeholder={t('wizard.rules.custom_error_placeholder')}
                    value={rule.message || ''}
                    onChange={e => updateRule(rule.id, 'message', e.target.value)}
                    className="h-9 flex-1 rounded-lg bg-background border border-glass-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[250px]"
                  />
                </div>
                <div className="flex gap-1 shrink-0 items-center">
                  <SelectInput
                    value={rule.severity}
                    onChange={(v) => updateRule(rule.id, 'severity', v)}
                    options={[
                      { value: 'blocking', label: t('wizard.rules.severity_blocking') },
                      { value: 'warning', label: t('wizard.rules.severity_warning') }
                    ]}
                    className="min-w-[180px]"
                  />
                </div>
              </div>
              {validationResults && validationResults[rule.id] && (
                <div className={`px-4 py-2 mt-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  validationResults[rule.id].passed 
                    ? "bg-success/10 text-success border border-success/20" 
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}>
                  {validationResults[rule.id].passed ? (
                    <><Check className="w-4 h-4 shrink-0" /> {t('wizard.rules.validation.passed')}</>
                  ) : (
                    <><X className="w-4 h-4 shrink-0" /> {validationResults[rule.id].detail || t('wizard.rules.validation.failed')}</>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
