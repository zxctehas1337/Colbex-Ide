import clsx from 'clsx';
import styles from '../TerminalPanel.module.css';
import { TerminalActionDropdown } from './TerminalActionDropdown';
import { EllipsisIcon, MaximizeIcon, CloseIcon } from '../Icons';

type TabId = 'problems' | 'output' | 'debug' | 'terminal' | 'ports';

interface Tab {
    id: TabId;
    label: string;
    badge?: number;
}

interface TerminalHeaderProps {
    activeTab: TabId;
    setActiveTab: (tab: TabId) => void;
    showActionDropdown: boolean;
    setShowActionDropdown: (show: boolean) => void;
    showTerminalSidebar: boolean;
    setShowTerminalSidebar: (show: boolean) => void;
    problemsCount?: number;
}

export const TerminalHeader = ({
    activeTab,
    setActiveTab,
    showActionDropdown,
    setShowActionDropdown,
    showTerminalSidebar,
    setShowTerminalSidebar,
    problemsCount = 0,
}: TerminalHeaderProps) => {
    const tabs: Tab[] = [
        { id: 'problems', label: 'Problems', badge: problemsCount > 0 ? problemsCount : undefined },
        { id: 'output', label: 'Output' },
        { id: 'debug', label: 'Debug Console' },
        { id: 'terminal', label: 'Terminal' },
        { id: 'ports', label: 'Ports' },
    ];

    return (
        <div className={styles.header}>
            <div className={styles.tabs}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={clsx(styles.tab, activeTab === tab.id && styles.tabActive)}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                        {tab.badge && <span className={styles.badge}>{tab.badge}</span>}
                    </button>
                ))}
            </div>

            <div className={styles.controls}>
                <TerminalActionDropdown
                    activeTab={activeTab}
                    showActionDropdown={showActionDropdown}
                    setShowActionDropdown={setShowActionDropdown}
                />

                <button
                    className={styles.actionButton}
                    onClick={() => setShowTerminalSidebar(!showTerminalSidebar)}
                    title="Toggle Terminal List"
                >
                    <EllipsisIcon />
                </button>
                <button className={styles.actionButton} title="Maximize">
                    <MaximizeIcon />
                </button>
                <button className={styles.actionButton} title="Close">
                    <CloseIcon />
                </button>
            </div>
        </div>
    );
};
