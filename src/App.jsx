import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TabHome from './components/TabHome';
import TabGeneral from './components/TabGeneral';
import TabMotor from './components/TabMotor';
import TabPersonal from './components/TabPersonal';
import TabMeeting from './components/TabMeeting';
import TabHistory from './components/TabHistory';
import FloatingHUD from './components/FloatingHUD';
import AppTooltip from './components/AppTooltip';
import { Minus, X, Power } from 'lucide-react';

const TAB_TITLES = {
  home: 'Ana',
  history: 'Geçmiş',
  meeting: 'Toplantı',
  motor: 'Motor & API',
  personal: 'Kişiselleştirme',
  general: 'Sistem',
  // legacy redirects
  models: 'Motor & API',
  cleanup: 'Motor & API',
  vocabulary: 'Kişiselleştirme',
  snippets: 'Kişiselleştirme',
  actions: 'Kişiselleştirme'
};

const LEGACY_TAB_MAP = {
  models: 'motor',
  cleanup: 'motor',
  vocabulary: 'personal',
  snippets: 'personal',
  actions: 'personal'
};

const PERSONAL_SUB_FROM_LEGACY = {
  vocabulary: 'vocabulary',
  snippets: 'snippets',
  actions: 'actions'
};

function resolveTheme(theme) {
  if (theme === 'lavender') return 'nord';
  return theme || 'day';
}

function normalizeTab(tab) {
  if (!tab) return 'home';
  return LEGACY_TAB_MAP[tab] || tab;
}

export default function App() {
  const [view, setView] = useState('dashboard');
  const [activeTab, setActiveTabRaw] = useState('home');
  const [personalSubTab, setPersonalSubTab] = useState('vocabulary');
  const [config, setConfig] = useState({});

  const setActiveTab = (tab) => {
    if (PERSONAL_SUB_FROM_LEGACY[tab]) {
      setPersonalSubTab(PERSONAL_SUB_FROM_LEGACY[tab]);
    }
    setActiveTabRaw(normalizeTab(tab));
  };

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'hud') {
      setView('hud');
    } else {
      setView('dashboard');
    }

    if (window.api) {
      window.api.getConfig().then((loaded) => {
        if (!loaded) return;
        if (loaded.activeTheme === 'lavender') {
          const migrated = { ...loaded, activeTheme: 'nord' };
          setConfig(migrated);
          window.api.saveConfig?.(migrated);
        } else {
          setConfig(loaded);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!window.api?.onNavigateTab) return undefined;
    return window.api.onNavigateTab((tab) => {
      if (!tab) return;
      setView('dashboard');
      setActiveTab(tab);
    });
  }, []);

  const saveConfig = async (newConfig) => {
    if (!window.api?.saveConfig) return { config: newConfig, hotkeyStatus: null };
    const result = await window.api.saveConfig(newConfig);
    if (result && result.config) {
      setConfig(result.config);
      return result;
    }
    if (result) setConfig(result);
    return { config: result || newConfig, hotkeyStatus: null };
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

  const activeTheme = resolveTheme(config.activeTheme);

  if (view === 'hud') {
    return (
      <div data-theme={activeTheme}>
        <FloatingHUD />
      </div>
    );
  }

  const pageTitle = TAB_TITLES[activeTab] || 'VoiceScribe';

  return (
    <div
      data-theme={activeTheme}
      className="w-screen h-screen flex text-gray-100 overflow-hidden border theme-border rounded-xl shadow-2xl theme-app-bg transition-colors duration-300"
    >
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="drag-region h-10 w-full shrink-0 flex items-center justify-between px-6 border-b theme-border theme-titlebar-bg">
          <div className="text-xs font-semibold text-gray-400">
            VoiceScribe
            <span className="text-gray-500 font-medium"> · {pageTitle}</span>
          </div>

          <div className="no-drag flex items-center gap-1">
            <AppTooltip content="Simge durumuna küçült" placement="bottom">
              <button
                type="button"
                onClick={handleMinimize}
                className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </AppTooltip>

            <AppTooltip content="Arka plan sistem tepsisine sakla" placement="bottom">
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-300 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </AppTooltip>

            <AppTooltip content="Uygulamadan tamamen çık" placement="bottom">
              <button
                type="button"
                onClick={handleQuit}
                className="p-1.5 hover:bg-red-600 hover:text-white rounded-md text-gray-400 transition-colors"
              >
                <Power className="w-3.5 h-3.5" />
              </button>
            </AppTooltip>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 40px)' }}>
          {activeTab === 'home' && <TabHome config={config} setActiveTab={setActiveTab} />}
          {activeTab === 'general' && <TabGeneral config={config} setConfig={setConfig} saveConfig={saveConfig} />}
          {activeTab === 'motor' && <TabMotor config={config} setConfig={setConfig} saveConfig={saveConfig} />}
          {activeTab === 'personal' && (
            <TabPersonal
              config={config}
              setConfig={setConfig}
              saveConfig={saveConfig}
              initialSubTab={personalSubTab}
            />
          )}
          {activeTab === 'meeting' && <TabMeeting />}
          {activeTab === 'history' && <TabHistory />}
        </div>
      </div>
    </div>
  );
}
