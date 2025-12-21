import { create } from 'zustand';
import { tauriApi, GitFileStatus, GitInfo, GitContributor } from '../lib/tauri-api';

type GitTab = 'changes' | 'graph';

interface GitStore {
    // State
    files: GitFileStatus[];
    info: GitInfo | null;
    contributors: GitContributor[];
    isLoading: boolean;
    error: string | null;
    commitMessage: string;
    searchQuery: string;
    activeTab: GitTab;
    
    // Actions
    setCommitMessage: (message: string) => void;
    setSearchQuery: (query: string) => void;
    setActiveTab: (tab: GitTab) => void;
    refresh: (workspacePath: string) => Promise<void>;
    refreshContributors: (workspacePath: string) => Promise<void>;
    stageFile: (workspacePath: string, filePath: string) => Promise<void>;
    unstageFile: (workspacePath: string, filePath: string) => Promise<void>;
    stageAll: (workspacePath: string) => Promise<void>;
    unstageAll: (workspacePath: string) => Promise<void>;
    commit: (workspacePath: string) => Promise<void>;
    discardChanges: (workspacePath: string, filePath: string) => Promise<void>;
}

export const useGitStore = create<GitStore>((set, get) => ({
    files: [],
    info: null,
    contributors: [],
    isLoading: false,
    error: null,
    commitMessage: '',
    searchQuery: '',
    activeTab: 'changes',
    
    setCommitMessage: (message) => set({ commitMessage: message }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setActiveTab: (tab) => set({ activeTab: tab }),
    
    refresh: async (workspacePath) => {
        if (!workspacePath) return;
        set({ isLoading: true, error: null });
        try {
            const [files, info] = await Promise.all([
                tauriApi.gitStatus(workspacePath),
                tauriApi.gitInfo(workspacePath),
            ]);
            set({ files, info, isLoading: false });
        } catch (e: any) {
            set({ error: e.toString(), isLoading: false, files: [], info: null });
        }
    },
    
    refreshContributors: async (workspacePath) => {
        if (!workspacePath) return;
        try {
            const contributors = await tauriApi.gitContributors(workspacePath);
            set({ contributors });
        } catch (e: any) {
            console.error('Failed to load contributors:', e);
            set({ contributors: [] });
        }
    },
    
    stageFile: async (workspacePath, filePath) => {
        try {
            await tauriApi.gitStage(workspacePath, filePath);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },
    
    unstageFile: async (workspacePath, filePath) => {
        try {
            await tauriApi.gitUnstage(workspacePath, filePath);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },
    
    stageAll: async (workspacePath) => {
        try {
            await tauriApi.gitStageAll(workspacePath);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },
    
    unstageAll: async (workspacePath) => {
        try {
            await tauriApi.gitUnstageAll(workspacePath);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },
    
    commit: async (workspacePath) => {
        const { commitMessage } = get();
        if (!commitMessage.trim()) {
            set({ error: 'Commit message is required' });
            return;
        }
        try {
            await tauriApi.gitCommit(workspacePath, commitMessage);
            set({ commitMessage: '' });
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },
    
    discardChanges: async (workspacePath, filePath) => {
        try {
            await tauriApi.gitDiscardChanges(workspacePath, filePath);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },
}));
