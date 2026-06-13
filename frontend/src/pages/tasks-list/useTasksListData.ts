import { useState, useEffect, useCallback } from 'react';
export interface TaskItem {
  id: number;
  title: string;
  difficulty: number | null;
  database_id: number;
  db_name: string;
  db_display_name: string;
  is_solved: boolean;
  is_flagged: boolean;
  tags: TagOption[];
  created_at: string;
  solved_at: string | null;
}

export interface FilterState {
  search: string;
  selectedDifficulties: number[];
  selectedTagIds: number[];
  selectedDatabaseId: number | null;
  status: 'all' | 'solved' | 'unsolved' | 'flagged';
  sortBy: 'created' | 'solved';
  sortDir: 'asc' | 'desc';
}

export interface TagOption { id: number; name: string; }
export interface DbOption { id: number; technical_name: string; display_name: string; }

export interface TasksListData {
  tasks: TaskItem[];
  total: number;
  tags: TagOption[];
  databases: DbOption[];
  isLoading: boolean;
  error: string | null;
}

const BASE_URL = '/api';

export function useTasksListData(filters: FilterState): TasksListData & { refetch: () => void } {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [databases, setDatabases] = useState<DbOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.selectedDifficulties.length)
      params.set('difficulty', filters.selectedDifficulties.join(','));
    if (filters.selectedTagIds.length)
      params.set('tag_ids', filters.selectedTagIds.join(','));
    if (filters.selectedDatabaseId)
      params.set('database_id', String(filters.selectedDatabaseId));
    if (filters.status !== 'all') params.set('status', filters.status);
    params.set('sort_by', filters.sortBy);
    params.set('sort_dir', filters.sortDir);

    fetch(`${BASE_URL}/tasks?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => {
        if (cancelled) return;
        setTasks(data.tasks);
        setTotal(data.total);
        setTags(data.tags);
        setDatabases(data.databases);
      })
      .catch(e => {
        if (cancelled) return;
        setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [
    filters.search,
    filters.selectedDifficulties,
    filters.selectedTagIds,
    filters.selectedDatabaseId,
    filters.status,
    filters.sortBy,
    filters.sortDir,
    tick,
  ]);

  return { tasks, total, tags, databases, isLoading, error, refetch };
}
