const path = require('path');
const fs = require('fs');
const { app, safeStorage } = require('electron');

const SECRET_KEYS = [
  'openaiApiKey',
  'openrouterApiKey',
  'groqApiKey',
  'deepgramApiKey',
  'geminiApiKey'
];

class Store {
  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'config.json');
    this.historyPath = path.join(userDataPath, 'history.json');
    this.secretsUnlocked = false;

    this.defaultConfig = {
      hotkey: 'CommandOrControl+Shift+Space',
      autoPaste: true,
      audioDevice: 'default',
      soundEffects: true,
      activeTheme: 'obsidian',
      silenceThresholdDb: -55,
      silenceMinDuration: 0.3,

      // Providers & Models
      sttProvider: 'local_whisper',
      openaiApiKey: '',
      openrouterApiKey: '',
      groqApiKey: '',
      deepgramApiKey: '',
      geminiApiKey: '',

      localWhisperModel: 'base',
      sttModel: 'whisper-large-v3-turbo',

      // Cleanup settings
      enableCleanup: true,
      cleanupProvider: 'openrouter',
      cleanupModel: 'google/gemini-2.5-flash-lite',
      thinkingEffort: 'medium',
      customPrompt: 'Dikte edilen konuşmayı düzelt. Duraksamaları (ııı, şey), gereksiz tekrarları ve noktalama hatalarını gider. Anlamı değiştirme.',

      // Custom Vocabulary
      customVocabulary: [
        { word: 'VoiceScribe', phonetic: 'voyskrayb' },
        { word: 'Dikte', phonetic: 'dikte' },
        { word: 'VS Code', phonetic: 'vesekod' },
        { word: 'React', phonetic: 'riyakt' },
        { word: 'TypeScript', phonetic: 'taypskript' }
      ],

      // Text snippets — clearly fake placeholders only (no realistic PII)
      enableSnippets: true,
      snippets: [
        {
          id: 'default-email',
          trigger: 'eposta örneğim',
          expansion: 'ornek@example.com',
          categories: ['Örnek', 'İletişim']
        },
        {
          id: 'default-signoff',
          trigger: 'kapanış cümlem',
          expansion: 'İyi çalışmalar dilerim.',
          categories: ['Örnek', 'Genel']
        }
      ]
    };

    this.config = this.loadConfig();
    this.history = this.loadHistory();
    this._pendingSnippetMigration = false;
    if (this.migrateLegacyFakeSnippets()) {
      this._pendingSnippetMigration = true;
    }
  }

  /**
   * Remove old sample snippets that looked like real PII (address / IBAN).
   * Keeps user-created entries. Adds safe placeholders only if list becomes empty
   * after removing legacy samples and no other snippets remain.
   */
  migrateLegacyFakeSnippets() {
    const LEGACY_TRIGGERS = new Set(['ev adresim', 'banka ibanım']);
    const LEGACY_EXPANSIONS = new Set([
      'İstiklal Cad. No:45 Daire:12 Beyoğlu / İstanbul',
      'TR33 0006 1000 0000 1234 5678 90 (Garanti BBVA)'
    ]);

    if (!Array.isArray(this.config.snippets)) return false;

    const before = this.config.snippets.length;
    const kept = this.config.snippets.filter((item) => {
      const trigger = String(item?.trigger || '').trim().toLowerCase();
      const expansion = String(item?.expansion || '').trim();
      const isLegacy =
        LEGACY_TRIGGERS.has(trigger) ||
        LEGACY_EXPANSIONS.has(expansion) ||
        item?.id === 'default-1' ||
        item?.id === 'default-2';
      return !isLegacy;
    });

    if (kept.length === before) return false;

    // If user only had the two legacy samples, restore safe placeholders
    if (kept.length === 0) {
      this.config.snippets = [...this.defaultConfig.snippets];
    } else {
      this.config.snippets = kept;
    }

    console.log(
      `🧹 [STORE] Removed legacy sample snippets (${before - kept.length}). Remaining: ${this.config.snippets.length}`
    );
    return true;
  }

  isSecretKey(key) {
    return SECRET_KEYS.includes(key);
  }

  canEncrypt() {
    try {
      return app.isReady() && safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  }

  encryptValue(plain) {
    const value = String(plain || '');
    if (!value) return '';
    if (!this.canEncrypt()) {
      console.warn('⚠️  [STORE] safeStorage unavailable — API key temporarily stored as plaintext');
      return value;
    }
    const encrypted = safeStorage.encryptString(value);
    return `enc:${encrypted.toString('base64')}`;
  }

  decryptValue(stored) {
    const value = String(stored || '');
    if (!value) return '';
    if (!value.startsWith('enc:')) {
      return value; // legacy plaintext
    }
    if (!this.canEncrypt()) {
      console.warn('⚠️  [STORE] Cannot decrypt API key — safeStorage unavailable');
      return '';
    }
    try {
      const buf = Buffer.from(value.slice(4), 'base64');
      return safeStorage.decryptString(buf);
    } catch (e) {
      console.error('❌ [STORE] API key decrypt failed:', e.message);
      return '';
    }
  }

  /**
   * Must be called after app.ready so safeStorage works.
   * Decrypts in-memory secrets and re-saves encrypted if plaintext existed on disk.
   */
  unlockSecrets() {
    if (this.secretsUnlocked) return;

    let hadPlaintext = false;
    for (const key of SECRET_KEYS) {
      const raw = this.config[key] || '';
      if (raw && !String(raw).startsWith('enc:')) {
        hadPlaintext = true;
      }
      this.config[key] = this.decryptValue(raw);
    }

    this.secretsUnlocked = true;

    let shouldPersist = this._pendingSnippetMigration;
    if (hadPlaintext && this.canEncrypt()) {
      console.log('🔐 [STORE] Migrating plaintext API keys to OS-encrypted storage...');
      shouldPersist = true;
    } else if (this.canEncrypt()) {
      console.log('🔐 [STORE] API key encryption ready (safeStorage)');
    }

    if (shouldPersist) {
      this.persistConfig();
      this._pendingSnippetMigration = false;
    }
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return { ...this.defaultConfig, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error('Config load error:', e);
    }
    return { ...this.defaultConfig };
  }

  persistConfig() {
    const toDisk = { ...this.config };
    for (const key of SECRET_KEYS) {
      toDisk[key] = this.encryptValue(this.config[key] || '');
    }
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(toDisk, null, 2), 'utf8');
    } catch (e) {
      console.error('Config save error:', e);
    }
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    // Ensure secrets stay plaintext in memory even if UI somehow sent enc: values
    if (this.secretsUnlocked) {
      for (const key of SECRET_KEYS) {
        if (typeof this.config[key] === 'string' && this.config[key].startsWith('enc:')) {
          this.config[key] = this.decryptValue(this.config[key]);
        }
      }
    }
    this.persistConfig();
    return this.config;
  }

  loadHistory() {
    try {
      if (fs.existsSync(this.historyPath)) {
        const data = fs.readFileSync(this.historyPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('History load error:', e);
    }
    return [];
  }

  addHistoryItem(item) {
    const historyItem = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      rawText: item.rawText || '',
      cleanText: item.cleanText || '',
      duration: item.duration || '00:00',
      provider: item.provider || 'local_whisper',
      mode: item.mode || 'dictation',
      isFavorite: false
    };

    this.history.unshift(historyItem);
    if (this.history.length > 200) {
      this.history = this.history.slice(0, 200);
    }

    try {
      fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2), 'utf8');
    } catch (e) {
      console.error('History save error:', e);
    }

    return historyItem;
  }

  deleteHistoryItem(id) {
    this.history = this.history.filter(item => item.id !== id);
    try {
      fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2), 'utf8');
    } catch (e) {
      console.error('Delete history item error:', e);
    }
    return this.history;
  }

  clearHistory() {
    this.history = [];
    try {
      fs.writeFileSync(this.historyPath, JSON.stringify([], null, 2), 'utf8');
    } catch (e) {
      console.error('Clear history error:', e);
    }
  }
}

module.exports = Store;
