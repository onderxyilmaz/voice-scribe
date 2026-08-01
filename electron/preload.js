const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  getHistory: () => ipcRenderer.invoke('get-history'),
  addHistoryItem: (item) => ipcRenderer.invoke('add-history-item', item),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  startRecording: () => ipcRenderer.send('start-recording'),
  stopRecording: () => ipcRenderer.send('stop-recording'),
  cancelRecording: () => ipcRenderer.send('cancel-recording'),

  pauseHotkey: () => ipcRenderer.send('pause-hotkey'),
  resumeHotkey: () => ipcRenderer.send('resume-hotkey'),

  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  quitApp: () => ipcRenderer.send('quit-app'),
  openDashboard: () => ipcRenderer.send('open-dashboard'),
  closeHUD: () => ipcRenderer.send('close-hud'),

  sendAudioBuffer: (buffer) => ipcRenderer.invoke('process-audio-buffer', buffer),

  // Auto-Updater API
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  quitAndInstall: () => ipcRenderer.send('quit-and-install'),
  onUpdateStatus: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },

  onRecordingStateChanged: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('recording-state-changed', handler);
    return () => ipcRenderer.removeListener('recording-state-changed', handler);
  },

  onNavigateTab: (callback) => {
    const handler = (event, tab) => callback(tab);
    ipcRenderer.on('navigate-tab', handler);
    return () => ipcRenderer.removeListener('navigate-tab', handler);
  }
});
