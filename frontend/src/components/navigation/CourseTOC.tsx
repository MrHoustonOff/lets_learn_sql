import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/uiStore';
import { CheckCircle2, Circle, Star, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const CourseTOC: React.FC = () => {
  const { t } = useTranslation();
  const isCourseTocOpen = useUIStore(state => state.isCourseTocOpen);
  const setCourseTocOpen = useUIStore(state => state.setCourseTocOpen);

  // Моковые данные для отображения
  const courseData = {
    title: "Основы PostgreSQL",
    totalTasks: 24,
    progress: 60,
    sections: [
      {
        id: "sec1",
        title: "Раздел 1: SELECT",
        completed: 4,
        total: 5,
        progress: 80,
        tasks: [
          { id: "t1", title: "Все клиенты", status: 'done', bookmarked: false },
          { id: "t2", title: "Фильтрация по стране", status: 'done', bookmarked: false },
          { id: "t3", title: "Сортировка", status: 'done', bookmarked: false },
          { id: "t4", title: "Псевдонимы колонок", status: 'todo', bookmarked: true },
          { id: "t5", title: "DISTINCT", status: 'todo', bookmarked: false },
        ]
      },
      {
        id: "sec2",
        title: "Раздел 2: JOIN",
        completed: 2,
        total: 6,
        progress: 33,
        tasks: [
          { id: "t6", title: "INNER JOIN", status: 'done', bookmarked: false },
          { id: "t7", title: "LEFT JOIN", status: 'done', bookmarked: true },
          { id: "t8", title: "Несколько JOIN", status: 'todo', bookmarked: false },
        ]
      }
    ]
  };

  return (
    <>
      {/* Backdrop for closing */}
      <div 
        className={`fixed inset-0 z-30 transition-all duration-300 ${
          isCourseTocOpen ? 'opacity-100 pointer-events-auto bg-background/20 backdrop-blur-[1px]' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setCourseTocOpen(false)}
      />

      <div 
        className={`fixed top-4 left-4 h-[calc(100vh-2rem)] bg-glass backdrop-blur-xl border border-glass-border rounded-2xl w-80 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] z-40 transition-transform duration-300 ease-in-out flex flex-col overflow-hidden ${
          isCourseTocOpen ? 'translate-x-0' : '-translate-x-[120%]'
        }`}
      >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-glass-border bg-hover shrink-0">
        <div>
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">КУРС</h2>
          <h1 className="font-bold text-foreground truncate" title={courseData.title}>{courseData.title}</h1>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {/* Global Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t('overall_progress')}</span>
            <span className="text-muted-foreground font-mono">{courseData.progress}%</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-success rounded-full" style={{ width: `${courseData.progress}%` }}></div>
          </div>
          <p className="text-xs text-muted-foreground">{courseData.totalTasks} задач</p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {courseData.sections.map(section => (
            <div key={section.id} className="space-y-3">
              {/* Section Header */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>{section.title}</span>
                  <span>{section.completed}/{section.total}</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success/70 rounded-full" style={{ width: `${section.progress}%` }}></div>
                </div>
              </div>

              {/* Tasks List */}
              <ul className="space-y-0.5">
                {section.tasks.map((task, idx) => {
                  const isActive = false; // TODO: active task check from URL
                  return (
                    <li key={task.id}>
                      <NavLink 
                        to={`/tasks/${task.id}`}
                        onClick={() => setCourseTocOpen(false)} // опционально: закрывать меню при переходе
                        className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all border border-transparent ${
                          isActive 
                            ? 'bg-primary/10 border-primary/20 text-primary font-medium shadow-sm' 
                            : 'text-muted-foreground hover:bg-hover hover:border-glass-border hover:text-foreground'
                        }`}
                      >
                        {/* Status Icon */}
                        <div className="relative shrink-0 flex items-center justify-center w-5 h-5">
                          {task.status === 'done' ? (
                            <CheckCircle2 size={16} className="text-success" />
                          ) : (
                            <Circle size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                          )}
                          {task.bookmarked && (
                            <Star size={10} className="absolute -top-1 -right-1 text-warning fill-warning" />
                          )}
                        </div>
                        
                        <span className="truncate flex-1">
                          {idx + 1}. {task.title}
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
    </div>
          {/* Chevron Trigger */}
      <button 
        onClick={() => setCourseTocOpen(!isCourseTocOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-50 py-4 px-1 bg-glass backdrop-blur-md border border-l-0 border-glass-border rounded-r-xl shadow-md transition-all duration-300 hover:bg-hover ${
          isCourseTocOpen ? 'left-[21rem]' : 'left-0'
        }`}
      >
        <ChevronRight size={20} className={`text-foreground/70 transition-transform duration-300 ${isCourseTocOpen ? 'rotate-180' : ''}`} />
      </button>
    </>
  );
};
