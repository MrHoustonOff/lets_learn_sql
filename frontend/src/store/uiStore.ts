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
  editorFontSize: number;
  editorWordWrap: boolean;
  hiddenPanels: PaneType[];
  toggleCourseToc: () => void;
  setCourseTocOpen: (isOpen: boolean) => void;
  setMaximizedPane: (pane: MaximizedPane) => void;
  setDraggingSlot: (slot: SlotId | null) => void;
  setEditorFontSize: (size: number | ((prev: number) => number)) => void;
  setEditorWordWrap: (wrap: boolean) => void;
  swapSlots: (slotA: SlotId, slotB: SlotId) => void;
  resetSlots: () => void;
  toggleHiddenPanel: (panel: PaneType) => void;
  isPanelHidden: (panel: PaneType) => boolean;
}

const defaultSlots: Record<SlotId, PaneType> = {
  topLeft: 'task',
  bottomLeft: 'editor',
  topRight: 'db',
  bottomRight: 'results',
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      isCourseTocOpen: false,
      maximizedPane: null,
      slots: defaultSlots,
      draggingSlot: null,
      editorFontSize: 14,
      editorWordWrap: true,
      hiddenPanels: [],
      toggleCourseToc: () => set((state) => ({ isCourseTocOpen: !state.isCourseTocOpen })),
      setCourseTocOpen: (isOpen) => set({ isCourseTocOpen: isOpen }),
      setMaximizedPane: (pane) => set({ maximizedPane: pane }),
      setDraggingSlot: (slot) => set({ draggingSlot: slot }),
      setEditorFontSize: (size) => set((state) => ({ 
        editorFontSize: typeof size === 'function' ? size(state.editorFontSize) : size 
      })),
      setEditorWordWrap: (wrap) => set({ editorWordWrap: wrap }),
      swapSlots: (slotA, slotB) => set((state) => {
        const newSlots = { ...state.slots };
        const temp = newSlots[slotA];
        newSlots[slotA] = newSlots[slotB];
        newSlots[slotB] = temp;
        return { slots: newSlots, draggingSlot: null };
      }),
      resetSlots: () => set({ slots: defaultSlots }),
      toggleHiddenPanel: (panel) => set((state) => {
        const hidden = state.hiddenPanels;
        const isHidden = hidden.includes(panel);
        return { hiddenPanels: isHidden ? hidden.filter(p => p !== panel) : [...hidden, panel] };
      }),
      isPanelHidden: (panel) => get().hiddenPanels.includes(panel),
    }),
    {
      name: 'll_ui_storage',
      partialize: (state) => ({
        slots: state.slots,
        maximizedPane: state.maximizedPane,
        editorFontSize: state.editorFontSize,
        editorWordWrap: state.editorWordWrap,
        hiddenPanels: state.hiddenPanels,
      }),
    }
  )
);
