import React, { useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { X } from 'lucide-react';
import { getFileIcon } from '../../utils/fileIcons';
import clsx from 'clsx';
import styles from './Tabs.module.css';

export const TabBar = () => {
    const { openFiles, activeFile, openFile, closeFile, unsavedChanges } = useProjectStore();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleWheel = (e: React.WheelEvent) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft += e.deltaY;
            e.preventDefault();
        }
    };

    if (openFiles.length === 0) return null;

    return (
        <div className={styles.tabsContainer}>
            <div
                className={styles.tabBar}
                onWheel={handleWheel}
                ref={scrollContainerRef}
            >
                {openFiles.map((path) => {
                    const name = path.split(/[\\/]/).pop() || path;
                    const isActive = activeFile === path;
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
            </div>
        </div>
    );
};
