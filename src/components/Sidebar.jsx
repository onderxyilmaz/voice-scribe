import React, { useState } from 'react';
import { Settings, Cpu, Sparkles, BookOpen, Mic, History, PanelLeftClose, PanelLeft, Zap, Terminal } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const navItems = [
    { id: 'general', label: 'Genel', icon: Settings },
    { id: 'models', label: 'API & Modeller', icon: Cpu },
    { id: 'cleanup', label: 'Metin Temizleme', icon: Sparkles },
    { id: 'vocabulary', label: 'Özel Sözlük', icon: BookOpen },
    { id: 'snippets', label: 'Metin Kısayolları', icon: Zap },
    { id: 'actions', label: 'Windows Aksiyonları', icon: Terminal },
    { id: 'meeting', label: 'Toplantı & AI', icon: Mic },
    { id: 'history', label: 'Geçmiş Vault', icon: History }
  ];

  return (
    <div
      className={`h-full border-r theme-border flex flex-col justify-between p-3 select-none theme-sidebar-bg transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div>
        {/* App Title Header */}
        <div className="flex items-center justify-between px-1 pt-1 pb-2.5 mb-2.5 border-b border-white/5">
          {!isCollapsed ? (
            <div className="drag-region flex items-center gap-3 flex-1 overflow-hidden">
              <div className="w-8 h-8 rounded-xl theme-accent-bg flex items-center justify-center shadow-lg shrink-0">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <div className="truncate">
                <h1 className="text-sm font-bold text-white tracking-wide truncate">VoiceScribe</h1>
                <p className="text-[10px] theme-accent-color font-medium truncate">Akıllı Sesli Dikte AI</p>
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center py-0.5">
              <div className="w-8 h-8 rounded-xl theme-accent-bg flex items-center justify-center shadow-lg shrink-0">
                <Mic className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="space-y-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full relative group flex items-center rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-indigo-600/30 text-white border border-indigo-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'theme-accent-color' : 'text-gray-400'}`} />
                
                {!isCollapsed && <span className="truncate">{item.label}</span>}

                {/* Floating Tooltip when Collapsed */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-semibold rounded-xl shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 flex items-center gap-1.5">
                    <span>{item.label}</span>
                  </div>
                )}
              </button>
            );
          })}

          {/* Separator Line */}
          <div className="border-t border-white/5 pt-1 my-1" />

          {/* Toggle Sidebar Button Styled as Menu Item */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`w-full relative group flex items-center rounded-xl text-xs font-semibold transition-all duration-200 ${
              isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
            } text-gray-400 hover:text-white hover:bg-white/5 border border-transparent`}
          >
            {isCollapsed ? (
              <PanelLeft className="w-4 h-4 shrink-0 text-indigo-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4 shrink-0 text-gray-400" />
            )}

            {!isCollapsed && <span className="truncate">Menüyü Daralt</span>}

            {/* Floating Tooltip when Collapsed */}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-semibold rounded-xl shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 flex items-center gap-1.5">
                <span>Menüyü Genişlet</span>
              </div>
            )}
          </button>
        </nav>
      </div>

      {/* Footer Info */}
      <div className={`mt-2.5 pt-2.5 pb-1 border-t border-white/5 text-[11px] text-gray-400 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-2'}`}>
        {!isCollapsed ? (
          <>
            <span>Sürüm 1.0.2</span>
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Aktif
            </span>
          </>
        ) : (
          <div className="relative group cursor-pointer">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse block" />
            <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-emerald-400 text-[10px] font-semibold rounded-lg shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
              v1.0.2 Aktif
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
