import { create } from 'zustand';

// Эти интерфейсы пока что-заглушки (mocks), 
// мы расширим их, когда дойдем до шага интеграции с бэкендом.
export interface ParsedPlanNode {
  "Node Type": string;
  cost_pct: number;
  // ...остальные поля появятся позже
}

export interface ExplainPlan {
  id: string;
  sql_text: string;
  plan_parsed: ParsedPlanNode;
  // ...остальные поля
}

export interface ExplainOptions {
  analyze: boolean;
  buffers: boolean;
}

interface ExplainState {
  options: ExplainOptions;
  
  // Буфер планов: максимум 2 элемента
  // slot1 — всегда последний свежий план
  // slot2 — предыдущий план
  slot1: ExplainPlan | null;
  slot2: ExplainPlan | null;
  
  // Залоченный план-эталон
  locked: ExplainPlan | null;

  // Actions
  fetchExplain: (sql: string, database?: string) => Promise<void>;
}

export const useExplainStore = create<ExplainState>((set, get) => ({
  options: {
    analyze: true,
    buffers: true,
  },
  
  slot1: null,
  slot2: null,
  locked: null,

  isLoading: false,
  error: null,

  fetchExplain: async (sql, database = 'northwind') => {
    if (!sql.trim()) return;

    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, database }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to fetch explain plan');
      }

      const result = await response.json();
      
      // Rotate slots
      set((state) => ({ 
        slot2: state.slot1,
        slot1: {
          id: Date.now().toString(),
          sql_text: result.sql,
          plan_parsed: result.plan_parsed
        },
        isLoading: false 
      }));
    } catch (error: any) {
      set({ error: error.message || 'An unknown error occurred', isLoading: false });
    }
  },
}));
