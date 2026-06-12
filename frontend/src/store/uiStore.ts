import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MaximizedPane = 'task' | 'editor' | 'db' | 'results' | null;
export type PaneType = 'task' | 'editor' | 'db' | 'results';
export type SlotId = 'topLeft' | 'bottomLeft' | 'topRight' | 'bottomRight';

interface UIState {
  isCourseTocOpen: boolean;
  maximizedPane: MaximizedPane;
  slots: Record<SlotId, PaneType>;
  draggingSlot: SlotId | null;
  toggleCourseToc: () => void;
  setCourseTocOpen: (isOpen: boolean) => void;
  setMaximizedPane: (pane: MaximizedPane) => void;
  setDraggingSlot: (slot: SlotId | null) => void;
  swapSlots: (slotA: SlotId, slotB: SlotId) => void;
}

const defaultSlots: Record<SlotId, PaneType> = {
  topLeft: 'task',
  bottomLeft: 'editor',
  topRight: 'db',
  bottomRight: 'results',
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isCourseTocOpen: false,
      maximizedPane: null,
      slots: defaultSlots,
      draggingSlot: null,
      toggleCourseToc: () => set((state) => ({ isCourseTocOpen: !state.isCourseTocOpen })),
      setCourseTocOpen: (isOpen) => set({ isCourseTocOpen: isOpen }),
      setMaximizedPane: (pane) => set({ maximizedPane: pane }),
      setDraggingSlot: (slot) => set({ draggingSlot: slot }),
      swapSlots: (slotA, slotB) => set((state) => {
        const newSlots = { ...state.slots };
        const temp = newSlots[slotA];
        newSlots[slotA] = newSlots[slotB];
        newSlots[slotB] = temp;
        return { slots: newSlots, draggingSlot: null };
      }),
    }),
    {
      name: 'll_ui_storage',
      partialize: (state) => ({
        slots: state.slots,
        maximizedPane: state.maximizedPane,
      }),
    }
  )
);
