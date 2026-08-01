import React from 'react';
import { Settings, Cpu, Sparkles, BookOpen, Mic, History } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'general', label: 'Genel', icon: Settings },
    { id: 'models', label: 'API & Modeller', icon: Cpu },
    { id: 'cleanup', label: 'Metin Temizleme', icon: Sparkles },
    { id: 'vocabulary', label: 'Özel Sözlük', icon: BookOpen },
    { id: 'meeting', label: 'Toplantı & AI', icon: Mic },
    { id: 'history', label: 'Geçmiş Vault', icon: History }
  ];

  return (
    <div className="w-64 h-full border-r theme-border flex flex-col justify-between p-4 select-none theme-sidebar-bg transition-colors duration-300">
      <div>
        {/* App Title Header */}
        <div className="drag-region flex items-center gap-3 px-3 py-4 mb-6">
          <div className="w-9 h-9 rounded-xl theme-accent-bg flex items-center justify-center shadow-lg">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">VoiceScribe</h1>
            <p className="text-[11px] theme-accent-color font-medium">Akıllı Sesli Dikte AI</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600/30 text-white border border-indigo-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'theme-accent-color' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="px-3 py-3 border-t border-white/5 text-[11px] text-gray-400 flex items-center justify-between">
        <span>Sürüm 1.0.0</span>
        <span className="inline-flex items-center gap-1 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Aktif
        </span>
      </div>
    </div>
  );
}
