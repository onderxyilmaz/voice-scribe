/**
 * Wait until Vite dev server answers before launching Electron.
 * Tries both localhost and 127.0.0.1 (Windows IPv6/IPv4 mismatch).
 */
const http = require('http');

const candidates = [
  process.env.VITE_DEV_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://[::1]:5173'
].filter(Boolean);

const timeoutMs = Number(process.env.VITE_WAIT_TIMEOUT_MS || 60000);
const intervalMs = 250;
const start = Date.now();

function probe(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function wait() {
  console.log(`⏳ Waiting for Vite (${candidates.join(' | ')}) ...`);

  while (Date.now() - start < timeoutMs) {
    for (const url of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await probe(url);
      if (ok) {
        console.log(`✓ Vite ready at ${url}`);
        process.exit(0);
      }
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  console.error(`❌ Timed out waiting for Vite after ${timeoutMs}ms`);
  process.exit(1);
}

wait();
