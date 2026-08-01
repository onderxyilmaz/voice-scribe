import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TabGeneral from './components/TabGeneral';
import TabModels from './components/TabModels';
import TabCleanup from './components/TabCleanup';
import TabVocabulary from './components/TabVocabulary';
import TabSnippets from './components/TabSnippets';
import TabActions from './components/TabActions';
import TabMeeting from './components/TabMeeting';
import TabHistory from './components/TabHistory';
import FloatingHUD from './components/FloatingHUD';
import { Minus, X, Power } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('general');
  const [config, setConfig] = useState({});

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'hud') {
      setView('hud');
    } else {
      setView('dashboard');
    }

    if (window.api) {
      window.api.getConfig().then(loaded => {
        if (loaded) setConfig(loaded);
      });
    }
  }, []);

  const saveConfig = (newConfig) => {
    if (window.api) {
      window.api.saveConfig(newConfig);
    }
  };

  const handleMinimize = () => {
    if (window.api) window.api.minimizeWindow();
  };

  const handleClose = () => {
    if (window.api) window.api.closeWindow();
  };

  const handleQuit = () => {
    if (window.api) window.api.quitApp();
  };

  if (view === 'hud') {
    return (
      <div data-theme={config.activeTheme || 'obsidian'}>
        <FloatingHUD />
      </div>
    );
  }

  const activeTheme = config.activeTheme || 'obsidian';

  return (
    <div
      data-theme={activeTheme}
      className="w-screen h-screen flex text-gray-100 overflow-hidden border theme-border rounded-xl shadow-2xl theme-app-bg transition-colors duration-300"
    >
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Custom Windows 11 Titlebar */}
        <div className="drag-region h-10 w-full shrink-0 flex items-center justify-between px-6 border-b theme-border theme-titlebar-bg">
          <div className="text-xs font-semibold text-gray-400">VoiceScribe — Windows 11 Dashboard</div>
          
          <div className="no-drag flex items-center gap-1">
            <button
              onClick={handleMinimize}
              className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
              title="Simge Durumuna Küçült"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-300 rounded-md transition-colors"
              title="Arka Plan Sistem Tepsisine Sakla (Tray)"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleQuit}
              className="p-1.5 hover:bg-red-600 hover:text-white rounded-md text-gray-400 transition-colors"
              title="Uygulamadan Tamamen Çık"
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Active Tab View Content */}
        <div className="flex-1 p-8 overflow-y-auto" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 40px)' }}>
          {activeTab === 'general' && <TabGeneral config={config} setConfig={setConfig} saveConfig={saveConfig} />}
          {activeTab === 'models' && <TabModels config={config} setConfig={setConfig} saveConfig={saveConfig} />}
          {activeTab === 'cleanup' && <TabCleanup config={config} setConfig={setConfig} saveConfig={saveConfig} />}
          {activeTab === 'vocabulary' && <TabVocabulary config={config} setConfig={setConfig} saveConfig={saveConfig} />}
          {activeTab === 'snippets' && <TabSnippets config={config} setConfig={setConfig} saveConfig={saveConfig} />}
          {activeTab === 'actions' && <TabActions config={config} setConfig={setConfig} saveConfig={saveConfig} />}
          {activeTab === 'meeting' && <TabMeeting />}
          {activeTab === 'history' && <TabHistory />}
        </div>
      </div>
    </div>
  );
}
