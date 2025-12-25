import type { Window } from '@tauri-apps/api/window';
import type { MenuCategory } from './menuBarTypes';
import { tauriApi } from '../../../lib/tauri-api';

const handleOpenFile = async (openFile: (path: string) => void) => {
    try {
        const filePath = await tauriApi.openFileDialog();
        if (filePath) {
            openFile(filePath);
        }
    } catch (error) {
        console.error('Failed to open file:', error);
    }
};

const handleOpenFolder = async (setWorkspace: (path: string) => void) => {
    try {
        const folderPath = await tauriApi.openFolderDialog();
        if (folderPath) {
            setWorkspace(folderPath);
        }
    } catch (error) {
        console.error('Failed to open folder:', error);
    }
};

<<<<<<< Updated upstream
=======

const handleSave = async (saveFn: () => Promise<void>) => {
    try {
        await saveFn();
    } catch (error) {
        console.error('Failed to save file:', error);
    }
};

const handleSaveAs = async (saveAsFn: () => Promise<void>) => {
    try {
        await saveAsFn();
    } catch (error) {
        console.error('Failed to save file as:', error);
    }
};

const handleNewWindow = async () => {
    try {
        await tauriApi.openNewWindow('', 'default');
    } catch (error) {
        console.error('Failed to open new window:', error);
    }
};

const handleOpenNewFileModal = (openNewFileModalFn: () => void) => {
    openNewFileModalFn();
};


const handleToggleAutoSave = (autoSaveStore: any) => {
    const { isEnabled, setAutoSaveEnabled } = autoSaveStore;
    setAutoSaveEnabled(!isEnabled);
};

const handleSaveAllNow = async (autoSaveStore: any) => {
    try {
        await autoSaveStore.saveAllUnsaved();
    } catch (error) {
        console.error('Failed to save all files:', error);
    }
};

>>>>>>> Stashed changes
export const createMenuStructure = ({
    setWorkspace,
    openFile,
    window,
    handlePaletteOpen,
}: {
    setWorkspace: (path: string) => void;
    openFile: (path: string) => void;
    window: Window;
    handlePaletteOpen: () => void;
}): MenuCategory[] => [
    {
        label: 'File',
        items: [
            { label: 'New File', shortcut: 'Ctrl+N' },
            { label: 'Open File...', shortcut: 'Ctrl+O', action: () => handleOpenFile(openFile) },
            { 
                label: 'Open Folder...', 
                shortcut: 'Ctrl+K Ctrl+O', 
                action: () => handleOpenFolder(setWorkspace) 
            },
            { label: 'Save', shortcut: 'Ctrl+S' },
            { label: 'Save As...', shortcut: 'Ctrl+Shift+S' },
            { label: 'Exit', action: () => window.close() },
        ],
    },
    {
        label: 'Edit',
        items: [
            { label: 'Undo', shortcut: 'Ctrl+Z' },
            { label: 'Redo', shortcut: 'Ctrl+Y' },
            { label: 'Cut', shortcut: 'Ctrl+X' },
            { label: 'Copy', shortcut: 'Ctrl+C' },
            { label: 'Paste', shortcut: 'Ctrl+V' },
            { label: 'Find', shortcut: 'Ctrl+F' },
            { label: 'Replace', shortcut: 'Ctrl+H' },
        ],
    },
    {
        label: 'Selection',
        items: [
            { label: 'Select All', shortcut: 'Ctrl+A' },
            { label: 'Expand Selection', shortcut: 'Shift+Alt+Right' },
            { label: 'Shrink Selection', shortcut: 'Shift+Alt+Left' },
        ],
    },
    {
        label: 'View',
        items: [
            { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: handlePaletteOpen },
            { label: 'Open View...' },
            { label: 'Appearance' },
            { label: 'Editor Layout' },
        ],
    },
    {
        label: 'Go',
        items: [
            { label: 'Go to File...', shortcut: 'Ctrl+P' },
            { label: 'Go to Symbol...', shortcut: 'Ctrl+Shift+O' },
            { label: 'Go to Definition', shortcut: 'F12' },
        ],
    },
    {
        label: 'Run',
        items: [
            { label: 'Start Debugging', shortcut: 'F5' },
            { label: 'Run Without Debugging', shortcut: 'Ctrl+F5' },
        ],
    },
    {
        label: 'Terminal',
        items: [
            { label: 'New Terminal', shortcut: 'Ctrl+Shift+`' },
            { label: 'Run Task...' },
        ],
    },
    {
        label: 'Help',
        items: [{ label: 'Welcome' }, { label: 'Documentation' }, { label: 'About' }],
    },
];
