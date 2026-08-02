const { execFile } = require('child_process');
const { shell } = require('electron');

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

/** Built-in phonetic / near-miss aliases for default Turkish triggers. */
const DEFAULT_ALIASES = {
  'not defteri': ['not defterim', 'not defter', 'notepad', 'not defterini', 'not deftere'],
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
              `⚡ [VOICE ACTION DETECTED] Aksiyon tetiklendi: "${action.trigger}"` +
              (needle !== this.normalizeMatchText(action.trigger) ? ` (eşleşme: "${phrase}")` : '') +
              ` -> ${action.command}`
            );
            this.executeCommand(action);
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

  runExecFile(file, args = []) {
    return new Promise((resolve) => {
      execFile(file, args, { shell: false, windowsHide: true }, (error) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  async runBuiltin(name) {
    const handler = BUILTIN_HANDLERS[name];
    if (!handler) {
      return { success: false, error: `Bilinmeyen güvenli aksiyon: ${name}` };
    }
    return this.runExecFile(handler.file, handler.args);
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
          result = { success: true };
        }
      } else if (actionType === 'app') {
        if (!this.isSafeAppCommand(command)) {
          result = {
            success: false,
            error: 'Uygulama komutu geçersiz. Yalnızca tek bir .exe adı kullanılabilir (örn. calc.exe).'
          };
        } else {
          result = await this.runExecFile(command, []);
        }
      } else {
        result = { success: false, error: `Desteklenmeyen aksiyon tipi: ${actionType}` };
      }
    } catch (e) {
      result = { success: false, error: e.message };
    }

    if (result.success) {
      console.log(`✅ [VOICE ACTION SUCCESS] Aksiyon çalıştırıldı (${trigger || command})`);
    } else {
      console.error(`❌ [VOICE ACTION ERROR] (${trigger || command}):`, result.error);
    }
    return result;
  }
}

module.exports = new WindowsActionsEngine();
