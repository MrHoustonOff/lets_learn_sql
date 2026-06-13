import { create } from 'zustand';

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
}

import { useExplainStore } from './explainStore';

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

  setSql: (sql) => set({ sql }),

  executeQuery: async (database = 'northwind') => {
    const { sql } = get();
    if (!sql.trim()) return;

    set({ isLoading: true, error: null, result: null });

    // Параллельно запускаем explain
    useExplainStore.getState().fetchExplain(sql, database);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, database }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to execute query');
      }

      const result = await response.json();
      set({ result, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'An unknown error occurred', isLoading: false });
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

      const report: GradeReport = await response.json();
      set({ submitResult: report, isSubmitting: false });
    } catch (error: any) {
      set({ submitError: error.message || 'An unknown error occurred', isSubmitting: false });
    }
  },

  clearSubmitResult: () => set({ submitResult: null, submitError: null }),
}));
