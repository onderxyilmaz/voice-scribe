const { clipboard } = require('electron');
const { execFile, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class TextInjector {
  /**
   * Pastes text into the currently active cursor position across Windows applications
   * @param {string} text The clean transcription text to paste
   */
  static pasteText(text) {
    if (!text || text.trim() === '') return;

    // 1. Copy transcription text to Windows Clipboard
    clipboard.writeText(text);

    // 2. Execute fast native paste.exe or fallback to paste.ps1
    const exePath = path.join(__dirname, 'paste.exe');

    if (fs.existsSync(exePath)) {
      execFile(exePath, (err) => {
        if (err) console.error('❌ Text injection error (exe):', err);
      });
    } else {
      const scriptPath = path.join(__dirname, 'paste.ps1');
      const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;
      exec(cmd, (err, stdout, stderr) => {
        if (err) console.error('❌ Text injection error (ps1):', stderr || err);
      });
    }
  }
}

module.exports = TextInjector;
