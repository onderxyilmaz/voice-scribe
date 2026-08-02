import React, { useState, useEffect } from 'react';
import {
  Settings, Cpu, Mic, History, PanelLeftClose, PanelLeft, Home, Layers
} from 'lucide-react';
import AppTooltip from './AppTooltip';

const NAV_GROUPS = [
  {
    label: 'Dikte',
    items: [
      { id: 'home', label: 'Ana', icon: Home },
      { id: 'history', label: 'Geçmiş', icon: History },
      { id: 'meeting', label: 'Toplantı', icon: Mic }
    ]
  },
  {
    label: 'Ayarlar',
    items: [
      { id: 'motor', label: 'Motor & API', icon: Cpu },
      { id: 'personal', label: 'Kişiselleştirme', icon: Layers },
      { id: 'general', label: 'Sistem', icon: Settings }
    ]
  }
];

export default function Sidebar({ activeTab, setActiveTab }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [appVersion, setAppVersion] = useState('—');

  useEffect(() => {
    if (window.api && window.api.getAppVersion) {
      window.api.getAppVersion().then((v) => {
        if (v) setAppVersion(v);
      });
    }
  }, []);

  const wrapTip = (label, node) => (
    <AppTooltip content={label} placement="right" disabled={!isCollapsed}>
      {node}
    </AppTooltip>
  );

  return (
    <div
      className={`h-full border-r theme-border flex flex-col justify-between select-none theme-sidebar-bg transition-all duration-300 overflow-x-hidden ${
        isCollapsed ? 'w-16 p-2' : 'w-64 p-3'
      }`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-between px-1 pt-1 pb-2.5 mb-2 border-b border-white/5">
          {!isCollapsed ? (
            <div className="drag-region flex items-center gap-3 flex-1 overflow-hidden min-w-0">
              <div className="w-8 h-8 rounded-xl theme-accent-bg flex items-center justify-center shrink-0 logo-mark">
                <Mic className="w-4 h-4" style={{ color: 'var(--on-accent, #042f2e)' }} />
              </div>
              <div className="truncate min-w-0">
                <h1 className="text-sm font-bold text-white tracking-wide truncate">VoiceScribe</h1>
                <p className="text-[10px] theme-accent-color font-medium truncate">Sesli dikte</p>
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center py-0.5">
              <div className="w-8 h-8 rounded-xl theme-accent-bg flex items-center justify-center shrink-0 logo-mark">
                <Mic className="w-4 h-4" style={{ color: 'var(--on-accent, #042f2e)' }} />
              </div>
            </div>
          )}
        </div>

        <nav className="space-y-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!isCollapsed && <div className="nav-group-label">{group.label}</div>}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const button = (
                    <button
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full relative group flex items-center rounded-lg text-xs font-semibold transition-colors ${
                        isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
                      } ${
                        isActive
                          ? 'theme-accent-muted text-white border theme-border'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'theme-accent-color' : 'text-gray-400'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );

                  return (
                    <React.Fragment key={item.id}>
                      {wrapTip(item.label, button)}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="border-t border-white/5 pt-2">
            {wrapTip(
              'Menüyü Genişlet',
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`w-full relative group flex items-center rounded-lg text-xs font-semibold transition-colors ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
                } text-gray-400 hover:text-white hover:bg-white/5 border border-transparent`}
              >
                {isCollapsed ? (
                  <PanelLeft className="w-4 h-4 shrink-0 theme-accent-color" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 shrink-0 text-gray-400" />
                )}
                {!isCollapsed && <span className="truncate">Menüyü Daralt</span>}
              </button>
            )}
          </div>
        </nav>
      </div>

      <div className={`mt-2 pt-2.5 border-t border-white/5 text-[11px] text-gray-400 flex items-center shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between px-2'}`}>
        {!isCollapsed ? (
          <>
            <span>v{appVersion}</span>
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Aktif
            </span>
          </>
        ) : (
          wrapTip(
            `v${appVersion} · Aktif`,
            <div className="cursor-default p-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse block" />
            </div>
          )
        )}
      </div>
    </div>
  );
}
