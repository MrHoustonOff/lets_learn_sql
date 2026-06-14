import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlayCircle, Trash2, Tag, User, Database, KeyRound, Pencil, X, BookOpen } from 'lucide-react';
import { ModalBase } from '../../components/ui/ModalBase';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { HistoryPanel } from '../../components/workspace/submit/HistoryPanel';
import { AttemptModal } from '../../components/workspace/submit/AttemptModal';
import { ReferenceModal } from '../../components/workspace/submit/ReferenceModal';
import { DifficultyDots } from './DifficultyDots';
import { DatabaseDetailsModal } from '../../components/workspace/DatabaseDetailsModal';

interface TaskPreviewModalProps {
  taskId: number;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export const TaskPreviewModal: React.FC<TaskPreviewModalProps> = ({ taskId, isOpen, onClose, onDeleted }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('tasks_list');

  const [task, setTask] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [showReference, setShowReference] = useState(false);
  const [showDbViewer, setShowDbViewer] = useState(false);

  const fetchDetails = async () => {
    try {
      const [resTask, resHistory] = await Promise.all([
        fetch(`/api/tasks/${taskId}`),
        fetch(`/api/tasks/${taskId}/attempts`)
      ]);
      if (!resTask.ok) throw new Error('Failed to fetch task');
      setTask(await resTask.json());
      setHistory(resHistory.ok ? await resHistory.json() : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setTask(null);
      fetchDetails();
    }
  }, [taskId, isOpen]);

  const handleDeleteTask = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        onDeleted();
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAttempt = async (attemptId: number) => {
    await fetch(`/api/tasks/${taskId}/attempts/${attemptId}`, { method: 'DELETE' });
    setSelectedAttempt(null);
    fetchDetails(); // refetch history
  };

  const handleClearHistory = async (type: 'all' | 'correct' | 'incorrect') => {
    await fetch(`/api/tasks/${taskId}/attempts?type=${type}`, { method: 'DELETE' });
    fetchDetails();
  };

  return (
    <>
      <ModalBase 
        isOpen={isOpen} 
        onClose={onClose} 
        isMonolith={true}
        disableEsc={showReference || !!selectedAttempt || deleteConfirm || showDbViewer}
      >
        {loading ? (
          <div className="p-12 flex justify-center text-muted-foreground animate-pulse">
            {t('page.loading')}
          </div>
        ) : error ? (
          <div className="p-8 text-destructive text-center">{error}</div>
        ) : task ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-glass-border flex items-start justify-between bg-glass/40">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="mt-1">
                    <DifficultyDots difficulty={task.difficulty} />
                  </div>
                  <h2 className="text-sm font-bold tracking-tight text-foreground whitespace-normal leading-snug">{task.title}</h2>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <button 
                    onClick={() => setShowDbViewer(true)}
                    className="flex items-center gap-1.5 bg-background border border-glass-border px-2 py-0.5 rounded-md shadow-sm hover:bg-hover transition-colors outline-none"
                  >
                    <Database size={11} className="text-primary" /> {task.db_name}
                  </button>
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
                <button
                  onClick={() => {}}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-hover hover:text-foreground transition-colors outline-none"
                  title="Редактировать задачу"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors outline-none"
                  title="Удалить задачу"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 shadow-sm transition-all outline-none mx-2"
                >
                  <PlayCircle size={16} /> Решить
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-hover hover:text-foreground transition-colors outline-none"
                  title="Закрыть"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              {/* Description */}
              {task.description && (
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
                  <p>{task.description}</p>
                </div>
              )}

              {/* Tags */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={12} /> Теги
                </h3>
                {task.tags && task.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {task.tags.map((tag: any) => (
                      <span
                        key={tag.id}
                        className="text-xs px-2 py-0.5 rounded-md font-medium"
                        style={{
                          background: `hsl(var(--badge-bg) / var(--badge-bg-opacity))`,
                          color: `hsl(var(--badge-fg))`,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex">
                    <span className="text-xs px-2 py-0.5 rounded-md font-medium border border-dashed border-glass-border text-muted-foreground/50 bg-glass/20">
                      Тегов пока нет
                    </span>
                  </div>
                )}
              </div>

              {/* Courses */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={12} /> Курсы
                </h3>
                {task.courses && task.courses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {task.courses.map((course: any) => (
                      <span
                        key={course.id}
                        className="text-xs px-2 py-0.5 rounded-md font-medium border border-glass-border bg-glass"
                      >
                        {course.title}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex">
                    <span className="text-xs px-2 py-0.5 rounded-md font-medium border border-dashed border-glass-border text-muted-foreground/50 bg-glass/20">
                      Курсов пока нет
                    </span>
                  </div>
                )}
              </div>

              {/* Previous Attempts History */}
              {history.length > 0 && (
                <div className="pt-4 border-t border-glass-border">
                  <HistoryPanel
                    history={history}
                    onOpenAttempt={setSelectedAttempt}
                    onDeleteAll={handleClearHistory}
                  />
                </div>
              )}

              {/* Reference SQL (only if solved) - Bottom */}
              {task.is_solved && task.reference_sql && (
                <div className="pt-4">
                  <button 
                    onClick={() => setShowReference(true)}
                    className="px-4 py-2 bg-background border border-glass-border hover:bg-hover text-foreground font-medium rounded-md text-xs transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <KeyRound className="text-muted-foreground" size={14} /> Правильное решение
                  </button>
                </div>
              )}

            </div>
          </>
        ) : null}
      </ModalBase>

      {/* Confirm Task Delete Modal */}
      <ConfirmModal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteTask}
        title="Удалить задачу?"
        confirmText={isDeleting ? 'Удаление...' : 'Удалить навсегда'}
        variant="destructive"
      >
        Задача <code className="px-1.5 py-0.5 mx-0.5 rounded bg-muted font-mono text-sm border border-glass-border">{task?.title}</code> будет безвозвратно удалена вместе со всеми решениями пользователей.
      </ConfirmModal>

      {/* Attempt Preview Modal */}
      {selectedAttempt && (
        <AttemptModal
          onClose={() => setSelectedAttempt(null)}
          attempt={selectedAttempt}
          onDelete={() => handleDeleteAttempt(selectedAttempt.id)}
        />
      )}

      {/* Reference SQL Modal */}
      <ReferenceModal 
        isOpen={showReference} 
        onClose={() => setShowReference(false)} 
        sql={task?.reference_sql}
      />

      {/* Database Details Modal */}
      {task && showDbViewer && (
        <DatabaseDetailsModal
          database={{
            id: String(task.database_id),
            technicalName: task.db_name,
            name: task.db_name
          }}
          isOpen={showDbViewer}
          onClose={() => setShowDbViewer(false)}
        />
      )}
    </>
  );
};
