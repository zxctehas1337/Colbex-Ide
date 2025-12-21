import { invoke } from '@tauri-apps/api/core';

export type SearchOptions = {
    query: string;
    is_case_sensitive: boolean;
    is_whole_word: boolean;
    is_regex: boolean;
    include_pattern: string;
    exclude_pattern: string;
    filter_pattern: string;
};

export type SearchMatch = {
    line: number;
    char_start: number;
    char_end: number;
    line_text: string;
};

export type SearchResult = {
    file: { name: string; path: string };
    matches: SearchMatch[];
};

export type ReplaceAllResult = {
    total_replacements: number;
    files_changed: number;
};

export type TerminalSize = {
    rows: number;
    cols: number;
};

export type TerminalOutput = {
    terminal_id: string;
    data: string;
};

export type TerminalInfo = {
    terminal_id: string;
    pid: number;
    process_name: string;
};

export type PortInfo = {
    port: number;
    protocol: string;
    pid: number | null;
    process_name: string | null;
    local_address: string;
    state: string;
};

export type Problem = {
    id: number;
    type: 'error' | 'warning';
    file: string;
    path: string;
    line: number;
    column: number;
    message: string;
    code: string | null;
    source: string;
};

export type FileProblems = {
    file: string;
    path: string;
    problems: Problem[];
    error_count: number;
    warning_count: number;
};

export type ProblemsResult = {
    files: FileProblems[];
    total_errors: number;
    total_warnings: number;
};

export type GitFileStatus = {
    path: string;
    status: string;
    is_staged: boolean;
};

export type GitInfo = {
    branch: string;
    is_clean: boolean;
    modified_files: number;
    untracked_files: number;
    staged_files: number;
    has_remote: boolean;
    remote_name: string | null;
    user_name: string | null;
    user_email: string | null;
};

export type DiffLine = {
    line_type: 'add' | 'delete' | 'context' | 'header' | 'hunk';
    content: string;
    old_line_no: number | null;
    new_line_no: number | null;
};

export type FileDiff = {
    file_path: string;
    old_content: string;
    new_content: string;
    lines: DiffLine[];
    is_new_file: boolean;
    is_deleted: boolean;
};

export type GitContributor = {
    name: string;
    email: string;
    commits_count: number;
    branches: string[];
    is_local: boolean;
    avatar_url: string | null;
};

export const tauriApi = {
    readDir: (path: string) => invoke<any[]>('read_dir', { path }),
    readFile: (path: string) => invoke<string>('read_file', { path }),
    readFileBinary: (path: string) => invoke<number[]>('read_file_binary', { path }),
    writeFile: (path: string, content: string) => invoke<void>('write_file', { path, content }),
    getAssetUrl: (path: string) => invoke<string>('get_asset_url', { path }),
    openFileDialog: () => invoke<string | null>('open_file_dialog'),
    openFolderDialog: () => invoke<string | null>('open_folder_dialog'),
    // Git commands
    gitStatus: (path: string) => invoke<GitFileStatus[]>('git_status', { path }),
    gitInfo: (path: string) => invoke<GitInfo>('git_info', { path }),
    gitClone: (url: string, path: string) => invoke<void>('git_clone', { url, path }),
    gitStage: (repoPath: string, filePath: string) => invoke<void>('git_stage', { repoPath, filePath }),
    gitUnstage: (repoPath: string, filePath: string) => invoke<void>('git_unstage', { repoPath, filePath }),
    gitStageAll: (repoPath: string) => invoke<void>('git_stage_all', { repoPath }),
    gitUnstageAll: (repoPath: string) => invoke<void>('git_unstage_all', { repoPath }),
    gitCommit: (repoPath: string, message: string) => invoke<string>('git_commit', { repoPath, message }),
    gitDiscardChanges: (repoPath: string, filePath: string) => invoke<void>('git_discard_changes', { repoPath, filePath }),
    gitDiff: (repoPath: string, filePath: string, isStaged: boolean) => invoke<FileDiff>('git_diff', { repoPath, filePath, isStaged }),
    gitContributors: (repoPath: string) => invoke<GitContributor[]>('git_contributors', { repoPath }),
    searchInFiles: (root_path: string, options: SearchOptions) =>
        invoke<SearchResult[]>('search_in_files', { rootPath: root_path, options }),
    replaceAll: (root_path: string, options: SearchOptions, replace_query: string, preserve_case_flag: boolean) =>
        invoke<ReplaceAllResult>('replace_all', { rootPath: root_path, options, replace_query, preserve_case_flag }),
    getAllFiles: (root_path: string) => invoke<any[]>('get_all_files', { rootPath: root_path }),
    // Terminal commands
    // Tauri 2.0: use camelCase in JS, it auto-converts to snake_case for Rust
    createTerminal: (terminalType?: string, workspacePath?: string, initialSize?: TerminalSize) =>
        invoke<TerminalInfo>('create_terminal', {
            terminalType: terminalType,
            workspacePath: workspacePath,
            initialSize: initialSize,
        }),
    writeTerminal: (terminalId: string, data: string) => {
        if (!terminalId || terminalId.trim() === '') {
            console.error('writeTerminal: terminalId is required', terminalId);
            return Promise.reject(new Error('terminalId is required'));
        }
        return invoke<void>('write_terminal', { terminalId: terminalId, data: data });
    },
    resizeTerminal: (terminalId: string, size: TerminalSize) => {
        if (!terminalId || terminalId.trim() === '') {
            console.error('resizeTerminal: terminalId is required', terminalId);
            return Promise.reject(new Error('terminalId is required'));
        }
        return invoke<void>('resize_terminal', { terminalId: terminalId, size: size });
    },
    closeTerminal: (terminalId: string) => {
        if (!terminalId || terminalId.trim() === '') {
            console.error('closeTerminal: terminalId is required', terminalId);
            return Promise.reject(new Error('terminalId is required'));
        }
        return invoke<void>('close_terminal', { terminalId: terminalId });
    },
    getTerminalInfo: (terminalId: string) => {
        if (!terminalId || terminalId.trim() === '') {
            return Promise.reject(new Error('terminalId is required'));
        }
        return invoke<TerminalInfo>('get_terminal_info', { terminalId: terminalId });
    },
    // Ports commands
    getListeningPorts: () => invoke<PortInfo[]>('get_listening_ports'),
    // Problems commands
    getProblems: (projectPath: string) => invoke<ProblemsResult>('get_problems', { projectPath }),
};
