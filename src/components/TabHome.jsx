import React, { useEffect, useState } from 'react';
import { Keyboard, Cpu, Sparkles, History, Mic, ArrowRight, FileText } from 'lucide-react';

const STT_LABELS = {
  local_whisper: 'Yerel Whisper',
  groq: 'Groq Cloud',
  openai: 'OpenAI Whisper',
  openrouter: 'Yerel Whisper'
};

function formatHotkey(hotkey) {
  if (!hotkey) return 'Ctrl + Shift + Space';
  return hotkey
    .replace(/CommandOrControl/gi, 'Ctrl')
    .replace(/Control/gi, 'Ctrl')
    .replace(/\+/g, ' + ');
}

export default function TabHome({ config, setActiveTab }) {
  const [lastItem, setLastItem] = useState(null);

  useEffect(() => {
    if (!window.api?.getHistory) return;
    window.api.getHistory().then((history) => {
      if (Array.isArray(history) && history.length > 0) {
        setLastItem(history[0]);
      }
    }).catch(() => {});
  }, []);

  const stt = STT_LABELS[config.sttProvider] || config.sttProvider || 'Yerel Whisper';
  const cleanupOn = config.enableCleanup !== false;

  const lastMode = (() => {
    if (!lastItem) return null;
    if (lastItem.mode) return lastItem.mode;
    const clean = String(lastItem.cleanText || '');
    if (clean.startsWith('⚡')) return 'action';
    if (clean.startsWith('🎯')) return 'command_miss';
    return 'dictation';
  })();

  const lastModeLabel =
    lastMode === 'action' ? 'Son aksiyon' :
    lastMode === 'command_miss' ? 'Son komut (eşleşmedi)' :
    'Son dikte';

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">VoiceScribe</h2>
        <p className="text-sm text-gray-400">Kısayolla dikte et — metin aktif imlece yapıştırılır.</p>
      </div>

      <div className="surface-panel p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg theme-accent-muted theme-accent-color">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Global kısayol</div>
              <div className="text-base font-semibold text-white font-mono">{formatHotkey(config.hotkey)}</div>
            </div>
          </div>
          <span className="chip-accent px-3 py-1.5 inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Hazır
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Cpu className="w-3.5 h-3.5 theme-accent-color" />
            STT: <span className="text-white font-medium">{stt}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Sparkles className="w-3.5 h-3.5 theme-accent-color" />
            Cleanup: <span className="text-white font-medium">{cleanupOn ? 'Açık' : 'Kapalı'}</span>
          </div>
        </div>
      </div>

      <div className="surface-panel p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 theme-accent-color" />
            <h3 className="text-sm font-semibold text-white">{lastModeLabel}</h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className="text-[11px] theme-accent-color hover:text-white flex items-center gap-1"
          >
            Geçmiş <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {lastItem ? (
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
            {lastItem.cleanText || lastItem.rawText || '—'}
          </p>
        ) : (
          <p className="text-xs text-gray-500">
            Henüz kayıt yok. Kısayolu kullanarak ilk dikteni dene.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { id: 'motor', label: 'Motor & API', desc: 'STT ve temizleme', icon: Cpu },
          { id: 'history', label: 'Geçmiş', desc: 'Önceki metinler', icon: History },
          { id: 'meeting', label: 'Toplantı', desc: 'Kayıt ve özet', icon: Mic }
        ].map((cta) => {
          const Icon = cta.icon;
          return (
            <button
              key={cta.id}
              type="button"
              onClick={() => setActiveTab(cta.id)}
              className="surface-panel p-4 text-left hover:bg-white/5 transition-colors border border-white/10"
            >
              <Icon className="w-4 h-4 theme-accent-color mb-2" />
              <div className="text-sm font-semibold text-white">{cta.label}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{cta.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
