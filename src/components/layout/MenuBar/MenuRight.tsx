import { ActivitySquareIcon, SettingsIcon, ProfileIcon } from './icons';
import { useAIStore } from '../../../store/aiStore';
import { useUIStore } from '../../../store/uiStore';
import clsx from 'clsx';
import styles from './MenuRight.module.css';

export const MenuRight = ({
    onOpenSettings,
}: {
    onOpenSettings?: () => void;
}) => {
    const { isAssistantOpen, toggleAssistant } = useAIStore();
    const { showTerminal, toggleTerminal, showSidebar, toggleSidebar } = useUIStore();

    return (
        <div className={styles.root}>
            {/* Left Sidebar Toggle */}
            <button
                onClick={toggleSidebar}
                className={styles.btn}
                title="Toggle Sidebar"
            >
                <ActivitySquareIcon active={showSidebar} position="left" />
            </button>

            {/* Bottom Terminal Toggle */}
            <button
                onClick={toggleTerminal}
                className={styles.btn}
                title="Toggle Terminal"
            >
                <ActivitySquareIcon active={showTerminal} position="bottom" />
            </button>

            {/* Right Assistant Toggle */}
            <button
                onClick={toggleAssistant}
                className={styles.btn}
                title="Toggle Assistant"
            >
                <ActivitySquareIcon active={isAssistantOpen} position="right" />
            </button>

            <div className={styles.divider} />

            {/* Settings */}
            <button
                onClick={onOpenSettings}
                className={clsx(styles.btn, !onOpenSettings && styles.btnDisabled)}
                title="Settings"
                disabled={!onOpenSettings}
            >
                <SettingsIcon />
            </button>

            {/* Profile */}
            <button
                className={styles.btn}
                title="Profile"
            >
                <ProfileIcon />
            </button>
        </div>
    );
};
