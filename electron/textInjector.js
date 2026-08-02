const { clipboard } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

function resolveUnpackPath(fileName) {
  // Packaged files may live in app.asar; executables/scripts need asar.unpacked.
  const asPacked = path.join(__dirname, fileName);
  if (!__dirname.includes('app.asar')) {
    return asPacked;
  }
  const unpacked = path.join(__dirname.replace('app.asar', 'app.asar.unpacked'), fileName);
  if (fs.existsSync(unpacked)) return unpacked;
  return asPacked;
}

class TextInjector {
  /**
   * Pastes text into the currently active cursor position across Windows applications
   * @param {string} text The clean transcription text to paste
   */
  static pasteText(text) {
    if (!text || text.trim() === '') return;

    clipboard.writeText(text);

    const exePath = resolveUnpackPath('paste.exe');
    if (fs.existsSync(exePath)) {
      execFile(exePath, (err) => {
        if (err) console.error('❌ Text injection error (exe):', err);
      });
      return;
    }

    const scriptPath = resolveUnpackPath('paste.ps1');
    if (!fs.existsSync(scriptPath)) {
      console.error('❌ Text injection: paste.exe and paste.ps1 not found');
      return;
    }

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      (err, _stdout, stderr) => {
        if (err) console.error('❌ Text injection error (ps1):', stderr || err);
      }
    );
  }
}

module.exports = TextInjector;
