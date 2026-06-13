import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, X, ArrowUp, ArrowDown, Database, Tag, Plus } from 'lucide-react';
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

const STATUS_IDS = ['all', 'solved', 'unsolved', 'flagged'] as const;

export const TasksListPage: React.FC = () => {
  const { t } = useTranslation('tasks_list');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const update = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleItem = useCallback((key: 'selectedDifficulties' | 'selectedTagIds', value: number) => {
    setFilters(prev => {
      const list = prev[key];
      return { ...prev, [key]: list.includes(value) ? list.filter(v => v !== value) : [...list, value] };
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

  return (
    <div className="h-full w-full flex overflow-hidden bg-background">

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 border-r border-glass-border flex flex-col h-full bg-glass/60 backdrop-blur-sm">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-glass-border flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal size={13} className="text-primary" />
            <span className="text-xs font-semibold">{t('sidebar.title')}</span>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-0.5 text-2xs text-muted-foreground hover:text-primary transition-colors"
            >
              <X size={10} />
              {t('sidebar.reset', { count: activeFilterCount })}
            </button>
          )}
        </div>

        {/* Filters scroll area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-4">

          {/* Status */}
          <FilterSection title={t('filter.status.label')}>
            <div className="grid grid-cols-2 gap-1">
              {STATUS_IDS.map(id => (
                <button
                  key={id}
                  onClick={() => update('status', id)}
                  className={`px-2 py-1 rounded-md text-2xs font-medium border transition-all duration-150 outline-none ${
                    filters.status === id
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-glass border-glass-border text-muted-foreground hover:text-foreground hover:border-primary/25 hover:bg-hover'
                  }`}
                >
                  {t(`filter.status.${id}`)}
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
              <div className="flex flex-wrap gap-1">
                {databases.map(db => (
                  <FilterChip
                    key={db.id}
                    label={db.display_name}
                    active={filters.selectedDatabaseId === db.id}
                    onClick={() => update('selectedDatabaseId',
                      filters.selectedDatabaseId === db.id ? null : db.id
                    )}
                  />
                ))}
              </div>
            </FilterSection>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <FilterSection title={t('filter.tags')} icon={Tag} defaultOpen={false}>
              <div className="flex flex-wrap gap-1">
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

        {/* Footer stats */}
        <div className="px-4 py-2.5 border-t border-glass-border bg-glass/30">
          <p className="text-2xs text-muted-foreground">
            {t('sidebar.found')} <span className="text-foreground font-semibold tabular-nums">{total}</span>
          </p>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Topbar */}
        <div className="px-6 py-3.5 border-b border-glass-border flex items-center gap-3 shrink-0 bg-glass/40 backdrop-blur-sm">
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold tracking-tight">{t('page.title')}</h1>
            <p className="text-2xs text-muted-foreground">{t('page.subtitle')}</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={filters.search}
              onChange={e => update('search', e.target.value)}
              placeholder={t('page.search_placeholder')}
              className="bg-glass border border-glass-border rounded-lg pl-8 pr-3 py-1.5 text-xs w-52 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60 backdrop-blur-sm"
            />
          </div>

          {/* Sort toggle */}
          <div className="flex items-center bg-glass border border-glass-border rounded-lg overflow-hidden shrink-0">
            <button
              onClick={() => update('sortBy', 'created')}
              className={`px-2.5 py-1.5 text-2xs font-medium transition-colors ${
                filters.sortBy === 'created' ? 'bg-hover text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('sort.created')}
            </button>
            <div className="w-px h-4 bg-glass-border" />
            <button
              onClick={() => update('sortBy', 'solved')}
              className={`px-2.5 py-1.5 text-2xs font-medium transition-colors ${
                filters.sortBy === 'solved' ? 'bg-hover text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('sort.solved')}
            </button>
            <div className="w-px h-4 bg-glass-border" />
            <button
              onClick={() => update('sortDir', filters.sortDir === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              {filters.sortDir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
            </button>
          </div>

          {/* Create */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shrink-0 hover:brightness-105 hover:shadow-[0_4px_16px_-4px_hsl(var(--glow)/0.5)] transition-all active:scale-[0.98]">
            <Plus size={13} />
            {t('page.create')}
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <span className="text-sm text-muted-foreground animate-pulse">{t('page.loading')}</span>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <span className="text-sm text-destructive">{error}</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center">
                <Search size={18} className="text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">{t('empty.title')}</p>
              <p className="text-2xs text-muted-foreground">{t('empty.subtitle')}</p>
              <button onClick={clearAll} className="text-xs text-primary hover:underline mt-1">
                {t('empty.reset')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
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
