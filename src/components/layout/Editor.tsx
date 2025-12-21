import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useProjectStore } from '../../store/projectStore';
import { tauriApi } from '../../lib/tauri-api';
import { ImageViewer } from './ImageViewer';
import { DiffEditor } from './Git/DiffEditor';
import styles from './Editor.module.css';

// Editor configuration to match VS Code dark theme and performance settings
const editorOptions = {
    minimap: { enabled: true },
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    lineHeight: 22,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: "smooth" as "smooth",
    renderWhitespace: "selection" as "selection",
    theme: "vs-dark",
    automaticLayout: true,
    padding: { top: 16 },
    // Disable automatic word highlighting on selection/click
    occurrencesHighlight: "off" as "off",
    selectionHighlight: false,
};

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff'];

export const CodeEditor = () => {
    const { activeFile, setCursorPosition, setFileContent, saveFile, fileContents, unsavedChanges, activeDiffTab, openDiffTabs, currentWorkspace } = useProjectStore();
    const [code, setCode] = useState("// Select a file to view");
    const [language, setLanguage] = useState("plaintext");
    const [isImage, setIsImage] = useState(false);

    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const decorationsRef = useRef<string[]>([]);
    const problemHighlightRef = useRef<string[]>([]);

    // Find active diff tab data
    const activeDiff = activeDiffTab ? openDiffTabs.find(t => t.id === activeDiffTab) : null;

    useEffect(() => {
        const loadFile = async () => {
            if (!activeFile) {
                setIsImage(false);
                return;
            }

            const ext = activeFile.split('.').pop()?.toLowerCase() || '';
            const isImg = IMAGE_EXTENSIONS.includes(ext);
            setIsImage(isImg);

            if (!isImg) {
                try {
                    const content = await tauriApi.readFile(activeFile);
                    setCode(content);
                    setFileContent(activeFile, content);

                    // Extension to Monaco language mapping
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
                    };
                    setLanguage(langMap[ext] || 'plaintext');

                } catch (error) {
                    setCode("// Error loading file");
                    setLanguage('plaintext');
                }
            }
        };
        loadFile();
    }, [activeFile, setFileContent]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Use e.key instead of e.code to support different keyboard layouts
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы')) {
                e.preventDefault();
                if (activeFile && unsavedChanges[activeFile]) {
                    saveFile(activeFile);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeFile, unsavedChanges, saveFile]);

    useEffect(() => {
        const handleReveal = (e: any) => {
            const detail = e?.detail;
            if (!detail || !activeFile || detail.path !== activeFile) return;
            if (!editorRef.current || !monacoRef.current) return;

            const line = Number(detail.line || 1);
            const start = Number(detail.start || 0);

            const monaco = monacoRef.current;
            const editor = editorRef.current;
            
            // Clear previous problem highlight
            problemHighlightRef.current = editor.deltaDecorations(problemHighlightRef.current, []);
            
            // Set cursor position
            editor.setPosition({ lineNumber: line, column: start + 1 });
            
            // Reveal line in center
            editor.revealLineInCenter(line);
            
            // Add line highlight decoration for the problem line
            const highlightDecoration = [{
                range: new monaco.Range(line, 1, line, 1),
                options: {
                    isWholeLine: true,
                    className: 'problem-line-highlight',
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                }
            }];
            
            problemHighlightRef.current = editor.deltaDecorations([], highlightDecoration);
            
            // Auto-clear highlight after 3 seconds
            setTimeout(() => {
                if (editorRef.current) {
                    problemHighlightRef.current = editorRef.current.deltaDecorations(problemHighlightRef.current, []);
                }
            }, 3000);
            
            editor.focus();
        };

        const handleApplyDecorations = (e: any) => {
            const detail = e?.detail;
            if (!detail || !activeFile || detail.path !== activeFile) return;
            if (!editorRef.current || !monacoRef.current) return;

            const monaco = monacoRef.current;
            const matches = Array.isArray(detail.matches) ? detail.matches : [];
            const newDecorations = matches.map((m: any) => {
                const line = Number(m.line || 1);
                const start = Number(m.charStart ?? m.char_start ?? 0);
                const end = Number(m.charEnd ?? m.char_end ?? start);
                return {
                    range: new monaco.Range(line, start + 1, line, end + 1),
                    options: {
                        inlineClassName: 'colbex-search-match',
                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                    },
                };
            });

            decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);
        };

        const handleClearDecorations = (e: any) => {
            const detail = e?.detail;
            if (!detail || !activeFile || detail.path !== activeFile) return;
            if (!editorRef.current) return;
            decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
        };

        window.addEventListener('editor-reveal-line', handleReveal as any);
        window.addEventListener('editor-apply-search-decorations', handleApplyDecorations as any);
        window.addEventListener('editor-clear-search-decorations', handleClearDecorations as any);

        return () => {
            window.removeEventListener('editor-reveal-line', handleReveal as any);
            window.removeEventListener('editor-apply-search-decorations', handleApplyDecorations as any);
            window.removeEventListener('editor-clear-search-decorations', handleClearDecorations as any);
        };
    }, [activeFile]);

    // Show diff editor if diff tab is active
    if (activeDiff && currentWorkspace) {
        return (
            <DiffEditor 
                filePath={activeDiff.filePath} 
                isStaged={activeDiff.isStaged}
                workspacePath={currentWorkspace}
            />
        );
    }

    if (!activeFile) {
        return (
            <div className={styles.empty}>
                <div className={styles.emptyInner}>
                    <div className={styles.brand}>
                        <img 
                            src="/icon.ico" 
                            alt="Colbex" 
                            className={styles.brandIcon}
                        />
                    </div>
                    <h1 className={styles.title}>Welcome to Colbex</h1>
                    
                    <div className={styles.grid}>
                        <div className={styles.card}>
                            <h3 className={styles.cardTitle}>File Operations</h3>
                            <div className={styles.cardBody}>
                                <p><kbd className={styles.kbd}>Ctrl+O</kbd> Open Folder</p>
                                <p><kbd className={styles.kbd}>Ctrl+P</kbd> Quick Open</p>
                                <p><kbd className={styles.kbd}>Ctrl+N</kbd> New File</p>
                            </div>
                        </div>
                        
                        <div className={styles.card}>
                            <h3 className={styles.cardTitle}>Navigation</h3>
                            <div className={styles.cardBody}>
                                <p><kbd className={styles.kbd}>Ctrl+,</kbd> Open Settings</p>
                                <p><kbd className={styles.kbd}>Ctrl+Shift+E</kbd> Show Explorer</p>
                                <p><kbd className={styles.kbd}>Ctrl+`</kbd> Toggle Terminal</p>
                            </div>
                        </div>
                    </div>
                    
                    <p>
                    </p>
                </div>
            </div>
        );
    }

    if (isImage) {
        return <ImageViewer path={activeFile} />;
    }

    return (
        <div className={styles.root}>
            <div className={styles.container}>
                <Editor
                    height="100%"
                    language={language}
                    value={fileContents[activeFile] || code}
                    theme="vs-dark"
                    options={editorOptions}
                    onChange={(value) => {
                        if (activeFile && value !== undefined) {
                            setCode(value);
                            setFileContent(activeFile, value);
                        }
                    }}
                    onMount={(editor, monaco) => {
                        editorRef.current = editor;
                        monacoRef.current = monaco;
                        
                        // Add cursor position change listener
                        const disposable = editor.onDidChangeCursorPosition((e: any) => {
                            const position = e.position;
                            setCursorPosition({
                                line: position.lineNumber,
                                column: position.column
                            });
                        });
                        
                        // Initial cursor position
                        const position = editor.getPosition();
                        if (position) {
                            setCursorPosition({
                                line: position.lineNumber,
                                column: position.column
                            });
                        }
                        
                        // Cleanup on unmount
                        return () => {
                            disposable.dispose();
                        };
                    }}
                />
            </div>
        </div>
    );
};
