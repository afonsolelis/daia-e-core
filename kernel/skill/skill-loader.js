'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseFrontmatter } = require('../squad/squad-loader');

const REQUIRED_KEYS = ['name', 'description'];

function loadSkill(skillDir) {
  const file = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(file)) throw new Error(`SKILL.md ausente em ${skillDir}`);
  const text = fs.readFileSync(file, 'utf8');
  const { frontmatter, body } = parseFrontmatter(text, file);
  const id = path.basename(skillDir);
  const problems = [];
  for (const key of REQUIRED_KEYS) {
    if (typeof frontmatter[key] !== 'string' || !frontmatter[key].trim()) {
      problems.push(`campo obrigatorio ausente no frontmatter: ${key}`);
    }
  }
  if (frontmatter.name && frontmatter.name !== id) {
    problems.push(`name "${frontmatter.name}" difere do diretorio "${id}"`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) problems.push(`nome invalido: ${id}`);
  if (!body.trim()) problems.push('corpo da skill vazio');
  if (!body.includes('## Resultado')) problems.push('secao obrigatoria ausente: ## Resultado');
  if (!body.includes('## Fluxo')) problems.push('secao obrigatoria ausente: ## Fluxo');
  return { id, file, dir: skillDir, frontmatter, body, problems };
}

function loadSkills(squadDir) {
  const skillsDir = path.join(squadDir, 'skills');
  const dirs = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
    : [];
  const skills = dirs.map((dir) => loadSkill(path.join(skillsDir, dir)));
  const manifest = JSON.parse(fs.readFileSync(path.join(squadDir, 'squad.json'), 'utf8'));
  const declarations = new Map((manifest.skills || []).map((skill) => [skill.id, skill]));
  for (const skill of skills) Object.assign(skill.frontmatter, declarations.get(skill.id) || {});
  const declared = new Set((manifest.skills || []).map((skill) => skill.id));
  const present = new Set(skills.map((skill) => skill.id));
  const problems = [];
  if (!skills.length) problems.push('biblioteca sem skills');
  if (declared.size !== (manifest.skills || []).length) problems.push('skills duplicadas no manifesto');
  for (const id of declared) if (!present.has(id)) problems.push(`skill "${id}" declarada mas ausente`);
  for (const id of present) if (!declared.has(id)) problems.push(`skill "${id}" presente mas nao declarada`);

  const knownAgents = new Set((manifest.agents || []).map((agent) => agent.id));
  for (const skill of skills) {
    if (!skill.frontmatter.agent || !skill.frontmatter.sprint || !skill.frontmatter.gate) {
      skill.problems.push('manifesto deve declarar agent, sprint e gate');
    } else if (!knownAgents.has(skill.frontmatter.agent)) {
      skill.problems.push(`agente desconhecido: ${skill.frontmatter.agent}`);
    }
  }
  return { skills, problems };
}

function validateAgentSkills(squad, skillSet) {
  const problems = [];
  for (const agent of squad.agents) {
    if (!Array.isArray(agent.frontmatter.skills)) problems.push(`agente ${agent.id}: skills deve ser lista`);
    const declared = Array.isArray(agent.frontmatter.skills) ? agent.frontmatter.skills : [];
    for (const id of declared) {
      if (!skillSet.has(id)) problems.push(`agente "${agent.id}" referencia skill desconhecida "${id}"`);
    }
  }
  return problems;
}

module.exports = { loadSkill, loadSkills, validateAgentSkills, REQUIRED_KEYS };
