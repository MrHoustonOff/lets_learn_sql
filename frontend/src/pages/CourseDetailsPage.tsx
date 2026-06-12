import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Circle, Star, ArrowRight, Database } from 'lucide-react';
import { DBViewerModal } from '../components/workspace/DBViewerModal';

export const CourseDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [selectedDb, setSelectedDb] = useState<string | null>(null);

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

  // Mock data - в будущем будет тянуться по id
  const courseData = {
    title: "Основы PostgreSQL",
    description: "Комплексный курс по основам реляционных баз данных. Вы научитесь писать сложные SQL запросы, работать с джоинами, агрегацией и оконными функциями на живых примерах.",
    dbNames: ["Northwind DB", "Postgres_Internal"],
    totalTasks: 24,
    totalSections: 12,
    progress: 60,
    completedTasks: 14,
    sections: [
      {
        id: "sec1",
        title: "Раздел 1: SELECT",
        description: "Базовые выборки, фильтрация (WHERE) и сортировка (ORDER BY). Учимся доставать именно те данные, которые нам нужны.",
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
        description: "Объединяем данные из разных таблиц. Разбираем разницу между INNER, LEFT, RIGHT и FULL JOIN.",
        completed: 2,
        total: 6,
        progress: 33,
        tasks: [
          { id: "t6", title: "INNER JOIN", status: 'done', bookmarked: false },
          { id: "t7", title: "LEFT JOIN", status: 'done', bookmarked: true },
          { id: "t8", title: "Несколько JOIN", status: 'todo', bookmarked: false },
          { id: "t9", title: "Self JOIN", status: 'todo', bookmarked: false },
        ]
      }
    ]
  };

  return (
    <div className="h-full overflow-y-auto primary-scrollbar pb-12">
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
              {section.tasks.map((task, idx) => (
                <li 
                  key={task.id} 
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-hover transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0 flex items-center justify-center w-5 h-5">
                      {task.status === 'done' ? (
                        <CheckCircle2 size={18} className="text-success" />
                      ) : (
                        <Circle size={16} className="text-muted-foreground opacity-50" />
                      )}
                      {task.bookmarked && (
                        <Star size={10} className="absolute -top-1 -right-1 text-warning fill-warning" />
                      )}
                    </div>
                    <span className={`text-sm ${task.status === 'done' ? 'text-muted-foreground line-through opacity-70' : 'text-foreground font-medium'}`}>
                      {idx + 1}. {task.title}
                    </span>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg pointer-events-none">
                    {t('courses_page:solve')} <ArrowRight size={14} />
                  </div>
                </li>
              ))}
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
