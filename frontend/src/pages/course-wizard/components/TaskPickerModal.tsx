import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, ChevronLeft, ChevronRight, Check, Eye } from 'lucide-react';
import { useTasksListData } from '../../tasks-list/useTasksListData';
import type { FilterState, TaskItem } from '../../tasks-list/useTasksListData';
import { TaskPreviewModal } from '../../tasks-list/TaskPreviewModal';
import { SelectInput } from '../../../components/ui/SelectInput';

const DEFAULT_FILTERS: FilterState = {
  search: '',
  selectedDifficulties: [],
  selectedTagIds: [],
  selectedCourseIds: [],
  selectedDatabaseId: null,
  status: 'all',
  sortBy: 'created',
  sortDir: 'desc',
  page: 1,
  pageSize: 10,
};

function diffMeta(level: number | null) {
  if (level === null) return null;
  const color = level <= 1 ? "bg-success" : level === 2 ? "bg-warning" : "bg-destructive";
  return { level, color, label: level <= 1 ? "Легкий" : level === 2 ? "Средний" : "Тяжелый" };
}

function DiffDots({ level }: { level: number | null }) {
  const m = diffMeta(level);
  if (!m) return (
    <div className="flex items-center gap-[3px]" title="Нет сложности">
      <span className="w-1.5 h-1.5 rounded-full bg-muted"></span>
      <span className="w-1.5 h-1.5 rounded-full bg-muted"></span>
      <span className="w-1.5 h-1.5 rounded-full bg-muted"></span>
    </div>
  );
  return (
    <div className="flex items-center gap-[3px]" title={`${m.label} ${m.level}/3`}>
      {[1,2,3].map(i => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= m.level ? m.color : "bg-muted-foreground/15"}`} />
      ))}
    </div>
  );
}

export function TaskPickerModal({ alreadySelected, onConfirm, onClose }: any) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [chosen, setChosen] = useState<TaskItem[]>([]);
  const [previewTaskId, setPreviewTaskId] = useState<number | null>(null);

  const { tasks, total, tags, courses, databases, isLoading } = useTasksListData(filters);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !previewTaskId) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, previewTaskId]);

  const toggle = (task: TaskItem) => {
    setChosen(c => c.some(x => x.id === task.id) ? c.filter(x => x.id !== task.id) : [...c, task]);
  };

  const handleConfirm = () => {
    onConfirm(chosen);
  };

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? value : 1 }));
  };

  return createPortal(
    <div className="fixed inset-0 z-modal-backdrop flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-glass-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-glass-border flex items-center justify-between shrink-0 bg-glass/40">
          <div>
            <h3 className="text-base font-bold">{t('wizard_course.content.add_task')}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {chosen.length > 0 ? `Выбрано: ${chosen.length}` : "Выберите задачи из базы"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FILTERS */}
        <div className="px-5 py-3 border-b border-glass-border bg-glass/40 shrink-0 space-y-3">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
                placeholder="Поиск по названию..."
                className="w-full bg-background border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground"
              />
            </div>
            <div className="w-[180px] shrink-0">
              <SelectInput
                value={filters.selectedDifficulties[0]?.toString() || ""}
                onChange={v => updateFilter('selectedDifficulties', v ? [Number(v)] : [])}
                options={[
                  { value: "", label: "Все сложности" },
                  { value: "1", label: "Легкие (1)" },
                  { value: "2", label: "Средние (2)" },
                  { value: "3", label: "Сложные (3)" },
                ]}
              />
            </div>
            <div className="w-[180px] shrink-0">
              <SelectInput
                value={filters.selectedTagIds[0]?.toString() || ""}
                onChange={v => updateFilter('selectedTagIds', v ? [Number(v)] : [])}
                options={[
                  { value: "", label: "Все теги" },
                  ...tags.map(t => ({ value: t.id.toString(), label: t.name }))
                ]}
              />
            </div>
            <div className="w-[180px] shrink-0">
              <SelectInput
                value={filters.selectedDatabaseId?.toString() || ""}
                onChange={v => updateFilter('selectedDatabaseId', v ? Number(v) : null)}
                options={[
                  { value: "", label: "Все базы данных" },
                  ...databases.map(db => ({ value: db.id.toString(), label: db.display_name }))
                ]}
              />
            </div>
          </div>
        </div>

        {/* TASK LIST */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-3 space-y-2">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Загрузка задач...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Ничего не найдено</div>
          ) : tasks.map(task => {
            const alreadyInCourse = alreadySelected.includes(task.id);
            const sel = chosen.some(c => c.id === task.id) || alreadyInCourse;

            return (
              <li 
                key={task.id}
                onClick={() => !alreadyInCourse && toggle(task)}
                className={`list-none flex items-center justify-between py-2 px-3 rounded-xl transition-all duration-200 group border shadow-[0_2px_16px_-4px_hsl(var(--glow)/0.05)] ${
                  alreadyInCourse ? "opacity-50 cursor-not-allowed bg-secondary/50 border-transparent" :
                  sel ? "bg-primary/5 border-primary/40 cursor-pointer" : "bg-glass border-transparent hover:border-glass-border/50 hover:bg-glass-hover cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="shrink-0 w-6 flex justify-center">
                    <DiffDots level={task.difficulty} />
                  </div>
                  <div className="relative shrink-0 flex items-center justify-center w-5 h-5">
                    <div className={`w-[14px] h-[14px] rounded-full border flex items-center justify-center transition-colors ${
                      sel ? "bg-primary border-primary" : "border-muted-foreground/30"
                    }`}>
                      {sel && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 w-[60%] shrink-0 min-w-0">
                    <span className="text-xs truncate transition-colors font-medium text-foreground">
                      {task.title}
                      {alreadyInCourse && <span className="ml-2 text-[10px] text-muted-foreground">(Уже в курсе)</span>}
                    </span>
                    <div className="flex items-center gap-3 text-micro text-muted-foreground">
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span>Теги:</span>
                          <div className="flex items-center gap-1">
                            {task.tags.slice(0,3).map(tag => (
                              <span key={tag.id} className="text-xs px-2 py-0.5 rounded-md font-medium truncate inline-flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity" style={{background: "hsl(var(--badge-bg) / var(--badge-bg-opacity))", color: "hsl(var(--badge-fg))"}}>
                                {tag.name}
                              </span>
                            ))}
                            {task.tags.length > 3 && <span className="text-xs px-2 py-0.5 rounded-md text-muted-foreground">+{task.tags.length - 3}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setPreviewTaskId(task.id); }}
                    className="flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg shrink-0 outline-none"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Просмотреть
                  </button>
                </div>
              </li>
            );
          })}
        </div>

        {/* FOOTER & PAGINATION */}
        <div className="px-5 py-4 border-t border-glass-border flex items-center justify-between shrink-0 bg-background/50">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => updateFilter('page', Math.max(1, filters.page - 1))}
              disabled={filters.page === 1 || isLoading}
              className="p-1.5 rounded-lg border border-glass-border hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-xs font-medium text-muted-foreground">
              Стр. {filters.page} (Всего: {total})
            </span>
            <button 
              onClick={() => updateFilter('page', filters.page + 1)}
              disabled={filters.page * filters.pageSize >= total || isLoading}
              className="p-1.5 rounded-lg border border-glass-border hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              disabled={chosen.length === 0}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:brightness-105 transition-all disabled:opacity-50"
            >
              Добавить {chosen.length > 0 ? `(${chosen.length})` : ""}
            </button>
          </div>
        </div>
      </div>
      
      {previewTaskId && (
        <TaskPreviewModal
          taskId={previewTaskId}
          isOpen={true}
          onClose={() => setPreviewTaskId(null)}
          onDeleted={() => {}}
          isReadOnly={true}
        />
      )}
    </div>,
    document.body
  );
}
