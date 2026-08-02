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
/** When false, arriving audio buffers are discarded (cancel path). */
let acceptNextAudioBuffer = false;
/** Prevents double-quit and allows clean updater restart (no hard process.exit). */
let isAppQuitting = false;
/** Epoch ms when current dictation recording started (for history duration). */
let recordingStartedAt = null;
/** Prevents concurrent process-audio-buffer handlers from both launching apps. */
let isProcessingAudio = false;
/** Dedupe rapid duplicate voice actions (same command). */
let lastVoiceActionKey = '';
let lastVoiceActionAt = 0;
/** Short recordings prefer voice-action matching over dictation paste. */
const COMMAND_MODE_MAX_SEC = 2.5;

function formatActionHudMessage(action, execResult, deduped) {
  const trigger = action?.trigger || action?.command || 'Aksiyon';
  if (deduped) return `Zaten çalıştı: ${trigger}`;
  if (execResult?.outcome === 'focused' || execResult?.activated) {
    return `${trigger} öne getirildi`;
  }
  if (execResult?.outcome === 'timeout') return `${trigger} gönderildi`;
  if (action?.actionType === 'builtin') return `${trigger} uygulandı`;
  if (action?.actionType === 'url') return `${trigger} açıldı`;
  return `${trigger} açıldı`;
}

function formatActionHistoryText(action, execResult, deduped) {
  const trigger = action?.trigger || '?';
  const command = action?.command || '';
  if (deduped) return `⚡ Aksiyon (tekrar yok sayıldı): "${trigger}"`;
  if (execResult?.outcome === 'focused' || execResult?.activated) {
    return `⚡ Aksiyon (öne getirildi): "${trigger}" (${command})`;
  }
  return `⚡ Aksiyon: "${trigger}" (${command})`;
}

