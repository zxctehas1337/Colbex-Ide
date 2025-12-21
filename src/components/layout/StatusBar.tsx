import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons';
import { useProjectStore } from '../../store/projectStore';
import { tauriApi } from '../../lib/tauri-api';
import styles from '../../App.module.css';

interface GitInfo {
    branch: string;
    hasChanges: boolean;
}

export const StatusBar = () => {
    const { 
        activeFile, 
        currentWorkspace, 
        cursorPosition, 
        errors, 
        warnings,
        setFileErrors,
        setFileWarnings
    } = useProjectStore();
    
    const [gitInfo, setGitInfo] = useState<GitInfo>({ branch: 'main', hasChanges: false });
    const [language, setLanguage] = useState<string>('Plain Text');
    const [lineCount, setLineCount] = useState<number>(0);

    // Update Git branch information
    const updateGitInfo = useCallback(async () => {
        if (!currentWorkspace) return;
        
        try {
            const [branchInfo, statusInfo] = await Promise.all([
                tauriApi.gitInfo(currentWorkspace).catch(() => ({ branch: 'main' })),
                tauriApi.gitStatus(currentWorkspace).catch(() => [])
            ]);
            
            setGitInfo({
                branch: branchInfo.branch || 'main',
                hasChanges: statusInfo.length > 0
            });
        } catch (error) {
            console.error('Failed to update git info:', error);
            setGitInfo({ branch: 'main', hasChanges: false });
        }
    }, [currentWorkspace]);

    // Analyze file content for errors and warnings
    const analyzeFile = useCallback(async (filePath: string) => {
        try {
            const content = await tauriApi.readFile(filePath);
            const lines = content.split('\n');
            setLineCount(lines.length);

            // Determine language from file extension
            const extension = filePath.split('.').pop()?.toLowerCase() || '';
            const detectedLanguage = getLanguageFromExtension(extension);
            setLanguage(detectedLanguage);

            // Count errors and warnings (simplified example)
            const { errorCount, warningCount } = countIssues(content, detectedLanguage);
            setFileErrors(filePath, errorCount);
            setFileWarnings(filePath, warningCount);
            
        } catch (error) {
            console.error('Failed to analyze file:', error);
            setFileErrors(filePath, 0);
            setFileWarnings(filePath, 0);
        }
    }, [setFileErrors, setFileWarnings]);

    // Update when active file changes
    useEffect(() => {
        if (activeFile) {
            analyzeFile(activeFile);
        } else {
            setLineCount(0);
            setLanguage('Plain Text');
        }
    }, [activeFile, analyzeFile]);

    // Update git info when workspace changes
    useEffect(() => {
        updateGitInfo();
        
        // Set up polling for git status (every 5 seconds)
        const interval = setInterval(updateGitInfo, 5000);
        return () => clearInterval(interval);
    }, [updateGitInfo]);

    const getLanguageFromExtension = (extension: string): string => {
        const languageMap: { [key: string]: string } = {
            // Web Technologies
            'ts': 'TypeScript', 'tsx': 'TypeScript React', 'js': 'JavaScript', 'jsx': 'JavaScript React',
            'html': 'HTML', 'htm': 'HTML', 'css': 'CSS', 'scss': 'SCSS', 'sass': 'SASS', 'less': 'Less',
            'vue': 'Vue', 'svelte': 'Svelte',
            
            // Backend Languages
            'py': 'Python', 'pyw': 'Python', 'pyi': 'Python',
            'rs': 'Rust', 'go': 'Go', 'java': 'Java', 'kt': 'Kotlin', 'kts': 'Kotlin',
            'scala': 'Scala', 'sc': 'Scala', 'clj': 'Clojure', 'cljs': 'ClojureScript',
            'hs': 'Haskell', 'lhs': 'Haskell', 'ml': 'OCaml', 'eliom': 'OCaml',
            'fs': 'F#', 'fsx': 'F#', 'fsi': 'F#',
            'elm': 'Elm', 'purs': 'PureScript', 'idr': 'Idris', 'ldr': 'Idris',
            
            // C/C++ Family
            'c': 'C', 'cpp': 'C++', 'cxx': 'C++', 'cc': 'C++', 'c++': 'C++',
            'h': 'C Header', 'hpp': 'C++ Header', 'hxx': 'C++ Header', 'hh': 'C++ Header',
            'cs': 'C#', 'csx': 'C#',
            'm': 'Objective-C', 'mm': 'Objective-C++',
            'vala': 'Vala', 'vapi': 'Vala',
            
            // Scripting Languages
            'rb': 'Ruby', 'rbw': 'Ruby', 'gemspec': 'Ruby',
            'php': 'PHP', 'phtml': 'PHP', 'php3': 'PHP', 'php4': 'PHP', 'php5': 'PHP', 'php7': 'PHP',
            'pl': 'Perl', 'pm': 'Perl', 't': 'Perl', 'pod': 'Perl',
            'lua': 'Lua', 'luac': 'Lua',
            'tcl': 'Tcl', 'tk': 'Tcl',
            'r': 'R', 'R': 'R',
            
            // Shell & System
            'sh': 'Shell', 'bash': 'Bash', 'zsh': 'Zsh', 'fish': 'Fish',
            'ps1': 'PowerShell', 'psm1': 'PowerShell', 'psd1': 'PowerShell',
            'bat': 'Batch', 'cmd': 'Batch',
            'reg': 'Registry',
            
            // Data & Configuration
            'json': 'JSON', 'jsonc': 'JSON', 'json5': 'JSON5',
            'xml': 'XML', 'xaml': 'XAML', 'xsl': 'XSLT', 'xsd': 'XSD',
            'yaml': 'YAML', 'yml': 'YAML',
            'toml': 'TOML', 'ini': 'INI', 'cfg': 'Config', 'conf': 'Config',
            'env': 'Environment', 'dotenv': 'Environment',
            
            // Documentation
            'md': 'Markdown', 'markdown': 'Markdown', 'mdx': 'MDX',
            'rst': 'reStructuredText', 'txt': 'Plain Text',
            'tex': 'LaTeX', 'latex': 'LaTeX', 'bib': 'BibTeX',
            
            // Database
            'sql': 'SQL', 'ddl': 'SQL', 'dml': 'SQL',
            'prql': 'PRQL',
            
            // Build & DevOps
            'dockerfile': 'Docker', 'dockerignore': 'Docker',
            'makefile': 'Makefile', 'mk': 'Makefile',
            'cmake': 'CMake',
            'gradle': 'Gradle',
            'pom': 'Maven', 'build': 'Bazel',
            'bzl': 'Bazel', 'bazel': 'Bazel',
            'nix': 'Nix',
            'justfile': 'Just',
            
            // Version Control
            'gitignore': 'Git', 'gitmodules': 'Git', 'gitattributes': 'Git',
            'hgignore': 'Mercurial',
            
            // Web Assets
            'svg': 'SVG', 'png': 'PNG', 'jpg': 'JPEG', 'jpeg': 'JPEG', 'gif': 'GIF',
            'ico': 'Icon', 'webp': 'WebP',
            'css.map': 'Source Map', 'js.map': 'Source Map',
            
            // Mobile Development
            'swift': 'Swift', 'dart': 'Dart',
            
            // Game Development
            'gd': 'GDScript',
            
            // Scientific & Academic
            'jl': 'Julia', 'matlab': 'MATLAB', 'fig': 'FIG',
            'stan': 'Stan',
            
            // Other Languages
            'nim': 'Nim', 'nimble': 'Nim',
            'cr': 'Crystal',
            'v': 'V', 'vsh': 'V',
            'zig': 'Zig',
            'wasm': 'WebAssembly', 'wat': 'WebAssembly',
            'ebnf': 'EBNF',
            'peg': 'PEG',
            'proto': 'Protocol Buffers',
            'thrift': 'Thrift',
            'avdl': 'Avro',
            'graphql': 'GraphQL', 'gql': 'GraphQL',
            'prisma': 'Prisma',
            
            // Template Languages
            'hbs': 'Handlebars', 'handlebars': 'Handlebars',
            'mustache': 'Mustache',
            'erb': 'ERB', 'rhtml': 'ERB',
            'ejs': 'EJS',
            'jinja': 'Jinja', 'jinja2': 'Jinja',
            'twig': 'Twig',
            'liquid': 'Liquid',
            
            // CSS Frameworks
            'styl': 'Stylus',
            'pcss': 'PostCSS',
            
            // Testing
            'spec': 'Spec', 'test': 'Test', 'tests': 'Test',
            
            // Misc
            'lock': 'Lock File', 'log': 'Log',
            'patch': 'Patch', 'diff': 'Diff',
            'rej': 'Reject',
            'bak': 'Backup', 'tmp': 'Temporary',
            'swp': 'Swap',
        };
        return languageMap[extension] || 'Plain Text';
    };

    const countIssues = (content: string, lang: string): { errorCount: number; warningCount: number } => {
        let errorCount = 0;
        let warningCount = 0;
        
        // Check for syntax issues (simplified example)
        const lines = content.split('\n');
        
        // Count potential issues based on language
        if (lang.includes('TypeScript') || lang.includes('JavaScript')) {
            lines.forEach(line => {
                // Example: Count console.log as warnings (for demonstration)
                if (line.includes('console.log')) {
                    warningCount++;
                }
                
                // Check for common issues
                if (line.includes('any') && !line.includes('//')) {
                    warningCount++;
                }
                
                // Count potential template literals without expressions
                const templateLiterals = line.match(/`[^`]*\$\{[^}]*\}[^`]*`/g) || [];
                warningCount += templateLiterals.length;
            });
            
            // Check for unclosed brackets/braces/parentheses
            const openBrackets = (content.match(/\(/g) || []).length;
            const closeBrackets = (content.match(/\)/g) || []).length;
            errorCount += Math.abs(openBrackets - closeBrackets);
            
            const openBraces = (content.match(/\{/g) || []).length;
            const closeBraces = (content.match(/\}/g) || []).length;
            errorCount += Math.abs(openBraces - closeBraces);
            
            const openSquare = (content.match(/\[/g) || []).length;
            const closeSquare = (content.match(/\]/g) || []).length;
            errorCount += Math.abs(openSquare - closeSquare);
        }
        
        return { errorCount, warningCount };
    };

    const errorCount = activeFile ? errors[activeFile] || 0 : 0;
    const warningCount = activeFile ? warnings[activeFile] || 0 : 0;

    return (
        <div className={styles.statusBar}>
            <div className={styles.statusLeft}>
                <div className={`${styles.statusItem} ${gitInfo.hasChanges ? styles.gitChanged : ''}`}>
                    <FontAwesomeIcon 
                        icon={faCodeBranch} 
                        style={{
                            fontSize: '16px',
                            marginRight: '4px'
                        }} 
                    />
                    <span style={{ verticalAlign: 'middle' }}>
                        {gitInfo.branch} {gitInfo.hasChanges && '*'}
                    </span>
                </div>
                {activeFile && (
                    <span className={styles.statusItem}>
                        {errorCount > 0 && <span className={styles.error}>{errorCount} errors</span>}
                        {warningCount > 0 && (
                            <span>
                                {errorCount > 0 && ', '}
                                <span className={styles.warning}>{warningCount} warnings</span>
                            </span>
                        )}
                        {(errorCount === 0 && warningCount === 0) && 'No problems'}
                    </span>
                )}
            </div>

            <div className={styles.statusRight}>
                {activeFile && (
                    <>
                        <span className={styles.statusItem}>
                            Ln {cursorPosition.line}, Col {cursorPosition.column}
                        </span>
                        <span className={styles.statusItem}>UTF-8</span>
                        <span className={styles.statusItem}>{language}</span>
                        <span className={styles.statusItem}>Lines: {lineCount}</span>
                    </>
                )}
            </div>
        </div>
    );
};
