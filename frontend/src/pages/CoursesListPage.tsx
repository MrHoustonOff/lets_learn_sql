import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Folder, Import, Plus } from 'lucide-react';

interface CourseMock {
  id: string;
  title: string;
  tasksCount: number;
  sectionsCount?: number;
  progress: number;
  dbNames: string[];
  status: 'not_started' | 'in_progress' | 'completed' | 'no_course';
}

const MOCK_COURSES: CourseMock[] = [
  {
    id: 'postgres-basics',
    title: 'Основы PostgreSQL',
    tasksCount: 24,
    sectionsCount: 12,
    progress: 60,
    dbNames: ['Northwind DB'],
    status: 'in_progress'
  },
  {
    id: 'joe-analytics',
    title: 'Курс Джо по аналитике',
    tasksCount: 10,
    sectionsCount: 3,
    progress: 0,
    dbNames: ["Joe's Sales DB", "Events DB"],
    status: 'not_started'
  },
  {
    id: 'standalone-tasks',
    title: 'Задачи без курса',
    tasksCount: 7,
    progress: 0,
    dbNames: ['Разные БД'],
    status: 'no_course'
  }
];

export const CoursesListPage: React.FC = () => {
  const navigate = useNavigate();

  const getButtonConfig = (status: CourseMock['status']) => {
    switch (status) {
      case 'not_started': return { text: 'Начать →', variant: 'primary' };
      case 'in_progress': return { text: 'Продолжить →', variant: 'primary' };
      case 'completed': return { text: 'Повторить →', variant: 'secondary' };
      case 'no_course': return { text: 'Открыть →', variant: 'secondary' };
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 max-w-5xl mx-auto animate-in fade-in duration-300 primary-scrollbar">
      <h1 className="text-3xl font-bold mb-8">Курсы</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {MOCK_COURSES.map(course => {
          const btn = getButtonConfig(course.status);
          
          return (
            <div 
              key={course.id}
              className="bg-glass backdrop-blur-md border border-glass-border rounded-2xl p-6 flex flex-col hover:border-primary/30 transition-colors shadow-sm"
            >
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/courses/${course.id}`)}>
                  {course.title}
                </h2>
                <div className="text-sm text-muted-foreground mb-4">
                  {course.tasksCount} задач {course.sectionsCount && `· ${course.sectionsCount} разделов`}
                </div>

                {course.status !== 'no_course' && (
                  <div className="space-y-2 mb-6">
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-success transition-all duration-500" 
                        style={{ width: `${course.progress}%` }} 
                      />
                    </div>
                    <div className="text-xs text-right font-mono text-muted-foreground">{course.progress}%</div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-glass-border">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground truncate mr-4">
                  <Database size={14} className="shrink-0" />
                  <span className="truncate">{course.dbNames.join(', ')}</span>
                </div>
                <button 
                  onClick={() => {
                    // Logic: jump directly to the first unfinished task if in progress, else open course.
                    if (course.status === 'in_progress') {
                      navigate(`/tasks/t4`); // MOCK jump to specific task
                    } else if (course.status === 'no_course') {
                       navigate(`/tasks`); // list of tasks?
                    } else {
                      navigate(`/courses/${course.id}`);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    btn.variant === 'primary' 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {btn.text}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 border-t border-glass-border pt-8">
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-glass backdrop-blur-md border border-glass-border hover:bg-hover transition-colors text-sm font-medium">
          <Import size={16} />
          Импортировать .llpg
        </button>
        
        <div className="relative group">
          <button 
            disabled 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-glass backdrop-blur-md border border-glass-border opacity-50 cursor-not-allowed text-sm font-medium"
          >
            <Plus size={16} />
            Создать курс
          </button>
          {/* Tooltip */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 dark:bg-white/90 text-white dark:text-black text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Скоро
          </div>
        </div>
      </div>
    </div>
  );
};
