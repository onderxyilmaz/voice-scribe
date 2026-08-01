# 🎙️ VoiceScribe — Windows 11 Akıllı Sesli Dikte (Voice-to-Text)

![VoiceScribe Splash](electron/splash.png)

**VoiceScribe**, Windows 11 ve Windows 10 kullanıcıları için geliştirilmiş; **%100 Yerel Offline Whisper** desteği, bulut STT API entegrasyonları, yapay zeka metin düzeltme motoru ve 60 FPS canlı ses görselleştirici HUD kapsülü sunan akıllı bir sesli dikte masaüstü uygulamasıdır.

---

## 🌟 Öne Çıkan Özellikler

- 🚀 **Tam Yerel ve Çevrimdışı Dikte (Local Whisper):** İnternet bağlantısı olmadan `faster-whisper` altyapısı ile %100 gizli ve tamamen yerel Türkçe/İngilizce dikte yapabilme.
- ⚡ **Bulut API Desteği (Hybrid Engine):** Groq Cloud (`whisper-large-v3-turbo`), OpenAI Whisper, OpenRouter ve Deepgram altyapılarını tek tıkla kullanabilme.
- 🤖 **Yapay Zeka Metin Temizleme (AI Cleanup):** Dikte ettiğiniz konuşmalardaki duraksamaları (*"ııı, şey"*), tekrarları ve noktalama hatalarını Gemini / Claude / GPT modelleriyle otomatik düzeltme.
- ⌨️ **Global Kısayol Tuşu (Ctrl + Space):** Hangi uygulamada (VS Code, Notepad, Chrome, Word vb.) olursanız olun kısayola bastığınızda sesinizi kaydeder ve metni **otomatik olarak aktif imleç konumuna yazar**.
- 🎛️ **Görsel Temalar:** **Dark Obsidian** (Derin Siyah & Indigo) ve **Midnight Lavender** (Color Hunt Lacivert & Gece Lavantası) temaları.
- 🎨 **60 FPS HUD Kapsülü:** Kayıt esnasında ekranın altında beliren, sesinizin ritmine göre şekil alan canlı ses dalgası görselleştiricisi.
- 📖 **Özel Fonetik Sözlük:** Kurumsal veya teknik terimleri (Örn: *VS Code*, *React*, *TypeScript*) kendi okunuşlarına göre otomatik düzelten özel sözlük.

---

## 🛠️ Teknolojiler & Mimarisi

- **Frontend:** React 19, Vite, Vanilla CSS Glassmorphism
- **Masaüstü Katmanı:** Electron 34, Win32 P/Invoke Keystroke Injection (`keybd_event`)
- **Yerel STT:** Python `faster-whisper` (UTF-8 stdout stream)
- **Paketleme:** `electron-builder`, NSIS Installer

---

## 💻 Kurulum ve Geliştirme

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/onderxyilmaz/voice-scribe.git
cd voice-scribe
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Geliştirici Modunda Çalıştırın
```bash
npm run electron:dev
```

### 4. Windows Kurulum Dosyalarını (.exe) Derleyin
```bash
npm run dist:win
```

---

## 📄 Lisans

Bu proje **MIT** lisansı ile lisanslanmıştır. Geliştirici: **Önder Yılmaz**.
