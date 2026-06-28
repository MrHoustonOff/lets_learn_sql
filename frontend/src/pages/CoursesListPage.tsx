import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Database, Import, Plus, Loader2 } from 'lucide-react';
import { ImportCourseModal } from './course-wizard/components/import-course/ImportCourseModal';

interface CourseListItem {
  id: number;
  title: string;
  description: string;
  sectionsCount: number;
  tasksCount: number;
  dbNames: string[];
  progress: number;
}

export const CoursesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [courses, setCourses] = React.useState<CourseListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchCourses = () => {
    setLoading(true);
    fetch('/api/courses')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch courses');
        return res.json();
      })
      .then(data => {
        setCourses(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  React.useEffect(() => {
    fetchCourses();
  }, []);

  const [actionLoadingId, setActionLoadingId] = React.useState<number | null>(null);

  const handleCourseAction = async (course: CourseListItem) => {
    if (course.progress === 100) {
      navigate(`/courses/${course.id}`);
      return;
    }

    try {
      setActionLoadingId(course.id);
      const res = await fetch(`/api/courses/${course.id}`);
      if (!res.ok) throw new Error('Failed to fetch course details');
      const data = await res.json();
      
      let nextTaskId = null;
      for (const section of data.sections || []) {
        for (const task of section.tasks || []) {
          if (task.status !== 'done') {
            nextTaskId = task.id;
            break;
          }
        }
        if (nextTaskId) break;
      }
      
      if (nextTaskId) {
        navigate(`/tasks/${nextTaskId}`);
      } else {
        navigate(`/courses/${course.id}`);
      }
    } catch (err) {
      console.error(err);
      navigate(`/courses/${course.id}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getButtonConfig = (progress: number) => {
    if (progress === 0) {
      return { text: t('courses_page:start'), variant: 'primary' };
    } else if (progress === 100) {
      return { text: t('courses_page:retry'), variant: 'secondary' };
    } else {
      return { text: t('courses_page:continue'), variant: 'primary' };
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">{t('common:loading') || 'Loading...'}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-destructive font-semibold">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full w-full overflow-y-auto p-8 max-w-5xl mx-auto animate-in fade-in duration-300 primary-scrollbar">
      <h1 className="text-3xl font-bold mb-8">{t('courses')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {courses.map(course => {
          const btn = getButtonConfig(course.progress);
          
          return (
            <div 
              key={course.id}
              className="bg-glass backdrop-blur-md border border-glass-border rounded-2xl p-6 flex flex-col hover:border-primary/30 transition-colors shadow-sm"
            >
              <div className="flex-1">
                <h2 
                  className="text-xl font-bold mb-2 cursor-pointer hover:text-primary transition-colors" 
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  {course.title}
                </h2>
                <div className="text-sm text-muted-foreground mb-4">
                  {course.tasksCount} {t('courses_page:tasks')} · {course.sectionsCount} {t('courses_page:sections')}
                </div>

                <div className="space-y-2 mb-6">
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success transition-all duration-500" 
                      style={{ width: `${course.progress}%` }} 
                    />
                  </div>
                  <div className="text-xs text-right font-mono text-muted-foreground">{course.progress}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-glass-border">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground truncate mr-4">
                  <Database size={14} className="shrink-0" />
                  <span className="truncate">{course.dbNames.join(', ')}</span>
                </div>
                <button 
                  onClick={() => handleCourseAction(course)}
                  disabled={actionLoadingId === course.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    btn.variant === 'primary' 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  } ${actionLoadingId === course.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {actionLoadingId === course.id && <Loader2 size={16} className="animate-spin shrink-0" />}
                  {btn.text}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 border-t border-glass-border pt-8">
        <button 
          onClick={() => setIsImportOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-glass backdrop-blur-md border border-glass-border hover:bg-hover transition-colors text-sm font-medium"
        >
          <Import size={16} />
          {t('courses_page:import')}
        </button>
        
        <div className="relative group">
          <button 
            disabled 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-glass backdrop-blur-md border border-glass-border opacity-50 cursor-not-allowed text-sm font-medium"
          >
            <Plus size={16} />
            {t('courses_page:create')}
          </button>
          {/* Tooltip */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-sm">
            {t('courses_page:coming_soon')}
          </div>
        </div>
      </div>
      
      <ImportCourseModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onImportFinished={() => fetchCourses()} 
      />
    </div>
  );
};
