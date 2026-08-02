# VoiceScribe — Windows 11 Akıllı Sesli Dikte (Voice-to-Text)

[![Windows App](https://img.shields.io/badge/Windows-10%20%2F%2011-0078D4?logo=windows&style=for-the-badge)](https://github.com/onderxyilmaz/voice-scribe/releases/latest)
[![Kurulum Setup](https://img.shields.io/badge/%C4%B0ndir-Setup%20(NSIS)-10B981?style=for-the-badge&logo=windows)](https://github.com/onderxyilmaz/voice-scribe/releases/latest)
[![Portable](https://img.shields.io/badge/%C4%B0ndir-Portable-6366F1?style=for-the-badge&logo=windows)](https://github.com/onderxyilmaz/voice-scribe/releases/latest)

![VoiceScribe Splash](electron/splash.png)

---

## Hemen indirin

Kod derlemeden kullanmak için [GitHub Releases](https://github.com/onderxyilmaz/voice-scribe/releases/latest) sayfasındaki son sürümü indirin.

| Sürüm türü | Açıklama | Not |
| :--- | :--- | :--- |
| **Windows Kurulum (Setup / NSIS)** | Masaüstü ve Başlat menüsü kısayolu oluşturur. | **Önerilen.** Uygulama içi otomatik güncelleme destekler. |
| **Taşınabilir (Portable)** | Kurulum olmadan çalışır. | Otomatik güncelleme **desteklenmez**. |

Güncel dosya adları genelde şöyledir:

- `VoiceScribe-Setup-<sürüm>.exe`
- `VoiceScribe-<sürüm>.exe` (portable)

---

## Öne çıkan özellikler

- **Yerel / çevrimdışı dikte:** Setup ile gelen gömülü Python + `faster-whisper` motoru (internet gerekmez).
- **Bulut STT:** Groq (`whisper-large-v3-turbo`) ve OpenAI Whisper API.
- **AI metin temizleme:** OpenRouter / Groq / OpenAI üzerinden duraksama ve imla düzeltme (API anahtarı gerekir).
- **Toplantı & AI:** Mikrofonla toplantı kaydı → STT transkript + AI özet; yazılı komutla asistan (yanıt panoya kopyalanır).
- **Global kısayol:** Varsayılan `Ctrl+Shift+Space` (ayarlanabilir). Metni aktif imleç konumuna yapıştırır.
- **Temalar:** Dark Obsidian ve Midnight Lavender.
- **HUD kapsülü:** Kayıt sırasında ses dalgası görselleştirici.
- **Özel sözlük & metin kısayolları:** Fonetik düzeltme ve sesli şablon genişletme.
- **Windows aksiyonları:** Güvenli allowlist ile uygulama açma, URL ve sistem (ses/kilit) aksiyonları.
- **Otomatik güncelleme:** Yalnızca NSIS kurulumunda (GitHub Releases).

### Bilerek kapsam dışı / henüz yok

- OpenRouter veya Deepgram üzerinden **ses→metin (STT)** yok (OpenRouter yalnızca metin / AI sohbet için kullanılır).
- Toplantı kaydı şu an **tek mikrofon** kaydıdır; sistem sesi / hoparlör yakalama ve canlı altyazı yoktur.

---

## Teknolojiler

- **Frontend:** React 19, Vite, Glassmorphism CSS
- **Masaüstü:** Electron 34, panoya yazma / Ctrl+V enjeksiyonu
- **Yerel STT:** Python `faster-whisper` (kurulumla paketlenmiş runtime)
- **Paketleme:** `electron-builder` (NSIS + portable)

---

## Geliştirici modu

```bash
git clone https://github.com/onderxyilmaz/voice-scribe.git
cd voice-scribe
npm install
npm run electron:dev
```

`electron:dev` Vite hazır olana kadar bekler, sonra Electron’u açar.

### Windows kurulum dosyası üretme

```bash
npm run dist:win
```

İlk derlemede gömülü Python runtime indirilir/kurulur (`python-runtime/`, git’e eklenmez). Çıktılar `release/` klasörüne yazılır.

Sertifika yokken build **imzasız** kalır (`SmartScreen` uyarısı normaldir). İmza için aşağıdaki bölüme bakın.

---

## Windows kod imzalama (SmartScreen)

SmartScreen, “Windows PC'nizi korudu” uyarısını **bilinmeyen yayıncı / imzasız veya itibarsız** dosyalarda gösterir. Bu uyarıyı kod yazarak kaldıramazsınız; **kod imzalama sertifikası** + zamanla oluşan indirme itibarı gerekir.

### Önemli gerçekler (2024+)

- **EV sertifika artık anında SmartScreen geçişi vermiyor.** OV ile aynı şekilde itibar birikir.
- Türkiye'de bireysel geliştirici için genelde pratik yol: bir CA’dan **OV Code Signing** sertifikası (DigiCert, Sectigo, GlobalSign vb.). Anahtar artık USB token / HSM’de tutulur.
- Azure Trusted Signing bazı bölgelerle sınırlı; Türkiye için uygun olmayabilir — satın almadan önce [Microsoft dokümantasyonunu](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options) kontrol edin.

### Bu projede imzalı build

1. Sertifikayı (genelde `.pfx` veya token + export) hazırlayın.
2. Build öncesi ortam değişkenlerini ayarlayın:

```powershell
$env:CSC_LINK = "C:\path\to\voicescribe-codesign.pfx"
$env:CSC_KEY_PASSWORD = "sertifika-sifresi"
npm run dist:win
```

3. Sertifika olmadan / bilinçli imzasız:

```powershell
npm run dist:win:unsigned
```

`publisherName` `package.json` içinde yayıncı adıyla uyumlu olmalı (sertifikadaki Common Name).

İmzalı Setup’ı indirme sayısı arttıkça SmartScreen uyarısı zamanla azalır; yeni sürüm hash’lerinde uyarı yeniden görülebilir.

---

## Lisans

MIT — Geliştirici: **Önder Yılmaz**.
