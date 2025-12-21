import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface FileEntry {
    name: string;
    path: string;
    is_dir: boolean;
    children?: FileEntry[];
}

interface CursorPosition {
    line: number;
    column: number;
}

interface ProjectState {
    currentWorkspace: string | null;
    fileStructure: FileEntry[];
    openFiles: string[];
    activeFile: string | null;
    history: string[];
    historyIndex: number;
    cursorPosition: CursorPosition;
    errors: { [key: string]: number };
    warnings: { [key: string]: number };
    unsavedChanges: { [key: string]: boolean };
    fileContents: { [key: string]: string };
    setWorkspace: (path: string) => Promise<void>;
    openFile: (path: string) => void;
    closeFile: (path: string) => void;
    refreshWorkspace: () => Promise<void>;
    navigateHistory: (direction: 'back' | 'forward') => void;
    setCursorPosition: (position: CursorPosition) => void;
    setFileErrors: (filePath: string, count: number) => void;
    setFileWarnings: (filePath: string, count: number) => void;
    setFileContent: (filePath: string, content: string) => void;
    saveFile: (filePath: string) => Promise<void>;
    markFileAsSaved: (filePath: string) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    currentWorkspace: null,
    fileStructure: [],
    openFiles: [],
    activeFile: null,
    history: [],
    historyIndex: -1,
    cursorPosition: { line: 1, column: 1 },
    errors: {},
    warnings: {},
    unsavedChanges: {},
    fileContents: {},

    setWorkspace: async (path: string) => {
        try {
            const structure = await invoke<FileEntry[]>('read_dir', { path });
            set({ currentWorkspace: path, fileStructure: structure });
        } catch (error) {
            console.error('Failed to load workspace:', error);
        }
    },

    refreshWorkspace: async () => {
        const { currentWorkspace } = get();
        if (currentWorkspace) {
            const structure = await invoke<FileEntry[]>('read_dir', { path: currentWorkspace });
            set({ fileStructure: structure });
        }
    },

    openFile: (path: string) => {
        const { openFiles, history, historyIndex } = get();

        // Update history
        const newHistory = [...history.slice(0, historyIndex + 1), path];
        // Keep history at reasonable size
        if (newHistory.length > 50) newHistory.shift();

        const newOpenFiles = openFiles.includes(path) ? openFiles : [...openFiles, path];

        set({
            openFiles: newOpenFiles,
            activeFile: path,
            history: newHistory,
            historyIndex: newHistory.length - 1
        });
    },

    closeFile: (path: string) => {
        const { openFiles, activeFile, history, historyIndex, errors, warnings } = get();
        const newOpenFiles = openFiles.filter(file => file !== path);
        const newActiveFile = activeFile === path ? (newOpenFiles[0] || null) : activeFile;

        // Update history if needed
        const newHistory = history.filter(file => file !== path);
        const newHistoryIndex = Math.min(historyIndex, newHistory.length - 1);

        // Remove error/warning counts for the closed file
        const newErrors = { ...errors };
        const newWarnings = { ...warnings };
        delete newErrors[path];
        delete newWarnings[path];

        set({
            openFiles: newOpenFiles,
            activeFile: newActiveFile,
            history: newHistory,
            historyIndex: newHistoryIndex,
            errors: newErrors,
            warnings: newWarnings
        });
    },

    navigateHistory: (direction: 'back' | 'forward') => {
        const { history, historyIndex } = get();
        if (direction === 'back' && historyIndex > 0) {
            const newIndex = historyIndex - 1;
            set({ historyIndex: newIndex, activeFile: history[newIndex] });
        } else if (direction === 'forward' && historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            set({ historyIndex: newIndex, activeFile: history[newIndex] });
        }
    },

    setCursorPosition: (position: CursorPosition) => {
        set({ cursorPosition: position });
    },

    setFileErrors: (filePath: string, count: number) => {
        const { errors } = get();
        set({ 
            errors: { 
                ...errors, 
                [filePath]: count 
            } 
        });
    },

    setFileWarnings: (filePath: string, count: number) => {
        const { warnings } = get();
        set({ 
            warnings: { 
                ...warnings, 
                [filePath]: count 
            } 
        });
    },

    setFileContent: (filePath: string, content: string) => {
        const { fileContents, unsavedChanges } = get();
        const originalContent = fileContents[filePath];
        
        // Если исходного содержимого нет (первая загрузка) не считаем это изменением
        const hasChanges = originalContent !== undefined && originalContent !== content;
        
        set({
            fileContents: {
                ...fileContents,
                [filePath]: content
            },
            unsavedChanges: {
                ...unsavedChanges,
                [filePath]: hasChanges
            }
        });
    },

    saveFile: async (filePath: string) => {
        const { fileContents } = get();
        const content = fileContents[filePath];
        
        if (content !== undefined) {
            try {
                await invoke('write_file', { path: filePath, content });
                get().markFileAsSaved(filePath);
            } catch (error) {
                console.error('Failed to save file:', error);
            }
        }
    },

    markFileAsSaved: (filePath: string) => {
        const { unsavedChanges } = get();
        set({
            unsavedChanges: {
                ...unsavedChanges,
                [filePath]: false
            }
        });
    },
}));
