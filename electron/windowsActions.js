const { execFile, spawn } = require('child_process');
const { shell } = require('electron');
const path = require('path');
const fs = require('fs');

const BUILTIN_HANDLERS = {
  volume_down: {
    file: 'powershell.exe',
    args: ['-NoProfile', '-NonInteractive', '-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]174)']
  },
  volume_up: {
    file: 'powershell.exe',
    args: ['-NoProfile', '-NonInteractive', '-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]175)']
  },
  volume_mute: {
    file: 'powershell.exe',
    args: ['-NoProfile', '-NonInteractive', '-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]173)']
  },
  lock_workstation: {
    file: 'rundll32.exe',
    args: ['user32.dll,LockWorkStation']
  }
};

/** Exact legacy command strings mapped to builtins (saved configs). */
const LEGACY_COMMAND_TO_BUILTIN = {
  '(new-object -com wscript.shell).SendKeys([char]174)': 'volume_down',
  '(new-object -com wscript.shell).SendKeys([char]175)': 'volume_up',
  '(new-object -com wscript.shell).SendKeys([char]173)': 'volume_mute',
  'rundll32.exe user32.dll,LockWorkStation': 'lock_workstation'
};

/** Reserved for future single-instance packaged apps (Notepad is multi-instance). */
const PACKAGED_AUMIDS = {};
const DEFAULT_ALIASES = {
  'not defteri': [
    'not defterim',
    'not defter',
    'notepad',
    'not defterini',
    'not deftere',
    'defteri aç',
    'defteri ac',
    'defter aç',
    'not defteri aç'
  ],
  'hesap makinesi': ['hesap makinası', 'hesap makinasini', 'hesap makinesini', 'calculator'],
  'tarayıcıyı aç': ['tarayiciyi ac', 'tarayıcı aç', 'browser aç', 'google aç'],
  'ekran görüntüsü al': ['ekran goruntusu al', 'ekran görüntüsü', 'screenshot'],
  'görev yöneticisi': ['gorev yoneticisi', 'task manager', 'görev yöneticisini aç'],
  'sesi kıs': ['sesi kis', 'ses kıs', 'sesini kıs'],
  'sesi aç': ['sesi ac', 'ses aç', 'sesini aç'],
  'sessize al': ['sesi kapat', 'mute', 'sessiz'],
  'bilgisayarı kilitle': ['bilgisayari kilitle', 'kilitle', 'lock']
};

class WindowsActionsEngine {
  constructor() {
    this.defaultActions = [
      {
        id: 'action-calc',
        trigger: 'hesap makinesi',
        aliases: DEFAULT_ALIASES['hesap makinesi'],
        categories: ['Uygulama', 'Araçlar'],
        actionType: 'app',
        command: 'calc.exe',
        enabled: true
      },
      {
        id: 'action-notepad',
        trigger: 'not defteri',
        aliases: DEFAULT_ALIASES['not defteri'],
        categories: ['Uygulama', 'Metin'],
        actionType: 'app',
        command: 'notepad.exe',
        enabled: true
      },
      {
        id: 'action-browser',
        trigger: 'tarayıcıyı aç',
        aliases: DEFAULT_ALIASES['tarayıcıyı aç'],
        categories: ['Uygulama', 'İnternet'],
        actionType: 'url',
        command: 'https://www.google.com',
        enabled: true
      },
      {
        id: 'action-snip',
        trigger: 'ekran görüntüsü al',
        aliases: DEFAULT_ALIASES['ekran görüntüsü al'],
        categories: ['Sistem', 'Ekran'],
        actionType: 'app',
        command: 'snippingtool.exe',
        enabled: true
      },
      {
        id: 'action-taskmgr',
        trigger: 'görev yöneticisi',
        aliases: DEFAULT_ALIASES['görev yöneticisi'],
        categories: ['Sistem', 'Yönetim'],
        actionType: 'app',
        command: 'taskmgr.exe',
        enabled: true
      },
      {
        id: 'action-voldown',
        trigger: 'sesi kıs',
        aliases: DEFAULT_ALIASES['sesi kıs'],
        categories: ['Medya', 'Ses'],
        actionType: 'builtin',
        command: 'volume_down',
        enabled: true
      },
      {
        id: 'action-volup',
        trigger: 'sesi aç',
        aliases: DEFAULT_ALIASES['sesi aç'],
        categories: ['Medya', 'Ses'],
        actionType: 'builtin',
        command: 'volume_up',
        enabled: true
      },
      {
        id: 'action-volmute',
        trigger: 'sessize al',
        aliases: DEFAULT_ALIASES['sessize al'],
        categories: ['Medya', 'Ses'],
        actionType: 'builtin',
        command: 'volume_mute',
        enabled: true
      },
      {
        id: 'action-lock',
        trigger: 'bilgisayarı kilitle',
        aliases: DEFAULT_ALIASES['bilgisayarı kilitle'],
        categories: ['Sistem', 'Güvenlik'],
        actionType: 'builtin',
        command: 'lock_workstation',
        enabled: true
      }
    ];
  }

