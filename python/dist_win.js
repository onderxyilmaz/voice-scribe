/**
 * Windows release pipeline.
 *
 * Signing (optional):
 *   CSC_LINK = path to .pfx (or base64)
 *   CSC_KEY_PASSWORD = pfx password
 *
 * Without cert env → unsigned (SmartScreen uyarısı beklenir).
 * Force unsigned: VOICESCRIBE_FORCE_UNSIGNED=1
 *
 * Not: İkon damgalama (rcedit) imzayı bozar; exe imzası stamp sonrası atılır.
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const forceUnsigned = process.env.VOICESCRIBE_FORCE_UNSIGNED === '1';
const cscLink = process.env.CSC_LINK || process.env.WIN_CSC_LINK || '';
const cscPassword =
  process.env.CSC_KEY_PASSWORD !== undefined
    ? process.env.CSC_KEY_PASSWORD
    : process.env.WIN_CSC_KEY_PASSWORD !== undefined
      ? process.env.WIN_CSC_KEY_PASSWORD
      : null;
const hasCert = Boolean(cscLink) && !forceUnsigned;

function run(cmd, extraEnv = {}) {
  console.log('\n>', cmd);
  execSync(cmd, {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, FORCE_PYTHON_RUNTIME: process.env.FORCE_PYTHON_RUNTIME || '', ...extraEnv },
    shell: true
  });
}

function findSignTool() {
  const roots = [
    process.env['ProgramFiles(x86)'],
    process.env.ProgramFiles
  ].filter(Boolean);

  for (const base of roots) {
    const kit = path.join(base, 'Windows Kits', '10', 'bin');
    if (!fs.existsSync(kit)) continue;
    const versions = fs.readdirSync(kit).sort().reverse();
    for (const ver of versions) {
      const candidate = path.join(kit, ver, 'x64', 'signtool.exe');
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function signFile(filePath) {
  if (!hasCert) return;
  if (!fs.existsSync(filePath)) {
    console.warn('⚠️  [SIGN] Dosya yok, atlanıyor:', filePath);
    return;
  }

  // File-path PFX is the reliable path for signtool; base64 CSC_LINK is left to electron-builder.
  const pfxPath = cscLink && fs.existsSync(cscLink) ? cscLink : null;
  if (!pfxPath) {
    console.log('ℹ️  [SIGN] CSC_LINK dosya yolu değil; exe imzası electron-builder’a bırakılıyor.');
    return;
  }

  const signtool = findSignTool();
  if (!signtool) {
    console.warn('⚠️  [SIGN] signtool.exe bulunamadı. Windows SDK / Build Tools kurun.');
    return;
  }

  const args = [
    'sign',
    '/f', pfxPath,
    '/fd', 'sha256',
    '/td', 'sha256',
    '/tr', 'http://timestamp.digicert.com',
    filePath
  ];
  if (cscPassword !== null && cscPassword !== '') {
    args.splice(3, 0, '/p', cscPassword);
  }

  console.log(`🔐 [SIGN] ${path.basename(filePath)}`);
  const result = spawnSync(signtool, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`signtool failed for ${filePath}`);
  }
}

console.log(
  hasCert
    ? '🔐 [SIGN] Kod imzalama etkin (CSC_LINK mevcut)'
    : forceUnsigned
      ? 'ℹ️  [SIGN] VOICESCRIBE_FORCE_UNSIGNED=1 → imzasız build'
      : 'ℹ️  [SIGN] CSC_LINK yok → imzasız build (SmartScreen uyarısı beklenir)'
);

// Intermediate dir build: always skip auto cert discovery so rcedit can stamp first.
run('node python/prepare_python_runtime.js');
run('node python/build_paste.js');
run('npx vite build');
run('node python/clean_release_dir.js');
run('npx electron-builder --win --dir', { CSC_IDENTITY_AUTO_DISCOVERY: 'false' });
run('node python/stamp_icon.js');

const unpackedExe = path.join(root, 'release', 'win-unpacked', 'VoiceScribe.exe');
signFile(unpackedExe);

run('node python/write_app_update_yml.js');

// Final NSIS/portable: allow electron-builder to sign installers when cert env is set.
const packEnv = hasCert
  ? {}
  : { CSC_IDENTITY_AUTO_DISCOVERY: 'false' };
run('node python/package_nsis.js', packEnv);

if (hasCert) {
  const pkg = require('../package.json');
  const version = pkg.version;
  signFile(path.join(root, 'release', `VoiceScribe-Setup-${version}.exe`));
  signFile(path.join(root, 'release', `VoiceScribe-${version}.exe`));
}

console.log('\n✓ dist:win tamamlandı. Çıktı: release/');
