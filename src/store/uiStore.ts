import { create } from 'zustand';

interface UIState {
    showSidebar: boolean;
    toggleSidebar: () => void;
    showTerminal: boolean;
    toggleTerminal: () => void;
    setTerminalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    showSidebar: true,
    toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
    showTerminal: false,
    toggleTerminal: () => set((state) => ({ showTerminal: !state.showTerminal })),
    setTerminalOpen: (open) => set({ showTerminal: open }),
}));