async function runActionWithTimeout(action, timeoutMs = 5000) {
  let timer;
  try {
    return await Promise.race([
      windowsActions.executeCommand(action),
      new Promise((resolve) => {
        timer = setTimeout(() => {
          console.warn(`⏱️  [ACTION TIMEOUT] Aksiyon ${timeoutMs}ms içinde bitmedi — devam ediliyor.`);
          resolve({ success: true, activated: false, outcome: 'timeout' });
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function formatRecordingDuration(totalSeconds) {
  const secs = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function resolveHistoryDuration(meta) {
  if (meta && typeof meta.durationSeconds === 'number' && Number.isFinite(meta.durationSeconds)) {
    return formatRecordingDuration(meta.durationSeconds);
  }
  if (recordingStartedAt) {
    return formatRecordingDuration((Date.now() - recordingStartedAt) / 1000);
  }
  return '00:00';
}


// Configure Auto-Updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function ensureUpdateConfig() {
  // Packaged builds expect resources/app-update.yml. Older --prepackaged
  // builds omitted it; provide a runtime fallback so update checks still work.
  const bundled = path.join(process.resourcesPath || '', 'app-update.yml');
  if (fs.existsSync(bundled)) return;

  try {
    const fallbackDir = app.getPath('userData');
    const fallback = path.join(fallbackDir, 'app-update.yml');
    const contents = [
      'provider: github',
      'owner: onderxyilmaz',
      'repo: voice-scribe',
      'updaterCacheDirName: voicescribe-updater',
      ''
    ].join('\n');
    fs.writeFileSync(fallback, contents, 'utf8');
    autoUpdater.updateConfigPath = fallback;
    console.log('📝 [AUTO-UPDATER] Fallback app-update.yml:', fallback);
  } catch (e) {
    console.error('❌ [AUTO-UPDATER] Could not create fallback app-update.yml:', e.message);
  }
}

try {
  if (app.isPackaged) {
    ensureUpdateConfig();
  }
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'onderxyilmaz',
    repo: 'voice-scribe'
  });
} catch (e) {
  console.log('autoUpdater setFeedURL note:', e.message);
}

function isPortableBuild() {
  // electron-builder portable sets this env var at runtime
  return Boolean(process.env.PORTABLE_EXECUTABLE_DIR);
}

function sendUpdateStatus(data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', data);
  }
}

function runUpdateCheck() {
  if (!app.isPackaged) {
    sendUpdateStatus({
      status: 'error',
      error: 'Geliştirme modunda güncelleme kontrolü yapılamaz. Paketlenmiş NSIS kurulumunu kullanın.'
    });
    return;
  }

  if (isPortableBuild()) {
    sendUpdateStatus({
      status: 'error',
      error: 'Portable sürümde otomatik güncelleme desteklenmiyor. Setup (NSIS) kurulumunu kullanın.'
    });
    return;
  }

  sendUpdateStatus({ status: 'checking' });
  autoUpdater.checkForUpdates().catch((err) => {
    // Do not report "latest" on failure — that masked real errors before.
    // The 'error' event usually fires too; keep a fallback status here.
    console.error('❌ [UPDATE CHECK FAILED]:', err ? err.message : err);
    sendUpdateStatus({
      status: 'error',
      error: err ? err.message : 'Güncelleme kontrolü başarısız'
    });
  });
}

function scheduleStartupUpdateCheck() {
  if (!app.isPackaged || isPortableBuild()) return;

  // Wait until UI can receive status events
  setTimeout(() => {
    console.log('🔄 [AUTO-UPDATER] Başlangıç güncelleme kontrolü...');
    runUpdateCheck();
  }, 8000);
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

autoUpdater.on('update-not-available', () => {
  sendUpdateStatus({ status: 'latest', version: app.getVersion() });
});

autoUpdater.on('error', (err) => {
  console.error('❌ [UPDATE ERROR]:', err ? err.message : '');
  sendUpdateStatus({ status: 'error', error: err ? err.message : 'Güncelleme hatası' });
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
  console.log(`📦 [UPDATE DOWNLOADED] Sürüm v${info.version} indirildi. Uygulama güncelleniyor ve yeniden başlatılıyor...`);
  setTimeout(() => {
    autoUpdater.quitAndInstall(false, true);
  }, 1500);
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

function refreshTrayMenu() {
  if (!tray) return;
  const hotkeyLabel = (store.config.hotkey || 'CommandOrControl+Shift+Space')
    .replace(/CommandOrControl/gi, 'Ctrl')
    .replace(/\+/g, '+');

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: `🔴 Kaydı Başlat / Durdur (${hotkeyLabel})`, click: () => toggleRecording() },
    { label: '🤖 AI Asistanına Sor', click: () => openDashboardWithTab('meeting') },
    { type: 'separator' },
    { label: '⚙️ Ayarlar Dashboard', click: () => createDashboardWindow() },
    { label: '📜 Geçmiş Vault', click: () => openDashboardWithTab('history') },
    { type: 'separator' },
    { label: '❌ Tamamen Çıkış', click: () => quitApplication() }
  ]));
}

function setupTray() {
  const trayIconPath = path.join(__dirname, 'tray.png');
  const icon = nativeImage.createFromPath(trayIconPath);

  tray = new Tray(icon);
  tray.setToolTip('VoiceScribe');
  refreshTrayMenu();
  tray.on('double-click', () => createDashboardWindow());
}

function quitApplication() {
  if (isAppQuitting) return;
  isAppQuitting = true;

  console.log('👋 [SYSTEM SHUTDOWN] VoiceScribe kapatılıyor...');
  globalShortcut.unregisterAll();

  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
  if (hudWindow && !hudWindow.isDestroyed()) hudWindow.destroy();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();

  // Do not call process.exit() — it aborts Electron's graceful shutdown and can
  // break autoUpdater.quitAndInstall() / Squirrel restart on Windows.
  app.quit();
}

function openDashboardWithTab(tabName) {
  createDashboardWindow();
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const sendNav = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('navigate-tab', tabName);
    }
  };

  // Avoid racing the renderer before it mounts the navigate listener
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', sendNav);
  } else {
    setImmediate(sendNav);
  }
}

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  if (isProcessingAudio) {
    console.log('⏳ [BUSY] Önceki dikte/aksiyon bitmeden yeni kayıt başlamadı.');
    if (hudWindow && !hudWindow.isDestroyed()) {
      hudWindow.showInactive();
      hudWindow.webContents.send('recording-state-changed', {
        status: 'busy',
        text: 'Önceki işlem bitiyor…'
      });
      setTimeout(() => {
        if (hudWindow && !hudWindow.isDestroyed() && !isRecording && !isProcessingAudio) {
          hudWindow.hide();
        }
      }, 1600);
    }
    return;
  }

  isRecording = true;
  acceptNextAudioBuffer = true;
  recordingStartedAt = Date.now();
  console.log(`\n🔴 [RECORDING STARTED] VoiceScribe ses kaydı başladı...`);
  if (hudWindow) {
    hudWindow.showInactive();
    hudWindow.webContents.send('recording-state-changed', { status: 'recording' });
  }
}

