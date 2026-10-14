'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Carrega e valida a squad DAIA-E.
 *
 * Art. XI: a fonte da verdade e `squads/`, e a definicao de agente e markdown
 * com frontmatter YAML puro — sem caminho de IDE, sem chamada a script. Este
 * carregador verifica essa propriedade em vez de confiar nela.
 *
 * O parser de frontmatter cobre o subconjunto do contrato: escalares, listas
 * inline e listas em bloco. Nao e um parser YAML completo, e nao pretende ser —
 * o contrato de agente e deliberadamente pequeno.
 */

const REQUIRED_KEYS = ['id', 'name', 'sprint', 'views', 'bok', 'gate', 'skills', 'produces'];
const REQUIRED_SECTIONS = [
  '## Papel',
  '## Pergunta característica',
  '## O que você produz',
  '## O que você não faz',
  '## Procedimento',
  '## Regras inegociáveis',
];

/** Padroes que violam a portabilidade exigida pelo Art. XI. */
const PORTABILITY_VIOLATIONS = [
  { pattern: /\.(claude|codex|cursor|gemini|grok|antigravity)\//, label: 'caminho de IDE' },
  { pattern: /\brequire\(|\bnode\s+\S+\.js/, label: 'chamada a script' },
  { pattern: /permission_mode|prompt_mode|subagent_type/, label: 'diretiva de runtime especifico' },
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
    throw new Error(`${path.basename(file)}: sem frontmatter YAML`);
  }
  const end = text.indexOf('\n---', 3);
  if (end === -1) throw new Error(`${path.basename(file)}: frontmatter nao fechado`);

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
    if (frontmatter[key] === undefined) problems.push(`campo obrigatorio ausente no frontmatter: ${key}`);
  }
  for (const section of REQUIRED_SECTIONS) {
    if (!body.includes(section)) problems.push(`secao obrigatoria ausente: ${section}`);
  }
  for (const { pattern, label } of PORTABILITY_VIOLATIONS) {
    if (pattern.test(body) || pattern.test(JSON.stringify(frontmatter))) {
      problems.push(`viola a portabilidade do Art. XI: ${label}`);
    }
  }
  const expectedId = path.basename(file, '.md');
  if (frontmatter.id && frontmatter.id !== expectedId) {
    problems.push(`id "${frontmatter.id}" difere do nome do arquivo "${expectedId}"`);
  }

  return { file, id: frontmatter.id || expectedId, frontmatter, problems };
}

function loadSquad(squadDir) {
  const manifestPath = path.join(squadDir, 'squad.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`squad.json ausente em ${squadDir}`);
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
    if (!present.has(id)) problems.push(`agente "${id}" declarado no manifesto mas ausente em agents/`);
  }
  for (const id of present) {
    if (!declared.has(id)) problems.push(`agente "${id}" presente em agents/ mas nao declarado no manifesto`);
  }

  return { manifest, agents, problems };
}

module.exports = { loadSquad, loadAgent, parseFrontmatter, REQUIRED_KEYS, REQUIRED_SECTIONS };
