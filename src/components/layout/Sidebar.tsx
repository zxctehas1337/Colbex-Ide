import { useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { ChevronRight, ChevronDown, FilePlus2, FolderPlus, RotateCw, Files } from 'lucide-react';
import { getFileIcon, getFolderIcon } from '../../utils/fileIcons';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { tauriApi } from '../../lib/tauri-api';
import styles from './Sidebar.module.css';

const FileItem = ({ entry, depth = 0 }: { entry: any; depth?: number }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [children, setChildren] = useState<any[]>(entry.children || []);
    const { openFile, activeFile } = useProjectStore();

    const isActive = activeFile === entry.path;

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (entry.is_dir) {
            if (!isOpen && children.length === 0) {
                try {
                    const files = await tauriApi.readDir(entry.path);
                    setChildren(files);
                } catch (e) {
                    console.error("Failed to read dir", e);
                }
            }
            setIsOpen(!isOpen);
        } else {
            openFile(entry.path);
        }
    };

    return (
        <div className={styles.fileItemWrap}>
            <div
                className={clsx(
                    styles.fileRow,
                    isActive && styles.fileRowActive,
                    entry.is_dir && isOpen && styles.fileRowSticky,
                    entry.is_dir && isOpen && isActive && styles.fileRowStickyActive
                )}
                style={{ ['--depth' as any]: depth }}
                onClick={handleToggle}
            >
                {/* Active indicator */}
                {isActive && (
                    <div className={styles.activeIndicator} />
                )}

                <span className={styles.chevronSlot}>
                    {entry.is_dir && (
                        isOpen ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />
                    )}
                    {!entry.is_dir && <div className={styles.placeholderChevron} />}
                </span>

                {entry.is_dir ? (
                    <div className={styles.iconSlot}>
                        {getFolderIcon(entry.name, isOpen, entry.path)}
                    </div>
                ) : (
                    <div className={styles.iconSlot}>
                        {getFileIcon(entry.name, entry.path)}
                    </div>
                )}
                <span className={styles.name}>{entry.name}</span>
            </div>

            <AnimatePresence>
                {isOpen && entry.is_dir && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={styles.childrenWrap}
                    >
                        {/* Nesting line */}
                        <div
                            className={styles.nestingLine}
                            style={{ ['--depth' as any]: depth }}
                        />
                        {children.map((child: any) => (
                            <FileItem key={child.path} entry={child} depth={depth + 1} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const Sidebar = () => {
    const { fileStructure, currentWorkspace, setWorkspace, refreshWorkspace } = useProjectStore();
    const [isProjectOpen, setIsProjectOpen] = useState(true);

    const openFolder = async () => {
        try {
            const selectedFolder = await tauriApi.openFolderDialog();
            if (selectedFolder) {
                setWorkspace(selectedFolder);
            }
        } catch (error) {
            console.error("Failed to open folder dialog:", error);
        }
    };

    const projectName = currentWorkspace ? currentWorkspace.split(/[\\/]/).pop() : 'No Folder';

    return (
        <div className={styles.sidebar}>
            <div className={styles.header}>
                <span>Explorer</span>
            </div>

            <div className={styles.body}>
                {currentWorkspace ? (
                    <div className={styles.section}>
                        <div
                            className={styles.projectHeader}
                            onClick={() => setIsProjectOpen(!isProjectOpen)}
                        >
                            <div className={styles.sectionTitle}>
                                <span className={styles.chev}>
                                    {isProjectOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </span>
                                <span>{projectName}</span>
                            </div>
                            <div className={styles.projectActions}>
                                <button className={styles.projectActionBtn} title="New File"><FilePlus2 size={14} /></button>
                                <button className={styles.projectActionBtn} title="New Folder"><FolderPlus size={14} /></button>
                                <button
                                    className={styles.projectActionBtn}
                                    title="Refresh"
                                    onClick={(e) => { e.stopPropagation(); refreshWorkspace(); }}
                                ><RotateCw size={14} /></button>
                                <button className={styles.projectActionBtn} title="Collapse All"><Files size={14} /></button>
                            </div>
                        </div>

                        {isProjectOpen && (
                            <div className={styles.tree}>
                                {fileStructure.map((entry) => (
                                    <FileItem key={entry.path} entry={entry} />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={styles.noWorkspace}>
                        <p className={styles.noWorkspaceText}>You have not yet opened a folder.</p>
                        <button
                            onClick={openFolder}
                            className={styles.openFolderBtn}
                        >
                            Open Folder
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

