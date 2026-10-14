'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadSkills, validateAgentSkills } = require('../../kernel/skill/skill-loader');
const { install } = require('../../kernel/skill/install');
const { loadSquad } = require('../../kernel/squad/squad-loader');

const SQUAD_DIR = path.join(__dirname, '..', '..', 'squads', 'daia-e');

test('biblioteca de skills coincide com o manifesto e e valida', () => {
  const library = loadSkills(SQUAD_DIR);
  assert.strictEqual(library.skills.length, 8);
  assert.deepStrictEqual(library.problems, []);
  for (const skill of library.skills) assert.deepStrictEqual(skill.problems, [], skill.problems.join('; '));
});

test('todo agente referencia apenas skills existentes', () => {
  const squad = loadSquad(SQUAD_DIR);
  const library = loadSkills(SQUAD_DIR);
  const problems = validateAgentSkills(squad, new Set(library.skills.map((skill) => skill.id)));
  assert.deepStrictEqual(problems, []);
});

test('skills sao projetadas no layout documentado do Claude', (t) => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'daia-skills-'));
  const { skills } = loadSkills(SQUAD_DIR);
  t.after(() => fs.rmSync(target, { recursive: true, force: true }));
  install(target, SQUAD_DIR, 'claude', true, skills[0].id);
  assert.ok(fs.existsSync(path.join(target, '.claude/skills', skills[0].id, 'SKILL.md')));
});
