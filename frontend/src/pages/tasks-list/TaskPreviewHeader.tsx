import React from 'react';
import { Database, User, Bookmark, Pencil, Trash2, X } from 'lucide-react';
import { DifficultyDots } from './DifficultyDots';
import { MarkdownText } from '../../components/ui/MarkdownText';
import { useTranslation } from 'react-i18next';

interface TaskPreviewHeaderProps {
  task: any;
  onToggleBookmark: () => void;
  onDeleteClick: () => void;
  onShowDbViewer: () => void;
  onClose: () => void;
  onEditClick: () => void;
  isReadOnly?: boolean;
}

export const TaskPreviewHeader: React.FC<TaskPreviewHeaderProps> = ({
  task,
  onToggleBookmark,
  onDeleteClick,
  onShowDbViewer,
  onClose,
  onEditClick,
  isReadOnly
}) => {
  const { t } = useTranslation('tasks_list');
  return (
    <div className="px-6 py-4 border-b border-glass-border flex items-start justify-between bg-glass/40">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="mt-1">
            <DifficultyDots difficulty={task.difficulty} />
          </div>
          <h2 className="text-sm font-bold tracking-tight text-foreground whitespace-pre-wrap leading-snug">
            <MarkdownText inline text={task.title} />
          </h2>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Database size={11} className="text-primary" />
            <button 
              onClick={onShowDbViewer}
              className="font-medium text-foreground hover:text-primary transition-colors hover:underline outline-none"
            >
              {task.db_name}
            </button>
          </span>
          {task.author_name && (
            <span className="flex items-center gap-1">
              <User size={13} />
              {task.author_url ? (
                <a href={task.author_url} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors hover:underline">
                  {task.author_name}
                </a>
              ) : (
                task.author_name
              )}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isReadOnly && (
          <>
            <button
              onClick={onToggleBookmark}
              className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-md transition-all border min-w-0 shadow-sm ${
                task.is_bookmarked
                  ? 'bg-warning/10 border-warning/30 text-warning-text'
                  : 'bg-background border-glass-border text-muted-foreground hover:bg-hover hover:text-foreground'
              }`}
              title={task.is_bookmarked ? t('preview.unbookmark') : t('preview.bookmark')}
            >
              <Bookmark size={14} className={`shrink-0 transition-opacity ${task.is_bookmarked ? 'opacity-100 fill-current' : 'opacity-70'}`} />
              <span className="text-xs font-medium truncate hidden sm:inline">{t('preview.flag')}</span>
            </button>
            <button
              onClick={onEditClick}
              className="p-2 rounded-lg text-muted-foreground hover:bg-hover hover:text-foreground transition-colors outline-none"
              title={t('preview.edit')}
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={onDeleteClick}
              className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors outline-none"
              title={t('preview.delete')}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}

        <button
          onClick={onClose}
          className="p-2 rounded-lg text-muted-foreground hover:bg-hover hover:text-foreground transition-colors outline-none"
          title={t('preview.close')}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
