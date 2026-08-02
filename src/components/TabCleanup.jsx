import React from 'react';
import { Sparkles, MessageSquareCode, Sliders, Zap } from 'lucide-react';

export default function TabCleanup({ config, setConfig, saveConfig }) {
  const handleChange = (key, value) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    saveConfig(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">AI Metin Temizleme & Kurallar</h2>
        <p className="text-xs text-gray-400">Dikte edilen ham konuşmayı yapay zeka ile dilbilgisi ve noktalama kurallarına göre düzenleyin.</p>
      </div>

      {/* Enable AI Cleanup Toggle */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">AI Metin Düzeltmeyi Aktif Et</h3>
              <p className="text-xs text-gray-400">Konuşma sırasındaki duraksamaları (ııı, şey), kekemelikleri ve imla hatalarını otomatik düzeltir.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableCleanup ?? true}
              onChange={(e) => handleChange('enableCleanup', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* Cleanup Provider + Model */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">Temizleme Sağlayıcısı & Modeli</h3>
            <p className="text-xs text-gray-400">API anahtarı API & Modeller sekmesinde tanımlanır. OpenRouter önerilir.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-gray-400 mb-1 block font-medium">Sağlayıcı</label>
            <select
              value={config.cleanupProvider || 'openrouter'}
              onChange={(e) => handleChange('cleanupProvider', e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="openrouter">OpenRouter (önerilen)</option>
              <option value="groq">Groq</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>

          {(config.cleanupProvider || 'openrouter') === 'openrouter' && (
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">OpenRouter Model</label>
              <select
                value={config.cleanupModel || 'google/gemini-2.5-flash-lite'}
                onChange={(e) => handleChange('cleanupModel', e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="google/gemini-2.5-flash-lite">google/gemini-2.5-flash-lite (En Hızlı & Hafif)</option>
                <option value="google/gemini-2.5-flash">google/gemini-2.5-flash (Gelişmiş Zeka)</option>
                <option value="openai/gpt-4o-mini">openai/gpt-4o-mini</option>
                <option value="anthropic/claude-3.5-haiku">anthropic/claude-3.5-haiku</option>
              </select>
            </div>
          )}

          {config.cleanupProvider === 'groq' && (
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Groq Model</label>
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
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">OpenAI Model</label>
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
      </div>

      {/* Custom Cleanup Prompt */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-3">
          <MessageSquareCode className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">Özel Düzeltme Talimatı (Prompt)</h3>
            <p className="text-xs text-gray-400">Düzeltme modeline nasıl davranması gerektiğini söyleyin.</p>
          </div>
        </div>

        <textarea
          rows={4}
          value={config.customPrompt || ''}
          onChange={(e) => handleChange('customPrompt', e.target.value)}
          className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-3 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
          placeholder="Dikte edilen konuşmayı düzelt..."
        />
      </div>

      {/* Thinking Effort */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-3 mb-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">Düşünme Seviyesi (Thinking Effort)</h3>
            <p className="text-xs text-gray-400">Modelin metin üzerinde düşünme derinliği.</p>
          </div>
        </div>

        <div className="flex gap-3">
          {['low', 'medium', 'high'].map((effort) => (
            <button
              key={effort}
              onClick={() => handleChange('thinkingEffort', effort)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                (config.thinkingEffort || 'medium') === effort
                  ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-sm'
                  : 'border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              {effort === 'low' ? 'Hızlı (Düşük)' : effort === 'medium' ? 'Dengeli (Orta)' : 'Derin (Yüksek)'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
