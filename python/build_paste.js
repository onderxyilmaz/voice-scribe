/**
 * Compiles electron/paste.cs → electron/paste.exe (Windows .NET Framework csc).
 * Skips if paste.exe already exists unless FORCE_PASTE_BUILD=1.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CS = path.join(ROOT, 'electron', 'paste.cs');
const EXE = path.join(ROOT, 'electron', 'paste.exe');
const FORCE = process.env.FORCE_PASTE_BUILD === '1';

const CSC_CANDIDATES = [
  path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
  path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')
];

function findCsc() {
  for (const p of CSC_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

if (!fs.existsSync(CS)) {
  console.error('❌ paste.cs not found:', CS);
  process.exit(1);
}

if (fs.existsSync(EXE) && !FORCE) {
  console.log('✓ paste.exe already present, skip compile');
  process.exit(0);
}

const csc = findCsc();
if (!csc) {
  console.error('❌ csc.exe not found. Install .NET Framework 4.x targeting pack / developer tools.');
  process.exit(1);
}

console.log('Compiling paste.exe with', csc);
execFileSync(csc, ['/nologo', '/target:exe', `/out:${EXE}`, CS], { stdio: 'inherit' });

if (!fs.existsSync(EXE)) {
  console.error('❌ paste.exe was not produced');
  process.exit(1);
}

console.log('✓ Built', EXE);
