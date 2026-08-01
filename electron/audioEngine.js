const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');

class AudioEngine {
  constructor(store) {
    this.store = store;
  }

  /**
   * Evaluates audio for silence and hallucination prevention
   * @param {string} audioPath Path to recorded audio WAV/WEBM file
   * @returns {boolean} True if audio has valid speech content
   */
  async checkSilence(audioPath) {
    try {
      const stats = fs.statSync(audioPath);
      console.log(`\n🔊 [AUDIO ANALYSIS] Ses dosyası inceleniyor: ${path.basename(audioPath)} (${stats.size} bytes)`);

      // Drop files smaller than 1000 bytes (silence / instant press)
      if (stats.size < 1000) {
        console.log(`⚠️  [SILENCE WARNING] Ses kaydı çok kısa veya sessiz! (Boyut: ${stats.size} bytes < 1000 bytes). İşlem iptal edildi.`);
        return false;
      }
      return true;
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
      return await this.transcribeLocal(audioPath, config.localWhisperModel || 'base');
    } else if (provider === 'groq') {
      if (!config.groqApiKey) {
        console.log(`⚠️  [GROQ WARNING] Groq API Key bulunamadı! Yerel Whisper (Offline) moduna otomatik geçiliyor...`);
        return await this.transcribeLocal(audioPath, 'base');
      }
      return await this.transcribeGroq(audioPath, config.groqApiKey);
    } else if (provider === 'openai') {
      if (!config.openaiApiKey) {
        console.log(`⚠️  [OPENAI WARNING] OpenAI API Key bulunamadı! Yerel Whisper (Offline) moduna otomatik geçiliyor...`);
        return await this.transcribeLocal(audioPath, 'base');
      }
      return await this.transcribeOpenAI(audioPath, config.openaiApiKey);
    } else {
      return await this.transcribeLocal(audioPath, 'base');
    }
  }

  /**
   * Local Whisper transcription via Python helper
   */
  async transcribeLocal(audioPath, modelName = 'base') {
    return new Promise((resolve) => {
      console.log(`💻 [LOCAL WHISPER] Python çevrimdışı model '${modelName}' çalıştırılıyor...`);
      const pythonExecutable = path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe');
      const scriptPath = path.join(__dirname, '..', 'python', 'local_whisper_engine.py');

      const cmd = `"${pythonExecutable}" "${scriptPath}" --audio "${audioPath}" --model "${modelName}" --lang "tr"`;
      
      exec(cmd, (error, stdout, stderr) => {
        if (stderr) {
          console.log(`ℹ️  [PYTHON LOG]: ${stderr.trim()}`);
        }
        if (error) {
          console.error(`❌ [LOCAL WHISPER ERROR] Python motoru hatası: ${error.message}`);
          return resolve("Yerel Whisper işlenirken bir hata oluştu.");
        }
        try {
          const result = JSON.parse(stdout);
          if (result.success) {
            console.log(`✅ [LOCAL WHISPER SUCCESS] Ham Okunan Metin: "${result.text}"`);
            resolve(result.text);
          } else {
            console.error(`❌ [LOCAL WHISPER ERROR] ${result.error}`);
            resolve("");
          }
        } catch (e) {
          const fallbackText = stdout.trim();
          console.log(`✅ [LOCAL WHISPER STDOUT] Ham Okunan Metin: "${fallbackText}"`);
          resolve(fallbackText);
        }
      });
    });
  }

  /**
   * Groq Cloud Whisper transcription
   */
  async transcribeGroq(audioPath, apiKey) {
    console.log(`☁️  [GROQ CLOUD] Groq LPU Whisper-Large-v3-Turbo API'sine istek gönderiliyor...`);
    const fileData = fs.readFileSync(audioPath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);

    let body = [];
    body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3-turbo\r\n`));
    body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\ntr\r\n`));
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

    let body = [];
    body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`));
    body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\ntr\r\n`));
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

  /**
   * AI LLM Text Cleanup & Custom Vocabulary Repair Engine
   */
  async cleanText(rawText) {
    const config = this.store.config;
    if (!config.enableCleanup || !rawText || rawText.trim() === '') {
      return rawText;
    }

    // Apply custom vocabulary replacement first
    let processedText = rawText;
    if (config.customVocabulary && Array.isArray(config.customVocabulary)) {
      config.customVocabulary.forEach(item => {
        if (item.phonetic && item.word) {
          const regex = new RegExp(`\\b${item.phonetic}\\b`, 'gi');
          processedText = processedText.replace(regex, item.word);
        }
      });
    }

    const apiKey = config.openrouterApiKey || config.groqApiKey || config.openaiApiKey;
    if (!apiKey) {
      console.log(`ℹ️  [CLEANUP INFO] LLM Düzeltme API Key bulunamadığı için ham metin kullanılıyor.`);
      return processedText;
    }

    console.log(`✨ [AI CLEANUP] Yapay Zeka metin temizleme başlatılıyor...`);

    const systemPrompt = `${config.customPrompt || 'Dikte edilen metni temizle.'} 
İmleç konuşma dilindeki duraksamaları (ııı, şey, hmm) çıkar. Noktalama işaretlerini ve büyük/küçük harf kullanımını düzelt. Anlamı değiştirme.
SADECE TEMİZLENMİŞ METNİ DÖNDÜR. Ekstra açıklama veya tırnak ekleme.`;

    try {
      const payload = JSON.stringify({
        model: config.cleanupModel || 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: processedText }
        ],
        temperature: 0.2
      });

      const hostname = config.openrouterApiKey ? 'openrouter.ai' : (config.groqApiKey ? 'api.groq.com' : 'api.openai.com');
      const path = config.groqApiKey ? '/openai/v1/chat/completions' : '/v1/chat/completions';

      return new Promise((resolve) => {
        const req = https.request({
          hostname,
          path,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (res) => {
          let responseData = '';
          res.on('data', chunk => responseData += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(responseData);
              const cleanResult = json.choices?.[0]?.message?.content?.trim();
              if (cleanResult) {
                console.log(`✨ [AI CLEANUP SUCCESS] Düzeltilmiş Metin: "${cleanResult}"`);
                resolve(cleanResult);
              } else {
                resolve(processedText);
              }
            } catch (e) {
              resolve(processedText);
            }
          });
        });

        req.on('error', () => resolve(processedText));
        req.write(payload);
        req.end();
      });

    } catch (e) {
      return processedText;
    }
  }
}

module.exports = AudioEngine;
