import { getIconForFile, getIconForFolder } from 'vscode-icons-js';

console.log('js:', getIconForFile('test.js'));
console.log('tsx:', getIconForFile('test.tsx'));
console.log('folder:', getIconForFolder('src'));
