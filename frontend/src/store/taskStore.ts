import { create } from 'zustand';

export interface Task {
  id: number;
  title: string;
  description: string;
  hint: string | null;
  dbName: string;
  isBookmarked: boolean;
  isSolved: boolean;
}

interface TaskState {
  activeTask: Task | null;
  isLoading: boolean;
  error: string | null;

  // Shared tab state: allows SqlEditorPane to switch TaskPane to 'solution' on Submit
  taskPaneTab: 'task' | 'solution';
  setTaskPaneTab: (tab: 'task' | 'solution') => void;

  setActiveTask: (task: Task | null) => void;
  fetchTask: (id: number | string) => Promise<void>;
  toggleBookmark: () => Promise<void>;
  toggleSolved: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  activeTask: null,
  isLoading: false,
  error: null,

  taskPaneTab: 'task',
  setTaskPaneTab: (tab) => set({ taskPaneTab: tab }),

  setActiveTask: (task) => set({ activeTask: task }),
  
  fetchTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/tasks/${id}`);
      if (!response.ok) throw new Error('Failed to fetch task details');
      const data = await response.json();
      
      const task: Task = {
        id: data.id,
        title: data.title,
        description: data.description,
        hint: data.hint,
        dbName: data.db_name,
        isBookmarked: data.is_bookmarked,
        isSolved: data.is_solved
      };
      set({ activeTask: task, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
  
  toggleBookmark: async () => {
    // Local placeholder for bookmark state toggling
    const { activeTask } = get();
    if (!activeTask) return;
    set({
      activeTask: {
        ...activeTask,
        isBookmarked: !activeTask.isBookmarked
      }
    });
  },
  
  toggleSolved: () => {
    const { activeTask } = get();
    if (!activeTask) return;
    set({
      activeTask: {
        ...activeTask,
        isSolved: !activeTask.isSolved
      }
    });
  }
}));
