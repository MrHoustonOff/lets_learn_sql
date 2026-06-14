import React from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, X, Database, Tag, BookOpen } from 'lucide-react';
import { FilterSection } from './FilterSection';
import { FilterChip } from './FilterChip';
import { DifficultyMatrix } from './DifficultyMatrix';
import type { FilterState } from './useTasksListData';

const STATUS_IDS = ['all', 'solved', 'unsolved', 'flagged'] as const;

interface TasksFilterSidebarProps {
  filters: FilterState;
  tags: any[];
  courses: any[];
  databases: any[];
  total: number;
  activeFilterCount: number;
  update: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  toggleItem: (key: 'selectedDifficulties' | 'selectedTagIds' | 'selectedCourseIds', value: number) => void;
  clearAll: () => void;
}

export const TasksFilterSidebar: React.FC<TasksFilterSidebarProps> = ({
  filters,
  tags,
  courses,
  databases,
  total,
  activeFilterCount,
  update,
  toggleItem,
  clearAll,
}) => {
  const { t } = useTranslation('tasks_list');

  return (
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

        {/* Courses */}
        <FilterSection title={t('filter.courses', 'Курсы')} icon={BookOpen} defaultOpen={false}>
          {courses.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {courses.map(course => (
                <FilterChip
                  key={course.id}
                  label={course.title}
                  active={filters.selectedCourseIds.includes(course.id)}
                  onClick={() => toggleItem('selectedCourseIds', course.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-2xs text-muted-foreground/50 border border-dashed border-glass-border rounded-lg p-3 text-center">
              Курсов пока нет
            </div>
          )}
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
                  onClick={() => update('selectedDatabaseId', filters.selectedDatabaseId === db.id ? null : db.id)}
                />
              ))}
            </div>
          </FilterSection>
        )}

        {/* Tags */}
        <FilterSection title={t('filter.tags')} icon={Tag} defaultOpen={false}>
          {tags.length > 0 ? (
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
          ) : (
            <div className="text-2xs text-muted-foreground/50 border border-dashed border-glass-border rounded-lg p-3 text-center">
              Тегов пока нет
            </div>
          )}
        </FilterSection>
      </div>

      {/* Footer stats */}
      <div className="px-4 py-2.5 border-t border-glass-border bg-glass/30">
        <p className="text-2xs text-muted-foreground">
          {t('sidebar.found')} <span className="text-foreground font-semibold tabular-nums">{total}</span>
        </p>
      </div>
    </aside>
  );
};
