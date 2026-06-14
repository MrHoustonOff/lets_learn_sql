import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Circle, Star, ArrowRight, Database, Bookmark } from 'lucide-react';
import { DBViewerModal } from '../components/workspace/DBViewerModal';
import { MarkdownText } from '../components/ui/MarkdownText';

interface TaskDetails {
  id: number;
  title: string;
  status: string;
  bookmarked: boolean;
}

interface SectionDetails {
  id: number;
  title: string;
  description?: string;
  completed: number;
  total: number;
  progress: number;
  tasks: TaskDetails[];
}

interface CourseDetails {
  id: number;
  title: string;
  description?: string;
  dbNames: string[];
  totalTasks: number;
  totalSections: number;
  progress: number;
  completedTasks: number;
  sections: SectionDetails[];
}

export const CourseDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [courseData, setCourseData] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Обработка Esc для возврата
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Идем назад только если модалка закрыта
      if (e.key === 'Escape' && !selectedDb) {
        navigate('/courses');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, selectedDb]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/courses/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch course details');
        return res.json();
      })
      .then(data => {
        setCourseData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">{t('common:loading') || 'Loading...'}</div>
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-destructive font-semibold">Error: {error || 'Course details not found'}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full w-full overflow-y-auto custom-scrollbar pb-12">
      <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-300">
        <button 
          onClick={() => navigate('/courses')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 font-medium text-sm"
        >
          <ArrowLeft size={16} />
          {t('courses_page:back_to_courses')}
        </button>

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-4">{courseData.title}</h1>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed max-w-3xl">
            {courseData.description}
          </p>
          <div className="text-muted-foreground text-sm flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-foreground/60" />
              {courseData.dbNames.map((db, i) => (
                <React.Fragment key={db}>
                  <button 
                    onClick={() => setSelectedDb(db)}
                    className="font-medium text-foreground hover:text-primary transition-colors hover:underline"
                  >
                    {db}
                  </button>
                  {i < courseData.dbNames.length - 1 && <span className="text-glass-border">,</span>}
                </React.Fragment>
              ))}
            </div>
            <span className="text-glass-border">|</span>
            <span>{courseData.totalTasks} {t('courses_page:tasks')}</span>
            <span className="text-glass-border">|</span>
            <span>{courseData.totalSections} {t('courses_page:sections')}</span>
          </div>
        </div>

      <div className="mb-12">
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="font-semibold text-lg">{t('overall_progress')}</span>
          <span className="text-muted-foreground font-mono font-medium">
            <span className="text-foreground">{courseData.progress}%</span> &nbsp;&nbsp; {courseData.completedTasks}/{courseData.totalTasks}
          </span>
        </div>
        <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-success transition-all duration-500" style={{ width: `${courseData.progress}%` }}></div>
        </div>
      </div>

      <div className="space-y-12">
        {courseData.sections.map(section => (
          <div key={section.id}>
            <div className="flex items-center justify-between text-sm mb-2 border-b border-glass-border pb-2">
              <span className="font-bold text-foreground/90 uppercase tracking-wider">{section.title}</span>
              <span className="text-muted-foreground font-mono font-medium">
                 {section.completed}/{section.total}
              </span>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mb-3">
              <div className="h-full bg-success/70" style={{ width: `${section.progress}%` }}></div>
            </div>
            {section.description && (
              <p className="text-xs text-muted-foreground mb-4 pl-1">{section.description}</p>
            )}

            <ul className="space-y-2 pl-2">
              {section.tasks.map((task, idx) => {
                const isBookmarked = task.bookmarked;
                const isDone = task.status === 'done';
                return (
                  <li 
                    key={task.id} 
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className={`flex items-center justify-between py-2 px-3 rounded-xl hover:bg-hover transition-colors group cursor-pointer border border-transparent ${
                      isBookmarked ? 'bg-warning/5 border-warning/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0 flex items-center justify-center w-5 h-5">
                        {isDone ? (
                          <CheckCircle2 size={18} className="text-success" />
                        ) : isBookmarked ? (
                          <Bookmark size={16} className="text-warning fill-warning" />
                        ) : (
                          <Circle size={16} className="text-muted-foreground opacity-50" />
                        )}
                        {isDone && isBookmarked && (
                          <Bookmark size={10} className="absolute -top-1 -right-1 text-warning fill-warning drop-shadow-sm" />
                        )}
                      </div>
                      <span className={`text-sm ${isDone ? 'text-muted-foreground line-through opacity-70' : isBookmarked ? 'text-warning-text font-bold' : 'text-foreground font-medium'}`}>
                        {idx + 1}. <MarkdownText inline text={task.title} />
                      </span>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg pointer-events-none">
                      {t('courses_page:solve')} <ArrowRight size={14} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      </div>
      
      <DBViewerModal 
        isOpen={!!selectedDb} 
        onClose={() => setSelectedDb(null)} 
        dbName={selectedDb || ''} 
      />
    </div>
  );
};
