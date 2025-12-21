import { useEffect, useState } from 'react';
import { useGitStore } from '../../../store/gitStore';
import { useProjectStore } from '../../../store/projectStore';
import { 
    ChevronRight, ChevronDown, RotateCw, Check, Plus, 
    Undo2, GitBranch, Cloud, User, CircleDot, GitGraph,
    Monitor, Globe
} from 'lucide-react';
import { getFileIcon } from '../../../utils/fileIcons';
import styles from './GitPane.module.css';

export const GitPane = () => {
    const { currentWorkspace, openDiffTab } = useProjectStore();
    const { 
        files, info, contributors, isLoading, error, commitMessage, activeTab,
        setCommitMessage, setActiveTab, refresh, refreshContributors, stageFile, 
        stageAll, commit, discardChanges
    } = useGitStore();
    
    const [changesOpen, setChangesOpen] = useState(true);
    const [contributorsOpen, setContributorsOpen] = useState(true);

    useEffect(() => {
        if (currentWorkspace) {
            refresh(currentWorkspace);
        }
    }, [currentWorkspace]);

    useEffect(() => {
        if (currentWorkspace && activeTab === 'graph') {
            refreshContributors(currentWorkspace);
        }
    }, [currentWorkspace, activeTab]);

    const handleCommit = async () => {
        if (currentWorkspace && commitMessage.trim() && files.length > 0) {
            await stageAll(currentWorkspace);
            await commit(currentWorkspace);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleCommit();
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'modified':
            case 'staged_modified':
                return 'M';
            case 'untracked':
            case 'staged_new':
                return 'U';
            case 'deleted':
            case 'staged_deleted':
                return 'D';
            default:
                return '?';
        }
    };

    const getStatusClass = (status: string) => {
        if (status.includes('modified')) return styles.statusM;
        if (status.includes('new') || status === 'untracked') return styles.statusU;
        if (status.includes('deleted')) return styles.statusD;
        return '';
    };

    const getFileName = (path: string) => path.split('/').pop() || path;
    const getFilePath = (path: string) => {
        const parts = path.split('/');
        if (parts.length > 1) {
            return parts.slice(0, -1).join('/');
        }
        return '';
    };

    const handleFileClick = (file: typeof files[0]) => {
        openDiffTab(file.path, file.is_staged);
    };

    if (!currentWorkspace) {
        return (
            <div className={styles.gitPane}>
                <div className={styles.header}>Source Control</div>
                <div className={styles.noRepo}>
                    <GitBranch size={32} />
                    <p className={styles.noRepoText}>Open a folder to see Git changes</p>
                </div>
            </div>
        );
    }

    if (error && !info) {
        return (
            <div className={styles.gitPane}>
                <div className={styles.header}>
                    <span>Source Control</span>
                    <div className={styles.headerActions}>
                        <button 
                            className={styles.headerBtn} 
                            onClick={() => refresh(currentWorkspace)}
                            title="Refresh"
                        >
                            <RotateCw size={14} />
                        </button>
                    </div>
                </div>
                <div className={styles.noRepo}>
                    <GitBranch size={32} />
                    <p className={styles.noRepoText}>Not a Git repository</p>
                </div>
            </div>
        );
    }

    if (isLoading && !info) {
        return (
            <div className={styles.gitPane}>
                <div className={styles.header}>Source Control</div>
                <div className={styles.loading}>Loading...</div>
            </div>
        );
    }

    return (
        <div className={styles.gitPane}>
            <div className={styles.header}>
                <span>Source Control</span>
                <div className={styles.headerActions}>
                    <button 
                        className={styles.headerBtn} 
                        onClick={() => {
                            refresh(currentWorkspace);
                            if (activeTab === 'graph') {
                                refreshContributors(currentWorkspace);
                            }
                        }}
                        title="Refresh"
                    >
                        <RotateCw size={14} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button 
                    className={`${styles.tab} ${activeTab === 'changes' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('changes')}
                >
                    <GitBranch size={14} />
                    Changes
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'graph' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('graph')}
                >
                    <GitGraph size={14} />
                    Graph
                </button>
            </div>

            {activeTab === 'changes' && (
                <>
                    {/* Commit Section */}
                    <div className={styles.commitSection}>
                        <textarea
                            className={styles.commitInput}
                            placeholder="Message (Ctrl+Enter to commit)"
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button 
                            className={styles.commitBtn}
                            onClick={handleCommit}
                            disabled={!commitMessage.trim() || files.length === 0}
                        >
                            <Check size={14} />
                            Commit
                        </button>
                    </div>

                    {/* Changes Section */}
                    <div className={styles.changesSection}>
                        <div 
                            className={styles.sectionHeader}
                            onClick={() => setChangesOpen(!changesOpen)}
                        >
                            <div className={styles.sectionTitle}>
                                {changesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <span>Changes</span>
                                {files.length > 0 && (
                                    <span className={styles.sectionCount}>{files.length}</span>
                                )}
                            </div>
                            {files.length > 0 && (
                                <div className={styles.sectionActions}>
                                    <button 
                                        className={styles.sectionBtn}
                                        onClick={(e) => { e.stopPropagation(); stageAll(currentWorkspace); }}
                                        title="Stage All"
                                    >
                                        <Plus size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {changesOpen && (
                            <div className={styles.filesList}>
                                {files.length === 0 ? (
                                    <div className={styles.emptySection}>No changes</div>
                                ) : (
                                    files.map((file) => (
                                        <div 
                                            key={file.path} 
                                            className={styles.fileItem}
                                            onClick={() => handleFileClick(file)}
                                        >
                                            <div className={styles.fileIcon}>
                                                {getFileIcon(getFileName(file.path), file.path)}
                                            </div>
                                            <span className={styles.fileName}>
                                                {getFileName(file.path)}
                                                {getFilePath(file.path) && (
                                                    <span className={styles.filePath}>{getFilePath(file.path)}</span>
                                                )}
                                            </span>
                                            <span className={`${styles.fileStatus} ${getStatusClass(file.status)}`}>
                                                {getStatusLabel(file.status)}
                                            </span>
                                            <div className={styles.fileActions}>
                                                <button 
                                                    className={styles.fileActionBtn}
                                                    onClick={(e) => { e.stopPropagation(); discardChanges(currentWorkspace, file.path); }}
                                                    title="Discard Changes"
                                                >
                                                    <Undo2 size={12} />
                                                </button>
                                                <button 
                                                    className={styles.fileActionBtn}
                                                    onClick={(e) => { e.stopPropagation(); stageFile(currentWorkspace, file.path); }}
                                                    title="Stage"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'graph' && (
                <div className={styles.graphSection}>
                    {/* Repository Info */}
                    {info && (
                        <div className={styles.repoInfo}>
                            <div className={styles.repoInfoItem}>
                                <span className={styles.repoInfoLabel}>Branch</span>
                                <div className={styles.branchBadge}>
                                    <CircleDot size={10} />
                                    {info.branch}
                                </div>
                            </div>
                            <div className={styles.repoInfoItem}>
                                <span className={styles.repoInfoLabel}>Repository</span>
                                <div className={styles.repoBadge}>
                                    {info.has_remote ? (
                                        <>
                                            <Globe size={12} />
                                            Remote
                                        </>
                                    ) : (
                                        <>
                                            <Monitor size={12} />
                                            Local
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Contributors Section */}
                    <div className={styles.contributorsSection}>
                        <div 
                            className={styles.sectionHeader}
                            onClick={() => setContributorsOpen(!contributorsOpen)}
                        >
                            <div className={styles.sectionTitle}>
                                {contributorsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <span>Contributors</span>
                                {contributors.length > 0 && (
                                    <span className={styles.sectionCount}>{contributors.length}</span>
                                )}
                            </div>
                        </div>
                        
                        {contributorsOpen && (
                            <div className={styles.contributorsList}>
                                {contributors.length === 0 ? (
                                    <div className={styles.emptySection}>No contributors found</div>
                                ) : (
                                    contributors.map((contributor) => (
                                        <div key={contributor.email} className={styles.contributorItem}>
                                            <div className={styles.contributorAvatar}>
                                                {contributor.avatar_url ? (
                                                    <img 
                                                        src={contributor.avatar_url} 
                                                        alt={contributor.name}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove(styles.hidden);
                                                        }}
                                                    />
                                                ) : null}
                                                <div className={`${styles.avatarFallback} ${contributor.avatar_url ? styles.hidden : ''}`}>
                                                    <User size={14} />
                                                </div>
                                            </div>
                                            <div className={styles.contributorInfo}>
                                                <div className={styles.contributorName}>
                                                    {contributor.name}
                                                    {contributor.is_local && (
                                                        <span className={styles.youBadge}>you</span>
                                                    )}
                                                </div>
                                                <div className={styles.contributorEmail}>{contributor.email}</div>
                                                <div className={styles.contributorMeta}>
                                                    <span className={styles.commitsCount}>
                                                        {contributor.commits_count} commit{contributor.commits_count !== 1 ? 's' : ''}
                                                    </span>
                                                    {contributor.branches.length > 0 && (
                                                        <div className={styles.branchesList}>
                                                            {contributor.branches.slice(0, 3).map((branch) => (
                                                                <span key={branch} className={styles.branchTag}>
                                                                    {branch.replace('origin/', '')}
                                                                </span>
                                                            ))}
                                                            {contributor.branches.length > 3 && (
                                                                <span className={styles.moreBranches}>
                                                                    +{contributor.branches.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer with branch info - only show on changes tab */}
            {info && activeTab === 'changes' && (
                <div className={styles.footer}>
                    <div className={styles.branchInfo}>
                        <div className={styles.branchName}>
                            <CircleDot size={10} />
                            {info.branch}
                        </div>
                        {info.has_remote && (
                            <Cloud size={14} className={styles.remoteIcon} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
