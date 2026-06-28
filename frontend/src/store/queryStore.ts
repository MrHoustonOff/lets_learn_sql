import { create } from 'zustand';
import { useExplainStore } from './explainStore';
import { useTaskStore } from './taskStore';
import { useUIStore } from './uiStore';

export interface QueryResponse {
  columns: string[];
  rows: any[][];
  row_count: number;
  duration_ms: number;
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// Submit / Grade report types (mirrors backend GradeReport.to_dict())
// Reference: правила_сравнения (1).md
// ---------------------------------------------------------------------------

export interface RowSample {
  rows: any[][];
  total: number;
}

export interface Stage1Report {
  passed: boolean;
  user_row_count: number;
  ref_row_count: number;
  user_hash: string | null;
  ref_hash: string | null;
  hash_match: boolean | null;
  except_ran: boolean;
  extra_rows: RowSample | null;
  missing_rows: RowSample | null;
  order_matters: boolean;
  order_passed: boolean | null;
  sql_error: string | null;
}

export interface RuleResult {
  rule_id: number;
  category: string;
  condition: string;
  params: Record<string, any>;
  severity: 'blocking' | 'warning';
  message: string;
  sort_order: number;
  passed: boolean;
  actual_value: any;
  detail_msg: string;
}

export interface Stage2Report {
  ran: boolean;
  all_blocking_passed: boolean;
  rules: RuleResult[];
}

export interface GradeReport {
  verdict: boolean;
  duration_ms: number;
  error: string | null;
  stage1: Stage1Report;
  stage2: Stage2Report;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface QueryState {
  sql: string;
  result: QueryResponse | null;
  isLoading: boolean;
  error: string | null;

  setSql: (sql: string) => void;
  executeQuery: (database?: string) => Promise<void>;

  // Submit (grade)
  submitResult: GradeReport | null;
  isSubmitting: boolean;
  submitError: string | null;
  submitQuery: (taskId: number, database?: string) => Promise<void>;
  clearSubmitResult: () => void;

  // Display settings
  maxRowsToDisplay: number;
  setMaxRowsToDisplay: (max: number) => void;

  // History
  history: any[];
  isHistoryLoading: boolean;
  fetchHistory: (taskId: number) => Promise<void>;
  deleteAttempt: (taskId: number, attemptId: number) => Promise<void>;
  deleteAllAttempts: (taskId: number, type: 'all' | 'correct' | 'incorrect') => Promise<void>;
  resetQueryState: () => void;
  
  isAdminMode: boolean;
  setAdminMode: (val: boolean) => void;
}

export const useQueryStore = create<QueryState>((set, get) => ({
  sql: "SELECT * FROM customers\nWHERE country = 'UK';",
  result: null,
  isLoading: false,
  error: null,

  submitResult: null,
  isSubmitting: false,
  submitError: null,

  maxRowsToDisplay: 100,
  setMaxRowsToDisplay: (max) => set({ maxRowsToDisplay: max }),

  history: [],
  isHistoryLoading: false,

  fetchHistory: async (taskId) => {
    set({ isHistoryLoading: true });
    try {
      const res = await fetch(`/api/tasks/${taskId}/attempts`);
      if (res.ok) {
        const data = await res.json();
        set({ history: data });
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    } finally {
      set({ isHistoryLoading: false });
    }
  },

  deleteAttempt: async (taskId, attemptId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attempts/${attemptId}`, { method: 'DELETE' });
      if (res.ok) {
        get().fetchHistory(taskId);
      }
    } catch (e) {
      console.error('Failed to delete attempt', e);
    }
  },

  deleteAllAttempts: async (taskId, type) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attempts?type=${type}`, { method: 'DELETE' });
      if (res.ok) {
        get().fetchHistory(taskId);
      }
    } catch (e) {
      console.error('Failed to mass delete attempts', e);
    }
  },

  resetQueryState: () => set({
    sql: '',
    result: null,
    error: null,
    submitResult: null,
    submitError: null,
    history: [],
  }),

  setSql: (sql) => set({ sql }),
  
  isAdminMode: false,
  setAdminMode: (val: boolean) => set({ isAdminMode: val }),

  executeQuery: async (database = 'northwind') => {
    const { sql, isAdminMode } = get();
    if (!sql.trim()) return;
    
    set({ isLoading: true, error: null, submitResult: null, submitError: null });

    // Automatically execute explain if not present
    const explainStore = useExplainStore.getState();
    if (!explainStore.explainData) {
      explainStore.fetchExplain(sql, database, isAdminMode);
    }

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, database, admin_commit: isAdminMode }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to execute query');
      }

      const data = await res.json();
      set({ result: data, isAdminMode: false }); // disable admin mode after execution
      
      // Если это был админский запрос (возможно DDL), обновляем схему
      if (isAdminMode) {
        useUIStore.getState().refreshSchema();
      }
    } catch (err: any) {
      set({ error: err.message, result: null, isAdminMode: false });
    } finally {
      set({ isLoading: false });
    }
  },

  submitQuery: async (taskId: number, _database = 'northwind') => {
    const { sql } = get();
    if (!sql.trim()) {
      set({ submitError: 'Empty SQL' });
      return;
    }

    set({ isSubmitting: true, submitError: null, submitResult: null });

    try {
      const response = await fetch(`/api/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Submit failed');
      }

      const result = await response.json();
      set({ submitResult: result, isSubmitting: false });
      
      // Refresh history after submit
      get().fetchHistory(taskId);
    } catch (error: any) {
      set({ submitError: error.message || 'An unknown error occurred', isSubmitting: false });
    }
  },

  clearSubmitResult: () => set({ submitResult: null, submitError: null }),
}));
