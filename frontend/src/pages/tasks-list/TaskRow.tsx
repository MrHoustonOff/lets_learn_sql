import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, BookmarkCheck, Bookmark, Database, PlayCircle } from 'lucide-react';
import { DifficultyDots } from './DifficultyDots';

export interface TaskItem {
  id: number;
  title: string;
  difficulty: number | null;
  db_display_name: string;
  is_solved: boolean;
  is_flagged: boolean;
  tags: { id: number; name: string }[];
  created_at: string;
  solved_at: string | null;
}

interface TaskRowProps {
  task: TaskItem;
  onToggleFlag: (id: number) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, onToggleFlag }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('tasks_list');

  return (
    <div className="group relative bg-glass backdrop-blur-sm border border-glass-border rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-200 hover:border-primary/25 hover:shadow-[0_2px_16px_-4px_hsl(var(--glow)/0.15)] hover:bg-glass-hover">

      {/* Difficulty */}
      <div className="shrink-0 w-7 flex justify-center">
        <DifficultyDots difficulty={task.difficulty} />
      </div>

      {/* Solved circle */}
      <div className="shrink-0">
        {task.is_solved
          ? <CheckCircle2 size={14} className="text-success" />
          : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/25" />
        }
      </div>

      {/* Title + tags */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium truncate">{task.title}</span>
          {task.is_flagged && <BookmarkCheck size={12} className="text-primary/70 shrink-0" />}
        </div>
        {task.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {task.tags.map(tag => (
              <span
                key={tag.id}
                className="text-2xs px-1.5 py-px rounded font-medium"
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

      {/* DB */}
      <div className="hidden md:flex items-center gap-1 text-2xs text-muted-foreground w-24 shrink-0 truncate">
        <Database size={11} className="shrink-0" />
        <span className="truncate">{task.db_display_name}</span>
      </div>

      {/* Dates */}
      <div className="hidden lg:flex flex-col items-end text-2xs text-muted-foreground/60 w-20 shrink-0 gap-0.5 tabular-nums">
        <span>{formatDate(task.created_at)}</span>
        {task.is_solved && <span className="text-success/70">{formatDate(task.solved_at)}</span>}
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={() => navigate(`/tasks/${task.id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 transition-all active:scale-[0.98] shadow-sm"
        >
          <PlayCircle size={12} />
          {t('row.solve')}
        </button>
      </div>

      {/* Bookmark */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFlag(task.id); }}
        title={task.is_flagged ? t('row.unflag') : t('row.flag')}
        className={`absolute top-2.5 right-2.5 transition-all duration-150 ${
          task.is_flagged
            ? 'opacity-100 text-primary'
            : 'opacity-0 group-hover:opacity-40 hover:!opacity-100 text-muted-foreground'
        } group-hover:hidden`}
      >
        {task.is_flagged
          ? <BookmarkCheck size={13} />
          : <Bookmark size={13} />
        }
      </button>
    </div>
  );
};
