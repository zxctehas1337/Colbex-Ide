import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { tauriApi, type FileProblems, type Problem } from '../../../../lib/tauri-api';
import { useProjectStore } from '../../../../store/projectStore';
import { getFileIcon } from '../../../../utils/fileIcons';
import styles from './ProblemsPanel.module.css';

interface ProblemsPanelProps {
    filterText?: string;
}

export const ProblemsPanel = ({ filterText = '' }: ProblemsPanelProps) => {
    const [problemsData, setProblemsData] = useState<FileProblems[]>([]);
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const currentWorkspace = useProjectStore((state) => state.currentWorkspace);
    const openFile = useProjectStore((state) => state.openFile);

    const fetchProblems = useCallback(async () => {
        if (!currentWorkspace) {
            setProblemsData([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await tauriApi.getProblems(currentWorkspace);
            setProblemsData(result.files);
            
            // Auto-expand all files with problems
            const allPaths = new Set(result.files.map(f => f.path));
            setExpandedFiles(allPaths);
        } catch (err) {
            console.error('Failed to fetch problems:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch problems');
        } finally {
            setIsLoading(false);
        }
    }, [currentWorkspace]);

    useEffect(() => {
        fetchProblems();
        
        // Refresh every 10 seconds
        const interval = setInterval(fetchProblems, 10000);
        return () => clearInterval(interval);
    }, [fetchProblems]);

    const toggleFile = (path: string) => {
        setExpandedFiles(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const handleProblemClick = (problem: Problem, filePath: string) => {
        // Build full path
        const fullPath = currentWorkspace 
            ? `${currentWorkspace}/${filePath}`.replace(/\\/g, '/').replace(/\/+/g, '/')
            : filePath;
        
        // Open file
        openFile(fullPath);
        
        // Navigate to line/column after a small delay to ensure file is loaded
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('editor-reveal-line', {
                detail: {
                    path: fullPath,
                    line: problem.line,
                    start: problem.column - 1,
                    end: problem.column - 1
                }
            }));
        }, 100);
    };

    const filteredData = filterText
        ? problemsData.map(file => ({
            ...file,
            problems: file.problems.filter(p => 
                p.message.toLowerCase().includes(filterText.toLowerCase()) ||
                p.file.toLowerCase().includes(filterText.toLowerCase()) ||
                p.path.toLowerCase().includes(filterText.toLowerCase())
            )
        })).filter(file => file.problems.length > 0)
        : problemsData;

    if (isLoading && problemsData.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.placeholder}>
                    <span className={styles.spinner}>⟳</span> Checking for problems...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.placeholder}>
                    <span className={styles.errorText}>⚠</span> {error}
                    <button className={styles.retryButton} onClick={fetchProblems}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (filteredData.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.placeholder}>
                    No problems detected in workspace
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.list}>
                {filteredData.map((fileProblems) => (
                    <FileProblemsGroup
                        key={fileProblems.path}
                        fileProblems={fileProblems}
                        isExpanded={expandedFiles.has(fileProblems.path)}
                        onToggle={() => toggleFile(fileProblems.path)}
                        onProblemClick={handleProblemClick}
                    />
                ))}
            </div>
        </div>
    );
};

interface FileProblemsGroupProps {
    fileProblems: FileProblems;
    isExpanded: boolean;
    onToggle: () => void;
    onProblemClick: (problem: Problem, filePath: string) => void;
}

const FileProblemsGroup = ({ fileProblems, isExpanded, onToggle, onProblemClick }: FileProblemsGroupProps) => {
    const totalCount = fileProblems.error_count + fileProblems.warning_count;

    return (
        <div className={styles.fileGroup}>
            <button className={styles.fileHeader} onClick={onToggle}>
                <span className={clsx(styles.chevron, isExpanded && styles.chevronExpanded)}>
                    ›
                </span>
                <span className={styles.fileIcon}>
                    {getFileIcon(fileProblems.file, fileProblems.path)}
                </span>
                <span className={styles.fileName}>{fileProblems.file}</span>
                <span className={styles.filePath}>{fileProblems.path}</span>
                <span className={styles.problemCount}>{totalCount}</span>
            </button>
            
            {isExpanded && (
                <div className={styles.problemsList}>
                    {fileProblems.problems.map((problem) => (
                        <ProblemItem 
                            key={problem.id} 
                            problem={problem} 
                            onClick={() => onProblemClick(problem, fileProblems.path)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface ProblemItemProps {
    problem: Problem;
    onClick: () => void;
}

const ProblemItem = ({ problem, onClick }: ProblemItemProps) => {
    const isError = problem.type === 'error';

    return (
        <div className={styles.problemItem} onClick={onClick}>
            <span className={clsx(styles.problemIcon, isError ? styles.errorIcon : styles.warningIcon)}>
                {isError ? '⊗' : '⚠'}
            </span>
            <span className={styles.problemMessage}>{problem.message}</span>
            {problem.code && (
                <span className={styles.problemCode}>{problem.source}({problem.code})</span>
            )}
            <span className={styles.problemLocation}>
                [Ln {problem.line}, Col {problem.column}]
            </span>
        </div>
    );
};

export type { Problem };
