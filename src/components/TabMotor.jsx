import React, { useEffect } from 'react';
import { HardDrive, Cloud, Key, CheckCircle, Sparkles, MessageSquareCode, Sliders, Zap } from 'lucide-react';

export default function TabMotor({ config, setConfig, saveConfig }) {
  const handleChange = (key, value) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    saveConfig(updated);
  };

  useEffect(() => {
    if (config.sttProvider === 'openrouter') {
      handleChange('sttProvider', 'local_whisper');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.sttProvider]);

  const providers = [
    { id: 'local_whisper', name: 'Yerel Whisper', desc: 'Gömülü motor — çevrimdışı. Türkçe için Small önerilir.', icon: HardDrive, tag: 'Önerilen' },
    { id: 'groq', name: 'Groq Cloud', desc: 'Whisper Large-v3 — yüksek doğruluk, düşük gecikme.', icon: Cloud, tag: 'Kalite' },
    { id: 'openai', name: 'OpenAI Whisper', desc: 'Resmi Whisper-1 API.', icon: Cloud, tag: 'Standart' }
  ];

  const selectedProvider = config.sttProvider === 'openrouter'
    ? 'local_whisper'
    : (config.sttProvider || 'local_whisper');

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Motor & API</h2>
        <p className="text-xs text-gray-400">Transkripsiyon sağlayıcısı, anahtarlar ve AI metin temizleme.</p>
      </div>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ses → Metin</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {providers.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedProvider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleChange('sttProvider', p.id)}
                className={`surface-panel p-4 text-left cursor-pointer transition-colors ${
                  isSelected ? 'border theme-border theme-accent-muted' : 'hover:bg-white/5'
                }`}
                style={isSelected ? { borderColor: 'var(--accent-color)' } : undefined}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${isSelected ? 'theme-accent-bg' : 'bg-white/5 text-gray-400'}`}>
                    <Icon className="w-4 h-4" style={isSelected ? { color: 'var(--on-accent, #042f2e)' } : undefined} />
                  </div>
                  {isSelected && <CheckCircle className="w-4 h-4 theme-accent-color" />}
                </div>
                <h4 className="text-sm font-semibold text-white">{p.name}</h4>
                <span className="chip-accent inline-block px-2 py-0.5 mt-1 text-[10px]">{p.tag}</span>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">{p.desc}</p>
              </button>
            );
          })}
        </div>

        {selectedProvider === 'local_whisper' && (
          <div className="surface-panel p-4 space-y-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 theme-accent-color" />
              <div>
                <h4 className="text-sm font-semibold text-white">Yerel model boyutu</h4>
                <p className="text-[11px] text-gray-400">Küçük modeller hızlı ama Türkçe kısa komutlarda zayıf kalır.</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'tiny', label: 'Tiny', desc: 'Hız', hint: '~75 MB' },
                { id: 'base', label: 'Base', desc: 'Hafif', hint: '~145 MB' },
                { id: 'small', label: 'Small', desc: 'Önerilen', hint: '~480 MB' },
                { id: 'medium', label: 'Medium', desc: 'En iyi', hint: '~1.5 GB' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleChange('localWhisperModel', m.id)}
                  className={`p-2.5 rounded-lg border text-center transition-colors ${
                    (config.localWhisperModel || 'small') === m.id
                      ? 'theme-accent-muted text-white font-semibold'
                      : 'border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                  style={(config.localWhisperModel || 'small') === m.id ? { borderColor: 'var(--accent-color)' } : undefined}
                >
                  <div className="text-xs">{m.label}</div>
                  <div className="text-[10px] theme-accent-color mt-0.5">{m.desc}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{m.hint}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedProvider === 'groq' && (
          <div className="surface-panel p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 theme-accent-color" />
              <div>
                <h4 className="text-sm font-semibold text-white">Groq Whisper modeli</h4>
                <p className="text-[11px] text-gray-400">Large-v3 daha doğru; Turbo daha hızlı ve ucuz.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'whisper-large-v3', label: 'Large-v3', desc: 'Yüksek doğruluk' },
                { id: 'whisper-large-v3-turbo', label: 'Large-v3 Turbo', desc: 'Daha hızlı' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleChange('sttModel', m.id)}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    (config.sttModel || 'whisper-large-v3') === m.id
                      ? 'theme-accent-muted text-white font-semibold'
                      : 'border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                  style={(config.sttModel || 'whisper-large-v3') === m.id ? { borderColor: 'var(--accent-color)' } : undefined}
                >
                  <div className="text-xs">{m.label}</div>
                  <div className="text-[10px] opacity-60 mt-1">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="surface-panel p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">API anahtarları</h3>
            <p className="text-[11px] text-gray-400">OS şifrelemesi (safeStorage) ile saklanır.</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {[
            { key: 'groqApiKey', label: 'Groq', placeholder: 'gsk_...' },
            { key: 'openaiApiKey', label: 'OpenAI', placeholder: 'sk-proj-...' },
            { key: 'openrouterApiKey', label: 'OpenRouter (cleanup)', placeholder: 'sk-or-v1-...' }
          ].map((field) => (
            <div key={field.key}>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">{field.label}</label>
              <input
                type="password"
                placeholder={field.placeholder}
                value={config[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                autoComplete="off"
                className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Metin temizleme</h3>

        <div className="surface-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg theme-accent-muted theme-accent-color">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">AI düzeltme</h4>
                <p className="text-[11px] text-gray-400">Duraksama ve imla temizliği.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableCleanup ?? true}
                onChange={(e) => handleChange('enableCleanup', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>
        </div>

        <div className="surface-panel p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 theme-accent-color" />
            <h4 className="text-sm font-semibold text-white">Sağlayıcı & model</h4>
          </div>
          <div>
            <label className="text-[11px] text-gray-400 mb-1 block font-medium">Sağlayıcı</label>
            <select
              value={config.cleanupProvider || 'openrouter'}
              onChange={(e) => handleChange('cleanupProvider', e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="openrouter">OpenRouter</option>
              <option value="groq">Groq</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>
          {(config.cleanupProvider || 'openrouter') === 'openrouter' && (
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">OpenRouter model</label>
              <select
                value={config.cleanupModel || 'google/gemini-2.5-flash-lite'}
                onChange={(e) => handleChange('cleanupModel', e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="google/gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
                <option value="google/gemini-2.5-flash">gemini-2.5-flash</option>
                <option value="openai/gpt-4o-mini">gpt-4o-mini</option>
                <option value="anthropic/claude-3.5-haiku">claude-3.5-haiku</option>
              </select>
            </div>
          )}
          {config.cleanupProvider === 'groq' && (
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Groq model</label>
              <select
                value={config.cleanupModelGroq || 'llama-3.1-8b-instant'}
                onChange={(e) => handleChange('cleanupModelGroq', e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
              </select>
            </div>
          )}
          {config.cleanupProvider === 'openai' && (
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">OpenAI model</label>
              <select
                value={config.cleanupModelOpenAI || 'gpt-4o-mini'}
                onChange={(e) => handleChange('cleanupModelOpenAI', e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4o">gpt-4o</option>
              </select>
            </div>
          )}
        </div>

        <div className="surface-panel p-4 space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquareCode className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-semibold text-white">Özel prompt</h4>
          </div>
          <textarea
            rows={3}
            value={config.customPrompt || ''}
            onChange={(e) => handleChange('customPrompt', e.target.value)}
            className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-3 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
            placeholder="Dikte edilen konuşmayı düzelt..."
            autoComplete="off"
          />
        </div>

        <div className="surface-panel p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-white">Düşünme seviyesi</h4>
          </div>
          <div className="flex gap-2">
            {['low', 'medium', 'high'].map((effort) => (
              <button
                key={effort}
                type="button"
                onClick={() => handleChange('thinkingEffort', effort)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  (config.thinkingEffort || 'medium') === effort
                    ? 'theme-accent-muted text-white'
                    : 'border-white/10 text-gray-400 hover:border-white/20'
                }`}
                style={(config.thinkingEffort || 'medium') === effort ? { borderColor: 'var(--accent-color)' } : undefined}
              >
                {effort === 'low' ? 'Hızlı' : effort === 'medium' ? 'Dengeli' : 'Derin'}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
