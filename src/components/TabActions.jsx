import React, { useState } from 'react';
import { Terminal, Plus, Trash2, Check, Search, AlignLeft, Tag, Edit2, Save, X, Play, Monitor, Volume2, Cpu, ExternalLink } from 'lucide-react';

export default function TabActions({ config, setConfig, saveConfig }) {
  const [trigger, setTrigger] = useState('');
  const [command, setCommand] = useState('');
  const [actionType, setActionType] = useState('app');
  const [categories, setCategories] = useState(['Uygulama']);
  const [categoryInput, setCategoryInput] = useState('');
  const [search, setSearch] = useState('');
  const [testingId, setTestingId] = useState(null);

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editTrigger, setEditTrigger] = useState('');
  const [editCommand, setEditCommand] = useState('');
  const [editActionType, setEditActionType] = useState('app');
  const [editCategories, setEditCategories] = useState([]);
  const [editCategoryInput, setEditCategoryInput] = useState('');

  const defaultActions = [
    {
      id: 'default-calc',
      trigger: 'hesap makinesi',
      categories: ['Uygulama', 'Araçlar'],
      actionType: 'app',
      command: 'calc.exe',
      enabled: true
    },
    {
      id: 'default-notepad',
      trigger: 'not defteri',
      categories: ['Uygulama', 'Metin'],
      actionType: 'app',
      command: 'notepad.exe',
      enabled: true
    },
    {
      id: 'default-browser',
      trigger: 'tarayıcıyı aç',
      categories: ['Uygulama', 'İnternet'],
      actionType: 'app',
      command: 'start https://www.google.com',
      enabled: true
    },
    {
      id: 'default-snip',
      trigger: 'ekran görüntüsü al',
      categories: ['Sistem', 'Ekran'],
      actionType: 'app',
      command: 'snippingtool.exe',
      enabled: true
    },
    {
      id: 'default-taskmgr',
      trigger: 'görev yöneticisi',
      categories: ['Sistem', 'Yönetim'],
      actionType: 'app',
      command: 'taskmgr.exe',
      enabled: true
    },
    {
      id: 'default-voldown',
      trigger: 'sesi kıs',
      categories: ['Medya', 'Ses'],
      actionType: 'powershell',
      command: '(new-object -com wscript.shell).SendKeys([char]174)',
      enabled: true
    },
    {
      id: 'default-volup',
      trigger: 'sesi aç',
      categories: ['Medya', 'Ses'],
      actionType: 'powershell',
      command: '(new-object -com wscript.shell).SendKeys([char]175)',
      enabled: true
    },
    {
      id: 'default-volmute',
      trigger: 'sessize al',
      categories: ['Medya', 'Ses'],
      actionType: 'powershell',
      command: '(new-object -com wscript.shell).SendKeys([char]173)',
      enabled: true
    },
    {
      id: 'default-lock',
      trigger: 'bilgisayarı kilitle',
      categories: ['Sistem', 'Güvenlik'],
      actionType: 'cmd',
      command: 'rundll32.exe user32.dll,LockWorkStation',
      enabled: true
    }
  ];

  const actionsList = config.windowsActions || defaultActions;

  const getItemCategories = (item) => {
    if (Array.isArray(item.categories) && item.categories.length > 0) {
      return item.categories;
    }
    if (item.category && typeof item.category === 'string') {
      return item.category.split(',').map(s => s.trim()).filter(Boolean);
    }
    return ['Sistem'];
  };

  const handleChangeConfig = (key, value) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    saveConfig(updated);
  };

  // Category Tag Input Handlers for New Action Form
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
    if (!trigger.trim() || !command.trim()) return;

    let finalCategories = [...categories];
    if (categoryInput.trim()) {
      const extra = categoryInput.trim().replace(/,/g, '');
      if (extra && !finalCategories.includes(extra)) {
        finalCategories.push(extra);
      }
    }
    if (finalCategories.length === 0) finalCategories = ['Uygulama'];

    const newAction = {
      id: Date.now().toString(),
      trigger: trigger.trim().toLowerCase(),
      command: command.trim(),
      actionType,
      categories: finalCategories,
      enabled: true
    };

    const updatedActions = [newAction, ...actionsList];
    const updated = { ...config, windowsActions: updatedActions };
    setConfig(updated);
    saveConfig(updated);

    setTrigger('');
    setCommand('');
    setActionType('app');
    setCategories(['Uygulama']);
    setCategoryInput('');
  };

  const handleExecuteAction = (item) => {
    setTestingId(item.id);
    if (window.api && window.api.executeWindowsAction) {
      window.api.executeWindowsAction(item);
    }
    setTimeout(() => setTestingId(null), 1200);
  };

  const handleDelete = (id) => {
    const updatedActions = actionsList.filter(item => item.id !== id);
    const updated = { ...config, windowsActions: updatedActions };
    setConfig(updated);
    saveConfig(updated);
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditTrigger(item.trigger);
    setEditCommand(item.command);
    setEditActionType(item.actionType || 'app');
    setEditCategories(getItemCategories(item));
    setEditCategoryInput('');
  };

  const handleSaveEdit = (id) => {
    if (!editTrigger.trim() || !editCommand.trim()) return;

    let finalCategories = [...editCategories];
    if (editCategoryInput.trim()) {
      const extra = editCategoryInput.trim().replace(/,/g, '');
      if (extra && !finalCategories.includes(extra)) {
        finalCategories.push(extra);
      }
    }
    if (finalCategories.length === 0) finalCategories = ['Uygulama'];

    const updatedActions = actionsList.map(item => {
      if (item.id === id) {
        return {
          ...item,
          trigger: editTrigger.trim().toLowerCase(),
          command: editCommand.trim(),
          actionType: editActionType,
          categories: finalCategories
        };
      }
      return item;
    });
    const updated = { ...config, windowsActions: updatedActions };
    setConfig(updated);
    saveConfig(updated);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const filteredActions = actionsList.filter(item => {
    const searchLower = search.toLowerCase();
    const itemCats = getItemCategories(item).join(' ').toLowerCase();
    return (
      (item.trigger || '').toLowerCase().includes(searchLower) ||
      (item.command || '').toLowerCase().includes(searchLower) ||
      itemCats.includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Sesli Windows Aksiyonları (Voice Windows Actions)</h2>
        <p className="text-xs text-gray-400">Sesli komutlarla Windows uygulamalarını çalıştırın, ses seviyesini değiştirin veya sistem aksiyonlarını tetikleyin.</p>
      </div>

      {/* Enable Toggle Card with Custom Checkbox Standard */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Sesli Windows Aksiyonlarını Aktif Et</h3>
              <p className="text-xs text-gray-400">Konuşma sırasında aksiyon tetikleyici kelimesi geçtiğinde ilgili Windows komutu otomatik yürütülür.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleChangeConfig('enableWindowsActions', !(config.enableWindowsActions ?? true))}
            className={`w-5 h-5 flex items-center justify-center transition-all shadow-sm ${
              (config.enableWindowsActions ?? true)
                ? 'bg-indigo-600 border border-indigo-600 text-white'
                : 'bg-slate-900/80 border border-white/30 text-transparent hover:border-indigo-400'
            }`}
            style={{ borderRadius: '6px' }}
            title="Aksiyonları Aç/Kapat"
          >
            {(config.enableWindowsActions ?? true) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
          </button>
        </div>
      </div>

      {/* Add New Action Form */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Yeni Sesli Windows Aksiyonu Ekle</h3>
            <p className="text-xs text-gray-400">Söylenecek komut kelimesini ve çalıştırılacak Windows aksiyonunu veya program komutunu tanımlayın.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Tetikleyici Sesli Komut (Söylenecek Söz)</label>
              <input
                type="text"
                placeholder="Örn: hesap makinesini aç"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
              />
            </div>

            {/* Interactive Multi-Tag Category Input */}
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Kategori / Etiketler (Boşluk veya Virgül ile Ekleyin)</label>
              <div className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-1.5 flex flex-wrap items-center gap-2 min-h-[42px] focus-within:border-indigo-500 transition-colors" style={{ backgroundColor: '#0f172a' }}>
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
                  placeholder={categories.length === 0 ? "Örn: Uygulama, Sistem..." : "Etiket ekle..."}
                  value={categoryInput}
                  onChange={handleCategoryInputChange}
                  onKeyDown={handleCategoryKeyDown}
                  className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-gray-500 min-w-[100px] py-1 shadow-none"
                  style={{ backgroundColor: 'transparent', color: '#ffffff', border: 'none', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Aksiyon Tipi</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
              >
                <option value="app">Uygulama / Exe Çalıştır (App)</option>
                <option value="powershell">PowerShell Komutu</option>
                <option value="cmd">Windows CMD / Shell Komutu</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Çalıştırılacak Komut / Dosya Yolu (Command)</label>
              <input
                type="text"
                placeholder="Örn: calc.exe veya start https://google.com"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
              />
            </div>
          </div>

          <button
            onClick={handleAdd}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" /> Aksiyonu Kaydet
          </button>
        </div>
      </div>

      {/* Actions List */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-purple-400" />
            <span>Kayıtlı Windows Aksiyonları ({actionsList.length})</span>
          </h3>

          {/* Search Bar with Search Icon Standard */}
          <div className="relative w-64" style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Aksiyonlarda ara..."
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

        {filteredActions.length === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">Henüz kayıtlı sesli Windows aksiyonu bulunamadı.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {filteredActions.map((item, idx) => {
              const isEditing = editingId === item.id;
              const itemCategories = getItemCategories(item);
              const isTesting = testingId === item.id;

              return (
                <div key={item.id || idx} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3 relative group hover:border-purple-500/30 transition-all">
                  {isEditing ? (
                    /* Inline Edit Mode */
                    <div className="space-y-3 p-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 mb-1 block font-medium">Tetikleyici Komut</label>
                          <input
                            type="text"
                            value={editTrigger}
                            onChange={(e) => setEditTrigger(e.target.value)}
                            className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
                            style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 mb-1 block font-medium">Kategori / Etiketler</label>
                          <div className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl px-3.5 py-1.5 flex flex-wrap items-center gap-2 min-h-[42px]" style={{ backgroundColor: '#0f172a' }}>
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

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 mb-1 block font-medium">Aksiyon Tipi</label>
                          <select
                            value={editActionType}
                            onChange={(e) => setEditActionType(e.target.value)}
                            className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                            style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                          >
                            <option value="app">Uygulama / Exe</option>
                            <option value="powershell">PowerShell</option>
                            <option value="cmd">Windows CMD</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[10px] text-gray-400 mb-1 block font-medium">Komut / Dosya Yolu</label>
                          <input
                            type="text"
                            value={editCommand}
                            onChange={(e) => setEditCommand(e.target.value)}
                            className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
                            style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                          />
                        </div>
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
                    /* Display Mode */
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* Trigger Name Badge */}
                          <span className="px-3.5 py-2.5 rounded-xl bg-purple-600/25 text-purple-200 font-mono font-bold text-xs border border-purple-500/40 shadow-sm">
                            "{item.trigger}"
                          </span>
                          
                          <span className="text-gray-500 font-bold">➔</span>

                          {/* Category Badges */}
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
                            onClick={() => handleExecuteAction(item)}
                            className={`p-1.5 px-3 rounded-lg flex items-center gap-1 text-xs font-semibold transition-colors ${
                              isTesting
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white/5 hover:bg-emerald-600 text-emerald-400 hover:text-white'
                            }`}
                            title="Aksiyonu Şimdi Test Et"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>{isTesting ? 'Çalışıyor...' : 'Test Et'}</span>
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

                      <div className="text-xs text-gray-200 font-mono whitespace-pre-wrap bg-slate-900/60 px-3.5 py-2.5 rounded-xl border border-white/5 leading-relaxed flex items-center justify-between">
                        <span className="truncate">{item.command}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold shrink-0 ml-2 px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                          {item.actionType || 'app'}
                        </span>
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
