'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { projectFile, digestFile } = require('../util/project-files');
const { writeJson } = require('../util/fs-walk');

function fingerprint(store, tc, check) {
  if (!check || typeof check.command !== 'string' || !check.command || !Array.isArray(check.args) ||
      !check.args.every(arg => typeof arg === 'string') || !Array.isArray(check.inputs) || !check.inputs.length) {
    throw new Error(`Configure verification.${tc.id}: command, args e inputs (arquivos de implementacao/configuracao)`);
  }
  const files = [...new Set([tc.test_path, ...check.inputs])].sort().map(file => [file, digestFile(store.root, file)]);
  return crypto.createHash('sha256').update(JSON.stringify({ check, files, model: store.stateHash() })).digest('hex');
}
function evidencePath(store, id) {
  return projectFile(store.root, path.join(store.config.evidenceDir, 'tests', `${id}.json`));
}
function verifyTests(store) {
  const results = [];
  for (const tc of store.all('TestContract')) {
    const check = store.config.verification?.[tc.id];
    const hash = fingerprint(store, tc, check);
    const run = spawnSync(check.command, check.args, {
      cwd: store.root, encoding: 'utf8', shell: false, timeout: 60000, maxBuffer: 1024 * 1024,
    });
    const phase = !run.error && run.status === 0 ? 'green' : !run.error && run.status > 0 ? 'red' : 'error';
    const record = { id: tc.id, phase, fingerprint: hash, exitCode: run.status,
      command: [check.command, ...check.args], executedAt: new Date().toISOString(),
      stdout: run.stdout || '', stderr: run.stderr || '', error: run.error?.message,
      stable: hash === fingerprint(store, tc, check) };
    writeJson(evidencePath(store, tc.id), record);
    results.push(record);
  }
  return results;
}
function evidenceProblems(store, sprint) {
  if (!['SP3', 'SP4', 'SP5'].includes(sprint)) return [];
  const out = [];
  for (const tc of store.all('TestContract')) {
    try {
      const record = JSON.parse(fs.readFileSync(evidencePath(store, tc.id), 'utf8'));
      if (record.fingerprint !== fingerprint(store, tc, store.config.verification?.[tc.id]) ||
          !record.stable || record.phase !== tc.phase || record.phase === 'error') {
        throw new Error('evidencia ausente, divergente ou desatualizada');
      }
    } catch (error) { out.push({ id: tc.id, message: `Execute daia verify: ${error.message}` }); }
  }
  return out;
}
module.exports = { verifyTests, evidenceProblems, fingerprint };
