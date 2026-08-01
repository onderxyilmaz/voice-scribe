const { rcedit } = require('rcedit');
const path = require('path');
const fs = require('fs');

async function main() {
  const exePath = path.join(__dirname, '../release/win-unpacked/VoiceScribe.exe');
  const iconPath = path.join(__dirname, '../electron/icon.ico');

  if (!fs.existsSync(exePath)) {
    console.error('❌ Exe not found:', exePath);
    return;
  }

  console.log('Stamping custom icon into binary:', exePath);
  try {
    await rcedit(exePath, {
      'icon': iconPath,
      'version-string': {
        'CompanyName': 'Önder Yılmaz',
        'LegalCopyright': 'Copyright © 2026 Önder Yılmaz',
        'FileDescription': 'VoiceScribe — Windows 11 Akıllı Dikte',
        'ProductName': 'VoiceScribe'
      }
    });
    console.log('✓ SUCCESS: Stamped custom icon.ico into VoiceScribe.exe binary!');
  } catch (err) {
    console.error('❌ Error stamping icon:', err);
  }
}

main();
