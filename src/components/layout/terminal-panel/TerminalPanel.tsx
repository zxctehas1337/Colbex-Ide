import { useState, useEffect, useCallback } from 'react';
import { useTerminalStore } from '../../../store/terminalStore';
import { useProjectStore } from '../../../store/projectStore';
import { tauriApi } from '../../../lib/tauri-api';
import styles from './TerminalPanel.module.css';
import { TerminalView } from './TerminalView';
import { useTerminalKeyboard } from './hooks';
import {
    TerminalHeader,
    TerminalTabs,
    TerminalSidebar,
    ProblemsPanel,
    PortsPanel,
} from './components';

type TabId = 'problems' | 'output' | 'debug' | 'terminal' | 'ports';

export const TerminalPanel = () => {
    const { terminals, activeTerminalId, addTerminal } = useTerminalStore();
    const currentWorkspace = useProjectStore((state) => state.currentWorkspace);

    const [selectedTerminalId, setSelectedTerminalId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>('terminal');
    const [showActionDropdown, setShowActionDropdown] = useState(false);
    const [showTerminalSidebar, setShowTerminalSidebar] = useState(false);
    const [problemsCount, setProblemsCount] = useState(0);

    useTerminalKeyboard({
        selectedTerminalId,
        setSelectedTerminalId,
        showActionDropdown,
        setShowActionDropdown,
    });

    // Fetch problems count for badge
    const fetchProblemsCount = useCallback(async () => {
        if (!currentWorkspace) {
            setProblemsCount(0);
            return;
        }
        try {
            const result = await tauriApi.getProblems(currentWorkspace);
            setProblemsCount(result.total_errors + result.total_warnings);
        } catch {
            // Ignore errors for badge count
        }
    }, [currentWorkspace]);

    useEffect(() => {
        fetchProblemsCount();
        const interval = setInterval(fetchProblemsCount, 10000);
        return () => clearInterval(interval);
    }, [fetchProblemsCount]);

    // Focus is handled by TerminalView component when it becomes active

    return (
        <div className={styles.panel}>
            <TerminalHeader
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                showActionDropdown={showActionDropdown}
                setShowActionDropdown={setShowActionDropdown}
                showTerminalSidebar={showTerminalSidebar}
                setShowTerminalSidebar={setShowTerminalSidebar}
                problemsCount={problemsCount}
            />

            <div className={styles.mainContent}>
                <div className={styles.content}>
                    {/* Terminal tab */}
                    <div
                        className={styles.terminalContainer}
                        style={{ display: activeTab === 'terminal' ? 'flex' : 'none' }}
                    >
                        <TerminalTabs activeTab={activeTab} />

                        {terminals.length > 0 ? (
                            <div className={styles.terminalsWrapper}>
                                {terminals.map((t) => (
                                    <TerminalView
                                        key={t.id}
                                        terminalId={t.id}
                                        isActive={t.id === activeTerminalId}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyStateText}>No terminal</div>
                                <button
                                    className={styles.createTerminalButton}
                                    onClick={() => {
                                        if (activeTab === 'terminal') {
                                            addTerminal('powershell');
                                        }
                                    }}
                                >
                                    New Terminal
                                </button>
                            </div>
                        )}
                    </div>

                    {activeTab === 'problems' && <ProblemsPanel />}

                    {activeTab === 'output' && (
                        <div className={styles.placeholderContent}>
                            <div className={styles.placeholderText}>Output panel</div>
                        </div>
                    )}
                    {activeTab === 'debug' && (
                        <div className={styles.placeholderContent}>
                            <div className={styles.placeholderText}>Debug Console panel</div>
                        </div>
                    )}
                    {activeTab === 'ports' && <PortsPanel />}
                </div>

                {showTerminalSidebar && (
                    <TerminalSidebar
                        setShowTerminalSidebar={setShowTerminalSidebar}
                        setSelectedTerminalId={setSelectedTerminalId}
                    />
                )}
            </div>
            </div>
    );
};