function stopRecording() {
  isRecording = false;
  // Keep acceptNextAudioBuffer=true so the HUD can still submit the finished clip.
  console.log(`⏹️  [RECORDING STOPPED] Ses kaydı tamamlandı. Transkripsiyon işleniyor...`);
  if (hudWindow) {
    hudWindow.webContents.send('recording-state-changed', { status: 'processing' });
  }
}

function registerGlobalHotkeys() {
  globalShortcut.unregisterAll();
  const hotkey = store.config.hotkey || 'CommandOrControl+Shift+Space';
  const status = { ok: false, hotkey, error: null };

  try {
    const ret = globalShortcut.register(hotkey, () => {
      console.log(`\n⌨️  [HOTKEY PRESSED] VoiceScribe kısayolu tetiklendi: '${hotkey}'`);
      toggleRecording();
    });
    if (!ret) {
      status.error = `Kısayol kaydı başarısız: ${hotkey}. Başka bir uygulama bu kombinasyonu kullanıyor olabilir (ör. Ctrl+Space → IME). Farklı bir kısayol seçin.`;
      console.error(`❌ [HOTKEY ERROR] ${status.error}`);
    } else {
      status.ok = true;
      console.log(`🎹 [HOTKEY REGISTERED] VoiceScribe kısayolu dinleniyor: ${hotkey}`);
      if (hotkey === 'CommandOrControl+Space' || hotkey === 'Ctrl+Space') {
        status.warning = 'Ctrl+Space bazı sistemlerde yazım dili (IME) ile çakışabilir. Sorun yaşarsan Ctrl+Shift+Space dene.';
      }
    }
  } catch (e) {
    status.error = e.message || 'Kısayol kaydı sırasında hata oluştu.';
    console.error('❌ [HOTKEY EXCEPTION]:', e);
  }

  refreshTrayMenu();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('hotkey-status', status);
  }
  return status;
}

app.whenReady().then(() => {
  console.log(`\n🚀 [SYSTEM STARTED] VoiceScribe Windows 11 Masaüstü Uygulaması Başlatıldı.`);
  store.unlockSecrets();
  createSplashWindow();
  createHUDWindow();
  setupTray();
  registerGlobalHotkeys();

  createDashboardWindow();
  scheduleStartupUpdateCheck();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createDashboardWindow();
  });
});

app.on('window-all-closed', () => {
  // Keep running in the tray unless the user chose full quit.
});

