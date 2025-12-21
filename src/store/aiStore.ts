import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIModel = {
    id: string;
    name: string;
    provider: 'openai' | 'anthropic' | 'gemini' | 'ollama';
};

export type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
};

export type Conversation = {
    id: string;
    title: string;
    timestamp: number;
    messages: Message[];
    modelId: string;
    mode: 'ask' | 'agent';
};

interface AIState {
    conversations: Conversation[];
    activeConversationId: string | null;
    availableModels: AIModel[];
    activeModelId: string;
    activeMode: 'ask' | 'agent';

    isAssistantOpen: boolean;
    // Actions
    addMessage: (conversationId: string, message: Message) => void;
    createConversation: (prompt: string) => string;
    setActiveConversation: (id: string | null) => void;
    setMode: (mode: 'ask' | 'agent') => void;
    setModel: (modelId: string) => void;
    deleteConversation: (id: string) => void;
    updateConversationTitle: (id: string, title: string) => void;
    toggleAssistant: () => void;
    setAssistantOpen: (open: boolean) => void;
}

export const useAIStore = create<AIState>()(
    persist(
        (set, get) => ({
            conversations: [],
            activeConversationId: null,
            availableModels: [
                { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
                { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
                { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini' },
            ],
            activeModelId: 'gpt-4o',
            activeMode: 'ask',
            isAssistantOpen: false,

            toggleAssistant: () => set((state) => ({ isAssistantOpen: !state.isAssistantOpen })),
            setAssistantOpen: (open) => set({ isAssistantOpen: open }),

            addMessage: (conversationId, message) => {
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c.id === conversationId
                            ? { ...c, messages: [...c.messages, message] }
                            : c
                    ),
                }));
            },

            createConversation: (prompt) => {
                const id = crypto.randomUUID();
                const newConv: Conversation = {
                    id,
                    title: prompt.slice(0, 30) + (prompt.length > 30 ? '...' : ''),
                    timestamp: Date.now(),
                    messages: [],
                    modelId: get().activeModelId,
                    mode: get().activeMode,
                };
                set((state) => ({
                    conversations: [newConv, ...state.conversations],
                    activeConversationId: id,
                }));
                return id;
            },

            setActiveConversation: (id) => set({ activeConversationId: id }),
            setMode: (mode) => set({ activeMode: mode }),
            setModel: (modelId) => set({ activeModelId: modelId }),

            deleteConversation: (id) => set((state) => ({
                conversations: state.conversations.filter((c) => c.id !== id),
                activeConversationId: state.activeConversationId === id ? null : state.activeConversationId
            })),

            updateConversationTitle: (id, title) => set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === id ? { ...c, title } : c
                ),
            })),
        }),
        {
            name: 'ai-storage', // unique name for localStorage
        }
    )
);
