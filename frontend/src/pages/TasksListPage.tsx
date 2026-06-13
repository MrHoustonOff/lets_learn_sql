import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, SlidersHorizontal, X, ArrowUp, ArrowDown,
  Database, GraduationCap, Plus, Tag,
} from 'lucide-react';
import { FilterSection } from './tasks-list/FilterSection';
import { FilterChip } from './tasks-list/FilterChip';
import { DifficultyMatrix } from './tasks-list/DifficultyMatrix';
import { TaskRow } from './tasks-list/TaskRow';
import { useTasksListData, type FilterState } from './tasks-list/useTasksListData';

const DEFAULT_FILTERS: FilterState = {
  search: '',
  selectedDifficulties: [],
  selectedTagIds: [],
  selectedDatabaseId: null,
  status: 'all',
  sortBy: 'created',
  sortDir: 'desc',
};

export const TasksListPage: React.FC = () => {
  const { t } = useTranslation('tasks_list');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const update = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleItem = useCallback(<T,>(key: keyof FilterState, value: T) => {
    setFilters(prev => {
      const list = prev[key] as T[];
      return {
        ...prev,
        [key]: list.includes(value) ? list.filter(v => v !== value) : [...list, value],
      };
    });
  }, []);

  const clearAll = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const { tasks, total, tags, databases, isLoading, error, refetch } = useTasksListData(filters);

  const activeFilterCount =
    filters.selectedDifficulties.length +
    filters.selectedTagIds.length +
    (filters.selectedDatabaseId ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0);

  const handleToggleFlag = useCallback(async (taskId: number) => {
    await fetch(`/api/tasks/${taskId}/bookmark`, { method: 'POST' });
    refetch();
  }, [refetch]);

  const STATUS_OPTIONS = [
    { id: 'all' as const,      label: t('filter.status.all') },
    { id: 'solved' as const,   label: t('filter.status.solved') },
    { id: 'unsolved' as const, label: t('filter.status.unsolved') },
    { id: 'flagged' as const,  label: t('filter.status.flagged') },
  ];

  return (
    <div className="h-full w-full flex bg-background text-foreground overflow-hidden">

      {/* ===================== SIDEBAR ===================== */}
      <aside className="w-72 shrink-0 border-r border-glass-border/60 flex flex-col h-full">
        {/* Sidebar header */}
        <div className="px-5 py-5 border-b border-glass-border/60">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-primary" />
              <h2 className="text-sm font-semibold">{t('sidebar.title')}</h2>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAll}
                className="text-2xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <X size={11} />
                {t('sidebar.reset', { count: activeFilterCount })}
              </button>
            )}
          </div>
          <p className="text-2xs text-muted-foreground">
            {t('sidebar.found')}{' '}
            <span className="text-foreground font-medium">{total}</span>
            {' '}{t('sidebar.from')}{' '}
            <span className="text-foreground font-medium">{tasks.length + (isLoading ? 0 : 0)}</span>
          </p>
        </div>

        {/* Filter panels */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
          {/* Status */}
          <FilterSection title={t('filter.status.label')}>
            <div className="grid grid-cols-2 gap-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => update('status', opt.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 outline-none ${
                    filters.status === opt.id
                      ? 'bg-primary text-primary-foreground border-transparent shadow-sm'
                      : 'bg-card border-glass-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-hover'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Difficulty */}
          <FilterSection title={t('filter.difficulty')}>
            <DifficultyMatrix
              selected={filters.selectedDifficulties}
              onToggle={id => toggleItem('selectedDifficulties', id)}
            />
          </FilterSection>

          {/* Database */}
          {databases.length > 0 && (
            <FilterSection title={t('filter.database')} icon={Database}>
              <div className="flex flex-wrap gap-1.5">
                {databases.map(db => (
                  <FilterChip
                    key={db.id}
                    label={db.display_name}
                    active={filters.selectedDatabaseId === db.id}
                    onClick={() => update('selectedDatabaseId', filters.selectedDatabaseId === db.id ? null : db.id)}
                  />
                ))}
              </div>
            </FilterSection>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <FilterSection title={t('filter.tags')} icon={Tag} defaultOpen={false}>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <FilterChip
                    key={tag.id}
                    label={tag.name}
                    active={filters.selectedTagIds.includes(tag.id)}
                    onClick={() => toggleItem('selectedTagIds', tag.id)}
                  />
                ))}
              </div>
            </FilterSection>
          )}
        </div>
      </aside>

      {/* ===================== MAIN ===================== */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 border-b border-glass-border/60 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t('page.title')}</h1>
            <p className="text-2xs text-muted-foreground mt-0.5">{t('page.subtitle')}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={filters.search}
                onChange={e => update('search', e.target.value)}
                placeholder={t('page.search_placeholder')}
                className="bg-card border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center bg-card border border-glass-border rounded-lg overflow-hidden">
              <button
                onClick={() => update('sortBy', 'created')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  filters.sortBy === 'created'
                    ? 'bg-hover text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('sort.created')}
              </button>
              <div className="w-px h-5 bg-glass-border" />
              <button
                onClick={() => update('sortBy', 'solved')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  filters.sortBy === 'solved'
                    ? 'bg-hover text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('sort.solved')}
              </button>
              <div className="w-px h-5 bg-glass-border" />
              <button
                onClick={() => update('sortDir', filters.sortDir === 'asc' ? 'desc' : 'asc')}
                className="px-2.5 py-2 text-muted-foreground hover:text-primary transition-colors"
                title={filters.sortDir === 'asc' ? t('sort.ascending') : t('sort.descending')}
              >
                {filters.sortDir === 'asc'
                  ? <ArrowUp size={14} />
                  : <ArrowDown size={14} />
                }
              </button>
            </div>

            {/* Create task */}
            <button className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-sm hover:shadow-[0_4px_20px_-2px_hsl(var(--glow)/0.4)] hover:brightness-105 transition-all duration-200 active:scale-[0.98]">
              <Plus size={15} />
              {t('page.create')}
            </button>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-5">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-muted-foreground text-sm animate-pulse">{t('page.loading')}</div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-destructive text-sm">{error}</div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Search size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">{t('empty.title')}</p>
              <p className="text-2xs text-muted-foreground mb-4">{t('empty.subtitle')}</p>
              <button
                onClick={clearAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t('empty.reset')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {tasks.map(task => (
                <TaskRow key={task.id} task={task} onToggleFlag={handleToggleFlag} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
