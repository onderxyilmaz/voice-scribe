import React, { useState, useEffect } from 'react';
import { History, Search, Copy, Check, Trash2, Calendar, Clock } from 'lucide-react';

export default function TabHistory() {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    if (window.api) {
      const items = await window.api.getHistory();
      setHistory(items || []);
    } else {
      // Demo fallback history
      setHistory([
        {
          id: '1',
          timestamp: new Date().toISOString(),
          rawText: 'merhaba bugün hava çok güzel ve proje dikte tamamlanıyor',
          cleanText: 'Merhaba, bugün hava çok güzel ve Dikte projesi tamamlanıyor.',
          duration: '00:04',
          provider: 'groq'
        }
      ]);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleClearAll = async () => {
    if (window.api) {
      await window.api.clearHistory();
      setHistory([]);
    }
  };

  const filteredHistory = history.filter(item =>
    (item.cleanText || item.rawText || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Geçmiş Vault (Transcription History)</h2>
          <p className="text-xs text-gray-400">Tüm sesli dikteleriniz ve AI tarafından temizlenmiş metinler burada saklanır.</p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Tümünü Temizle
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Geçmiş transkripsiyonlarda ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* History Items List */}
      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {filteredHistory.length === 0 ? (
          <div className="glass-card p-12 text-center text-gray-500 text-xs">
            Henüz transkripsiyon kaydı bulunamadı.
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div key={item.id} className="glass-card p-4 space-y-2 relative group hover:border-indigo-500/40">
              <div className="flex items-center justify-between text-[11px] text-gray-400 border-b border-white/5 pb-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-400" />
                    {new Date(item.timestamp).toLocaleDateString('tr-TR')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    {new Date(item.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-mono text-[10px]">
                    {item.provider}
                  </span>
                  <button
                    onClick={() => handleCopy(item.cleanText || item.rawText, item.id)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-600 text-gray-300 hover:text-white transition-colors"
                    title="Kopyala"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Clean Text */}
              <div className="text-xs text-gray-100 font-medium leading-relaxed">
                {item.cleanText || item.rawText}
              </div>

              {/* Raw Text comparison if modified */}
              {item.rawText && item.cleanText && item.rawText !== item.cleanText && (
                <div className="text-[11px] text-gray-500 italic bg-white/5 p-2 rounded-lg">
                  Ham: "{item.rawText}"
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
