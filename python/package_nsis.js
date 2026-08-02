const { execSync } = require('child_process');
const path = require('path');
const pkg = require('../package.json');

const outDir = (pkg.build && pkg.build.directories && pkg.build.directories.output) || 'release';
const prepackaged = path.join(outDir, 'win-unpacked');

execSync(
  `npx electron-builder --win nsis portable --prepackaged "${prepackaged}"`,
  { stdio: 'inherit', shell: true, cwd: path.join(__dirname, '..') }
);
