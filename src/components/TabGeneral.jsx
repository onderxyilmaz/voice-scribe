import React, { useState, useEffect } from 'react';
import { Keyboard, ClipboardCheck, Volume2, Sliders, Check, RotateCcw, Palette, RefreshCw, Download, Sparkles, CheckCircle2 } from 'lucide-react';

export default function TabGeneral({ config, setConfig, saveConfig }) {
  const [isRecordingKey, setIsRecordingKey] = useState(false);
  const [recordedCombo, setRecordedCombo] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Auto-Update States
  const [currentVersion, setCurrentVersion] = useState('1.0.2');
  const [updateStatus, setUpdateStatus] = useState({ status: 'idle', version: '' });

  useEffect(() => {
    if (window.api && window.api.getAppVersion) {
      window.api.getAppVersion().then(v => {
        if (v) setCurrentVersion(v);
      });
    }

    if (window.api && window.api.onUpdateStatus) {
      const cleanup = window.api.onUpdateStatus((data) => {
        setUpdateStatus(data);
      });
      return cleanup;
    }
  }, []);

  const handleCheckForUpdates = () => {
    setUpdateStatus({ status: 'checking', version: currentVersion });
    if (window.api && window.api.checkForUpdates) {
      window.api.checkForUpdates();
    }
  };

  const handleDownloadUpdate = () => {
    setUpdateStatus({ status: 'downloading', percent: 0 });
    if (window.api && window.api.downloadUpdate) {
      window.api.downloadUpdate();
    }
  };

  const handleQuitAndInstall = () => {
    if (window.api && window.api.quitAndInstall) {
      window.api.quitAndInstall();
    }
  };

  const formatDisplayHotkey = (hotkey) => {
    if (!hotkey) return 'Ctrl + Space';
    return hotkey
      .replace(/CommandOrControl/gi, 'Ctrl')
      .replace(/Control/gi, 'Ctrl')
      .replace(/\+/g, ' + ');
  };

  useEffect(() => {
    if (!isRecordingKey) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const keys = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');
      if (e.metaKey) keys.push('Win');

      let mainKey = e.key;
      if (mainKey === ' ') mainKey = 'Space';
      if (mainKey === 'Control' || mainKey === 'Alt' || mainKey === 'Shift' || mainKey === 'Meta') {
        mainKey = '';
      } else if (mainKey.length === 1) {
        mainKey = mainKey.toUpperCase();
      }

      if (mainKey) {
        keys.push(mainKey);
      }

      if (keys.length > 0) {
        setRecordedCombo(keys.join(' + '));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecordingKey]);

  const handleStartRecord = () => {
    setIsRecordingKey(true);
    setRecordedCombo('');
    if (window.api) {
      window.api.pauseHotkey();
    }
  };

  const handleSaveHotkey = () => {
    if (!recordedCombo) {
      handleCancelRecord();
      return;
    }
    
    const electronHotkey = recordedCombo
      .replace(/Ctrl/g, 'CommandOrControl')
      .replace(/\s\+\s/g, '+');

    const updated = { ...config, hotkey: electronHotkey };
    setConfig(updated);
    saveConfig(updated);

    setIsRecordingKey(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);

    if (window.api) {
      window.api.resumeHotkey();
    }
  };

  const handleCancelRecord = () => {
    setIsRecordingKey(false);
    setRecordedCombo('');
    if (window.api) {
      window.api.resumeHotkey();
    }
  };

  const handleChange = (key, value) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    saveConfig(updated);
  };

  const themes = [
    {
      id: 'obsidian',
      name: 'Dark Obsidian',
      desc: 'Siyah & Indigo Işıltısı (Varsayılan)',
      colors: ['#0b0f19', '#1e1f2a', '#6366f1']
    },
    {
      id: 'lavender',
      name: 'Midnight Lavender',
      desc: 'Color Hunt (#070F2B / #1B1A55 / #535C91 / #9290C3)',
      colors: ['#070F2B', '#1B1A55', '#535C91', '#9290C3']
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Genel Ayarlar</h2>
        <p className="text-xs text-gray-400">Kısayol tuşları, tema seçimi, otomatik güncelleme ve ses tercihlerini yönetin.</p>
      </div>

      {/* Auto-Update Control Card */}
      <div className="glass-card p-5 space-y-4 border-indigo-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <RefreshCw className={`w-5 h-5 ${updateStatus.status === 'checking' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                Yazılım Güncellemeleri
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v{currentVersion}
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                {updateStatus.status === 'checking' && 'GitHub Releases adresi denetleniyor...'}
                {updateStatus.status === 'latest' && `Tebrikler, en son VoiceScribe sürümünü (v${currentVersion}) kullanıyorsunuz!`}
                {updateStatus.status === 'available' && `Yeni Güncelleme Mevcut: v${updateStatus.version}`}
                {updateStatus.status === 'downloading' && `İndiriliyor: %${updateStatus.percent || 0}`}
                {updateStatus.status === 'downloaded' && 'Güncelleme başarıyla indirildi. Yüklemek için yeniden başlatın.'}
                {updateStatus.status === 'error' && `Güncelleme Kontrolü: ${updateStatus.error || 'İndirme tamamlanamadı'}`}
                {updateStatus.status === 'idle' && 'En yeni sürümleri ve güvenlik iyileştirmelerini kontrol edin.'}
              </p>
            </div>
          </div>

          <div>
            {updateStatus.status === 'available' && (
              <button
                onClick={handleDownloadUpdate}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" /> İndir (v{updateStatus.version})
              </button>
            )}

            {updateStatus.status === 'downloading' && (
              <span className="px-4 py-2 bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                İndiriliyor %{updateStatus.percent || 0}...
              </span>
            )}

            {updateStatus.status === 'downloaded' && (
              <button
                onClick={handleQuitAndInstall}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer animate-pulse"
              >
                <Sparkles className="w-4 h-4" /> Şimdi Kur & Yeniden Başlat
              </button>
            )}

            {(updateStatus.status === 'idle' || updateStatus.status === 'latest') && (
              <button
                onClick={handleCheckForUpdates}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Güncellemeleri Denetle
              </button>
            )}

            {updateStatus.status === 'checking' && (
              <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1 animate-pulse">
                Denetleniyor...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Theme Selection Card */}
      <div className="glass-card p-5 space-y-4 border-indigo-500/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Uygulama Teması</h3>
            <p className="text-xs text-gray-400">Görsel renk paletini tercihinize göre değiştirin.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {themes.map((t) => {
            const isSelected = (config.activeTheme || 'obsidian') === t.id;
            return (
              <div
                key={t.id}
                onClick={() => handleChange('activeTheme', t.id)}
                className={`glass-card p-4 cursor-pointer relative transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                    : 'hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-white">{t.name}</h4>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-[11px] text-gray-400 mb-3">{t.desc}</p>
                
                <div className="flex items-center gap-2">
                  {t.colors.map((c, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Global Hotkey Recorder Setting */}
      <div className="glass-card p-5 space-y-3 border-indigo-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Global Kısayol Tuşu</h3>
              <p className="text-xs text-gray-400">Her yerden dikteyi başlatmak veya durdurmak için kullanılacak tuş kombinasyonu.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isRecordingKey ? (
              <>
                <button
                  onClick={handleStartRecord}
                  className="border border-white/10 hover:border-indigo-500/50 rounded-xl px-4 py-2 text-xs text-indigo-300 font-mono text-center font-bold min-w-[140px] transition-all cursor-pointer shadow-inner"
                  style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
                  title="Yeni kısayol kaydetmek için tıklayın"
                >
                  {formatDisplayHotkey(config.hotkey)}
                </button>
                {savedSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                    <Check className="w-4 h-4" /> Kaydedildi
                  </span>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="border border-indigo-500 rounded-xl px-4 py-2 text-xs text-white font-mono text-center font-bold animate-pulse min-w-[150px]"
                  style={{ backgroundColor: 'rgba(99, 102, 241, 0.3)' }}
                >
                  {recordedCombo || 'Tuşlara basın...'}
                </div>

                <button
                  onClick={handleSaveHotkey}
                  disabled={!recordedCombo}
                  className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  style={{
                    backgroundColor: recordedCombo ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                    color: recordedCombo ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
                    border: recordedCombo ? '1px solid #059669' : '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: recordedCombo ? 'pointer' : 'not-allowed'
                  }}
                >
                  <Check className="w-3.5 h-3.5" /> Kaydet
                </button>

                <button
                  onClick={handleCancelRecord}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border border-white/10"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#f3f4f6' }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> İptal
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auto Paste Toggle */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Otomatik Yapıştırma (Auto-Paste)</h3>
              <p className="text-xs text-gray-400">Transkripsiyon tamamlandığında metni aktif imleç konumuna otomatik simüle ederek yapıştırır.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoPaste ?? true}
              onChange={(e) => handleChange('autoPaste', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* Sound Effects Toggle */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Sesli Bildirimler</h3>
              <p className="text-xs text-gray-400">Kayıt başladığında ve bittiğinde hafif bir bildirim sesi çalar.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.soundEffects ?? true}
              onChange={(e) => handleChange('soundEffects', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* Silence Sensitivity Slider */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Sessizlik & Gürültü Eşiği ({config.silenceThresholdDb || -55} dBFS)</h3>
            <p className="text-xs text-gray-400">Sessiz kayıtların API'ye gitmesini engeller ("Altyazı M.K." gibi hatalı metinleri önler).</p>
          </div>
        </div>
        <input
          type="range"
          min="-70"
          max="-30"
          value={config.silenceThresholdDb || -55}
          onChange={(e) => handleChange('silenceThresholdDb', parseInt(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>
    </div>
  );
}
