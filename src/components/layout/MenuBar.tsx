import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { getCurrentWindow } from '@tauri-apps/api/window';
import CommandPalette from './CommandPalette';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { MenuLeft } from './MenuBar/MenuLeft';
import { MenuRight } from './MenuBar/MenuRight';
import { WindowControls } from './MenuBar/WindowControls';
import { createMenuStructure } from './MenuBar/menuStructure';
import styles from './MenuBar.module.css';

interface MenuBarProps {
    onOpenSettings?: () => void;
}

export const MenuBar = ({ onOpenSettings }: MenuBarProps) => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [palettePosition, setPalettePosition] = useState<{ top: number; left: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const { setWorkspace, openFile, activeFile, navigateHistory } = useProjectStore();
    const window = getCurrentWindow();
    const isMacOS = navigator.userAgent.toLowerCase().includes('mac');
    const isWindows = navigator.userAgent.toLowerCase().includes('win');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyP') {
                e.preventDefault();
                e.stopPropagation();
                handlePaletteOpen();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);



    const handleMenuClick = (category: string) => {
        setActiveMenu(activeMenu === category ? null : category);
    };

    const handlePaletteOpen = () => {
        if (isPaletteOpen) {
            setIsPaletteOpen(false);
            return;
        }
        
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPalettePosition({
                top: rect.bottom + 4,
                left: rect.left - 50
            });
        } else {
            setPalettePosition(null);
        }
        setIsPaletteOpen(true);
    };



    const menuStructure = createMenuStructure({
        setWorkspace,
        openFile,
        window,
        handlePaletteOpen,
    });

    const currentFileName = activeFile ? (activeFile.split(/[/\\]/).pop() ?? 'Untitled') : 'Untitled';

    return (
        <>
            <div className={`${styles.menuBar} ${isMacOS ? styles.macos : ''} ${isWindows ? styles.windows : ''}`} ref={menuRef}>
                <MenuLeft
                    menuStructure={menuStructure}
                    activeMenu={activeMenu}
                    setActiveMenu={setActiveMenu}
                    handleMenuClick={handleMenuClick}
                />

                {/* Центральная часть меню - область перетаскивания и поиска */}
                <div className={styles.center} data-tauri-drag-region>
                    <div className={styles.navGroup}>
                        <div className={styles.navButtons}>
                            <button onClick={() => navigateHistory('back')} className={styles.navBtn}>
                                <ArrowLeft size={18} />
                            </button>
                            <button onClick={() => navigateHistory('forward')} className={styles.navBtn}>
                                <ArrowRight size={18} />
                            </button>
                        </div>

                        <div
                            ref={triggerRef}
                            onClick={handlePaletteOpen}
                            className={styles.searchBar}
                        >
                            <Search size={14} className={styles.searchIcon} />
                            <span className={styles.searchText}>
                                Colbex - <span className="hidden md:inline">{currentFileName}</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.rightGroup}>
                    <MenuRight
                        onOpenSettings={onOpenSettings}
                    />

                    <WindowControls />
                </div>
            </div>

            <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} position={palettePosition} />
        </>
    );
};
