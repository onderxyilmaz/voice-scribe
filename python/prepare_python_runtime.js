/**
 * Builds a relocatable Windows Python runtime with faster-whisper for Setup packaging.
 * Output: <repo>/python-runtime/
 *
 * Skip if marker exists unless FORCE_PYTHON_RUNTIME=1
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execFileSync, execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const RUNTIME_DIR = path.join(ROOT, 'python-runtime');
const MARKER = path.join(RUNTIME_DIR, '.voicescribe-runtime-ok');
const PYTHON_VERSION = '3.11.9';
const EMBED_ZIP = `python-${PYTHON_VERSION}-embed-amd64.zip`;
const EMBED_URL = `https://www.python.org/ftp/python/${PYTHON_VERSION}/${EMBED_ZIP}`;
const GET_PIP_URL = 'https://bootstrap.pypa.io/get-pip.py';
const DEFAULT_MODEL = process.env.VOICESCRIBE_BUNDLE_MODEL || 'small';

function log(msg) {
  console.log(msg);
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    log(`⬇️  Downloading ${url}`);
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'VoiceScribe-RuntimeBuilder' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
    });
    req.on('error', (err) => {
      try { file.close(); fs.unlinkSync(dest); } catch (_) {}
      reject(err);
    });
  });
}

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function enableSiteInPth(runtimeDir) {
  const pth = fs.readdirSync(runtimeDir).find((f) => f.endsWith('._pth'));
  if (!pth) throw new Error('python*._pth not found in embeddable runtime');
  const pthPath = path.join(runtimeDir, pth);
  const zipName = fs.readdirSync(runtimeDir).find((f) => /^python\d+\d+\.zip$/i.test(f)) || 'python311.zip';
  const contents = [
    zipName,
    '.',
    'Lib\\site-packages',
    'import site',
    ''
  ].join('\n');
  fs.writeFileSync(pthPath, contents, 'utf8');
  log(`✓ Enabled site-packages in ${pth}`);
}

function runPython(runtimeDir, args, opts = {}) {
  const pythonExe = path.join(runtimeDir, 'python.exe');
  execFileSync(pythonExe, args, {
    cwd: runtimeDir,
    stdio: 'inherit',
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONUTF8: '1',
      PIP_DISABLE_PIP_VERSION_CHECK: '1'
    },
    ...opts
  });
}

async function main() {
  if (process.platform !== 'win32') {
    console.error('prepare_python_runtime.js currently supports Windows only.');
    process.exit(1);
  }

  if (fs.existsSync(MARKER) && process.env.FORCE_PYTHON_RUNTIME !== '1') {
    log(`✓ python-runtime already prepared (${MARKER}). Set FORCE_PYTHON_RUNTIME=1 to rebuild.`);
    return;
  }

  const cacheDir = path.join(ROOT, '.cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const zipPath = path.join(cacheDir, EMBED_ZIP);
  const getPipPath = path.join(cacheDir, 'get-pip.py');

  log('🧹 Recreating python-runtime...');
  rmrf(RUNTIME_DIR);
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });

  if (!fs.existsSync(zipPath)) {
    await download(EMBED_URL, zipPath);
  } else {
    log(`✓ Using cached ${EMBED_ZIP}`);
  }

  execSync(`tar -xf "${zipPath}" -C "${RUNTIME_DIR}"`, { stdio: 'inherit' });
  enableSiteInPth(RUNTIME_DIR);

  if (!fs.existsSync(getPipPath)) {
    await download(GET_PIP_URL, getPipPath);
  } else {
    log('✓ Using cached get-pip.py');
  }

  log('📦 Installing pip...');
  runPython(RUNTIME_DIR, [getPipPath, '--no-warn-script-location']);

  log('📦 Installing faster-whisper...');
  runPython(RUNTIME_DIR, ['-m', 'pip', 'install', '--no-warn-script-location', 'faster-whisper']);

  const modelsDir = path.join(RUNTIME_DIR, 'models');
  fs.mkdirSync(modelsDir, { recursive: true });

  log(`🧠 Prefetching Whisper model '${DEFAULT_MODEL}' into python-runtime/models ...`);
  const prefetch = `
import os
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
from faster_whisper import WhisperModel
WhisperModel("${DEFAULT_MODEL}", device="cpu", compute_type="int8", download_root=r"${modelsDir.replace(/\\/g, '\\\\')}")
print("MODEL_OK")
`;
  const prefetchPath = path.join(RUNTIME_DIR, '_prefetch_model.py');
  fs.writeFileSync(prefetchPath, prefetch, 'utf8');
  try {
    runPython(RUNTIME_DIR, [prefetchPath]);
  } finally {
    try { fs.unlinkSync(prefetchPath); } catch (_) {}
  }

  fs.writeFileSync(
    MARKER,
    [
      `python=${PYTHON_VERSION}`,
      `model=${DEFAULT_MODEL}`,
      `created=${new Date().toISOString()}`,
      ''
    ].join('\n'),
    'utf8'
  );

  log('✅ python-runtime ready for packaging.');
}

main().catch((err) => {
  console.error('❌ prepare_python_runtime failed:', err);
  process.exit(1);
});
