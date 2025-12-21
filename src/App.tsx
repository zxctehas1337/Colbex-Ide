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
  const [activeActivity, setActiveActivity] = useState<'files' | 'search' | 'git' | 'debug' | 'remote' | 'extensions'>('files');
  const { showTerminal, toggleTerminal, showSidebar } = useUIStore();
  const { activeFile, closeFile } = useProjectStore();
  const { isAssistantOpen, toggleAssistant } = useAIStore();

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
