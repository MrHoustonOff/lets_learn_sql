import { create } from 'zustand';

export type MaximizedPane = 'task' | 'editor' | 'db' | 'results' | null;

interface UIState {
  isCourseTocOpen: boolean;
  maximizedPane: MaximizedPane;
  toggleCourseToc: () => void;
  setCourseTocOpen: (isOpen: boolean) => void;
  setMaximizedPane: (pane: MaximizedPane) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCourseTocOpen: false,
  maximizedPane: null,
  toggleCourseToc: () => set((state) => ({ isCourseTocOpen: !state.isCourseTocOpen })),
  setCourseTocOpen: (isOpen) => set({ isCourseTocOpen: isOpen }),
  setMaximizedPane: (pane) => set({ maximizedPane: pane }),
}));
