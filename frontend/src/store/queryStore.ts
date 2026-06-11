import { create } from 'zustand';

export interface QueryResponse {
  columns: string[];
  rows: any[][];
  row_count: number;
  duration_ms: number;
  truncated: boolean;
}

interface QueryState {
  sql: string;
  result: QueryResponse | null;
  isLoading: boolean;
  error: string | null;
  
  setSql: (sql: string) => void;
  executeQuery: (database?: string) => Promise<void>;
  
  // Настройки отображения
  maxRowsToDisplay: number;
  setMaxRowsToDisplay: (max: number) => void;
}

export const useQueryStore = create<QueryState>((set, get) => ({
  sql: "SELECT * FROM customers\nWHERE country = 'UK';",
  result: null,
  isLoading: false,
  error: null,
  
  maxRowsToDisplay: 100,
  setMaxRowsToDisplay: (max) => set({ maxRowsToDisplay: max }),

  setSql: (sql) => set({ sql }),
  
  executeQuery: async (database = 'northwind') => {
    const { sql } = get();
    if (!sql.trim()) return;

    set({ isLoading: true, error: null, result: null });

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
}));
