import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, BookmarkCheck, Bookmark, Database, PlayCircle, Pencil } from 'lucide-react';
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
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, onToggleFlag }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('tasks_list');

  return (
    <div className="group relative bg-card border border-glass-border rounded-xl px-4 py-3.5 flex items-center gap-4 transition-all duration-200 hover:border-primary/30 hover:shadow-[0_4px_24px_-8px_hsl(var(--glow)/0.2)]">

      {/* Difficulty dots */}
      <div className="flex flex-col items-center gap-1 w-8 shrink-0">
        <DifficultyDots difficulty={task.difficulty} />
      </div>

      {/* Solved indicator */}
      <div className="shrink-0">
        {task.is_solved ? (
          <CheckCircle2 size={16} className="text-success" />
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/25" />
        )}
      </div>

      {/* Title + tags */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium truncate">{task.title}</h3>
          {task.is_flagged && (
            <BookmarkCheck size={13} className="text-primary shrink-0" />
          )}
        </div>
        {task.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {task.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-2xs px-1.5 py-0.5 rounded-md font-medium bg-primary/8 text-primary/70 border border-primary/10"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Database */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground w-28 shrink-0">
        <Database size={13} />
        <span className="truncate">{task.db_display_name}</span>
      </div>

      {/* Dates */}
      <div className="hidden xl:flex flex-col items-end text-2xs text-muted-foreground w-24 shrink-0 gap-0.5">
        <span>{t('row.created')} {formatDate(task.created_at)}</span>
        <span className={task.is_solved ? 'text-success' : ''}>
          {task.is_solved ? `${t('row.solved')} ${formatDate(task.solved_at)}` : t('row.not_solved')}
        </span>
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          className="p-2 rounded-lg bg-hover hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          title={t('row.edit')}
          onClick={(e) => { e.stopPropagation(); }}
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => navigate(`/tasks/${task.id}`)}
          className="p-2 rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-all flex items-center gap-1.5 px-3 shadow-sm"
          title={t('row.solve')}
        >
          <PlayCircle size={13} />
          <span className="text-xs font-semibold">{t('row.solve')}</span>
        </button>
      </div>

      {/* Bookmark button — always rendered, visible on hover or when active */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFlag(task.id); }}
        title={task.is_flagged ? t('row.unflag') : t('row.flag')}
        className={`absolute top-3 right-3 transition-all duration-150 ${
          task.is_flagged
            ? 'opacity-100 text-primary'
            : 'opacity-0 group-hover:opacity-50 hover:!opacity-100 text-muted-foreground'
        } group-hover:hidden`}
      >
        {task.is_flagged
          ? <BookmarkCheck size={15} />
          : <Bookmark size={15} />
        }
      </button>
    </div>
  );
};
