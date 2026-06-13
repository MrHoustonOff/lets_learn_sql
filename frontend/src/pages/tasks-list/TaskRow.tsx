import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Bookmark, ArrowRight } from 'lucide-react';
import { DifficultyDots } from './DifficultyDots';
import type { TaskItem } from './useTasksListData';

interface TaskRowProps {
  task: TaskItem;
  onClick: (id: number) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, onClick }) => {
  const { t } = useTranslation('tasks_list');

  // Using the requested styling for solved/flagged
  const isSpecial = task.is_solved && task.is_flagged;
  const baseCls = isSpecial
    ? 'bg-warning/5 border-warning/20'
    : 'bg-glass border-transparent hover:border-glass-border/50 hover:bg-glass-hover shadow-[0_2px_16px_-4px_hsl(var(--glow)/0.05)]';

  return (
    <li
      onClick={() => onClick(task.id)}
      className={`flex items-center justify-between py-2 px-3 rounded-xl transition-all duration-200 group cursor-pointer border ${baseCls}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        
        {/* Difficulty Dots */}
        <div className="shrink-0 w-6 flex justify-center">
          <DifficultyDots difficulty={task.difficulty} />
        </div>

        {/* Check & Bookmark container */}
        <div className="relative shrink-0 flex items-center justify-center w-5 h-5">
          {task.is_solved ? (
            <CheckCircle2 size={18} className="text-success" />
          ) : (
            <div className="w-[14px] h-[14px] rounded-full border border-muted-foreground/30" />
          )}
          {task.is_flagged && (
            <Bookmark
              size={10}
              className={`absolute -top-1 -right-1 drop-shadow-sm ${isSpecial ? 'text-warning fill-warning' : 'text-primary fill-primary'}`}
            />
          )}
        </div>

        {/* Title and Tags */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-sm truncate transition-colors ${
              task.is_solved ? 'text-muted-foreground line-through opacity-70 group-hover:opacity-100 group-hover:no-underline' : 'font-medium'
            }`}
          >
            {task.title}
          </span>
          {task.tags.length > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              {task.tags.map(tag => (
                <span
                  key={tag.id}
                  className="text-micro px-1.5 py-0.5 rounded font-medium opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `hsl(var(--badge-bg) / var(--badge-bg-opacity))`,
                    color: `hsl(var(--badge-fg))`,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hover action */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg shrink-0">
        {t('row.solve')} <ArrowRight size={14} />
      </div>
    </li>
  );
};
