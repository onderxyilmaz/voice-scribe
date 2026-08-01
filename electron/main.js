const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, clipboard } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const Store = require('./store');
const AudioEngine = require('./audioEngine');
const TextInjector = require('./textInjector');
const windowsActions = require('./windowsActions');

let mainWindow = null;
let hudWindow = null;
let splashWindow = null;
let tray = null;

const store = new Store();
const audioEngine = new AudioEngine(store);

let isRecording = false;

// Configure Auto-Updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function sendUpdateStatus(data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', data);
  }
}

autoUpdater.on('checking-for-update', () => {
  sendUpdateStatus({ status: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  sendUpdateStatus({
    status: 'available',
    version: info.version,
    releaseNotes: info.releaseNotes
  });
});

autoUpdater.on('update-not-available', (info) => {
  sendUpdateStatus({ status: 'latest', version: app.getVersion() });
});

autoUpdater.on('error', (err) => {
  console.log('Update check info:', err ? err.message : '');
  sendUpdateStatus({ status: 'latest', version: app.getVersion() });
});

autoUpdater.on('download-progress', (progressObj) => {
  sendUpdateStatus({
    status: 'downloading',
    percent: Math.round(progressObj.percent || 0),
    bytesPerSecond: progressObj.bytesPerSecond
  });
});

autoUpdater.on('update-downloaded', (info) => {
  sendUpdateStatus({ status: 'downloaded', version: info.version });
});

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 560,
    height: 315,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

function createHUDWindow() {
  hudWindow = new BrowserWindow({
    width: 340,
    height: 72,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    focusable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    hudWindow.loadURL('http://localhost:5173/#hud');
  } else {
    hudWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'hud' });
  }

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  hudWindow.setPosition(Math.round((width - 340) / 2), height - 120);
}

function createDashboardWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  const iconPath = path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: 'VoiceScribe — Windows 11',
    icon: iconPath,
    frame: false,
    transparent: false,
    backgroundColor: '#0b0f19',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/#dashboard');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'dashboard' });
  }

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.destroy();
        splashWindow = null;
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, 1500);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupTray() {
  const trayIconPath = path.join(__dirname, 'tray.png');
  const icon = nativeImage.createFromPath(trayIconPath);

  tray = new Tray(icon);
  tray.setToolTip('VoiceScribe (Ctrl+Space)');

  const contextMenu = Menu.buildFromTemplate([
    { label: '🔴 Kaydı Başlat / Durdur (Ctrl+Space)', click: () => toggleRecording() },
    { label: '🤖 AI Asistanına Sor', click: () => openDashboardWithTab('meeting') },
    { type: 'separator' },
    { label: '⚙️ Ayarlar Dashboard', click: () => createDashboardWindow() },
    { label: '📜 Geçmiş Vault', click: () => openDashboardWithTab('history') },
    { type: 'separator' },
    { label: '❌ Tamamen Çıkış', click: () => quitApplication() }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => createDashboardWindow());
}

function quitApplication() {
  console.log('👋 [SYSTEM SHUTDOWN] VoiceScribe kapatılıyor...');
  globalShortcut.unregisterAll();
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
  if (hudWindow && !hudWindow.isDestroyed()) hudWindow.destroy();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
  app.quit();
  process.exit(0);
}

function openDashboardWithTab(tabName) {
  createDashboardWindow();
  mainWindow.webContents.send('navigate-tab', tabName);
}

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  isRecording = true;
  console.log(`\n🔴 [RECORDING STARTED] VoiceScribe ses kaydı başladı...`);
  if (hudWindow) {
    hudWindow.showInactive();
    hudWindow.webContents.send('recording-state-changed', { status: 'recording' });
  }
}

function stopRecording() {
  isRecording = false;
  console.log(`⏹️  [RECORDING STOPPED] Ses kaydı tamamlandı. Transkripsiyon işleniyor...`);
  if (hudWindow) {
    hudWindow.webContents.send('recording-state-changed', { status: 'processing' });
  }
}

function registerGlobalHotkeys() {
  globalShortcut.unregisterAll();
  const hotkey = store.config.hotkey || 'CommandOrControl+Space';

  try {
    const ret = globalShortcut.register(hotkey, () => {
      console.log(`\n⌨️  [HOTKEY PRESSED] VoiceScribe kısayolu tetiklendi: '${hotkey}'`);
      toggleRecording();
    });
    if (!ret) {
      console.error(`❌ [HOTKEY ERROR] Kısayol kaydı başarısız: ${hotkey}`);
    } else {
      console.log(`🎹 [HOTKEY REGISTERED] VoiceScribe kısayolu dinleniyor: ${hotkey}`);
    }
  } catch (e) {
    console.error('❌ [HOTKEY EXCEPTION]:', e);
  }
}

app.whenReady().then(() => {
  console.log(`\n🚀 [SYSTEM STARTED] VoiceScribe Windows 11 Masaüstü Uygulaması Başlatıldı.`);
  createSplashWindow();
  createHUDWindow();
  setupTray();
  registerGlobalHotkeys();

  createDashboardWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createDashboardWindow();
  });
});

