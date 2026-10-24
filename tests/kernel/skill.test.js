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

test('the skill library matches the manifest and is valid', () => {
  const library = loadSkills(SQUAD_DIR);
  assert.strictEqual(library.skills.length, 21);
  assert.deepStrictEqual(library.problems, []);
  for (const skill of library.skills) assert.deepStrictEqual(skill.problems, [], skill.problems.join('; '));
});

test('each agent refers only to skills that exist', () => {
  const squad = loadSquad(SQUAD_DIR);
  const library = loadSkills(SQUAD_DIR);
  const problems = validateAgentSkills(squad, new Set(library.skills.map((skill) => skill.id)));
  assert.deepStrictEqual(problems, []);
});

test('skills are installed in the documented Claude layout', (t) => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'daia-skills-'));
  const { skills } = loadSkills(SQUAD_DIR);
  t.after(() => fs.rmSync(target, { recursive: true, force: true }));
  install(target, SQUAD_DIR, 'claude', true, skills[0].id);
  assert.ok(fs.existsSync(path.join(target, '.claude/skills', skills[0].id, 'SKILL.md')));
});

test('the catalogs of the tactic skills give ids that the decision schema accepts', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'kernel', 'schemas', 'decision.schema.json'), 'utf8'));
  const pattern = new RegExp(schema.properties.tactics.items.pattern);
  const tacticSkills = loadSkills(SQUAD_DIR).skills.filter((skill) => /^evaluate-[a-z]+-tactics$/.test(skill.id));
  assert.strictEqual(tacticSkills.length, 7);
  for (const skill of tacticSkills) {
    const attribute = skill.id.replace(/^evaluate-/, '').replace(/-tactics$/, '');
    const ids = [...skill.body.matchAll(/^\| `([a-z-]+)` \|/gm)].map((match) => match[1]);
    assert.ok(ids.length > 0, `${skill.id} has no catalog`);
    assert.strictEqual(new Set(ids).size, ids.length, `${skill.id} has a duplicate tactic`);
    for (const id of ids) assert.match(`${attribute}/${id}`, pattern);
  }
});

test('each skill that the manifest declares for SP1-SP5 is in the guided workflow', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'kernel', 'workflow', 'workflow.js'), 'utf8');
  for (const skill of loadSkills(SQUAD_DIR).skills) {
    assert.ok(source.includes(`'${skill.id}'`), `${skill.id} is missing in the workflow`);
  }
});
