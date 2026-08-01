const { exec } = require('child_process');

class WindowsActionsEngine {
  constructor() {
    this.defaultActions = [
      {
        id: 'action-calc',
        trigger: 'hesap makinesi',
        categories: ['Uygulama', 'Araçlar'],
        actionType: 'app',
        command: 'calc.exe',
        enabled: true
      },
      {
        id: 'action-notepad',
        trigger: 'not defteri',
        categories: ['Uygulama', 'Metin'],
        actionType: 'app',
        command: 'notepad.exe',
        enabled: true
      },
      {
        id: 'action-browser',
        trigger: 'tarayıcıyı aç',
        categories: ['Uygulama', 'İnternet'],
        actionType: 'app',
        command: 'start https://www.google.com',
        enabled: true
      },
      {
        id: 'action-snip',
        trigger: 'ekran görüntüsü al',
        categories: ['Sistem', 'Ekran'],
        actionType: 'app',
        command: 'snippingtool.exe',
        enabled: true
      },
      {
        id: 'action-taskmgr',
        trigger: 'görev yöneticisi',
        categories: ['Sistem', 'Yönetim'],
        actionType: 'app',
        command: 'taskmgr.exe',
        enabled: true
      },
      {
        id: 'action-voldown',
        trigger: 'sesi kıs',
        categories: ['Medya', 'Ses'],
        actionType: 'powershell',
        command: '(new-object -com wscript.shell).SendKeys([char]174)',
        enabled: true
      },
      {
        id: 'action-volup',
        trigger: 'sesi aç',
        categories: ['Medya', 'Ses'],
        actionType: 'powershell',
        command: '(new-object -com wscript.shell).SendKeys([char]175)',
        enabled: true
      },
      {
        id: 'action-volmute',
        trigger: 'sessize al',
        categories: ['Medya', 'Ses'],
        actionType: 'powershell',
        command: '(new-object -com wscript.shell).SendKeys([char]173)',
        enabled: true
      },
      {
        id: 'action-lock',
        trigger: 'bilgisayarı kilitle',
        categories: ['Sistem', 'Güvenlik'],
        actionType: 'cmd',
        command: 'rundll32.exe user32.dll,LockWorkStation',
        enabled: true
      }
    ];
  }

  processText(text, config) {
    if (!config || config.enableWindowsActions === false) return { handled: false, text };

    const actionsList = config.windowsActions || this.defaultActions;
    const lowerText = text.toLowerCase().trim();

    for (const action of actionsList) {
      if (action.enabled === false) continue;
      const trigger = (action.trigger || '').toLowerCase().trim();
      if (!trigger) continue;

      if (lowerText.includes(trigger)) {
        console.log(`⚡ [VOICE ACTION DETECTED] Aksiyon tetiklendi: "${action.trigger}" -> ${action.command}`);
        this.executeCommand(action);
        return {
          handled: true,
          action,
          text
        };
      }
    }

    return { handled: false, text };
  }

  executeCommand(action) {
    let cmd = action.command;
    if (!cmd) return;

    if (action.actionType === 'powershell') {
      cmd = `powershell -c "${cmd.replace(/"/g, '\\"')}"`;
    }

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ [VOICE ACTION ERROR] Aksiyon çalıştırılamadı (${action.trigger}):`, error.message);
      } else {
        console.log(`✅ [VOICE ACTION SUCCESS] Aksiyon çalıştırıldı (${action.trigger})`);
      }
    });
  }
}

module.exports = new WindowsActionsEngine();