app.on('window-all-closed', () => {
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('pause-hotkey', () => {
  console.log(`⏸️  [HOTKEY PAUSED] VoiceScribe kısayolu donduruldu.`);
  globalShortcut.unregisterAll();
});

ipcMain.on('resume-hotkey', () => {
  console.log(`▶️  [HOTKEY RESUMED] VoiceScribe kısayolu tekrar aktifleştirildi.`);
  registerGlobalHotkeys();
});

ipcMain.on('minimize-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('close-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
});

ipcMain.on('quit-app', () => {
  quitApplication();
});

ipcMain.on('check-for-updates', () => {
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch(() => {
      sendUpdateStatus({ status: 'latest', version: app.getVersion() });
    });
  } else {
    // In development mode, simulate update check
    sendUpdateStatus({ status: 'checking' });
    setTimeout(() => {
      sendUpdateStatus({ status: 'latest', version: app.getVersion() });
    }, 1200);
  }
});

ipcMain.on('download-update', () => {
  if (app.isPackaged) {
    autoUpdater.downloadUpdate();
  }
});

ipcMain.on('quit-and-install', () => {
  if (app.isPackaged) {
    autoUpdater.quitAndInstall();
  }
});

ipcMain.handle('get-config', () => store.config);
ipcMain.handle('save-config', (event, config) => {
  const updated = store.saveConfig(config);
  registerGlobalHotkeys();
  return updated;
});

ipcMain.handle('get-history', () => store.history);
ipcMain.handle('add-history-item', (event, item) => store.addHistoryItem(item));
ipcMain.handle('delete-history-item', (event, id) => store.deleteHistoryItem(id));
ipcMain.handle('clear-history', () => store.clearHistory());
ipcMain.handle('execute-windows-action', (event, action) => windowsActions.executeCommand(action));

ipcMain.on('start-recording', () => startRecording());
ipcMain.on('stop-recording', () => stopRecording());
ipcMain.on('cancel-recording', () => {
  isRecording = false;
  console.log(`🚫 [RECORDING CANCELLED] Kayıt kullanıcı tarafından iptal edildi.`);
  if (hudWindow) hudWindow.hide();
});

ipcMain.on('open-dashboard', () => createDashboardWindow());
ipcMain.on('close-hud', () => {
  if (hudWindow) hudWindow.hide();
});

ipcMain.handle('process-audio-buffer', async (event, arrayBuffer) => {
  try {
    const tempDir = app.getPath('temp');
    const audioPath = path.join(tempDir, `dikte_rec_${Date.now()}.webm`);
    
    fs.writeFileSync(audioPath, Buffer.from(arrayBuffer));

    const hasSpeech = await audioEngine.checkSilence(audioPath);
    if (!hasSpeech) {
      if (hudWindow) hudWindow.hide();
      return { success: false, reason: 'silence' };
    }

    if (hudWindow) {
      hudWindow.webContents.send('recording-state-changed', { status: 'transcribing' });
    }
    const rawText = await audioEngine.transcribe(audioPath);

    if (!rawText || rawText.trim() === '') {
      console.log(`⚠️  [TRANSCRIPTION EMPTY] Konuşma algılanamadı veya metne çevrilemedi.`);
      if (hudWindow) hudWindow.hide();
      return { success: false, reason: 'empty' };
    }

    if (hudWindow) {
      hudWindow.webContents.send('recording-state-changed', { status: 'cleaning' });
    }
    let cleanText = await audioEngine.cleanText(rawText);

    // Check Windows Voice Actions
    const actionResult = windowsActions.processText(cleanText, store.config);
    if (actionResult.handled) {
      console.log(`⚡ [ACTION EXECUTED] Sesli aksiyon çalıştırıldı, metin yapıştırma atlanıyor.`);
      store.addHistoryItem({
        rawText,
        cleanText: `⚡ Aksiyon: "${actionResult.action.trigger}" (${actionResult.action.command})`,
        provider: store.config.sttProvider,
        duration: '00:02'
      });
      if (hudWindow) {
        hudWindow.webContents.send('recording-state-changed', { status: 'success', text: `⚡ Aksiyon: ${actionResult.action.trigger}` });
        setTimeout(() => hudWindow.hide(), 1800);
      }
      try { fs.unlinkSync(audioPath); } catch (e) {}
      return { success: true, actionHandled: true, action: actionResult.action };
    }

    cleanText = audioEngine.applySnippets(cleanText);

    console.log(`📋 [AUTO PASTE] Metin panoya kopyalanıyor ve aktif imleç konumuna yazılıyor...`);
    if (store.config.autoPaste) {
      TextInjector.pasteText(cleanText);
      console.log(`🚀 [SUCCESS] Metin imleç konumuna başarıyla yapıştırıldı: "${cleanText}"`);
    } else {
      clipboard.writeText(cleanText);
      console.log(`📋 [SUCCESS] Metin panoya kopyalandı.`);
    }

    store.addHistoryItem({
      rawText,
      cleanText,
      provider: store.config.sttProvider,
      duration: '00:05'
    });

    if (hudWindow) {
      hudWindow.webContents.send('recording-state-changed', { status: 'success', text: cleanText });
      setTimeout(() => {
        hudWindow.hide();
      }, 1800);
    }

    try { fs.unlinkSync(audioPath); } catch (e) {}

    return { success: true, text: cleanText };

  } catch (e) {
    console.error('❌ [PROCESS ERROR] Ses işleme hatası:', e);
    if (hudWindow) hudWindow.hide();
    return { success: false, error: e.message };
  }
});
