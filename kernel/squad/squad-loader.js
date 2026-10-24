'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Loads and validates the DAIA-E squad.
 *
 * Art. XI: the source of truth is `squads/`. An agent definition is markdown
 * with plain YAML frontmatter, with no IDE path and no script call. This
 * loader verifies that property. It does not trust it.
 *
 * The frontmatter parser covers the subset of the contract: scalars, inline
 * lists and block lists. It is not a full YAML parser, and it does not try to
 * be one. The agent contract is small by design.
 */

const REQUIRED_KEYS = ['id', 'name', 'sprint', 'views', 'bok', 'gate', 'skills', 'produces'];
const REQUIRED_SECTIONS = [
  '## Role',
  '## Key question',
  '## What you produce',
  '## What you do not do',
  '## Procedure',
  '## Mandatory rules',
];

/** The patterns that break the portability that Art. XI makes mandatory. */
const PORTABILITY_VIOLATIONS = [
  { pattern: /\.(claude|codex|cursor|gemini|grok|antigravity)\//, label: 'IDE path' },
  { pattern: /\brequire\(|\bnode\s+\S+\.js/, label: 'script call' },
  { pattern: /permission_mode|prompt_mode|subagent_type/, label: 'runtime-specific directive' },
];

function parseScalar(raw) {
  const value = raw.trim();
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  return value.replace(/^["']|["']$/g, '');
}

function parseFrontmatter(text, file) {
  if (!text.startsWith('---')) {
    throw new Error(`${path.basename(file)}: no YAML frontmatter`);
  }
  const end = text.indexOf('\n---', 3);
  if (end === -1) throw new Error(`${path.basename(file)}: the frontmatter is not closed`);

  const block = text.slice(4, end);
  const data = {};
  let currentListKey = null;

  for (const line of block.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && currentListKey) {
      data[currentListKey].push(parseScalar(listItem[1]));
      continue;
    }
    const pair = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!pair) continue;
    const [, key, rawValue] = pair;
    if (rawValue.trim() === '') {
      data[key] = [];
      currentListKey = key;
    } else {
      data[key] = parseScalar(rawValue);
      currentListKey = null;
    }
  }
  return { frontmatter: data, body: text.slice(end + 4) };
}

function loadAgent(file) {
  const text = fs.readFileSync(file, 'utf8');
  const { frontmatter, body } = parseFrontmatter(text, file);
  const problems = [];

  for (const key of REQUIRED_KEYS) {
    if (frontmatter[key] === undefined) problems.push(`a mandatory field is missing in the frontmatter: ${key}`);
  }
  for (const section of REQUIRED_SECTIONS) {
    if (!body.includes(section)) problems.push(`a mandatory section is missing: ${section}`);
  }
  for (const { pattern, label } of PORTABILITY_VIOLATIONS) {
    if (pattern.test(body) || pattern.test(JSON.stringify(frontmatter))) {
      problems.push(`breaks the portability of Art. XI: ${label}`);
    }
  }
  const expectedId = path.basename(file, '.md');
  if (frontmatter.id && frontmatter.id !== expectedId) {
    problems.push(`the id "${frontmatter.id}" is different from the file name "${expectedId}"`);
  }

  return { file, id: frontmatter.id || expectedId, frontmatter, problems };
}

function loadSquad(squadDir) {
  const manifestPath = path.join(squadDir, 'squad.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`squad.json is missing in ${squadDir}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const agentsDir = path.join(squadDir, 'agents');
  const files = fs.existsSync(agentsDir)
    ? fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md')).sort()
    : [];
  const agents = files.map((f) => loadAgent(path.join(agentsDir, f)));

  const declared = new Set((manifest.agents || []).map((a) => a.id));
  const present = new Set(agents.map((a) => a.id));
  const problems = [];
  for (const id of declared) {
    if (!present.has(id)) problems.push(`the agent "${id}" is declared in the manifest but is missing in agents/`);
  }
  for (const id of present) {
    if (!declared.has(id)) problems.push(`the agent "${id}" is in agents/ but is not declared in the manifest`);
  }

  return { manifest, agents, problems };
}

module.exports = { loadSquad, loadAgent, parseFrontmatter, REQUIRED_KEYS, REQUIRED_SECTIONS };
