import React, { useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { X, GitCompare } from 'lucide-react';
import { getFileIcon } from '../../utils/fileIcons';
import clsx from 'clsx';
import styles from './Tabs.module.css';

export const TabBar = () => {
    const { 
        openFiles, activeFile, openFile, closeFile, unsavedChanges,
        openDiffTabs, activeDiffTab, setActiveDiffTab, closeDiffTab 
    } = useProjectStore();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleWheel = (e: React.WheelEvent) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft += e.deltaY;
            e.preventDefault();
        }
    };

    if (openFiles.length === 0 && openDiffTabs.length === 0) return null;

    return (
        <div className={styles.tabsContainer}>
            <div
                className={styles.tabBar}
                onWheel={handleWheel}
                ref={scrollContainerRef}
            >
                {/* Regular file tabs */}
                {openFiles.map((path) => {
                    const name = path.split(/[\\/]/).pop() || path;
                    const isActive = activeFile === path && !activeDiffTab;
                    const hasUnsavedChanges = unsavedChanges[path];

                    return (
                        <div
                            key={path}
                            className={clsx(
                                styles.tab,
                                isActive && styles.tabActive,
                                !isActive && styles.tabInactive
                            )}
                            onClick={() => openFile(path)}
                        >
                            <div className={styles.tabContent}>
                                <span className={styles.tabIcon}>
                                    {getFileIcon(name, path)}
                                </span>
                                <span className={styles.tabLabel}>
                                    {name}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeFile(path);
                                    }}
                                    className={clsx(
                                        styles.closeButton,
                                        isActive && styles.closeButtonActive,
                                        hasUnsavedChanges && styles.closeButtonUnsaved
                                    )}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseUp={(e) => e.stopPropagation()}
                                >
                                    {hasUnsavedChanges ? (
                                        <>
                                            <div className={styles.unsavedDot} />
                                            <X size={14} strokeWidth={2} className={clsx(styles.closeIcon, styles.unsavedCloseIcon)} />
                                        </>
                                    ) : (
                                        <X size={14} strokeWidth={2} className={styles.closeIcon} />
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
                
                {/* Diff tabs */}
                {openDiffTabs.map((diffTab) => {
                    const isActive = activeDiffTab === diffTab.id;

                    return (
                        <div
                            key={diffTab.id}
                            className={clsx(
                                styles.tab,
                                isActive && styles.tabActive,
                                !isActive && styles.tabInactive
                            )}
                            onClick={() => setActiveDiffTab(diffTab.id)}
                        >
                            <div className={styles.tabContent}>
                                <span className={styles.tabIcon}>
                                    <GitCompare size={14} />
                                </span>
                                <span className={styles.tabLabel}>
                                    {diffTab.fileName}
                                </span>
                                <span className={styles.diffLabel}>
                                    (Working Tree)
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeDiffTab(diffTab.id);
                                    }}
                                    className={clsx(
                                        styles.closeButton,
                                        isActive && styles.closeButtonActive
                                    )}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseUp={(e) => e.stopPropagation()}
                                >
                                    <X size={14} strokeWidth={2} className={styles.closeIcon} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