app.on('before-quit', () => {
  isAppQuitting = true;
  globalShortcut.unregisterAll();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('pause-hotkey', () => {
  console.log(`⏸️  [HOTKEY PAUSED] VoiceScribe kısayolu donduruldu.`);
  globalShortcut.unregisterAll();
});

ipcMain.handle('resume-hotkey', () => {
  console.log(`▶️  [HOTKEY RESUMED] VoiceScribe kısayolu tekrar aktifleştirildi.`);
  return registerGlobalHotkeys();
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
  runUpdateCheck();
});

ipcMain.on('download-update', () => {
  if (!app.isPackaged) {
    sendUpdateStatus({
      status: 'error',
      error: 'Geliştirme modunda güncelleme indirilemez.'
    });
    return;
  }
  if (isPortableBuild()) {
    sendUpdateStatus({
      status: 'error',
      error: 'Portable sürümde otomatik güncelleme desteklenmiyor. Setup (NSIS) kurulumunu kullanın.'
    });
    return;
  }

  console.log('📥 [AUTO-UPDATER] Güncelleme indirmesi başlatıldı...');
  autoUpdater.downloadUpdate().catch((err) => {
    console.error('❌ [DOWNLOAD ERROR]:', err);
    sendUpdateStatus({ status: 'error', error: err ? err.message : 'İndirme hatası' });
  });
});

ipcMain.on('quit-and-install', () => {
  if (app.isPackaged && !isPortableBuild()) {
    autoUpdater.quitAndInstall(false, true);
  }
});

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-config', () => store.config);
ipcMain.handle('save-config', (event, config) => {
  const updated = store.saveConfig(config);
  const hotkeyStatus = registerGlobalHotkeys();
  return { config: updated, hotkeyStatus };
});

ipcMain.handle('get-history', () => store.history);
ipcMain.handle('add-history-item', (event, item) => store.addHistoryItem(item));
ipcMain.handle('delete-history-item', (event, id) => store.deleteHistoryItem(id));
ipcMain.handle('clear-history', () => store.clearHistory());
ipcMain.handle('execute-windows-action', (event, action) => windowsActions.executeCommand(action));

ipcMain.handle('ask-ai', async (event, prompt) => {
  const text = String(prompt || '').trim();
  if (!text) return { success: false, error: 'Komut boş olamaz.' };

  const result = await audioEngine.chatCompletion(
    `Sen VoiceScribe masaüstü asistanısın. Kullanıcı Türkçe konuşur.
İsteklerine göre e-posta taslağı, özet, madde listesi veya kısa yanıt üret.
Net, kullanıma hazır metin yaz. Gereksiz giriş/çıkış cümleleri ekleme.`,
    text,
    { temperature: 0.5 }
  );

  if (result.success && result.text) {
    clipboard.writeText(result.text);
  }
  return result;
});

ipcMain.handle('process-meeting-audio', async (event, arrayBuffer, meta = {}) => {
  try {
    if (!arrayBuffer) return { success: false, error: 'Ses verisi yok.' };

    const tempDir = app.getPath('temp');
    const audioPath = path.join(tempDir, `meeting_rec_${Date.now()}.webm`);
    fs.writeFileSync(audioPath, Buffer.from(arrayBuffer));

    console.log(`🎙️  [MEETING] Transkripsiyon başlıyor (${meta.durationSeconds || '?'} sn)...`);
    const transcript = await audioEngine.transcribe(audioPath);
    try { fs.unlinkSync(audioPath); } catch (e) {}

    if (!transcript || !String(transcript).trim()) {
      return { success: false, error: 'Toplantı sesinden metin çıkarılamadı.' };
    }

    const cleaned = await audioEngine.cleanText(transcript);
    const transcriptText = cleaned || transcript;

    let summary = '';
    const summaryResult = await audioEngine.chatCompletion(
      `Sen bir toplantı asistanısın. Verilen transkripti Türkçe özetle.
Çıktı yapısı:
1) Kısa özet (3-5 cümle)
2) Madde madde kararlar / eylemler
3) Varsa açık sorular
Transkript yokmuş gibi uydurma.`,
      transcriptText,
      { temperature: 0.3 }
    );

    if (summaryResult.success) {
      summary = summaryResult.text;
    } else {
      summary = `Özet üretilemedi: ${summaryResult.error || 'Bilinmeyen hata'}\n\n(Transkripsiyon yine de aşağıda.)`;
    }

    store.addHistoryItem({
      rawText: transcript,
      cleanText: summary ? `📋 Toplantı özeti\n\n${summary}` : transcriptText,
      provider: store.config.sttProvider,
      duration: typeof meta.durationSeconds === 'number'
        ? `${String(Math.floor(meta.durationSeconds / 60)).padStart(2, '0')}:${String(Math.round(meta.durationSeconds % 60)).padStart(2, '0')}`
        : '00:00'
    });

    return {
      success: true,
      transcript: transcriptText,
      summary,
      summaryError: summaryResult.success ? null : summaryResult.error
    };
  } catch (e) {
    console.error('❌ [MEETING ERROR]', e);
    return { success: false, error: e.message };
  }
});

ipcMain.on('start-recording', () => startRecording());
ipcMain.on('stop-recording', () => stopRecording());
ipcMain.on('cancel-recording', () => {
  // Only abort an in-progress capture. If STT/action is already running,
  // just hide the HUD — cancelling mid-process caused confusing "busy" discards.
  if (isProcessingAudio) {
    console.log('ℹ️  [HUD HIDDEN] İşlem sürerken iptal: yalnızca arayüz gizlendi, işlem devam ediyor.');
    if (hudWindow) hudWindow.hide();
    return;
  }
  isRecording = false;
  acceptNextAudioBuffer = false;
  recordingStartedAt = null;
  console.log(`🚫 [RECORDING CANCELLED] Kayıt kullanıcı tarafından iptal edildi.`);
  if (hudWindow) hudWindow.hide();
});

ipcMain.on('open-dashboard', () => createDashboardWindow());
ipcMain.on('close-hud', () => {
  if (hudWindow) hudWindow.hide();
});

ipcMain.handle('process-audio-buffer', async (event, arrayBuffer, meta = {}) => {
  try {
    if (!acceptNextAudioBuffer) {
      console.log('🚫 [AUDIO DISCARDED] İptal edilmiş veya beklenmeyen ses tamponu yok sayıldı.');
      return { success: false, reason: 'cancelled' };
    }
    if (isProcessingAudio) {
      console.log('🚫 [AUDIO DISCARDED] Önceki ses hâlâ işleniyor — çift tetikleme engellendi.');
      if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.webContents.send('recording-state-changed', {
          status: 'busy',
          text: 'Önceki işlem bitiyor…'
        });
      }
      return { success: false, reason: 'busy' };
    }
    acceptNextAudioBuffer = false;
    isProcessingAudio = true;
    const historyDuration = resolveHistoryDuration(meta);
    recordingStartedAt = null;
    const durationSec = Number(meta?.durationSeconds);
    const isCommandMode =
      Number.isFinite(durationSec) && durationSec > 0 && durationSec <= COMMAND_MODE_MAX_SEC;

    const tempDir = app.getPath('temp');
    const audioPath = path.join(tempDir, `dikte_rec_${Date.now()}.webm`);
    
    fs.writeFileSync(audioPath, Buffer.from(arrayBuffer));

    const hasSpeech = await audioEngine.checkSilence(audioPath);
    if (!hasSpeech) {
      if (hudWindow) hudWindow.hide();
      return { success: false, reason: 'silence' };
    }

    if (hudWindow) {
      hudWindow.webContents.send('recording-state-changed', {
        status: 'transcribing',
        text: isCommandMode ? 'Komut dinleniyor…' : undefined
      });
    }
    const rawText = audioEngine.sanitizeTranscript(await audioEngine.transcribe(audioPath));

    if (!rawText || rawText.trim() === '') {
      console.log(`⚠️  [TRANSCRIPTION EMPTY] Konuşma algılanamadı veya metne çevrilemedi.`);
      if (hudWindow) hudWindow.hide();
      return { success: false, reason: 'empty' };
    }

    if (isCommandMode) {
      console.log(`🎯 [COMMAND MODE] Kısa kayıt (${durationSec.toFixed(1)}s) — aksiyon öncelikli.`);
    }

    const finishAction = async (actionResult) => {
      const actionKey = `${actionResult.action?.actionType || ''}:${actionResult.action?.command || ''}`;
      const now = Date.now();
      const deduped = Boolean(actionKey && actionKey === lastVoiceActionKey && (now - lastVoiceActionAt) < 2500);
      let execResult = { success: true, outcome: 'deduped' };

      if (deduped) {
        console.log(`⏭️  [ACTION DEDUPED] Aynı aksiyon 2.5 sn içinde tekrarlandı: ${actionKey}`);
      } else {
        lastVoiceActionKey = actionKey;
        lastVoiceActionAt = now;
        execResult = await runActionWithTimeout(actionResult.action);
        console.log(`⚡ [ACTION EXECUTED] Sesli aksiyon tamamlandı.`);
      }

      const hudText = formatActionHudMessage(actionResult.action, execResult, deduped);
      store.addHistoryItem({
        rawText,
        cleanText: formatActionHistoryText(actionResult.action, execResult, deduped),
        provider: store.config.sttProvider,
        duration: historyDuration,
        mode: 'action'
      });
      if (hudWindow) {
        hudWindow.webContents.send('recording-state-changed', { status: 'success', text: hudText });
        setTimeout(() => hudWindow.hide(), 1800);
      }
      try { fs.unlinkSync(audioPath); } catch (e) {}
      return { success: true, actionHandled: true, action: actionResult.action, outcome: execResult.outcome };
    };

    // Prefer action match on raw/vocab text before slow AI cleanup
    const vocabText = audioEngine.applyVocabulary(rawText);
    let actionResult = windowsActions.processText([vocabText, rawText], store.config);
    if (actionResult.handled) {
      return await finishAction(actionResult);
    }

    // Short command clips: do not paste near-miss STT as dictation
    if (isCommandMode) {
      console.log(`🎯 [COMMAND MODE] Aksiyon eşleşmedi — yapıştırma atlandı: "${rawText}"`);
      store.addHistoryItem({
        rawText,
        cleanText: `🎯 Komut eşleşmedi: "${rawText}"`,
        provider: store.config.sttProvider,
        duration: historyDuration,
        mode: 'command_miss'
      });
      if (hudWindow) {
        hudWindow.webContents.send('recording-state-changed', {
          status: 'error',
          text: 'Komut eşleşmedi'
        });
        setTimeout(() => hudWindow.hide(), 1800);
      }
      try { fs.unlinkSync(audioPath); } catch (e) {}
      return { success: false, reason: 'command_miss', text: rawText };
    }

    if (hudWindow) {
      hudWindow.webContents.send('recording-state-changed', { status: 'cleaning' });
    }
    let cleanText = await audioEngine.cleanText(rawText);

    // Second chance: cleanup may repair a near-miss transcription
    actionResult = windowsActions.processText(cleanText, store.config);
    if (actionResult.handled) {
      return await finishAction(actionResult);
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
      duration: historyDuration,
      mode: 'dictation'
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
  } finally {
    isProcessingAudio = false;
  }
});