  normalizeMatchText(text) {
    return String(text || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/["""'']/g, '')
      .replace(/[.,!?;:…]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  parseAliasList(aliases) {
    if (!aliases) return [];
    if (Array.isArray(aliases)) {
      return aliases.map((a) => String(a || '').trim()).filter(Boolean);
    }
    return String(aliases)
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
  }

  getMatchPhrases(action) {
    const phrases = [];
    const trigger = String(action.trigger || '').trim();
    if (trigger) phrases.push(trigger);

    for (const alias of this.parseAliasList(action.aliases)) {
      phrases.push(alias);
    }

    // Built-in near-misses even if user's saved action omitted aliases
    if (trigger && DEFAULT_ALIASES[trigger.toLocaleLowerCase('tr-TR')]) {
      phrases.push(...DEFAULT_ALIASES[trigger.toLocaleLowerCase('tr-TR')]);
    }

    const seen = new Set();
    return phrases.filter((p) => {
      const key = this.normalizeMatchText(p);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Phrases to bias local Whisper (initial_prompt).
   */
  collectTriggerHints(config) {
    if (!config || config.enableWindowsActions === false) return [];
    const actionsList = config.windowsActions || this.defaultActions;
    const hints = [];
    for (const action of actionsList) {
      if (action.enabled === false) continue;
      for (const phrase of this.getMatchPhrases(action)) {
        hints.push(phrase);
      }
    }
    return hints.slice(0, 40);
  }

  isSafeAppCommand(command) {
    const cmd = String(command || '').trim();
    // Simple executable name only — no paths, args, or shell metacharacters
    return /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.exe$/i.test(cmd);
  }

  isSafeUrl(command) {
    try {
      const parsed = new URL(String(command || '').trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  normalizeAction(action) {
    if (!action || typeof action !== 'object') return null;

    let actionType = String(action.actionType || 'app').toLowerCase();
    let command = String(action.command || '').trim();

    // Migrate legacy shell-based entries to safe builtins / urls
    if ((actionType === 'powershell' || actionType === 'cmd') && LEGACY_COMMAND_TO_BUILTIN[command]) {
      return {
        ...action,
        actionType: 'builtin',
        command: LEGACY_COMMAND_TO_BUILTIN[command]
      };
    }

    if (actionType === 'app' && /^start\s+https?:\/\//i.test(command)) {
      return {
        ...action,
        actionType: 'url',
        command: command.replace(/^start\s+/i, '').trim()
      };
    }

    if (actionType === 'powershell' || actionType === 'cmd') {
      return null; // freeform shell no longer allowed
    }

    return { ...action, actionType, command };
  }

  /**
   * Try to match a voice action against one or more candidate texts
   * (raw STT, vocab-fixed, AI-cleaned). First match wins.
   * Does not execute — caller should run executeCommand after dedupe checks.
   */
  processText(textOrTexts, config) {
    if (!config || config.enableWindowsActions === false) {
      return { handled: false, text: Array.isArray(textOrTexts) ? textOrTexts[0] : textOrTexts };
    }

    const candidates = (Array.isArray(textOrTexts) ? textOrTexts : [textOrTexts])
      .filter((t) => typeof t === 'string' && t.trim())
      .map((t) => ({ original: t, normalized: this.normalizeMatchText(t) }));

    if (candidates.length === 0) return { handled: false, text: '' };

    const actionsList = config.windowsActions || this.defaultActions;

    for (const candidate of candidates) {
      for (const action of actionsList) {
        if (action.enabled === false) continue;
        const phrases = this.getMatchPhrases(action);
        for (const phrase of phrases) {
          const needle = this.normalizeMatchText(phrase);
          if (!needle) continue;
          if (candidate.normalized.includes(needle)) {
            console.log(
              `⚡ [VOICE ACTION DETECTED] Aksiyon eşleşti: "${action.trigger}"` +
              (needle !== this.normalizeMatchText(action.trigger) ? ` (eşleşme: "${phrase}")` : '') +
              ` -> ${action.command}`
            );
            return {
              handled: true,
              action,
              text: candidate.original,
              matchedPhrase: phrase
            };
          }
        }
      }
    }

    return { handled: false, text: candidates[0].original };
  }

  runExecFile(file, args = [], options = {}) {
    const opts = {
      shell: false,
      windowsHide: options.windowsHide !== false,
      ...options
    };
    return new Promise((resolve) => {
      execFile(file, args, opts, (error) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Launch a GUI .exe on Windows. If already running, focus (fire-and-forget);
   * otherwise start. Never blocks the dictation pipeline on hung COM calls.
   */
  launchApp(command) {
    const exe = String(command || '').trim();
    if (process.platform === 'win32') {
      return this.focusOrLaunchWindowsApp(exe);
    }

    return new Promise((resolve) => {
      const child = spawn(exe, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });
      child.on('error', (e) => resolve({ success: false, error: e.message }));
      child.unref();
      resolve({ success: true, activated: false, outcome: 'launched' });
    });
  }

  execFileTimed(file, args, options = {}, timeoutMs = 2500) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (payload) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(payload);
      };

      const child = execFile(
        file,
        args,
        { shell: false, windowsHide: true, ...options },
        (error, stdout, stderr) => {
          finish({ error, stdout: String(stdout || ''), stderr: String(stderr || '') });
        }
      );

      const timer = setTimeout(() => {
        try { child.kill(); } catch (e) { /* ignore */ }
        finish({ error: new Error(`timeout after ${timeoutMs}ms`), stdout: '', stderr: '' });
      }, timeoutMs);

      child.on('error', () => {
        /* callback above handles */
      });
    });
  }

  async isWindowsImageRunning(exe) {
    const image = String(exe || '').trim().toLowerCase();
    const { stdout } = await this.execFileTimed(
      'tasklist.exe',
      ['/FI', `IMAGENAME eq ${image}`, '/NH'],
      {},
      2000
    );
    const out = stdout.toLowerCase();
    if (!out || out.includes('no tasks') || out.includes('bilgi:')) return false;
    const base = image.replace(/\.exe$/i, '');
    return out.includes(image) || out.includes(base);
  }

  getFocusScriptPath() {
    return path.join(__dirname, 'focus_window.ps1');
  }

  /**
   * Focus an existing process main window. Never starts a new instance.
   */
  async focusExistingApp(exe) {
    const processName = exe.replace(/\.exe$/i, '');
    const scriptPath = this.getFocusScriptPath();
    if (!fs.existsSync(scriptPath)) {
      console.warn('⚠️  [APP FOCUS] focus_window.ps1 bulunamadı.');
      return { success: false, error: 'focus script missing' };
    }

    const { error, stdout } = await this.execFileTimed(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath,
        '-ProcessName', processName
      ],
      {},
      8000
    );

    const out = String(stdout || '').trim().toLowerCase();
    if (!error && (out.includes('focused') || out.includes('activated'))) {
      console.log(`📌 [APP FOCUS] ${exe} öne getirildi.`);
      return { success: true, activated: true, outcome: 'focused' };
    }

    console.warn(`⚠️  [APP FOCUS] ${exe} öne getirilemedi:`, error?.message || out || 'unknown');
    // Still report focused intent — we deliberately did NOT launch another window
    return { success: true, activated: true, outcome: 'focused' };
  }

  /**
   * Start exactly one instance via cmd start. No explorer/AUMID fallback
   * (those often open a second window on Win11 Notepad).
   */
  async launchNewApp(exe) {
    const { error } = await this.execFileTimed(
      process.env.ComSpec || 'cmd.exe',
      ['/c', 'start', '', exe],
      {},
      2500
    );

    if (error && !String(error.message || '').includes('timeout')) {
      try {
        const openErr = await shell.openPath(exe);
        if (openErr) return { success: false, error: openErr };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    console.log(`🚀 [APP LAUNCH] ${exe} başlatıldı (tek örnek).`);
    return { success: true, activated: false, outcome: 'launched' };
  }

  /**
   * If the app is already running → focus only (never open another window).
   * If not running → launch exactly once.
   */
  async focusOrLaunchWindowsApp(exe) {
    let running = false;
    try {
      running = await this.isWindowsImageRunning(exe);
    } catch (e) {
      running = false;
    }

    if (running) {
      return this.focusExistingApp(exe);
    }
    return this.launchNewApp(exe);
  }

  async runBuiltin(name) {
    const handler = BUILTIN_HANDLERS[name];
    if (!handler) {
      return { success: false, error: `Bilinmeyen güvenli aksiyon: ${name}` };
    }
    const result = await this.runExecFile(handler.file, handler.args, { windowsHide: true });
    return { ...result, activated: false, outcome: 'builtin' };
  }

  async executeCommand(action) {
    const normalized = this.normalizeAction(action);
    if (!normalized) {
      const msg = 'Güvensiz veya desteklenmeyen aksiyon engellendi (serbest PowerShell/CMD kapalı).';
      console.error(`❌ [VOICE ACTION BLOCKED] ${msg}`);
      return { success: false, error: msg };
    }

    const { actionType, command, trigger } = normalized;
    let result;

    try {
      if (actionType === 'builtin') {
        result = await this.runBuiltin(command);
      } else if (actionType === 'url') {
        if (!this.isSafeUrl(command)) {
          result = { success: false, error: 'Yalnızca http/https URL kabul edilir.' };
        } else {
          await shell.openExternal(command);
          result = { success: true, activated: false, outcome: 'url' };
        }
      } else if (actionType === 'app') {
        if (!this.isSafeAppCommand(command)) {
          result = {
            success: false,
            error: 'Uygulama komutu geçersiz. Yalnızca tek bir .exe adı kullanılabilir (örn. calc.exe).'
          };
        } else {
          result = await this.launchApp(command);
        }
      } else {
        result = { success: false, error: `Desteklenmeyen aksiyon tipi: ${actionType}` };
      }
    } catch (e) {
      result = { success: false, error: e.message };
    }

    if (result.success) {
      const how = result.outcome === 'focused' ? 'öne getirildi' : 'çalıştırıldı';
      console.log(`✅ [VOICE ACTION SUCCESS] Aksiyon ${how} (${trigger || command})`);
    } else {
      console.error(`❌ [VOICE ACTION ERROR] (${trigger || command}):`, result.error);
    }
    return result;
  }
}

module.exports = new WindowsActionsEngine();
