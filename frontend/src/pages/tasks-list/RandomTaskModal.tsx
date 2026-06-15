import React, { useState, useEffect } from 'react';
import { X, Dices } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FilterChip } from './FilterChip';
import { DifficultyMatrix } from './DifficultyMatrix';

interface TagOut { id: number; name: string; }
interface CourseOut { id: number; title: string; }

interface RandomTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: TagOut[];
  courses: CourseOut[];
  databases: any[];
}

export const RandomTaskModal: React.FC<RandomTaskModalProps> = ({ isOpen, onClose, tags, courses, databases }) => {
  const { t } = useTranslation('tasks_list');
  const navigate = useNavigate();

  // Дефолтные значения (нерешенные, все теги, northwind)
  const defaultDb = databases.find(db => db.technical_name === 'northwind')?.id || null;
  
  const [status, setStatus] = useState<'all' | 'solved' | 'unsolved'>('unsolved');
  const [selectedDifficulties, setSelectedDifficulties] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<number | null>(defaultDb);
  const [isLoading, setIsLoading] = useState(false);
  const [showNotFound, setShowNotFound] = useState(false);

  // Закрытие по ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleArrayItem = (setter: React.Dispatch<React.SetStateAction<number[]>>, val: number) => {
    setter(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  const handleSolve = async () => {
    setIsLoading(true);
    setShowNotFound(false);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.append('status', status);
      if (selectedDifficulties.length > 0) params.append('difficulty', selectedDifficulties.join(','));
      if (selectedCourseIds.length > 0) params.append('course_ids', selectedCourseIds.join(','));
      if (selectedTagIds.length > 0) params.append('tag_ids', selectedTagIds.join(','));
      if (selectedDatabaseId !== null) params.append('database_id', selectedDatabaseId.toString());

      const res = await fetch(`/api/tasks?${params.toString()}&page_size=100`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      
      if (data.tasks && data.tasks.length > 0) {
        const randomTask = data.tasks[Math.floor(Math.random() * data.tasks.length)];
        onClose();
        navigate(`/tasks/${randomTask.id}`);
      } else {
        setShowNotFound(true);
        setTimeout(() => setShowNotFound(false), 2500);
      }
    } catch (e) {
      console.error(e);
      // Fallback native alert on actual network error
      alert(t('random_modal.error', 'Ошибка при поиске задачи'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-background border border-glass-border rounded-xl shadow-[0_16px_60px_-16px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-glass-border flex items-center justify-between bg-glass/20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Dices size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">{t('random_modal.title')}</h2>
              <p className="text-2xs text-muted-foreground">{t('random_modal.subtitle')}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-hover rounded-md transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Status */}
          <div className="space-y-2">
            <label className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">{t('filter.status.label')}</label>
            <div className="grid grid-cols-3 gap-1.5">
              {['all', 'unsolved', 'solved'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s as any)}
                  className={`px-3 py-1.5 rounded-md text-2xs font-medium border transition-all duration-150 outline-none ${
                    status === s
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-glass border-glass-border text-muted-foreground hover:text-foreground hover:border-primary/25 hover:bg-hover'
                  }`}
                >
                  {s === 'all' ? t('filter.status.all') : s === 'unsolved' ? t('filter.status.unsolved') : t('filter.status.solved')}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">{t('filter.difficulty')}</label>
              <button 
                onClick={() => setSelectedDifficulties(selectedDifficulties.length === 9 ? [] : [1, 2, 3, 4, 5, 6, 7, 8, 9])}
                className="text-[10px] uppercase tracking-wider font-semibold text-primary hover:text-primary/80 transition-colors outline-none"
              >
                {selectedDifficulties.length === 9 ? t('random_modal.clear') : t('random_modal.all')}
              </button>
            </div>
            <DifficultyMatrix
              selected={selectedDifficulties}
              onToggle={id => toggleArrayItem(setSelectedDifficulties, id)}
            />
          </div>

          {/* Database */}
          {databases.length > 0 && (
            <div className="space-y-2">
              <label className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">{t('filter.database')}</label>
              <div className="flex flex-wrap gap-1.5">
                {databases.map(db => (
                  <FilterChip
                    key={db.id}
                    label={db.display_name}
                    active={selectedDatabaseId === db.id}
                    onClick={() => setSelectedDatabaseId(selectedDatabaseId === db.id ? null : db.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Courses */}
          {courses.length > 0 && (
            <div className="space-y-2">
              <label className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">{t('filter.courses')}</label>
              <div className="flex flex-wrap gap-1.5">
                {courses.map(course => (
                  <FilterChip
                    key={course.id}
                    label={course.title}
                    active={selectedCourseIds.includes(course.id)}
                    onClick={() => toggleArrayItem(setSelectedCourseIds, course.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <label className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">{t('filter.tags')}</label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1 -m-1">
                {tags.map(tag => (
                  <FilterChip
                    key={tag.id}
                    label={tag.name}
                    active={selectedTagIds.includes(tag.id)}
                    onClick={() => toggleArrayItem(setSelectedTagIds, tag.id)}
                  />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="relative p-5 pt-3 border-t border-glass-border bg-glass/10 shrink-0">
          
          {/* Not Found Message (sliding out of button) */}
          <div 
            className={`absolute left-0 right-0 top-0 flex justify-center pointer-events-none transition-all duration-300 z-10 ${
              showNotFound ? '-translate-y-[120%] opacity-100' : 'translate-y-0 opacity-0'
            }`}
          >
            <div className="bg-destructive/10 text-destructive border border-destructive/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold shadow-[0_4px_16px_rgba(239,68,68,0.2)]">
              {t('random_modal.not_found')}
            </div>
          </div>

          <button 
            onClick={handleSolve}
            disabled={isLoading}
            className="relative w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_2px_10px_rgba(var(--primary),0.3)] disabled:opacity-50 disabled:cursor-not-allowed z-20"
          >
            {isLoading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <Dices size={15} />
            )}
            {t('random_modal.solve')}
          </button>
        </div>

      </div>
    </div>
  );
};
