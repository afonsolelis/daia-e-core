'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Walks a directory recursively and returns the paths of the files that
 * match the given extension. A missing directory returns an empty list and
 * does not throw. An incomplete model is a normal state before SP1.
 */
function walk(dir, ext = '.json') {
  const found = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return found;
    throw new Error(`Cannot read the directory ${dir}: ${err.message}`);
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
    throw new Error(`Cannot read ${file}: ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`The JSON in ${file} is not valid: ${err.message}`);
  }
}

function writeJson(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  } catch (err) {
    throw new Error(`Cannot write ${file}: ${err.message}`);
  }
}

module.exports = { walk, readJson, writeJson };
