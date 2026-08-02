const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const https = require('https');
const { app } = require('electron');

class AudioEngine {
  constructor(store) {
    this.store = store;
  }

  /**
   * Resolve a Python helper script outside asar when packaged.
   */
  getPythonScriptPath(fileName) {
    if (app.isPackaged) {
      const bundled = path.join(process.resourcesPath, 'python', fileName);
      if (fs.existsSync(bundled)) return bundled;
    }
    return path.join(__dirname, '..', 'python', fileName);
  }

  getWhisperScriptPath() {
    return this.getPythonScriptPath('local_whisper_engine.py');
  }

  getAnalyzeScriptPath() {
    return this.getPythonScriptPath('analyze_audio.py');
  }

  /**
   * Bundled embeddable Python runtime (shipped inside Setup via extraResources).
   */
  getBundledRuntimePython() {
    const packaged = app.isPackaged
      ? path.join(process.resourcesPath, 'python-runtime', 'python.exe')
      : path.join(__dirname, '..', 'python-runtime', 'python.exe');
    return fs.existsSync(packaged) ? packaged : null;
  }

  getBundledModelDir() {
    const dir = app.isPackaged
      ? path.join(process.resourcesPath, 'python-runtime', 'models')
      : path.join(__dirname, '..', 'python-runtime', 'models');
    return fs.existsSync(dir) ? dir : null;
  }

  /**
   * Find a usable Python interpreter for local Whisper.
   * Prefer bundled python-runtime, then project .venv, then system Python.
   */
  resolvePythonExecutable() {
    const candidates = [];

    if (process.env.VOICESCRIBE_PYTHON) {
      candidates.push(process.env.VOICESCRIBE_PYTHON);
    }

    const bundled = this.getBundledRuntimePython();
    if (bundled) candidates.push(bundled);

    // Dev / source checkout
    candidates.push(path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe'));
    candidates.push(path.join(__dirname, '..', '.venv', 'bin', 'python'));

    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) {
        return { command: candidate, argsPrefix: [] };
      }
    }

