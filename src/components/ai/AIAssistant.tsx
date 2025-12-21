import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronDown, ArrowLeft, Plus, History, MoreHorizontal, X, Mic, ArrowRight } from 'lucide-react';
import { useAIStore } from '../../store/aiStore';
import { useProjectStore } from '../../store/projectStore';
import { HistoryModal } from './HistoryModal';
import styles from './AIAssistant.module.css';

export const AIAssistant = () => {
  const {
    conversations,
    activeConversationId,
    activeModelId,
    activeMode,
    availableModels,
    createConversation,
    addMessage,
    setActiveConversation,
    setMode,
    setAssistantOpen,
    setModel
  } = useAIStore();
  const { currentWorkspace } = useProjectStore();

  const getProjectName = () => {
    if (!currentWorkspace) return 'Colbex';
    const name = currentWorkspace.replace(/[/\\]$/, '').split(/[/\\]/).pop() || 'Colbex';

    return name.split(/[-_]/)
      .map(part => {
        const clean = part.replace(/\s/g, '');
        if (!clean) return '';
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      })
      .join('') || 'Colbex';
  };

  const [inputValue, setInputValue] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const extendedModeDropdownRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;

      if (textarea.scrollHeight > 200) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  };

  useLayoutEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);


  useEffect(() => {
    if (activeConversationId) {
      scrollToBottom();
    }
  }, [activeConversationId, activeConversation?.messages]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle model dropdown
      if (isModelDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }

      // Handle mode dropdown
      if (isModeDropdownOpen) {
        const target = event.target as Node;
        const isClickInsideModeButton = modeDropdownRef.current?.contains(target);
        const isClickInsideModeDropdown = extendedModeDropdownRef.current?.contains(target);

        if (!isClickInsideModeButton && !isClickInsideModeDropdown) {
          setIsModeDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModelDropdownOpen, isModeDropdownOpen]);

  // Add keyboard navigation for dropdowns
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModelDropdownOpen(false);
        setIsModeDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const content = inputValue.trim();
    setInputValue('');

    let convId = activeConversationId;

    if (!convId) {
      convId = createConversation(content);
    }

    if (convId) {
      const userMsg = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: content,
        timestamp: Date.now()
      };
      addMessage(convId, userMsg);

      // Simulate AI Response
      setTimeout(() => {
        addMessage(convId!, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `[${activeModelId} / ${activeMode}] This is a simulated response. In a real app, this would call the API.`,
          timestamp: Date.now()
        });
      }, 1000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const goBack = () => {
    setActiveConversation(null);
  };

  const activeModelName = availableModels.find(m => m.id === activeModelId)?.name || 'Select Model';

  const renderInputArea = (variant: 'home' | 'chat') => (
    <div className={variant === 'home' ? styles.homeInputContainer : styles.chatInputContainer}>
      <div className={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={variant === 'home' ? "Ask anything (Ctrl+L), @ to mention, / for workflows" : "Ask a question..."}
          className={styles.textArea}
          rows={1}
        />

        <div className={styles.inputFooter}>
          <div className={styles.inputTools}>
            <button className={styles.toolBtn} title="Add attachment">
              <Plus size={16} />
            </button>

            <div ref={modeDropdownRef} className={styles.modelSelectorWrapper}>
              <button
                className={`${styles.modelTag} ${isModeDropdownOpen ? styles.active : ''}`}
                onClick={() => {
                  if (isModeDropdownOpen) {
                    setIsModeDropdownOpen(false);
                  } else {
                    setIsModelDropdownOpen(false);
                    setIsModeDropdownOpen(true);
                  }
                }}
                title="Select Mode"
              >
                <ChevronDown size={14} />
                <span>{activeMode === 'ask' ? 'Ask' : 'Agent'}</span>
              </button>
            </div>

            <div ref={dropdownRef} className={styles.modelSelectorWrapper}>
              <button
                className={`${styles.modelTag} ${isModelDropdownOpen ? styles.active : ''}`}
                onClick={() => {
                  if (isModelDropdownOpen) {
                    setIsModelDropdownOpen(false);
                  } else {
                    setIsModeDropdownOpen(false);
                    setIsModelDropdownOpen(true);
                  }
                }}
              >
                <ChevronDown size={14} />
                <span>{activeModelName}</span>
              </button>

              {isModelDropdownOpen && (
                <div className={`${styles.dropdownMenu} ${styles.modelDropdownMenu} ${styles.show}`}>
                  {availableModels.map(model => (
                    <div
                      key={model.id}
                      className={`${styles.dropdownItem} ${activeModelId === model.id ? styles.dropdownItemActive : ''}`}
                      onClick={() => {
                        setModel(model.id);
                        setIsModelDropdownOpen(false);
                      }}
                    >
                      {model.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.inputActions}>
            <button className={styles.iconBtn}>
              <Mic size={18} />
            </button>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className={styles.sendIconBtn}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Mode selection dropdown - positioned at inputWrapper level */}
        <div className={styles.modelSelectorWrapper} style={{ position: 'static' }}>
          {isModeDropdownOpen && (
            <div ref={extendedModeDropdownRef} className={`${styles.dropdownMenu} ${styles.modeDropdownMenu} ${styles.show}`}>
              <div className={styles.dropdownHeader}>Conversation mode</div>
              {[
                {
                  mode: 'ask',
                  title: 'Ask',
                  description: 'Get quick answers and assistance. Use for simple questions, explanations, or when you need direct help.'
                },
                {
                  mode: 'agent',
                  title: 'Agent',
                  description: 'AI can take actions and execute tasks. Use for coding, file operations, or complex workflows.'
                }
              ].map(({ mode, title, description }) => (
                <div
                  key={mode}
                  className={`${styles.modeItem} ${activeMode === mode ? styles.modeItemActive : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMode(mode as 'ask' | 'agent');
                    setIsModeDropdownOpen(false);
                  }}
                >
                  <div className={styles.modeTitle}>{title}</div>
                  <div className={styles.modeDescription}>{description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (activeConversationId && activeConversation) {
    return (
      <div className={styles.container}>
        <div className={styles.chatHeader}>
          <button onClick={goBack} className={styles.backBtn}>
            <ArrowLeft size={16} />
          </button>
          <span className={styles.chatTitle}>{activeConversation.title}</span>
          <div className="hidden sm:block text-xs text-[#6e6e6e]">{activeModelName}</div>
          <button onClick={() => setAssistantOpen(false)} className={styles.closeBtn} title="Close Chat">
            <X size={16} />
          </button>
        </div>

        <div className={styles.chatMessages}>
          {activeConversation.messages.map(msg => (
            <div key={msg.id} className={msg.role === 'user' ? styles.userMessageWrapper : styles.aiMessageWrapper}>
              {msg.role === 'user' ? (
                <div className={styles.userBubble}>
                  <p>{msg.content}</p>
                </div>
              ) : (
                <div className={styles.aiContent}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {renderInputArea('chat')}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>{activeConversation?.title || 'Agent'}</div>
        <div className={styles.headerIcons}>
          <button onClick={() => setActiveConversation(null)} title="New Chat">
            <Plus size={18} />
          </button>
          <button onClick={() => setIsHistoryModalOpen(true)} title="History">
            <History size={18} />
          </button>
          <button title="More">
            <MoreHorizontal size={18} />
          </button>
          <button onClick={() => setAssistantOpen(false)} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.brandTitle}>{getProjectName()}</div>
        {renderInputArea('home')}
      </div>

      <div className={styles.historyContainer}>
        {conversations.length > 0 && (
          <>
            <div className={styles.historyList}>
              {conversations.slice(0, 3).map(conv => (
                <div
                  key={conv.id}
                  className={styles.historyItem}
                  onClick={() => setActiveConversation(conv.id)}
                >
                  <span className={styles.historyTitle}>{conv.title}</span>
                  <span className={styles.historyTime}>
                    {(() => {
                      const diff = Date.now() - conv.timestamp;
                      const secs = Math.floor(diff / 1000);
                      if (secs < 60) return `${secs}s`;
                      const mins = Math.floor(secs / 60);
                      if (mins < 60) return `${mins}m`;
                      const hours = Math.floor(mins / 60);
                      if (hours < 24) return `${hours}h`;
                      return `${Math.floor(hours / 24)}d`;
                    })()}
                  </span>
                </div>
              ))}
            </div>
            <button
              className={styles.seeAllBtn}
              onClick={() => setIsHistoryModalOpen(true)}
            >
              See all
            </button>
          </>
        )}
      </div>

      {isHistoryModalOpen && (
        <HistoryModal onClose={() => setIsHistoryModalOpen(false)} />
      )}
    </div>
  );
};

