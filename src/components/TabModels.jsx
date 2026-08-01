import React from 'react';
import { Cpu, HardDrive, Cloud, Key, CheckCircle } from 'lucide-react';

export default function TabModels({ config, setConfig, saveConfig }) {
  const handleChange = (key, value) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    saveConfig(updated);
  };

  const providers = [
    { id: 'local_whisper', name: 'Yerel Whisper (Offline / 100% Çevrimdışı)', desc: 'Cihazınızın işlemcisinde çalışır. İnternet gerektirmez, %100 gizlidir ve tamamen ücretsizdir.', icon: HardDrive, tag: 'Önerilen (Gizli)' },
    { id: 'groq', name: 'Groq Cloud Whisper', desc: 'Ultra hızlı (100x daha hızlı). Groq LPU altyapısında Whisper-Large-v3-Turbo kullanır.', icon: Cloud, tag: 'Ultra Hızlı' },
    { id: 'openai', name: 'OpenAI Whisper API', desc: 'OpenAI resmi Whisper-1 modeli.', icon: Cloud, tag: 'Standart' },
    { id: 'openrouter', name: 'OpenRouter Audio', desc: 'Esnek OpenRouter sağlayıcısı üzerinden transkripsiyon.', icon: Cloud, tag: 'Esnek' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">API & Transkripsiyon Modelleri</h2>
        <p className="text-xs text-gray-400">Yerel çevrimdışı Whisper veya bulut sağlayıcıları arasında seçim yapın.</p>
      </div>

      {/* Provider Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => {
          const Icon = p.icon;
          const isSelected = (config.sttProvider || 'local_whisper') === p.id;
          return (
            <div
              key={p.id}
              onClick={() => handleChange('sttProvider', p.id)}
              className={`glass-card p-4 cursor-pointer relative transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                  : 'hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                    <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      {p.tag}
                    </span>
                  </div>
                </div>
                {isSelected && <CheckCircle className="w-4 h-4 text-indigo-400" />}
              </div>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">{p.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Local Whisper Configuration */}
      {config.sttProvider === 'local_whisper' && (
        <div className="glass-card p-5 space-y-4 border-indigo-500/30">
          <div className="flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Yerel Model Boyutu</h3>
              <p className="text-xs text-gray-400">Performans ve doğruluk dengesine göre model seçin.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-3 pt-2">
            {[
              { id: 'tiny', label: 'Tiny (Hızlı)', desc: '~75 MB' },
              { id: 'base', label: 'Base (Dengeli)', desc: '~145 MB' },
              { id: 'small', label: 'Small (Doğru)', desc: '~480 MB' },
              { id: 'medium', label: 'Medium (Yüksek)', desc: '~1.5 GB' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => handleChange('localWhisperModel', m.id)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  (config.localWhisperModel || 'base') === m.id
                    ? 'border-indigo-500 bg-indigo-500/20 text-white font-semibold'
                    : 'border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <div className="text-xs">{m.label}</div>
                <div className="text-[10px] opacity-60 mt-1">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cloud API Keys */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Key className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">Bulut API Anahtarları</h3>
            <p className="text-xs text-gray-400">Bulut sağlayıcılarını kullanmak için anahtarınızı girin. Bilgiler yerel cihazınızda saklanır.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-300 font-medium block mb-1">Groq API Key (Önerilen - Ücretsiz & Hızlı)</label>
            <input
              type="password"
              placeholder="gsk_..."
              value={config.groqApiKey || ''}
              onChange={(e) => handleChange('groqApiKey', e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-gray-300 font-medium block mb-1">OpenAI API Key</label>
            <input
              type="password"
              placeholder="sk-proj-..."
              value={config.openaiApiKey || ''}
              onChange={(e) => handleChange('openaiApiKey', e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-gray-300 font-medium block mb-1">OpenRouter API Key (Metin Temizleme için)</label>
            <input
              type="password"
              placeholder="sk-or-v1-..."
              value={config.openrouterApiKey || ''}
              onChange={(e) => handleChange('openrouterApiKey', e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
