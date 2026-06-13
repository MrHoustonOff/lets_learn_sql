import React from 'react';
import { getTier, getStep } from './difficulty';

interface DifficultyDotsProps {
  difficulty: number | null | undefined;
  size?: 'sm' | 'md';
}

export const DifficultyDots: React.FC<DifficultyDotsProps> = ({ difficulty, size = 'sm' }) => {
  if (!difficulty) return <span className="text-muted-foreground/40 text-micro">—</span>;

  const tier = getTier(difficulty);
  const step = getStep(difficulty);
  const dotCls = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <div className="flex items-center gap-0.5" title={`${tier.key} ${step}/3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`${dotCls} rounded-full transition-colors ${i <= step ? tier.color : 'bg-muted-foreground/20'}`}
        />
      ))}
    </div>
  );
};
