import React from 'react';
import { useTranslation } from 'react-i18next';
import { DIFFICULTY_TIERS } from './difficulty';

interface DifficultyMatrixProps {
  selected: number[];
  onToggle: (id: number) => void;
}

export const DifficultyMatrix: React.FC<DifficultyMatrixProps> = ({ selected, onToggle }) => {
  const { t } = useTranslation('tasks_list');

  return (
    <div className="space-y-2">
      {DIFFICULTY_TIERS.map((tier, tierIdx) => (
        <div key={tier.key} className="flex items-center gap-1.5">
          {/* Tier label */}
          <div className="flex items-center gap-1 w-14 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tier.color}`} />
            <span className="text-2xs text-muted-foreground font-medium truncate">{t(tier.labelKey)}</span>
          </div>
          {/* 3 level buttons */}
          <div className="flex gap-1 flex-1">
            {[1, 2, 3].map((step) => {
              const diffId = tierIdx * 3 + step;
              const active = selected.includes(diffId);
              return (
                <button
                  key={diffId}
                  onClick={() => onToggle(diffId)}
                  title={`${t(tier.labelKey)} ${step}/3`}
                  className={`flex-1 h-6 rounded-md flex items-center justify-center gap-[3px] transition-all duration-150 outline-none border ${
                    active
                      ? `${tier.color} border-transparent shadow-sm`
                      : 'bg-glass border-glass-border hover:border-primary/30 hover:bg-hover'
                  }`}
                >
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`w-1 h-1 rounded-full transition-colors ${
                        i <= step
                          ? active ? 'bg-white/70' : tier.color
                          : active ? 'bg-white/20' : 'bg-muted-foreground/20'
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
