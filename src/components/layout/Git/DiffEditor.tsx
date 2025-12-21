import { useEffect, useState } from 'react';
import { DiffEditor as MonacoDiffEditor } from '@monaco-editor/react';
import { tauriApi, FileDiff } from '../../../lib/tauri-api';
import styles from './DiffEditor.module.css';

interface DiffEditorProps {
    filePath: string;
    isStaged: boolean;
    workspacePath: string;
}

const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
        'rs': 'rust',
        'ts': 'typescript',
        'tsx': 'typescript',
        'js': 'javascript',
        'jsx': 'javascript',
        'json': 'json',
        'html': 'html',
        'css': 'css',
        'md': 'markdown',
        'py': 'python',
        'go': 'go',
        'cpp': 'cpp',
        'c': 'c',
        'java': 'java',
        'toml': 'toml',
        'yaml': 'yaml',
        'yml': 'yaml',
        'xml': 'xml',
        'sql': 'sql',
        'sh': 'shell',
        'bash': 'shell',
    };
    return langMap[ext] || 'plaintext';
};

export const DiffEditor = ({ filePath, isStaged, workspacePath }: DiffEditorProps) => {
    const [diff, setDiff] = useState<FileDiff | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadDiff = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await tauriApi.gitDiff(workspacePath, filePath, isStaged);
                setDiff(result);
            } catch (e: any) {
                setError(e.toString());
            } finally {
                setIsLoading(false);
            }
        };
        loadDiff();
    }, [filePath, isStaged, workspacePath]);

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <span>Loading diff...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                <span>Error loading diff: {error}</span>
            </div>
        );
    }

    if (!diff) {
        return (
            <div className={styles.error}>
                <span>No diff available</span>
            </div>
        );
    }

    const language = getLanguageFromPath(filePath);

    return (
        <div className={styles.diffEditor}>
            <MonacoDiffEditor
                height="100%"
                language={language}
                original={diff.old_content}
                modified={diff.new_content}
                theme="vs-dark"
                options={{
                    readOnly: true,
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    lineHeight: 22,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 8 },
                    renderOverviewRuler: true,
                    diffWordWrap: 'off',
                }}
            />
        </div>
    );
};
