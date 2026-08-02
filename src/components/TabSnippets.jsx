import React, { useState } from 'react';
import { Zap, Plus, Trash2, Copy, Check, Search, AlignLeft, Tag, Edit2, Save, X } from 'lucide-react';

export default function TabSnippets({ config, setConfig, saveConfig, embedded = false }) {
  const [trigger, setTrigger] = useState('');
  const [expansion, setExpansion] = useState('');
  const [categories, setCategories] = useState(['Genel']);
  const [categoryInput, setCategoryInput] = useState('');
  const [search, setSearch] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editTrigger, setEditTrigger] = useState('');
  const [editExpansion, setEditExpansion] = useState('');
  const [editCategories, setEditCategories] = useState([]);
  const [editCategoryInput, setEditCategoryInput] = useState('');

  const snippetsList = Array.isArray(config.snippets) ? config.snippets : [];

  const getItemCategories = (item) => {
    if (Array.isArray(item.categories) && item.categories.length > 0) {
      return item.categories;
    }
    if (item.category && typeof item.category === 'string') {
      return item.category.split(',').map(s => s.trim()).filter(Boolean);
    }
    return ['Genel'];
  };

  const handleChangeConfig = (key, value) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    saveConfig(updated);
  };

  // Category Tag Input Handlers for New Snippet Form
  const addCategoryTag = (text) => {
    const tag = text.trim().replace(/,/g, '');
    if (tag && !categories.includes(tag)) {
      setCategories(prev => [...prev, tag]);
    }
  };

  const handleCategoryKeyDown = (e) => {
    if (e.key === ' ' || e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      addCategoryTag(categoryInput);
      setCategoryInput('');
    } else if (e.key === 'Backspace' && !categoryInput && categories.length > 0) {
      setCategories(prev => prev.slice(0, -1));
    }
  };

  const handleCategoryInputChange = (e) => {
    const val = e.target.value;
    if (val.includes(',') || val.includes(' ')) {
      const parts = val.split(/[, ]+/);
      parts.forEach(part => {
        if (part.trim()) addCategoryTag(part);
      });
      setCategoryInput('');
    } else {
      setCategoryInput(val);
    }
  };

  const handleRemoveCategoryTag = (tagToRemove) => {
    setCategories(prev => prev.filter(t => t !== tagToRemove));
  };

  // Category Tag Input Handlers for Edit Mode
  const addEditCategoryTag = (text) => {
    const tag = text.trim().replace(/,/g, '');
    if (tag && !editCategories.includes(tag)) {
      setEditCategories(prev => [...prev, tag]);
    }
  };

  const handleEditCategoryKeyDown = (e) => {
    if (e.key === ' ' || e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      addEditCategoryTag(editCategoryInput);
      setEditCategoryInput('');
    } else if (e.key === 'Backspace' && !editCategoryInput && editCategories.length > 0) {
      setEditCategories(prev => prev.slice(0, -1));
    }
  };

  const handleEditCategoryInputChange = (e) => {
    const val = e.target.value;
    if (val.includes(',') || val.includes(' ')) {
      const parts = val.split(/[, ]+/);
      parts.forEach(part => {
        if (part.trim()) addEditCategoryTag(part);
      });
      setEditCategoryInput('');
    } else {
      setEditCategoryInput(val);
    }
  };

  const handleRemoveEditCategoryTag = (tagToRemove) => {
    setEditCategories(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleAdd = () => {
    if (!trigger.trim() || !expansion.trim()) return;

    let finalCategories = [...categories];
    if (categoryInput.trim()) {
      const extra = categoryInput.trim().replace(/,/g, '');
      if (extra && !finalCategories.includes(extra)) {
        finalCategories.push(extra);
      }
    }
    if (finalCategories.length === 0) finalCategories = ['Genel'];

    const newSnippet = {
      id: Date.now().toString(),
      trigger: trigger.trim().toLowerCase(),
      expansion: expansion.trim(),
      categories: finalCategories
    };

    const updatedSnippets = [newSnippet, ...snippetsList];
    const updated = { ...config, snippets: updatedSnippets };
    setConfig(updated);
    saveConfig(updated);

    setTrigger('');
    setExpansion('');
    setCategories(['Genel']);
    setCategoryInput('');
  };

  const handleDelete = (id) => {
    const updatedSnippets = snippetsList.filter(item => item.id !== id);
    const updated = { ...config, snippets: updatedSnippets };
    setConfig(updated);
    saveConfig(updated);
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditTrigger(item.trigger);
    setEditExpansion(item.expansion);
    setEditCategories(getItemCategories(item));
    setEditCategoryInput('');
  };

  const handleSaveEdit = (id) => {
    if (!editTrigger.trim() || !editExpansion.trim()) return;

    let finalCategories = [...editCategories];
    if (editCategoryInput.trim()) {
      const extra = editCategoryInput.trim().replace(/,/g, '');
      if (extra && !finalCategories.includes(extra)) {
        finalCategories.push(extra);
      }
    }
    if (finalCategories.length === 0) finalCategories = ['Genel'];

    const updatedSnippets = snippetsList.map(item => {
      if (item.id === id) {
        return {
          ...item,
          trigger: editTrigger.trim().toLowerCase(),
          expansion: editExpansion.trim(),
          categories: finalCategories
        };
      }
      return item;
    });
    const updated = { ...config, snippets: updatedSnippets };
    setConfig(updated);
    saveConfig(updated);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const filteredSnippets = snippetsList.filter(item => {
    const searchLower = search.toLowerCase();
    const itemCats = getItemCategories(item).join(' ').toLowerCase();
    return (
      (item.trigger || '').toLowerCase().includes(searchLower) ||
      (item.expansion || '').toLowerCase().includes(searchLower) ||
      itemCats.includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {!embedded && (
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Metin Kısayolları</h2>
        <p className="text-xs text-gray-400">Söylenen ifadeyi uzun şablona genişlet.</p>
      </div>
      )}

      {/* Enable Toggle Card */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Sesli Metin Kısayollarını Aktif Et</h3>
              <p className="text-xs text-gray-400">Konuşma sırasında kısayol kelimesi geçtiğinde otomatik olarak şablon metinle değiştirilir.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleChangeConfig('enableSnippets', !(config.enableSnippets ?? true))}
            className={`w-5 h-5 flex items-center justify-center transition-all shadow-sm ${
              (config.enableSnippets ?? true)
                ? 'bg-indigo-600 border border-indigo-600 text-white'
                : 'bg-slate-900/80 border border-white/30 text-transparent hover:border-indigo-400'
            }`}
            style={{ borderRadius: '6px' }}
            title="Kısayolları Aç/Kapat"
          >
            {(config.enableSnippets ?? true) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
          </button>
        </div>
      </div>



      {/* Add New Snippet Form */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Yeni Metin Kısayolu Ekle</h3>
            <p className="text-xs text-gray-400">Sesli söyleyeceğiniz tetikleyici kelimeyi ve açılacak uzun metni tanımlayın.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Tetikleyici Kelime / İfade (Söylenecek Söz)</label>
              <input
                type="text"
                placeholder="Örn: ev adresim"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            
            {/* Interactive Multi-Tag Category Input with Generous Badge Padding */}
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Kategori / Etiketler (Boşluk veya Virgül ile Ekleyin)</label>
              <div className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-1.5 flex flex-wrap items-center gap-2 min-h-[44px] focus-within:border-indigo-500 transition-colors">
                {categories.map((cat, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 text-xs font-semibold shadow-sm"
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategoryTag(cat)}
                      className="hover:text-red-400 text-indigo-300 hover:bg-white/10 p-0.5 rounded transition-colors ml-0.5"
                      title="Etiketi Kaldır"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={categories.length === 0 ? "Örn: Adres, Banka..." : "Etiket ekle..."}
                  value={categoryInput}
                  onChange={handleCategoryInputChange}
                  onKeyDown={handleCategoryKeyDown}
                  className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-gray-500 min-w-[100px] py-1 shadow-none"
                  style={{ background: 'transparent', border: 'none', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-gray-400 mb-1 block font-medium">Yazılacak Uzun Metin / Şablon (Expansion)</label>
            <textarea
              rows={3}
              placeholder="Tetikleyici kelime söylendiğinde buradaki metin otomatik yazılacak..."
              value={expansion}
              onChange={(e) => setExpansion(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
            />
          </div>

          <button
            onClick={handleAdd}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" /> Kısayolu Kaydet
          </button>
        </div>
      </div>

      {/* Snippets List */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-purple-400" />
            <span>Kayıtlı Kısayollar ({snippetsList.length})</span>
          </h3>

          {/* Search Bar with Search Icon on the FAR RIGHT */}
          <div className="relative w-64" style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Kısayollarda ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 shadow-sm"
              style={{ backgroundColor: '#0f172a', color: '#ffffff', paddingRight: '3rem', paddingLeft: '0.875rem' }}
            />
            <div
              className="absolute inset-y-0 flex items-center pointer-events-none"
              style={{ position: 'absolute', right: '16px', top: '0', bottom: '0', height: '100%', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}
            >
              <Search className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        {filteredSnippets.length === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">Henüz kayıtlı metin kısayolu bulunamadı.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {filteredSnippets.map((item, idx) => {
              const isEditing = editingId === item.id;
              const itemCategories = getItemCategories(item);

              return (
                <div key={item.id || idx} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3 relative group hover:border-purple-500/30 transition-all">
                  {isEditing ? (
                    /* Inline Edit Mode with Matched Tag Input */
                    <div className="space-y-3 p-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 mb-1 block font-medium">Tetikleyici Kelime</label>
                          <input
                            type="text"
                            value={editTrigger}
                            onChange={(e) => setEditTrigger(e.target.value)}
                            className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400 font-mono shadow-inner"
                            style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 mb-1 block font-medium">Kategori / Etiketler</label>
                          <div className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl px-3.5 py-1.5 flex flex-wrap items-center gap-2 min-h-[44px]" style={{ backgroundColor: '#0f172a' }}>
                            {editCategories.map((cat, cIdx) => (
                              <span
                                key={cIdx}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 text-xs font-semibold shadow-sm"
                              >
                                <span>{cat}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditCategoryTag(cat)}
                                  className="hover:text-red-400 text-indigo-300 hover:bg-white/10 p-0.5 rounded transition-colors ml-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                            <input
                              type="text"
                              placeholder="Etiket ekle..."
                              value={editCategoryInput}
                              onChange={handleEditCategoryInputChange}
                              onKeyDown={handleEditCategoryKeyDown}
                              className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-gray-500 min-w-[80px] py-1 shadow-none"
                              style={{ backgroundColor: 'transparent', color: '#ffffff', border: 'none', outline: 'none' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 mb-1 block font-medium">Şablon Metin</label>
                        <textarea
                          rows={3}
                          value={editExpansion}
                          onChange={(e) => setEditExpansion(e.target.value)}
                          className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400 font-mono leading-relaxed shadow-inner"
                          style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> İptal
                        </button>
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shadow-md"
                        >
                          <Save className="w-3.5 h-3.5" /> Güncelle
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode with Generous Padding & Badges */
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* Trigger Name Badge with Padding */}
                          <span className="px-3.5 py-2.5 rounded-xl bg-purple-600/25 text-purple-200 font-mono font-bold text-xs border border-purple-500/40 shadow-sm">
                            "{item.trigger}"
                          </span>
                          
                          <span className="text-gray-500 font-bold">➔</span>
                          
                          {/* Category Badges with Padding */}
                          {itemCategories.map((cat, cIdx) => (
                            <span
                              key={cIdx}
                              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-semibold tracking-wide shadow-sm"
                            >
                              <Tag className="w-3.5 h-3.5 text-indigo-400" />
                              {cat}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleCopy(item.expansion, idx)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-600 text-gray-300 hover:text-white transition-colors"
                            title="Metni Kopyala"
                          >
                            {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-600 text-gray-300 hover:text-white transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-indigo-400 hover:text-white" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-600/80 text-red-400 hover:text-white transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-gray-200 font-mono whitespace-pre-wrap bg-slate-900/60 px-3.5 py-2.5 rounded-xl border border-white/5 leading-relaxed">
                        {item.expansion}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
