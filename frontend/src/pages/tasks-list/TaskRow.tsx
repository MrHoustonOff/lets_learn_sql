import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Bookmark, ArrowRight } from 'lucide-react';
import { DifficultyDots } from './DifficultyDots';
import { MarkdownText } from '../../components/ui/MarkdownText';
import { Badge } from '../../components/ui/Badge';
import type { TaskItem } from './useTasksListData';

import { useNavigate } from 'react-router-dom';

interface TaskRowProps {
  task: TaskItem;
  onClick: (id: number) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, onClick }) => {
  const { t } = useTranslation('tasks_list');
  const navigate = useNavigate();

  const baseCls = 'bg-glass border-transparent hover:border-glass-border/50 hover:bg-glass-hover shadow-[0_2px_16px_-4px_hsl(var(--glow)/0.05)]';

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
              className="absolute -top-1 -right-1 drop-shadow-sm text-primary fill-primary"
            />
          )}
        </div>

        {/* Title and Meta (Courses/Tags) */}
        <div className="flex flex-col gap-1 w-[60%] shrink-0 min-w-0">
          {/* Top: Title */}
          <span
            className={`text-xs truncate transition-colors ${
              task.is_solved ? 'text-muted-foreground line-through opacity-70 group-hover:opacity-100 group-hover:no-underline' : 'font-medium text-foreground'
            }`}
          >
            <MarkdownText inline text={task.title} />
          </span>
          
          {/* Bottom: Courses & Tags */}
          <div className="flex items-center gap-3 text-micro text-muted-foreground">
            {/* Courses */}
            {task.courses && task.courses.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span>{t('row.courses', 'Курсы:')}</span>
                <div className="flex items-center gap-1">
                  {task.courses.map((c: any, idx: number) => (
                    <Badge key={c?.id || idx} variant="outline" className="opacity-80 group-hover:opacity-100 transition-opacity">
                      {c?.title || c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {task.tags.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span>{t('row.tags', 'Теги:')}</span>
                <div className="flex items-center gap-1">
                  {task.tags.map((tag: any, idx: number) => (
                    <Badge key={tag?.id || idx} variant="default" className="opacity-80 group-hover:opacity-100 transition-opacity">
                      {tag?.name || tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hover action */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/tasks/${task.id}`);
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg shrink-0 outline-none"
      >
        {t('row.solve')} <ArrowRight size={14} />
      </button>
    </li>
  );
};
