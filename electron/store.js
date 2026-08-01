const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class Store {
  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'config.json');
    this.historyPath = path.join(userDataPath, 'history.json');
    
    this.defaultConfig = {
      hotkey: 'CommandOrControl+Space',
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
      ]
    };

    this.config = this.loadConfig();
    this.history = this.loadHistory();
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

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (e) {
      console.error('Config save error:', e);
    }
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
      duration: item.duration || '00:05',
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
