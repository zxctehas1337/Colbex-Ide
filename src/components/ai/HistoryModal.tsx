import { useState, useRef, useEffect } from 'react';
import { useAIStore } from '../../store/aiStore';
import { Trash2 } from 'lucide-react';
import styles from './HistoryModal.module.css';

// Helper for relative time since I can't guarantee date-fns is installed
const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days} days ago`;
    if (hours > 0) return `${hours} hrs ago`;
    return 'Just now';
};

interface HistoryModalProps {
    onClose: () => void;
}

export const HistoryModal = ({ onClose }: HistoryModalProps) => {
    const { conversations, setActiveConversation, deleteConversation } = useAIStore();
    const [search, setSearch] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);

    // Filter conversations
    const filtered = conversations.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase())
    );

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleSelect = (id: string) => {
        setActiveConversation(id);
        onClose();
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteConversation(id);
    };

    return (
        <div className={styles.modalOverlay}>
            <div ref={modalRef} className={styles.modalContent}>
                <input
                    type="text"
                    placeholder="Select a conversation..."
                    className={styles.searchInput}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                />

                <div className={styles.listContainer}>
                    {filtered.length > 0 ? (
                        <>
                            <div className={styles.groupHeader}>Recent Conversations</div>
                            {filtered.map((conv) => (
                                <div
                                    key={conv.id}
                                    className={styles.item}
                                    onClick={() => handleSelect(conv.id)}
                                >
                                    <div className={styles.itemTitle}>
                                        <div className={styles.itemTitleText}>{conv.title}</div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className={styles.itemTime}>{getRelativeTime(conv.timestamp)}</span>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={(e) => handleDelete(e, conv.id)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="p-4 text-center text-[#808080] text-sm">
                            No conversations found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
