import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlayCircle, Tag, KeyRound, BookOpen } from 'lucide-react';
import { ModalBase } from '../../components/ui/ModalBase';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { HistoryPanel } from '../../components/workspace/submit/HistoryPanel';
import { AttemptModal } from '../../components/workspace/submit/AttemptModal';
import { ReferenceModal } from '../../components/workspace/submit/ReferenceModal';
import { DBViewerModal } from '../../components/workspace/DBViewerModal';
import { MarkdownText } from '../../components/ui/MarkdownText';
import { TaskPreviewHeader } from './TaskPreviewHeader';
import { Badge } from '../../components/ui/Badge';

interface TaskPreviewModalProps {
  taskId: number;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onBookmarkToggle?: (taskId: number, isBookmarked: boolean) => void;
}

export const TaskPreviewModal: React.FC<TaskPreviewModalProps> = ({ taskId, isOpen, onClose, onDeleted, onBookmarkToggle }) => {
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

  const handleToggleBookmark = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/bookmark`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTask((prev: any) => ({ ...prev, is_bookmarked: data.is_bookmarked }));
        if (onBookmarkToggle) {
          onBookmarkToggle(taskId, data.is_bookmarked);
        }
      }
    } catch (err) {
      console.error('Failed to toggle bookmark', err);
    }
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
            <TaskPreviewHeader
              task={task}
              onToggleBookmark={handleToggleBookmark}
              onDeleteClick={() => setDeleteConfirm(true)}
              onShowDbViewer={() => setShowDbViewer(true)}
              onClose={onClose}
              onEditClick={() => {
                onClose();
                navigate(`/studio/task/${taskId}`, { state: { fromEditTask: true } });
              }}
            />

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              {/* Description */}
              {task.description && (
                <MarkdownText text={task.description} />
              )}

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-6 flex-1">
                  {/* Tags */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={12} /> {t('preview.tags')}
                </h3>
                {task.tags && task.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {task.tags.map((tag: any, idx: number) => (
                      <Badge key={tag?.id || idx} variant="default">
                        {tag?.name || tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="flex">
                    <Badge variant="dashed">
                      {t('preview.no_tags')}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Courses */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={12} /> {t('preview.courses')}
                </h3>
                {task.courses && task.courses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {task.courses.map((course: any, idx: number) => (
                      <Badge key={course?.id || idx} variant="outline">
                        {course?.title || course}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="flex">
                    <Badge variant="dashed">
                      {t('preview.no_courses')}
                    </Badge>
                  </div>
                )}
                  </div>
                </div>

                <div className="shrink-0 sm:pb-1">
                  <button
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 shadow-md transition-all outline-none w-full sm:w-auto justify-center"
                  >
                    <PlayCircle size={18} /> {t('preview.solve')}
                  </button>
                </div>
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
                    <KeyRound className="text-muted-foreground" size={14} /> {t('preview.solution')}
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
        title={t('preview.delete_title')}
        confirmText={isDeleting ? t('preview.delete_confirming') : t('preview.delete_confirm')}
        variant="destructive"
      >
        {t('preview.delete_desc1')} <code className="px-1.5 py-0.5 mx-0.5 rounded bg-muted font-mono text-sm border border-glass-border">{task?.title}</code> {t('preview.delete_desc2')}
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

      {/* Database Viewer Modal */}
      {task && (
        <DBViewerModal
          dbName={task.db_name}
          isOpen={showDbViewer}
          onClose={() => setShowDbViewer(false)}
        />
      )}
    </>
  );
};
