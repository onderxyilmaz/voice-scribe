import React, { useState } from 'react';
import { BookOpen, Plus, Trash2, SpellCheck } from 'lucide-react';

export default function TabVocabulary({ config, setConfig, saveConfig }) {
  const [newWord, setNewWord] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');

  const vocabList = config.customVocabulary || [];

  const handleAdd = () => {
    if (!newWord.trim() || !newPhonetic.trim()) return;
    const updatedVocab = [...vocabList, { word: newWord.trim(), phonetic: newPhonetic.trim() }];
    const updated = { ...config, customVocabulary: updatedVocab };
    setConfig(updated);
    saveConfig(updated);
    setNewWord('');
    setNewPhonetic('');
  };

  const handleDelete = (index) => {
    const updatedVocab = vocabList.filter((_, i) => i !== index);
    const updated = { ...config, customVocabulary: updatedVocab };
    setConfig(updated);
    saveConfig(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Özel Kelime Sözlüğü (Custom Vocabulary)</h2>
        <p className="text-xs text-gray-400">Yapay zekanın fonetik olarak yanlış anladığı veya özel marka/terim adlarını otomatik düzeltmek için eşleyin.</p>
      </div>

      {/* Add New Entry Form */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <SpellCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Yeni Kelime Eşlemesi Ekle</h3>
            <p className="text-xs text-gray-400">Okunuş (fonetik) ile doğru yazılışını girin.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Yanlış okunuş (örn: vesekod)"
            value={newPhonetic}
            onChange={(e) => setNewPhonetic(e.target.value)}
            className="flex-1 bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
          <span className="text-gray-400 font-bold">➔</span>
          <input
            type="text"
            placeholder="Doğru yazılışı (örn: VS Code)"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            className="flex-1 bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Ekle
          </button>
        </div>
      </div>

      {/* Vocabulary List */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center justify-between mb-2">
          <span>Kayıtlı Kelime Listesi ({vocabList.length})</span>
        </h3>

        {vocabList.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">Henüz özel kelime eklenmedi.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {vocabList.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 font-mono">{item.phonetic}</span>
                  <span className="text-indigo-400 font-bold">➔</span>
                  <span className="text-white font-semibold">{item.word}</span>
                </div>
                <button
                  onClick={() => handleDelete(idx)}
                  className="text-gray-500 hover:text-red-400 p-1 rounded-lg transition-colors"
                  title="Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
