import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PenTool, CheckSquare, BookOpen, ChevronRight, Wand2, Copy, CheckCircle2, Trash2, ChevronDown, ChevronLeft, ArrowRight, Upload } from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DifficultyDots } from './tasks-list/DifficultyDots';
import { Badge } from '../components/ui/Badge';
import { ImportTasksModal } from './task-wizard/components/ImportTasksModal';
import { ImportCourseModal } from './course-wizard/components/import-course/ImportCourseModal';

const MOCK_PROMPTS = [
  { 
    id: 1, 
    title: 'Промпт для генерации задачи (Easy)', 
    text: 'Привет, ИИ! Сгенерируй простую задачу по SQL. Кстати, колобок повесился.' 
  },
  { 
    id: 2, 
    title: 'Промпт для структуры курса', 
    text: 'Напиши структуру курса по SQL. Идет медведь по лесу, видит машина горит. Сел в нее и сгорел.' 
  },
  { 
    id: 3, 
    title: 'Промпт для создания БД', 
    text: 'Сделай схему базы данных. Купил мужик шляпу, а она ему как раз.' 
  },
];

const formatRelativeTime = (dateStr: string, t: any) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours >= 24) {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return t('studio_page.time.just_now');
  if (diffMinutes < 60) return t('studio_page.time.minutes_ago', { count: diffMinutes });
  
  const h = Math.floor(diffMinutes / 60);
  return t('studio_page.time.hours_ago', { count: h });
};

const translateStep = (step: string, t: any) => {
  if (!step) return '';
  let result = step;
  result = result.replace('Шаг', t('studio_page.step_prefix'));
  result = result.replace('из', t('studio_page.step_of'));
  result = result.replace('(Основное)', `(${t('studio_page.step_main')})`);
  result = result.replace('(Решение)', `(${t('studio_page.step_solution')})`);
  result = result.replace('(Правила)', `(${t('studio_page.step_rules')})`);
  result = result.replace('(Превью)', `(${t('studio_page.step_preview')})`);
  return result;
};

const getStepStyle = (step: string) => {
  if (step.includes('Шаг 1')) return 'bg-destructive/10 text-destructive'; // Красный
  if (step.includes('Шаг 2')) return 'bg-warning/10 text-warning'; // Оранжевый
  if (step.includes('Шаг 3')) return 'bg-emerald-400/10 text-emerald-400'; // Почти зеленый
  if (step.includes('Шаг 4')) return 'bg-success/10 text-success'; // Зеленый
  return 'bg-foreground/5 text-muted-foreground';
};

const getStepColorHex = (step: string) => {
  if (step.includes('Шаг 1')) return 'hsl(var(--destructive))';
  if (step.includes('Шаг 2')) return 'hsl(var(--warning))';
  if (step.includes('Шаг 3')) return 'rgb(52, 211, 153)'; // emerald-400
  if (step.includes('Шаг 4')) return 'hsl(var(--success))';
  return 'hsl(var(--muted-foreground))';
};

