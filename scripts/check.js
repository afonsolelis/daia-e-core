'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
function check(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) check(file);
    else if (file.endsWith('.js')) {
      const run = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
      if (run.status !== 0) process.exitCode = 1;
    }
  }
}
for (const dir of ['bin', 'kernel', 'scripts', 'tests']) check(dir);
