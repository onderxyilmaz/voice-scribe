const fs = require('fs');
const path = require('path');

/**
 * electron-builder --prepackaged does not generate app-update.yml.
 * Write it into <output>/win-unpacked/resources before NSIS/portable packaging.
 */
function main() {
  const pkg = require('../package.json');
  const outDir = (pkg.build && pkg.build.directories && pkg.build.directories.output) || 'release';
  const publish = (pkg.build && pkg.build.publish) || {};
  const resourcesDir = path.join(__dirname, '..', outDir, 'win-unpacked', 'resources');
  const dest = path.join(resourcesDir, 'app-update.yml');

  if (!fs.existsSync(resourcesDir)) {
    console.error('❌ resources dir not found:', resourcesDir);
    process.exit(1);
  }

  const owner = publish.owner || 'onderxyilmaz';
  const repo = publish.repo || 'voice-scribe';
  const contents = [
    'provider: github',
    `owner: ${owner}`,
    `repo: ${repo}`,
    'updaterCacheDirName: voicescribe-updater',
    ''
  ].join('\n');

  fs.writeFileSync(dest, contents, 'utf8');
  console.log('✓ Wrote', dest);
}

main();
