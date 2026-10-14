'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
function projectFile(root, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) throw new Error('Caminho relativo obrigatorio');
  const base = fs.realpathSync(root);
  const target = path.resolve(base, relative);
  if (!target.startsWith(base + path.sep)) throw new Error(`Caminho fora do projeto: ${relative}`);
  // Reject symlinks in every existing ancestor, including dangling links.
  let cursor = base;
  for (const part of path.relative(base, target).split(path.sep)) {
    cursor = path.join(cursor, part);
    try { if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error(`Link simbolico recusado: ${relative}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return target;
}
function digestFile(root, relative) {
  const file = projectFile(root, relative);
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function referencedFiles(doc) {
  return [...(doc.models || []).map(model => model.path), ...(doc.test_path ? [doc.test_path] : [])];
}
module.exports = { projectFile, digestFile, referencedFiles };