    // Windows py launcher / PATH python (validated later by running the script)
    if (process.platform === 'win32') {
      return { command: 'py', argsPrefix: ['-3'] };
    }
    return { command: 'python3', argsPrefix: [] };
  }

  runPythonCommand(python, scriptArgs) {
    return new Promise((resolve) => {
      const args = [...python.argsPrefix, ...scriptArgs];
      execFile(python.command, args, { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        resolve({ error, stdout: stdout || '', stderr: stderr || '' });
      });
    });
  }

  /**
   * Fallback when RMS analysis is unavailable: map dBFS slider to a min size.
   * More negative threshold (e.g. -70) = more permissive = smaller files allowed.
   */
  fallbackSilenceBySize(stats, thresholdDb) {
    const clamped = Math.min(-30, Math.max(-70, Number(thresholdDb) || -55));
    // -70 -> ~400 bytes, -55 -> ~1000, -30 -> ~2200
    const minBytes = Math.round(400 + (clamped + 70) * 45);
    const ok = stats.size >= minBytes;
    console.log(
      `ℹ️  [AUDIO ANALYSIS FALLBACK] Boyut kontrolü: ${stats.size} bytes (min ${minBytes}, eşik ${clamped} dBFS) => ${ok ? 'OK' : 'REJECT'}`
    );
    return ok;
  }

  /**
   * Evaluates audio for silence using silenceThresholdDb + silenceMinDuration.
   * @param {string} audioPath Path to recorded audio WAV/WEBM file
   * @returns {boolean} True if audio has valid speech content
   */
  async checkSilence(audioPath) {
    try {
      const stats = fs.statSync(audioPath);
      const thresholdDb = Number(this.store.config.silenceThresholdDb ?? -55);
      const minSpeechSec = Number(this.store.config.silenceMinDuration ?? 0.45);

      console.log(
        `\n🔊 [AUDIO ANALYSIS] ${path.basename(audioPath)} | ${stats.size} bytes | eşik ${thresholdDb} dBFS | min konuşma ${minSpeechSec}s`
      );

      // Tiny blob = instant click / empty recorder
      if (stats.size < 300) {
        console.log('⚠️  [SILENCE WARNING] Kayıt aşırı kısa (dosya boyutu).');
        return false;
      }

      const python = this.resolvePythonExecutable();
      const scriptPath = this.getAnalyzeScriptPath();
      if (!fs.existsSync(scriptPath)) {
        console.log('ℹ️  [AUDIO ANALYSIS] analyze_audio.py yok, boyut fallback kullanılıyor.');
        return this.fallbackSilenceBySize(stats, thresholdDb);
      }

      const { error, stdout, stderr } = await this.runPythonCommand(python, [
        scriptPath,
        '--audio', audioPath,
        '--threshold-db', String(thresholdDb),
        '--min-speech-sec', String(minSpeechSec)
      ]);

      if (stderr && stderr.trim()) {
        console.log(`ℹ️  [AUDIO ANALYSIS LOG]: ${stderr.trim()}`);
      }

      if (error) {
        console.error('❌ [AUDIO ANALYSIS ERROR]', error.message);
        return this.fallbackSilenceBySize(stats, thresholdDb);
      }

      try {
        const result = JSON.parse(stdout);
        if (!result.success || result.fallback) {
          console.log('ℹ️  [AUDIO ANALYSIS] Analiz başarısız, boyut fallback:', result.error || '');
          return this.fallbackSilenceBySize(stats, thresholdDb);
        }

        console.log(
          `🔊 [AUDIO ANALYSIS RESULT] peak=${result.peakDb} dBFS, speech=${result.speechSeconds}s, duration=${result.durationSeconds}s => ${result.hasSpeech ? 'SPEECH' : 'SILENCE'}`
        );

        if (!result.hasSpeech) {
          console.log('⚠️  [SILENCE WARNING] Eşik altında veya çok kısa konuşma — işlem iptal.');
        }
        return Boolean(result.hasSpeech);
      } catch (parseErr) {
        console.error('❌ [AUDIO ANALYSIS PARSE]', parseErr.message);
        return this.fallbackSilenceBySize(stats, thresholdDb);
      }
    } catch (e) {
      console.error(`❌ [AUDIO FILE ERROR] Ses dosyası okunamadı: ${e.message}`);
      return false;
    }
  }

  /**
   * Transcribes audio using selected STT Provider (Local Whisper or Cloud API)
   * @param {string} audioPath Path to audio file
   * @returns {Promise<string>} Transcribed raw text
   */
  async transcribe(audioPath) {
    const config = this.store.config;
    const provider = config.sttProvider || 'local_whisper';

    console.log(`🎙️  [STT ENGINE] Transkripsiyon sağlayıcısı başlatılıyor: '${provider.toUpperCase()}'`);

    if (provider === 'local_whisper') {
      return await this.transcribeLocal(audioPath, config.localWhisperModel || 'small');
    }
    if (provider === 'groq') {
      if (!config.groqApiKey) {
        console.log(`⚠️  [GROQ WARNING] Groq API Key bulunamadı! Yerel Whisper (Offline) moduna otomatik geçiliyor...`);
        return await this.transcribeLocal(audioPath, config.localWhisperModel || 'small');
      }
      return await this.transcribeGroq(audioPath, config.groqApiKey, config.sttModel);
    }
    if (provider === 'openai') {
      if (!config.openaiApiKey) {
        console.log(`⚠️  [OPENAI WARNING] OpenAI API Key bulunamadı! Yerel Whisper (Offline) moduna otomatik geçiliyor...`);
        return await this.transcribeLocal(audioPath, config.localWhisperModel || 'small');
      }
      return await this.transcribeOpenAI(audioPath, config.openaiApiKey);
    }
    if (provider === 'openrouter') {
      // OpenRouter does not provide a dedicated Whisper STT endpoint in this app.
      console.log('⚠️  [STT WARNING] OpenRouter STT desteklenmiyor. Yerel Whisper kullanılıyor...');
      return await this.transcribeLocal(audioPath, config.localWhisperModel || 'small');
    }
    return await this.transcribeLocal(audioPath, config.localWhisperModel || 'small');
  }

  /**
   * Resolve chat-completions endpoint for AI cleanup by preferred provider + available keys.
   */
  resolveCleanupEndpoint(config) {
    const preferred = String(config.cleanupProvider || 'openrouter').toLowerCase();

    const openrouter = config.openrouterApiKey
      ? {
          provider: 'openrouter',
          hostname: 'openrouter.ai',
          apiPath: '/api/v1/chat/completions',
          apiKey: config.openrouterApiKey,
          model: config.cleanupModel || 'google/gemini-2.5-flash-lite',
          extraHeaders: {
            'HTTP-Referer': 'https://github.com/onderxyilmaz/voice-scribe',
            'X-Title': 'VoiceScribe'
          }
        }
      : null;

    const groq = config.groqApiKey
      ? {
          provider: 'groq',
          hostname: 'api.groq.com',
          apiPath: '/openai/v1/chat/completions',
          apiKey: config.groqApiKey,
          // OpenRouter-style model ids are invalid on Groq
          model: config.cleanupModelGroq || 'llama-3.1-8b-instant',
          extraHeaders: {}
        }
      : null;

    const openai = config.openaiApiKey
      ? {
          provider: 'openai',
          hostname: 'api.openai.com',
          apiPath: '/v1/chat/completions',
          apiKey: config.openaiApiKey,
          model: config.cleanupModelOpenAI || 'gpt-4o-mini',
          extraHeaders: {}
        }
      : null;

    if (preferred === 'openrouter' && openrouter) return openrouter;
    if (preferred === 'groq' && groq) return groq;
    if (preferred === 'openai' && openai) return openai;

    return openrouter || groq || openai || null;
  }

  /**
   * Bias Whisper toward Turkish dictation + known voice-action phrases / vocabulary.
   * Used by local faster-whisper and Groq/OpenAI prompt fields.
   */
  buildWhisperInitialPrompt() {
    const parts = [
      'not defteri',
      'hesap makinesi',
      'ayarlar',
      'dosya gezgini',
      'görev yöneticisi',
      'aç',
      'kapat',
      'VoiceScribe',
      'dikte'
    ];
    try {
      const windowsActions = require('./windowsActions');
      const hints = windowsActions.collectTriggerHints(this.store.config);
      parts.push(...hints);
    } catch (e) {
      // optional
    }

    const vocab = this.store.config.customVocabulary;
    if (Array.isArray(vocab)) {
      for (const item of vocab) {
        if (item?.word) parts.push(String(item.word).trim());
        if (item?.phonetic) parts.push(String(item.phonetic).trim());
      }
    }

    const unique = [];
    const seen = new Set();
    for (const p of parts) {
      const key = String(p || '').trim().toLocaleLowerCase('tr-TR');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(String(p).trim());
      if (unique.length >= 40) break;
    }

    return (
      'Bu bir Türkçe dikte kaydıdır. Kısa sesli komutlar ve özel kelimeler: ' +
      `${unique.join(', ')}.`
    );
  }

  /**
   * Local Whisper transcription via Python helper
   */
  async transcribeLocal(audioPath, modelName = 'small') {
    const scriptPath = this.getWhisperScriptPath();
    if (!fs.existsSync(scriptPath)) {
      console.error(`❌ [LOCAL WHISPER ERROR] Script bulunamadı: ${scriptPath}`);
      return 'Yerel Whisper motoru bulunamadı. Uygulamayı yeniden kurun.';
    }

    const python = this.resolvePythonExecutable();
    const modelDir = this.getBundledModelDir();
    console.log(
      `💻 [LOCAL WHISPER] Model '${modelName}' | Python: ${python.command} ${python.argsPrefix.join(' ')} | Script: ${scriptPath}`
    );

    const scriptArgs = [
      scriptPath,
      '--audio', audioPath,
      '--model', modelName,
      '--lang', 'tr'
    ];
    if (modelDir) {
      scriptArgs.push('--model-dir', modelDir);
    }

    const initialPrompt = this.buildWhisperInitialPrompt();
    if (initialPrompt) {
      scriptArgs.push('--initial-prompt', initialPrompt);
      console.log(`💡 [LOCAL WHISPER] initial_prompt aktif (${initialPrompt.length} karakter)`);
    }

    let { error, stdout, stderr } = await this.runPythonCommand(python, scriptArgs);

    // If `py -3` failed, try bare `python` once (common on Windows PATH installs)
    if (error && python.command === 'py') {
      console.log('ℹ️  [LOCAL WHISPER] py -3 başarısız, PATH üzerindeki python deneniyor...');
      ({ error, stdout, stderr } = await this.runPythonCommand(
        { command: 'python', argsPrefix: [] },
        scriptArgs
      ));
    }

    if (stderr && stderr.trim()) {
      console.log(`ℹ️  [PYTHON LOG]: ${stderr.trim()}`);
    }

    if (error) {
      console.error(`❌ [LOCAL WHISPER ERROR] Python motoru hatası: ${error.message}`);
      const hint = this.getBundledRuntimePython()
        ? 'Gömülü Python runtime bulundu ama çalıştırılamadı. Uygulamayı yeniden kurmayı deneyin.'
        : (app.isPackaged
          ? 'Gömülü Whisper runtime eksik. VoiceScribe Setup ile yeniden kurun.'
          : 'Önce `node python/prepare_python_runtime.js` çalıştırın veya proje .venv içine faster-whisper kurun.');
      return `Yerel Whisper çalıştırılamadı. ${hint}`;
    }

    try {
      const result = JSON.parse(stdout);
      if (result.success) {
        console.log(`✅ [LOCAL WHISPER SUCCESS] Ham Okunan Metin: "${result.text}"`);
        return result.text;
      }
      console.error(`❌ [LOCAL WHISPER ERROR] ${result.error}`);
      if (String(result.error || '').toLowerCase().includes('faster_whisper') ||
          String(result.error || '').toLowerCase().includes('no module named')) {
        return 'faster-whisper kurulu değil. Terminalde: pip install faster-whisper';
      }
      return '';
    } catch (e) {
      const fallbackText = stdout.trim();
      console.log(`✅ [LOCAL WHISPER STDOUT] Ham Okunan Metin: "${fallbackText}"`);
      return fallbackText;
    }
  }

  /**
   * Groq Cloud Whisper transcription
   */
  async transcribeGroq(audioPath, apiKey, modelName = 'whisper-large-v3') {
    const model = String(modelName || 'whisper-large-v3').trim() || 'whisper-large-v3';
    console.log(`☁️  [GROQ CLOUD] Groq ${model} API'sine istek gönderiliyor...`);
    const fileData = fs.readFileSync(audioPath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
    const prompt = this.buildWhisperInitialPrompt();

    let body = [];
    body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n`));
    body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\ntr\r\n`));
    if (prompt) {
      body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n${prompt}\r\n`));
    }
    body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="recording.webm"\r\nContent-Type: audio/webm\r\n\r\n`));
    body.push(fileData);
    body.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const fullBuffer = Buffer.concat(body);

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.groq.com',
        path: '/openai/v1/audio/transcriptions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': fullBuffer.length
        }
      }, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(responseData);
            if (json.text) {
              console.log(`✅ [GROQ SUCCESS] Ham Okunan Metin: "${json.text.trim()}"`);
              resolve(json.text.trim());
            } else {
              console.error(`❌ [GROQ API ERROR] ${JSON.stringify(json)}`);
              resolve('');
            }
          } catch (e) {
            console.error(`❌ [GROQ PARSE ERROR] Yanıt çözümlenemedi.`);
            resolve('');
          }
        });
      });

      req.on('error', (e) => {
        console.error(`❌ [GROQ NETWORK ERROR] ${e.message}`);
        resolve('');
      });
      req.write(fullBuffer);
      req.end();
    });
  }

  /**
   * OpenAI Cloud Whisper transcription
   */
  async transcribeOpenAI(audioPath, apiKey) {
    console.log(`☁️  [OPENAI CLOUD] OpenAI Whisper-1 API'sine istek gönderiliyor...`);
    const fileData = fs.readFileSync(audioPath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
    const prompt = this.buildWhisperInitialPrompt();

    let body = [];
    body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`));
    body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\ntr\r\n`));
    if (prompt) {
      body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n${prompt}\r\n`));
    }
    body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="recording.webm"\r\nContent-Type: audio/webm\r\n\r\n`));
    body.push(fileData);
    body.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const fullBuffer = Buffer.concat(body);

    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.openai.com',
        path: '/v1/audio/transcriptions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': fullBuffer.length
        }
      }, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(responseData);
            if (json.text) {
              console.log(`✅ [OPENAI SUCCESS] Ham Okunan Metin: "${json.text.trim()}"`);
              resolve(json.text.trim());
            } else {
              console.error(`❌ [OPENAI API ERROR] ${JSON.stringify(json)}`);
              resolve('');
            }
          } catch (e) {
            console.error(`❌ [OPENAI PARSE ERROR] Yanıt çözümlenemedi.`);
            resolve('');
          }
        });
      });

      req.on('error', (e) => {
        console.error(`❌ [OPENAI NETWORK ERROR] ${e.message}`);
        resolve('');
      });
      req.write(fullBuffer);
      req.end();
    });
  }

  escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Whisper often invents YouTube/subtitle credit lines on short, quiet, or
   * non-speech audio (training-data priors). Treat those as empty.
   */
  isWhisperHallucination(text) {
    const normalized = String(text || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/["""'']/g, '')
      .replace(/[.,!?;:…]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) return false;

    const exact = new Set([
      'altyazı m k',
      'altyazi m k',
      'altyazı mk',
      'altyazi mk',
      'altyazı m.k',
      'altyazi m.k',
      'subtitles by amara org',
      'subtitles by the amara org',
      'subtitles by the amara.org community',
      'thanks for watching',
      'thank you for watching',
      'thanks for watching please subscribe',
      'abone olmayı unutmayın',
      'izlediğiniz için teşekkürler'
    ]);

    if (exact.has(normalized)) return true;

    const patterns = [
      /^altyaz[ıi]\s*m\.?\s*k\.?$/i,
      /^subtitl(e|es)\s+by\b/i,
      /^thanks?\s+for\s+watching\b/i,
      /^thank\s+you\s+for\s+watching\b/i,
      /^amara\.?org\b/i,
      /^translated\s+by\b/i,
      /^caption(s|ed)?\s+by\b/i,
      /^izlediğiniz\s+için\s+teşekkür/i
    ];

    return patterns.some((re) => re.test(normalized));
  }

  /**
   * Drop known Whisper hallucination transcripts so they are not pasted.
   * @returns {string} original text, or '' if hallucinated
   */
  sanitizeTranscript(text) {
    if (!text || typeof text !== 'string') return '';
    const trimmed = text.trim();
    if (!trimmed) return '';
    if (this.isWhisperHallucination(trimmed)) {
      console.log(`🧹 [STT HALLUCINATION] Whisper uydurması yok sayıldı: "${trimmed}"`);
      return '';
    }
    return trimmed;
  }

  /**
   * Replace phonetic hits with canonical vocabulary words.
   * Runs even when AI cleanup is disabled.
   */
  applyVocabulary(text) {
    const config = this.store.config;
    if (!text || typeof text !== 'string') return text;
    if (!config.customVocabulary || !Array.isArray(config.customVocabulary)) return text;

    let processedText = text;
    config.customVocabulary.forEach((item) => {
      if (!item?.phonetic || !item?.word) return;
      try {
        const escaped = this.escapeRegExp(item.phonetic.trim());
        if (!escaped) return;
        // Unicode-aware-ish boundaries: avoid matching inside longer tokens
        const regex = new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'giu');
        const next = processedText.replace(regex, item.word);
        if (next !== processedText) {
          console.log(`📚 [VOCAB] "${item.phonetic}" ➔ "${item.word}"`);
          processedText = next;
        }
      } catch (e) {
        console.error(`❌ [VOCAB REGEX] "${item.phonetic}":`, e.message);
      }
    });
    return processedText;
  }

  /**
   * AI LLM Text Cleanup & Custom Vocabulary Repair Engine
   */
  async cleanText(rawText) {
    const config = this.store.config;
    if (!rawText || rawText.trim() === '') {
      return rawText;
    }

    let processedText = this.applyVocabulary(rawText);

    if (!config.enableCleanup) {
      return processedText;
    }

    const endpoint = this.resolveCleanupEndpoint(config);
    if (!endpoint) {
      console.log(`ℹ️  [CLEANUP INFO] LLM Düzeltme API Key bulunamadığı için ham metin kullanılıyor.`);
      return processedText;
    }

    console.log(`✨ [AI CLEANUP] Sağlayıcı: ${endpoint.provider} | Model: ${endpoint.model}`);

    const systemPrompt = `${config.customPrompt || 'Dikte edilen metni temizle.'} 
İmleç konuşma dilindeki duraksamaları (ııı, şey, hmm) çıkar. Noktalama işaretlerini ve büyük/küçük harf kullanımını düzelt. Anlamı değiştirme.
SADECE TEMİZLENMİŞ METNİ DÖNDÜR. Ekstra açıklama veya tırnak ekleme.`;

    try {
      const payload = JSON.stringify({
        model: endpoint.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: processedText }
        ],
        temperature: 0.2
      });

      return new Promise((resolve) => {
        const req = https.request({
          hostname: endpoint.hostname,
          path: endpoint.apiPath,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${endpoint.apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            ...endpoint.extraHeaders
          }
        }, (res) => {
          let responseData = '';
          res.on('data', chunk => responseData += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(responseData);
              if (res.statusCode < 200 || res.statusCode >= 300) {
                console.error(`❌ [AI CLEANUP HTTP ${res.statusCode}]`, json.error || json);
                return resolve(processedText);
              }
              const cleanResult = json.choices?.[0]?.message?.content?.trim();
              if (cleanResult) {
                console.log(`✨ [AI CLEANUP SUCCESS] Düzeltilmiş Metin: "${cleanResult}"`);
                resolve(cleanResult);
              } else {
                console.error('❌ [AI CLEANUP EMPTY] Beklenen choices[0].message.content yok:', responseData.slice(0, 300));
                resolve(processedText);
              }
            } catch (e) {
              console.error('❌ [AI CLEANUP PARSE ERROR]', e.message, responseData.slice(0, 300));
              resolve(processedText);
            }
          });
        });

        req.on('error', (err) => {
          console.error('❌ [AI CLEANUP NETWORK ERROR]', err.message);
          resolve(processedText);
        });
        req.write(payload);
        req.end();
      });

    } catch (e) {
      console.error('❌ [AI CLEANUP EXCEPTION]', e.message);
      return processedText;
    }
  }

  /**
   * Generic chat completion using the same providers as AI cleanup.
   * @returns {{ success: boolean, text?: string, error?: string, provider?: string, model?: string }}
   */
  async chatCompletion(systemPrompt, userPrompt, options = {}) {
    const config = this.store.config;
    const endpoint = this.resolveCleanupEndpoint(config);
    if (!endpoint) {
      return {
        success: false,
        error: 'AI için API anahtarı yok. API & Modeller sekmesinden OpenRouter, Groq veya OpenAI anahtarı ekleyin.'
      };
    }

    const temperature = typeof options.temperature === 'number' ? options.temperature : 0.4;
    const payload = JSON.stringify({
      model: endpoint.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature
    });

    console.log(`🤖 [AI CHAT] Sağlayıcı: ${endpoint.provider} | Model: ${endpoint.model}`);

    return new Promise((resolve) => {
      const req = https.request({
        hostname: endpoint.hostname,
        path: endpoint.apiPath,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${endpoint.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...endpoint.extraHeaders
        }
      }, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(responseData);
            if (res.statusCode < 200 || res.statusCode >= 300) {
              const msg = json.error?.message || json.error || `HTTP ${res.statusCode}`;
              console.error(`❌ [AI CHAT HTTP ${res.statusCode}]`, msg);
              return resolve({ success: false, error: String(msg), provider: endpoint.provider, model: endpoint.model });
            }
            const text = json.choices?.[0]?.message?.content?.trim();
            if (!text) {
              return resolve({ success: false, error: 'Model boş yanıt döndürdü.', provider: endpoint.provider, model: endpoint.model });
            }
            console.log(`🤖 [AI CHAT SUCCESS] ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`);
            resolve({ success: true, text, provider: endpoint.provider, model: endpoint.model });
          } catch (e) {
            resolve({ success: false, error: e.message, provider: endpoint.provider, model: endpoint.model });
          }
        });
      });

      req.on('error', (err) => {
        console.error('❌ [AI CHAT NETWORK ERROR]', err.message);
        resolve({ success: false, error: err.message, provider: endpoint.provider, model: endpoint.model });
      });
      req.write(payload);
      req.end();
    });
  }

  /**
   * Voice Snippets / Text Expansion Engine
   */
  applySnippets(text) {
    const config = this.store.config;
    if (config.enableSnippets === false || !text || typeof text !== 'string') {
      return text;
    }

    const snippets = Array.isArray(config.snippets) ? config.snippets : [];

    let result = text;
    snippets.forEach(item => {
      if (item.trigger && item.expansion) {
        try {
          const escaped = this.escapeRegExp(item.trigger.trim());
          if (!escaped) return;
          const regex = new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'giu');
          const next = result.replace(regex, item.expansion);
          if (next !== result) {
            result = next;
            console.log(`🚀 [SNIPPET EXPANDED] "${item.trigger}" ➔ "${item.expansion}"`);
          }
        } catch (e) {
          console.error(`❌ [SNIPPET REGEX] "${item.trigger}":`, e.message);
        }
      }
    });

    return result;
  }
}

module.exports = AudioEngine;
