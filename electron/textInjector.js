const { clipboard } = require('electron');
const { exec } = require('child_process');
const path = require('path');

class TextInjector {
  /**
   * Pastes text into the currently active cursor position across Windows applications
   * @param {string} text The clean transcription text to paste
   */
  static pasteText(text) {
    if (!text || text.trim() === '') return;

    // Set transcription to Windows clipboard
    clipboard.writeText(text);

    // Call paste.ps1 script with P/Invoke keybd_event
    const scriptPath = path.join(__dirname, 'paste.ps1');
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error('Text injection error:', stderr || err);
      }
    });
  }
}

module.exports = TextInjector;
