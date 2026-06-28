import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { CheckCircle2, Circle, Star, ChevronRight, Loader2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { MarkdownText } from '../ui/MarkdownText';

export const CourseTOC: React.FC = () => {
  const { t } = useTranslation();
  const isCourseTocOpen = useUIStore(state => state.isCourseTocOpen);
  const setCourseTocOpen = useUIStore(state => state.setCourseTocOpen);
  const activeTask = useTaskStore(state => state.activeTask);
  
  const [courseData, setCourseData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCourseTocOpen) {
        setCourseTocOpen(false);
      }
    };

    if (isCourseTocOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCourseTocOpen, setCourseTocOpen]);

  React.useEffect(() => {
    const courseId = activeTask?.courses?.[0]?.id;
    if (!courseId) {
      setCourseData(null);
      return;
    }

    setLoading(true);
    fetch(`/api/courses/${courseId}`)
      .then(res => res.json())
      .then(data => {
        setCourseData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load course TOC:', err);
        setLoading(false);
      });
  }, [activeTask?.courses]);

  if (!courseData && !loading) {
    return null;
  }

  return (
    <>
      {/* Overlay for mobile/tablet */}
      <div 
        className={`fixed inset-0 z-overlay transition-all duration-300 ${
          isCourseTocOpen ? 'opacity-100 pointer-events-auto bg-background/20 backdrop-blur-[1px]' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setCourseTocOpen(false)}
      />

      <div 
        className={`fixed top-4 left-4 h-[calc(100vh-2rem)] bg-glass backdrop-blur-xl border border-glass-border rounded-2xl w-80 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] z-drawer transition-transform duration-300 ease-in-out flex flex-col overflow-y-auto custom-scrollbar ${
          isCourseTocOpen ? 'translate-x-0' : '-translate-x-[120%]'
        }`}
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary opacity-50" size={32} />
          </div>
        ) : courseData && (
          <>
            {/* Header */}
            <div className="p-4 border-b border-glass-border bg-hover shrink-0">
              <div>
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">КУРС</h2>
                <h1 className="font-bold text-foreground leading-tight break-words mt-1">{courseData.title}</h1>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 custom-scrollbar">
              {/* Global Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t('overall_progress', 'Общий прогресс')}</span>
                  <span className="text-muted-foreground font-mono">{courseData.progress}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: `${courseData.progress}%` }}></div>
                </div>
                <p className="text-xs text-muted-foreground">{courseData.totalTasks} задач</p>
              </div>

              {/* Sections */}
              <div className="space-y-6">
                {courseData.sections?.map((section: any) => (
                  <div key={section.id} className="space-y-3">
                    {/* Section Header */}
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider gap-3">
                        <span className="break-words leading-tight">{section.title}</span>
                        <span className="shrink-0">{section.completed}/{section.total}</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-success/70 rounded-full" style={{ width: `${section.progress}%` }}></div>
                      </div>
                    </div>

                    {/* Tasks List */}
                    <ul className="space-y-0.5">
                      {section.tasks?.map((task: any, idx: number) => {
                        const isActive = task.id === activeTask?.id;
                        const isDone = task.status === 'done';
                        return (
                          <li key={task.id}>
                            <NavLink 
                              to={`/tasks/${task.id}`}
                              onClick={() => setCourseTocOpen(false)}
                              className={`group flex items-start gap-3 px-3 py-2 rounded-xl text-sm transition-all border border-transparent ${
                                isActive 
                                  ? 'bg-primary/10 border-primary/20 text-primary font-medium shadow-sm' 
                                  : 'text-muted-foreground hover:bg-hover hover:border-glass-border hover:text-foreground'
                              }`}
                            >
                              {/* Status Icon */}
                              <div className="relative shrink-0 flex items-center justify-center w-5 h-5 mt-0.5">
                                {isDone ? (
                                  <CheckCircle2 size={16} className="text-success" />
                                ) : (
                                  <Circle size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                                )}
                                {task.bookmarked && (
                                  <Star size={10} className="absolute -top-1 -right-1 text-warning fill-warning" />
                                )}
                              </div>
                              
                              <span className={`flex-1 break-words leading-snug min-w-0 ${isDone ? 'opacity-70' : ''}`}>
                                {idx + 1}. <MarkdownText inline text={task.title} />
                              </span>
                            </NavLink>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Trigger Zone / Button */}
      {!isCourseTocOpen ? (
        <div 
          className="fixed inset-y-0 left-0 w-8 z-dropdown group cursor-pointer"
          onClick={() => setCourseTocOpen(true)}
        >
          <button 
            className="absolute top-1/2 -translate-y-1/2 left-0 py-4 px-1 bg-glass backdrop-blur-md border border-l-0 border-glass-border rounded-r-xl shadow-md transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:bg-hover"
          >
            <ChevronRight size={20} className="text-foreground/70" />
          </button>
        </div>
      ) : (
        <button 
          onClick={() => setCourseTocOpen(false)}
          className="fixed top-1/2 -translate-y-1/2 z-dropdown py-4 px-1 bg-glass backdrop-blur-md border border-l-0 border-glass-border rounded-r-xl shadow-md transition-all duration-300 hover:bg-hover left-[21rem]"
        >
          <ChevronRight size={20} className="text-foreground/70 rotate-180" />
        </button>
      )}
    </>
  );
};
