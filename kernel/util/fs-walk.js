'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Percorre um diretório recursivamente e devolve caminhos de arquivos
 * que casam com a extensão pedida. Diretórios ausentes devolvem lista vazia
 * em vez de lançar — um modelo incompleto é estado normal antes da SP1.
 */
function walk(dir, ext = '.json') {
  const found = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return found;
    throw new Error(`Falha ao ler o diretório ${dir}: ${err.message}`);
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(full, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext) && !entry.name.startsWith('_')) {
      found.push(full);
    }
  }
  return found.sort();
}

function readJson(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw new Error(`Falha ao ler ${file}: ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`JSON invalido em ${file}: ${err.message}`);
  }
}

function writeJson(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  } catch (err) {
    throw new Error(`Falha ao escrever ${file}: ${err.message}`);
  }
}

module.exports = { walk, readJson, writeJson };