const CustomSelect = ({ value, onChange, options, className }: any) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((o: any) => o.value === value);
  return (
    <div className="relative z-dropdown">
      <button 
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={`flex items-center gap-1.5 bg-glass border border-glass-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 hover:bg-glass-hover transition-colors ${className}`}
      >
        {selectedOption?.label}
        <ChevronDown size={12} className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 w-36 bg-background border border-glass-border rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] overflow-hidden z-[60] py-1 animate-in slide-in-from-top-1 fade-in duration-150">
          {options.map((opt: any) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors focus:outline-none ${
                value === opt.value ? 'text-primary font-medium bg-primary/5' : 'text-foreground hover:bg-hover'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const StudioPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportCourseModalOpen, setIsImportCourseModalOpen] = useState(false);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingDraft, setDeletingDraft] = useState<{id: number, type: string} | null>(null);
  
  // Filters & Pagination
  const [filterType, setFilterType] = useState('all'); // 'all', 'task', 'course'
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  const loadDrafts = () => {
    setIsLoading(true);
    fetch('/api/studio/drafts')
      .then(r => r.json())
      .then(data => {
        setDrafts(data);
        setIsLoading(false);
      })
      .catch(e => {
        console.error(e);
        setIsLoading(false);
      });
  };

  React.useEffect(() => {
    loadDrafts();
  }, []);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [filterType, sortOrder, drafts.length]);

  const handleDeleteDraftClick = (e: React.MouseEvent, id: number, type: string) => {
    e.stopPropagation();
    setDeletingDraft({ id, type });
  };

  const confirmDeleteDraft = async () => {
    if (!deletingDraft) return;
    try {
      const endpoint = deletingDraft.type === 'course' 
        ? `/api/courses/${deletingDraft.id}` 
        : `/api/tasks/${deletingDraft.id}`;
      await fetch(endpoint, { method: 'DELETE' });
      setDrafts(prev => prev.filter(d => !(d.id === deletingDraft.id && d.type === deletingDraft.type)));
    } catch (err) {
      console.error(err);
      alert('Ошибка при удалении');
    } finally {
      setDeletingDraft(null);
    }
  };

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateTask = async () => {
    navigate('/studio/task/new');
  };

  const filteredAndSortedDrafts = React.useMemo(() => {
    let result = [...drafts];
    if (filterType !== 'all') {
      result = result.filter(d => d.type === filterType);
    }
    result.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return result;
  }, [drafts, filterType, sortOrder]);

  const total = filteredAndSortedDrafts.length;
  const paginatedDrafts = filteredAndSortedDrafts.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-glass-border bg-glass/40 backdrop-blur-sm flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <PenTool className="text-primary" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('studio_page.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('studio_page.subtitle')}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">
            
            {/* Drafts Section */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('studio_page.current_drafts')}</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={handleCreateTask}
                    disabled={isCreatingTask}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingTask ? (
                      <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-primary border-t-transparent" />
                    ) : (
                      <CheckSquare size={14} />
                    )}
                    {t('studio_page.create_task')}
                  </button>
                  <button 
                    onClick={() => navigate('/studio/course/new', { state: { isNew: true } })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors"
                  >
                    <BookOpen size={14} /> {t('studio_page.create_course')}
                  </button>
                  <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors"
                  >
                    <Upload size={14} /> {t('studio_page.import')}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 z-dropdown">
                  <CustomSelect
                    value={filterType}
                    onChange={setFilterType}
                    options={[
                      { value: 'all', label: t('studio_page.filters.all_types') },
                      { value: 'task', label: t('studio_page.filters.tasks') },
                      { value: 'course', label: t('studio_page.filters.courses') }
                    ]}
                  />
                  <CustomSelect
                    value={sortOrder}
                    onChange={setSortOrder}
                    options={[
                      { value: 'newest', label: t('studio_page.filters.newest') },
                      { value: 'oldest', label: t('studio_page.filters.oldest') }
                    ]}
                  />
                </div>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <div className="px-6 py-2.5 border border-glass-border rounded-xl flex items-center justify-between bg-glass/20 backdrop-blur-sm z-layout shrink-0 mb-4">
                  <div className="text-2xs font-medium text-muted-foreground">
                    {t('studio_page.pagination.showing', { start: Math.min((page - 1) * pageSize + 1, total), end: Math.min(page * pageSize, total), total })}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="relative z-dropdown">
                      <button 
                        onClick={() => setPageSizeOpen(!pageSizeOpen)}
                        onBlur={() => setTimeout(() => setPageSizeOpen(false), 150)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background border border-glass-border rounded-lg text-2xs font-medium hover:bg-hover transition-colors focus:outline-none"
                      >
                        <span>{pageSize} {t('studio_page.pagination.per_page')}</span>
                        <ChevronDown size={12} className={`text-muted-foreground transition-transform duration-200 ${pageSizeOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {pageSizeOpen && (
                        <div className="absolute top-full mt-1.5 right-0 w-28 bg-background border border-glass-border rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] overflow-hidden z-[60] py-1 animate-in slide-in-from-top-1 fade-in duration-150">
                          {[10, 20, 50].map(size => (
                            <button
                              key={size}
                              onClick={() => {
                                setPageSize(size);
                                setPage(1);
                                setPageSizeOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-2xs transition-colors focus:outline-none ${
                                pageSize === size ? 'text-primary font-medium bg-primary/5' : 'text-foreground hover:bg-hover'
                              }`}
                            >
                              {size} / page
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1 rounded-md hover:bg-hover border border-transparent hover:border-glass-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-all"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-muted-foreground font-semibold tabular-nums px-2 text-2xs">
                        {page} <span className="text-muted-foreground/50 mx-0.5">/</span> {Math.max(1, Math.ceil(total / pageSize))}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                        disabled={page >= Math.ceil(total / pageSize)}
                        className="p-1 rounded-md hover:bg-hover border border-transparent hover:border-glass-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-all"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                {isLoading ? (
                  <>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-4 py-2 px-3 rounded-xl border bg-glass border-transparent h-[60px] opacity-70">
                        <div className="w-6 shrink-0 flex justify-center">
                          <div className="w-4 h-4 rounded-full bg-muted/50 animate-pulse" />
                        </div>
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="h-4 w-1/3 bg-muted/50 rounded animate-pulse" />
                          <div className="flex gap-2">
                            <div className="h-3 w-16 bg-muted/50 rounded animate-pulse" />
                            <div className="h-3 w-24 bg-muted/50 rounded animate-pulse" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : paginatedDrafts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground bg-glass border border-glass-border rounded-xl">
                    {t('studio_page.no_drafts')}
                  </div>
                ) : (
                  paginatedDrafts.map(draft => (
                    <div 
                      key={`${draft.type}-${draft.id}`} 
                      onClick={() => navigate(`/studio/${draft.type === 'course' ? 'course' : 'task'}/${draft.id}`)}
                      className="flex items-center justify-between py-2 px-3 rounded-xl transition-all duration-300 group cursor-pointer border bg-glass border-transparent hover:border-glass-border/50 hover:bg-glass-hover shadow-[0_2px_16px_-4px_hsl(var(--glow)/0.05)] hover:-translate-y-[2px] hover:shadow-[0_8px_24px_-8px_hsl(var(--glow)/0.15)]"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="shrink-0 w-6 flex justify-center">
                          {draft.type === 'task' ? (
                            <DifficultyDots difficulty={draft.difficulty ?? 1} />
                          ) : (
                            <BookOpen size={16} className="text-blue-500 opacity-80" />
                          )}
                        </div>

                        <div className="flex flex-col gap-1 flex-1 min-w-0 py-1">
                          <span className="text-sm transition-colors font-semibold text-foreground leading-snug break-words">
                            {draft.title}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 w-full min-w-0">
                            <span className={`px-2 py-0.5 rounded-md font-medium shrink-0 whitespace-nowrap ${getStepStyle(draft.step)}`}>
                              {translateStep(draft.step, t)}
                            </span>
                            <span className="shrink-0">•</span>
                            <span className="text-foreground/80 font-medium shrink-0 whitespace-nowrap">{t('studio_page.updated')}: {formatRelativeTime(draft.updatedAt, t)}</span>
                            
                            {draft.tags && draft.tags.length > 0 && (
                              <>
                                <span className="shrink-0">•</span>
                                <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity min-w-0 flex-1 overflow-hidden">
                                  {draft.tags.map((tag: any) => (
                                    <span key={tag.id} className="truncate px-1.5 py-0.5 rounded-md bg-foreground/5 text-muted-foreground shrink text-micro">
                                      #{tag.name}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => handleDeleteDraftClick(e, draft.id, draft.type)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-destructive hover:bg-destructive/10 rounded-md shrink-0 outline-none"
                          title={t('studio_page.delete_draft')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
            </div>
            </div>

            {/* AI Prompts Section */}
            <div className="lg:w-80 shrink-0 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Wand2 size={14} className="text-primary" /> {t('studio_page.ai_prompts')}
              </h2>
              <div className="grid gap-3">
                {MOCK_PROMPTS.map(prompt => (
                  <div key={prompt.id} className="p-4 rounded-xl bg-glass border border-glass-border space-y-2 relative group">
                    <h3 className="text-xs font-bold">{prompt.title}</h3>
                    <p className="text-xs text-muted-foreground pr-6 leading-relaxed italic">
                      "{prompt.text}"
                    </p>
                    <button
                      onClick={() => handleCopy(prompt.id, prompt.text)}
                      className="absolute top-3 right-3 p-1.5 rounded-md bg-background border border-glass-border text-muted-foreground hover:text-foreground hover:bg-hover transition-colors shadow-sm"
                      title={t('studio_page.copy')}
                    >
                      {copiedId === prompt.id ? (
                        <CheckCircle2 size={14} className="text-success" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      {/* Delete Draft Modal */}
      <ConfirmModal
        isOpen={deletingDraft !== null}
        onClose={() => setDeletingDraft(null)}
        onConfirm={confirmDeleteDraft}
        title={t('studio_page.delete_modal.title')}
        confirmText={t('studio_page.delete_modal.confirm')}
        cancelText={t('common:cancel', 'Отмена')}
        variant="destructive"
      >
        {t('studio_page.delete_modal.text1')} <span className="text-destructive font-bold">{t('studio_page.delete_modal.text2')}</span>{t('studio_page.delete_modal.text3')}
      </ConfirmModal>

      <ImportTasksModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportFinished={loadDrafts}
        onSelectCourse={() => {
          setIsImportModalOpen(false);
          setIsImportCourseModalOpen(true);
        }}
      />

      <ImportCourseModal 
        isOpen={isImportCourseModalOpen}
        onClose={() => setIsImportCourseModalOpen(false)}
        onImportFinished={loadDrafts}
      />

      </main>
  );
};
