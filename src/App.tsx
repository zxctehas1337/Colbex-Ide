import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Sidebar } from './components/layout/Sidebar';
import { SearchPane } from './components/layout/Search/SearchPane';
import { GitPane } from './components/layout/Git/GitPane';
import { CodeEditor } from './components/layout/Editor';
import { TerminalPanel } from './components/layout/TerminalPanel';
import { MenuBar } from './components/layout/MenuBar';
import { AIAssistant } from './components/ai';
import { TabBar } from './components/layout/Tabs';
import { StatusBar } from './components/layout/StatusBar';
import { ActivityBar } from './components/layout/ActivityBar';
import { useProjectStore } from './store/projectStore';
import { useAIStore } from './store/aiStore';
import { useUIStore } from './store/uiStore';
import styles from './App.module.css';

function App() {
<<<<<<< Updated upstream
  const [activeActivity, setActiveActivity] = useState<'files' | 'search' | 'git' | 'debug' | 'remote' | 'extensions'>('files');
  const { showTerminal, toggleTerminal, showSidebar } = useUIStore();
  const { activeFile, closeFile } = useProjectStore();
  const { isAssistantOpen, toggleAssistant } = useAIStore();
=======
  const [activeActivity, setActiveActivity] = useState<ActivityId>('files');
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const { showTerminal, openPorts, setTerminalOpen, showSidebar, zoomLevel, zoomIn, zoomOut, resetZoom, aiPanelWidth, setAIPanelWidth } = useUIStore();
  const uiStore = useUIStore();
  const { activeFile, closeFile, openSettingsTab, openProfilesTab, setWorkspace, currentWorkspace, openFileDialog, newFile, newTextFile, newFileWithExtension, createCustomFile } = useProjectStore();
  const { toggleAssistant, isAssistantOpen, initializeAgentRouter, initializeModels, initializeApiKeys } = useAIStore();
  const { selectAll } = useEditorStore();
  const { saveOnFocusLoss, saveAllUnsaved } = useAutoSaveStore();
  const fsRefreshTimerRef = useRef<number | null>(null);
  
  // Initialize resizable panel for AI assistant
  const aiPanel = useResizablePanel({
    defaultWidth: aiPanelWidth,
    minWidth: 300,
    maxWidth: 800,
    direction: 'left',
    onResize: setAIPanelWidth
  });
  
  // Sync store width with hook when it changes
  useEffect(() => {
    if (Math.abs(aiPanel.width - aiPanelWidth) > 1) {
      setAIPanelWidth(aiPanel.width);
    }
  }, [aiPanel.width, aiPanelWidth, setAIPanelWidth]);

  // Helper function to check if editor is focused
  const isEditorFocused = () => {
    return document.activeElement?.closest('.monaco-editor') !== null;
  };
  useEffect(() => {
    document.documentElement.style.fontSize = `${zoomLevel * 100}%`;
  }, [zoomLevel]);

  // Handle initial state from CLI arguments and load last workspace
  useEffect(() => {
    console.log('App useEffect for initialization called');
    const initializeApp = async () => {
      try {
        console.log('App initialization starting...');
        // Initialize AI models
        console.log('About to call initializeModels...');
        await initializeModels();
        console.log('initializeModels completed');
        
        // Initialize API keys from backend
        console.log('About to call initializeApiKeys...');
        await initializeApiKeys();
        console.log('initializeApiKeys completed');
        
        // Initialize AgentRouter if API key is already set
        initializeAgentRouter();
        
        // First try to get initial state from CLI arguments
        const state = await tauriApi.getInitialState();
        if (state.workspace) {
          await setWorkspace(state.workspace);
          return;
        }
        
        // If no workspace from CLI, try to load last workspace
        const workspaceInitialized = await useProjectStore.getState().initWorkspace();
        
        if (!workspaceInitialized) {
          console.log('No previous workspace found');
        }
      } catch (err) {
        console.error('Failed to initialize app:', err);
      }
    };
    
    initializeApp();
  }, [setWorkspace, initializeAgentRouter, initializeModels, initializeApiKeys]);
>>>>>>> Stashed changes

  useEffect(() => {
    const unlisten = listen('select-all', () => {
      console.log('Select all requested');
      // Here you could trigger a select all in the active editor
      // For example: document.execCommand('selectAll');
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+W - Close current tab (KeyW works on all layouts)
      if (event.ctrlKey && event.code === 'KeyW') {
        event.preventDefault();
        if (activeFile) {
          closeFile(activeFile);
        }
      }
      // Ctrl+` - Toggle Terminal (Backquote works on all layouts)
      else if (event.ctrlKey && event.code === 'Backquote') {
        event.preventDefault();
        toggleTerminal();
      }
      // Ctrl+Shift+E - Toggle Explorer (KeyE works on all layouts)
      else if (event.ctrlKey && event.shiftKey && event.code === 'KeyE') {
        event.preventDefault();
        setActiveActivity('files');
      }
      // Ctrl+Shift+F - Toggle Search (KeyF works on all layouts)
      else if (event.ctrlKey && event.shiftKey && event.code === 'KeyF') {
        event.preventDefault();
        setActiveActivity('search');
      }
      // Ctrl+Shift+G - Toggle Git (KeyG works on all layouts)
      else if (event.ctrlKey && event.shiftKey && event.code === 'KeyG') {
        event.preventDefault();
        setActiveActivity('git');
      }
      // Ctrl+, - Open Settings (Comma works on all layouts)
      else if (event.ctrlKey && event.code === 'Comma') {
        event.preventDefault();
        setActiveActivity('extensions');
      }
      // Ctrl+L - Toggle Assistant (KeyL works on all layouts)
      else if (event.ctrlKey && event.code === 'KeyL') {
        event.preventDefault();
        toggleAssistant();
      }
      // Ctrl+P - Command Palette (KeyP works on all layouts)
      // Let MenuBar handle this - prevent default to avoid conflicts
      else if (event.ctrlKey && event.code === 'KeyP') {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, closeFile]);

  return (
    <div className={styles.app}>
      {/* Menu Bar */}
      <MenuBar
        onOpenSettings={() => setActiveActivity('extensions')}
      />

      {/* Main Workspace Area */}
      <div className={styles.main}>
        {/* Activity Bar (Leftmost narrow strip) */}
        <ActivityBar
          activeItem={activeActivity}
          onActivityChange={setActiveActivity}
        />

        {/* Sidebar - logic to show/hide based on activity could go here */}
        {showSidebar && activeActivity === 'files' && <Sidebar />}
        {showSidebar && activeActivity === 'search' && <SearchPane />}
        {showSidebar && activeActivity === 'git' && <GitPane />}

        {/* Main Content Area */}
        <div className={styles.content}>
          <TabBar />
          <CodeEditor />
          {showTerminal && <TerminalPanel />}
        </div>

        {/* AI Assistant Panel */}
        {isAssistantOpen && (
          <div className={styles.aiPanel}>
            <AIAssistant />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}

export default App;
