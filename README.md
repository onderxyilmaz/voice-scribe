# VoiceScribe

Windows 10 / 11 için **sesli dikte** masaüstü uygulaması. Global kısayolla konuşursunuz; metin aktif imleç konumuna yapıştırılır. Yerel Whisper veya bulut STT, AI metin temizleme, sesli Windows aksiyonları ve toplantı özeti tek arayüzde.

[![Windows](https://img.shields.io/badge/Windows-10%20%2F%2011-0078D4?logo=windows&style=for-the-badge)](https://github.com/onderxyilmaz/voice-scribe/releases/latest)
[![İndir Setup](https://img.shields.io/badge/%C4%B0ndir-Setup%20(NSIS)-10B981?style=for-the-badge&logo=windows)](https://github.com/onderxyilmaz/voice-scribe/releases/latest)
[![İndir Portable](https://img.shields.io/badge/%C4%B0ndir-Portable-0D9488?style=for-the-badge&logo=windows)](https://github.com/onderxyilmaz/voice-scribe/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

![VoiceScribe](electron/splash.png)

---

## Hemen indirin

Derleme bilmeden kullanmak için [GitHub Releases](https://github.com/onderxyilmaz/voice-scribe/releases/latest) üzerinden son sürümü indirin.

| Tür | Dosya örneği | Not |
| :--- | :--- | :--- |
| **Setup (NSIS)** — önerilen | `VoiceScribe-Setup-<sürüm>.exe` | Masaüstü / Başlat kısayolu. **Uygulama içi otomatik güncelleme** destekler. |
| **Portable** | `VoiceScribe-<sürüm>.exe` | Kurulumsuz çalışır. Otomatik güncelleme **yok**. |

> İlk açılışta Windows SmartScreen “bilinmeyen yayıncı” uyarısı gösterebilir (imzasız dağıtım). *Ek bilgi → Yine de çalıştır* ile devam edilebilir. Kod imzalama ayrı bir bölümdedir.

---

## Ne yapar?

1. Global kısayola basın (varsayılan: **Ctrl+Space**, ayarlanabilir).
2. Konuşun; bırakınca transkripsiyon başlar.
3. Kısa komutlar (**“not defteri aç”** vb.) Windows aksiyonu çalıştırır.
4. Uzun dikte metni AI ile temizlenir (isteğe bağlı) ve imlece yapıştırılır.

---

## Öne çıkan özellikler

### Ses → metin
- **Yerel Whisper** (`faster-whisper`, varsayılan model **small**): çevrimdışı, gömülü Python runtime ile Setup’ta gelir.
- **Groq** (`whisper-large-v3` / Turbo) ve **OpenAI Whisper-1**.
- Türkçe bias prompt, VAD / decode ayarları, bilinen Whisper uydurmalarının (`Altyazı M.K.` vb.) filtrelenmesi.
- Özel **sözlük** (fonetik → kelime) ve **metin kısayolları** (snippet).

### Kısa komut modu & Windows aksiyonları
- ~2.5 sn altı kayıtlarda aksiyon öncelikli; eşleşmezse rastgele metin yapıştırılmaz.
- Güvenli allowlist: uygulama (`.exe`), http(s) URL, ses / kilit gibi sistem aksiyonları.
- Açık uygulama varsa **yeni pencere açmadan öne getirme** (Win11 Notepad dahil).

### AI & toplantı
- Metin temizleme: OpenRouter / Groq / OpenAI (API anahtarı gerekir).
- Toplantı: mikrofon kaydı → STT → AI özet.
- “AI’ya sor”: yanıt panoya kopyalanır.

### Arayüz
- Temalar: **Day** (varsayılan yeni kurulum), **Obsidian**, **Nord**.
- Gruplu kenar çubuğu (Dikte / Ayarlar), HUD kayıt kapsülü, Floating UI tooltip’ler.
- API anahtarları OS `safeStorage` ile saklanır.

### Güncelleme
- Yalnızca **NSIS Setup** kurulumunda GitHub Releases üzerinden otomatik kontrol / indirme.

### Bilerek yok / sınırlı
- OpenRouter veya Deepgram ile **STT yok** (OpenRouter metin / AI için).
- Toplantı kaydı **tek mikrofon**; sistem sesi / hoparlör yakalama ve canlı altyazı yok.

---

## Teknolojiler

| Katman | Stack |
| :--- | :--- |
| UI | React 19, Vite, tema token’lı CSS, Floating UI |
| Masaüstü | Electron 34, global kısayol, tray, metin enjeksiyonu |
| Yerel STT | Python `faster-whisper` (paketlenmiş runtime) |
| Dağıtım | `electron-builder` (NSIS + portable) |

---

## Geliştirici kurulumu

```bash
git clone https://github.com/onderxyilmaz/voice-scribe.git
cd voice-scribe
npm install
npm run electron:dev
```

`electron:dev` Vite’ın ayağa kalkmasını bekler, ardından Electron’u açar.

### Windows paketleme

```bash
npm run dist:win
```

İlk derlemede gömülü Python runtime hazırlanır (`python-runtime/`, git’e eklenmez). Çıktılar `release/` altındadır.

İmzasız zorlamak için:

```powershell
npm run dist:win:unsigned
```

---

## Kullanım ipuçları

- **Kısa sesli komut** için net söyleyin ve kaydı kısa tutun (komut modu).
- **Uzun dikte** için birkaç saniye konuşun; cleanup açıksa metin düzeltilir.
- Yerel kalite için Motor’da model **Small** (veya Medium); Groq’da **Large-v3** önerilir.
- Genel → Sessizlik: min konuşma süresi ~**0.45 sn** kısa gürültü / Whisper uydurmalarını azaltır.
- Notepad zaten açıksa tekrar “not defteri aç” yeni pencere açmaz; mevcut pencereyi öne getirmeyi dener.

---

## Windows kod imzalama (SmartScreen)

SmartScreen uyarısı imzasız veya itibarsız yayıncıda normaldir; kodla kaldırılamaz. **Kod imzalama sertifikası** + indirme itibarı gerekir.

- EV artık anında itibar vermez; OV ile benzer şekilde birikir.
- Build öncesi örnek:

```powershell
$env:CSC_LINK = "C:\path\to\voicescribe-codesign.pfx"
$env:CSC_KEY_PASSWORD = "sertifika-sifresi"
npm run dist:win
```

Ayrıntılar için [Microsoft kod imzalama seçenekleri](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options).

---

## Sürümleme

SemVer kullanılır (`MAJOR.MINOR.PATCH`).

- **MINOR:** yeni özellik / belirgin UX (ör. `1.1.0`)
- **PATCH:** hata düzeltmesi / küçük iyileştirme (ör. `1.0.11`)

---

## Lisans

MIT — **Önder Yılmaz**.

Sorun ve istekler: [GitHub Issues](https://github.com/onderxyilmaz/voice-scribe/issues) · İndirme: [Releases](https://github.com/onderxyilmaz/voice-scribe/releases/latest)
