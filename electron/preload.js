const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Store & Settings
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // History Vault
  getHistory: () => ipcRenderer.invoke('get-history'),
  addHistoryItem: (item) => ipcRenderer.invoke('add-history-item', item),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  
  // Audio & Recording actions
  startRecording: () => ipcRenderer.send('start-recording'),
  stopRecording: () => ipcRenderer.send('stop-recording'),
  cancelRecording: () => ipcRenderer.send('cancel-recording'),
  
  // Global Hotkey pause & resume during editing
  pauseHotkey: () => ipcRenderer.send('pause-hotkey'),
  resumeHotkey: () => ipcRenderer.send('resume-hotkey'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  quitApp: () => ipcRenderer.send('quit-app'),

  // Audio blob send from Renderer to Main for transcription
  sendAudioBuffer: (buffer) => ipcRenderer.invoke('process-audio-buffer', buffer),
  
  // System actions
  openDashboard: () => ipcRenderer.send('open-dashboard'),
  closeHUD: () => ipcRenderer.send('close-hud'),
  
  // Event listeners
  onRecordingStateChanged: (callback) => {
    const handler = (event, state) => callback(state);
    ipcRenderer.on('recording-state-changed', handler);
    return () => ipcRenderer.removeListener('recording-state-changed', handler);
  },

  onHotkeyTriggered: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('hotkey-triggered', handler);
    return () => ipcRenderer.removeListener('hotkey-triggered', handler);
  }
});
