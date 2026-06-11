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

  isLoading: boolean;
  error: string | null;
}

export const useExplainStore = create<ExplainState>((set) => ({
  options: {
    analyze: true,
    buffers: true,
  },
  
  slot1: null,
  slot2: null,
  locked: null,

  isLoading: false,
  error: null,
}));
