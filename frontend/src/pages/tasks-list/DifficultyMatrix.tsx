import React from 'react';
import { useTranslation } from 'react-i18next';
import { DIFFICULTY_TIERS, getTier, getStep } from './difficulty';

interface DifficultyMatrixProps {
  selected: number[];
  onToggle: (id: number) => void;
}

export const DifficultyMatrix: React.FC<DifficultyMatrixProps> = ({ selected, onToggle }) => {
  const { t } = useTranslation('tasks_list');

  return (
    <div className="space-y-3">
      {DIFFICULTY_TIERS.map((tier) => (
        <div key={tier.key} className="space-y-1.5">
          <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className={`w-1.5 h-1.5 rounded-full ${tier.color}`} />
            {t(tier.labelKey)}
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((step) => {
              const diffId = (DIFFICULTY_TIERS.indexOf(tier)) * 3 + step;
              const active = selected.includes(diffId);
              return (
                <button
                  key={diffId}
                  onClick={() => onToggle(diffId)}
                  title={`${t(tier.labelKey)} ${step}/3`}
                  className={`flex-1 h-9 rounded-lg border flex items-center justify-center gap-0.5 transition-all duration-150 outline-none ${
                    active
                      ? `border-transparent ${tier.color} shadow-sm`
                      : 'border-glass-border bg-card hover:border-primary/30 hover:bg-hover'
                  }`}
                >
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i <= step
                          ? active ? 'bg-white/80' : tier.color
                          : active ? 'bg-white/25' : 'bg-muted-foreground/20'
                      }`}
                    />
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
