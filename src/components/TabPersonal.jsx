import React, { useState, useEffect } from 'react';
import { BookOpen, Zap, Terminal } from 'lucide-react';
import TabVocabulary from './TabVocabulary';
import TabSnippets from './TabSnippets';
import TabActions from './TabActions';

const SUB_TABS = [
  { id: 'vocabulary', label: 'Sözlük', icon: BookOpen },
  { id: 'snippets', label: 'Kısayollar', icon: Zap },
  { id: 'actions', label: 'Aksiyonlar', icon: Terminal }
];

export default function TabPersonal({ config, setConfig, saveConfig, initialSubTab = 'vocabulary' }) {
  const [subTab, setSubTab] = useState(
    SUB_TABS.some((t) => t.id === initialSubTab) ? initialSubTab : 'vocabulary'
  );

  useEffect(() => {
    if (SUB_TABS.some((t) => t.id === initialSubTab)) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Kişiselleştirme</h2>
        <p className="text-xs text-gray-400">Sözlük, metin kısayolları ve sesli Windows aksiyonları.</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                active ? 'theme-accent-muted theme-accent-color' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {subTab === 'vocabulary' && (
          <TabVocabulary config={config} setConfig={setConfig} saveConfig={saveConfig} embedded />
        )}
        {subTab === 'snippets' && (
          <TabSnippets config={config} setConfig={setConfig} saveConfig={saveConfig} embedded />
        )}
        {subTab === 'actions' && (
          <TabActions config={config} setConfig={setConfig} saveConfig={saveConfig} embedded />
        )}
      </div>
    </div>
  );
}
