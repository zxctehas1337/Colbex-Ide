import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronDown, ArrowLeft, Plus, History, MoreHorizontal, X, Mic, ArrowRight } from 'lucide-react';
import { useAIStore } from '../../store/aiStore';
import { useProjectStore } from '../../store/projectStore';
<<<<<<< Updated upstream
import { HistoryModal } from './HistoryModal';
=======
import { useAIAssistant } from './hooks/useAIAssistant';
import { ChatView } from './components/ChatView';
import { HomeView } from './components/HomeView';
import { AISettings } from './components/AISettings';
import { getProjectName } from './utils/aiHelpers';
import { ChatService } from './services/ChatService';
import { useAIStore } from '../../store/aiStore';
import { useRef, useEffect } from 'react';
>>>>>>> Stashed changes
import styles from './AIAssistant.module.css';

export const AIAssistant = () => {
<<<<<<< Updated upstream
=======
  
  const aiAssistantData = useAIAssistant();
  
  const aiStore = useAIStore();
  const { currentWorkspace } = useProjectStore();
  const chatServiceRef = useRef<ChatService | null>(null);
  
>>>>>>> Stashed changes
  const {
    conversations,
    activeConversationId,
    activeModelId,
    activeMode,
    availableModels,
    createConversation,
    addMessage,
<<<<<<< Updated upstream
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

=======
    appendMessageContent,
    setIsLoading
  } = aiAssistantData;
  
  const handleStop = () => {
    if (chatServiceRef.current) {
      chatServiceRef.current.abort();
      chatServiceRef.current = null;
    }
    setIsLoading(false);
  };
  
  // Update workspace in chat service when it changes
  useEffect(() => {
    if (chatServiceRef.current && currentWorkspace) {
      chatServiceRef.current.setWorkspace(currentWorkspace);
    }
  }, [currentWorkspace]);
  
  
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    
>>>>>>> Stashed changes
    const content = inputValue.trim();
    setInputValue('');

    let convId = activeConversationId;
<<<<<<< Updated upstream

=======
    let isNewConversation = false;
    
    
>>>>>>> Stashed changes
    if (!convId) {
      convId = createConversation();
      isNewConversation = true;
    } else {
    }
<<<<<<< Updated upstream

=======
    
    
>>>>>>> Stashed changes
    if (convId) {
      const userMsg = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: content,
        timestamp: Date.now()
      };
      addMessage(convId, userMsg);
<<<<<<< Updated upstream

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

=======
      
      // Create empty assistant message
      const assistantMsgId = (Date.now() + 1).toString();
      addMessage(convId, {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      });
      
      // Get the current model
      const currentModel = availableModels.find(m => m.id === activeModelId);
      
      if (currentModel) {
        try {
          // Get conversation history
          const conv = conversations.find(c => c.id === convId);
          let messages = conv?.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })) || [];
          
          // Add current user message if not already included
          if (messages.length === 0 || messages[messages.length - 1].content !== content) {
            messages.push({
              role: 'user',
              content: content
            });
          }
          
          let fullAssistantResponse = '';
          
          // Use ChatService to handle the request
          const chatService = new ChatService();
          chatServiceRef.current = chatService;
          
          // Set workspace for tool execution
          if (currentWorkspace) {
            chatService.setWorkspace(currentWorkspace);
          }
          
          await chatService.sendMessage(
            currentModel,
            messages,
            activeMode,
            (chunk: string) => {
              fullAssistantResponse += chunk;
              appendMessageContent(convId, chunk);
            },
            // Tool execution callback
            (tool: string, isStart: boolean, _result?: string) => {
              if (isStart) {
                console.log(`🔧 Executing tool: ${tool}`);
              } else {
                console.log(`✅ Tool ${tool} completed`);
              }
            }
          );
          
          chatServiceRef.current = null;
          
          // Generate title for conversations with temporary title after getting the response
          const currentConv = conversations.find(c => c.id === convId);
          const shouldGenerateTitle = isNewConversation || (currentConv && currentConv.title === 'New Chat...');
          
          if (shouldGenerateTitle && fullAssistantResponse.trim()) {
            try {
              const generatedTitle = await chatService.generateTitle(
                currentModel,
                content,
                fullAssistantResponse
              );
              // Use aiStore to update conversation title
              aiStore.updateConversationTitle(convId, generatedTitle);
            } catch (titleError) {
              console.error('Error generating title:', titleError);
              // Keep the temporary title if generation fails
            }
          }
        } catch (error) {
          console.error('Error in chat service:', error);
          appendMessageContent(convId, `\n\n[Error: ${error instanceof Error ? error.message : String(error)}]`);
        }
      } else {
        appendMessageContent(convId, 'Error: No model selected');
      }
    }
    
    chatServiceRef.current = null;
    setIsLoading(false);
  };
  
  
>>>>>>> Stashed changes
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Ctrl+A to select all text natively
    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      return; // Let the browser handle select all
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
<<<<<<< Updated upstream

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
=======
  
  const projectName = getProjectName(currentWorkspace);
  if (currentView === 'settings') {
    return <AISettings onBack={() => setCurrentView('home')} onClose={() => setAssistantOpen(false)} styles={styles} />;
  }
  if (currentView === 'chat') {
    return (
      <ChatView
        activeConversation={activeConversation}
        inputValue={inputValue}
        setInputValue={setInputValue}
        activeMode={activeMode}
        activeModelName={activeModelName}
        activeModelId={activeModelId}
        isModelDropdownOpen={isModelDropdownOpen}
        isModeDropdownOpen={isModeDropdownOpen}
        availableModels={availableModels}
        getModelStatus={getModelStatus}
        setModel={setModel}
        setMode={setMode}
        setIsModelDropdownOpen={setIsModelDropdownOpen}
        setIsModeDropdownOpen={setIsModeDropdownOpen}
        setAssistantOpen={setAssistantOpen}
        setActiveConversation={setActiveConversation}
        onSend={handleSend}
        onStop={handleStop}
        onKeyDown={handleKeyDown}
        textareaRef={textareaRef}
        messagesEndRef={messagesEndRef}
        dropdownRef={dropdownRef}
        modeDropdownRef={modeDropdownRef}
        extendedModeDropdownRef={extendedModeDropdownRef}
        isLoading={isLoading}
        styles={styles}
      />
    );
  }
  if (currentView === 'home') {
    return (
      <HomeView
        projectName={projectName}
        conversations={conversations}
        inputValue={inputValue}
        setInputValue={setInputValue}
        activeMode={activeMode}
        activeModelName={activeModelName}
        activeModelId={activeModelId}
        isModelDropdownOpen={isModelDropdownOpen}
        isModeDropdownOpen={isModeDropdownOpen}
        isHistoryModalOpen={isHistoryModalOpen}
        availableModels={availableModels}
        getModelStatus={getModelStatus}
        setModel={setModel}
        setMode={setMode}
        setIsModelDropdownOpen={setIsModelDropdownOpen}
        setIsModeDropdownOpen={setIsModeDropdownOpen}
        setIsHistoryModalOpen={setIsHistoryModalOpen}
        setAssistantOpen={setAssistantOpen}
        setActiveConversation={setActiveConversation}
        setCurrentView={setCurrentView}
        onSend={handleSend}
        onStop={handleStop}
        onKeyDown={handleKeyDown}
        textareaRef={textareaRef}
        dropdownRef={dropdownRef}
        modeDropdownRef={modeDropdownRef}
        extendedModeDropdownRef={extendedModeDropdownRef}
        isLoading={isLoading}
        styles={styles}
      />
    );
  }
  
  return null;
>>>>>>> Stashed changes
};

