'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseFrontmatter } = require('../squad/squad-loader');

const REQUIRED_KEYS = ['name', 'description'];

function loadSkill(skillDir) {
  const file = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(file)) throw new Error(`SKILL.md is missing in ${skillDir}`);
  const text = fs.readFileSync(file, 'utf8');
  const { frontmatter, body } = parseFrontmatter(text, file);
  const id = path.basename(skillDir);
  const problems = [];
  for (const key of REQUIRED_KEYS) {
    if (typeof frontmatter[key] !== 'string' || !frontmatter[key].trim()) {
      problems.push(`a mandatory field is missing in the frontmatter: ${key}`);
    }
  }
  if (frontmatter.name && frontmatter.name !== id) {
    problems.push(`the name "${frontmatter.name}" is different from the directory "${id}"`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) problems.push(`the name is not valid: ${id}`);
  if (!body.trim()) problems.push('the skill body is empty');
  if (!body.includes('## Result')) problems.push('a mandatory section is missing: ## Result');
  if (!body.includes('## Procedure')) problems.push('a mandatory section is missing: ## Procedure');
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
  if (!skills.length) problems.push('the library has no skills');
  if (declared.size !== (manifest.skills || []).length) problems.push('the manifest has duplicate skills');
  for (const id of declared) if (!present.has(id)) problems.push(`the skill "${id}" is declared but is missing`);
  for (const id of present) if (!declared.has(id)) problems.push(`the skill "${id}" is present but is not declared`);

  const knownAgents = new Set((manifest.agents || []).map((agent) => agent.id));
  for (const skill of skills) {
    if (!skill.frontmatter.agent || !skill.frontmatter.sprint || !skill.frontmatter.gate) {
      skill.problems.push('the manifest must declare agent, sprint and gate');
    } else if (!knownAgents.has(skill.frontmatter.agent)) {
      skill.problems.push(`unknown agent: ${skill.frontmatter.agent}`);
    }
  }
  return { skills, problems };
}

function validateAgentSkills(squad, skillSet) {
  const problems = [];
  for (const agent of squad.agents) {
    if (!Array.isArray(agent.frontmatter.skills)) problems.push(`agent ${agent.id}: skills must be a list`);
    const declared = Array.isArray(agent.frontmatter.skills) ? agent.frontmatter.skills : [];
    for (const id of declared) {
      if (!skillSet.has(id)) problems.push(`the agent "${agent.id}" refers to an unknown skill "${id}"`);
    }
  }
  return problems;
}

module.exports = { loadSkill, loadSkills, validateAgentSkills, REQUIRED_KEYS };
