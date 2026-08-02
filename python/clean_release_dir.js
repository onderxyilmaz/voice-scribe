/**
 * Best-effort cleanup of previous win-unpacked output before packaging.
 * Avoids leftover locks/confusion across version bumps (output is always "release/").
 */
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const outDir = (pkg.build && pkg.build.directories && pkg.build.directories.output) || 'release';
const winUnpacked = path.join(__dirname, '..', outDir, 'win-unpacked');

if (!fs.existsSync(winUnpacked)) {
  console.log('✓ No previous win-unpacked to clean');
  process.exit(0);
}

try {
  fs.rmSync(winUnpacked, { recursive: true, force: true });
  console.log('✓ Removed', winUnpacked);
} catch (e) {
  console.warn('⚠️  Could not fully remove win-unpacked (file lock?):', e.message);
  console.warn('   Close VoiceScribe / Explorer windows using that folder, then retry.');
  process.exit(1);
}
