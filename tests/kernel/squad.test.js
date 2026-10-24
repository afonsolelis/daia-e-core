'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { loadSquad, loadAgent, parseFrontmatter } = require('../../kernel/squad/squad-loader');

const SQUAD_DIR = path.join(__dirname, '..', '..', 'squads', 'daia-e');

test('the squad loads and the manifest matches the files', () => {
  const squad = loadSquad(SQUAD_DIR);
  assert.strictEqual(squad.manifest.name, 'daia-e');
  assert.deepStrictEqual(squad.problems, [], squad.problems.join('; '));
  assert.strictEqual(squad.agents.length, 23);
});

test('Art. XI: no agent breaks portability', () => {
  const squad = loadSquad(SQUAD_DIR);
  for (const agent of squad.agents) {
    assert.deepStrictEqual(
      agent.problems, [],
      `${agent.id} broke the contract: ${agent.problems.join('; ')}`
    );
  }
});

test('each agent declares sprint, view and body of knowledge', () => {
  const squad = loadSquad(SQUAD_DIR);
  for (const { id, frontmatter } of squad.agents) {
    assert.ok(frontmatter.sprint, `${id} has no sprint`);
    assert.ok(frontmatter.bok, `${id} has no bok`);
    assert.ok(Array.isArray(frontmatter.views), `${id} has no views list`);
  }
});

test('each of the five sprints has at least one agent', () => {
  const squad = loadSquad(SQUAD_DIR);
  const declared = squad.agents.map((a) => String(a.frontmatter.sprint));
  for (const sp of ['SP1', 'SP2', 'SP3', 'SP4', 'SP5']) {
    assert.ok(declared.some((s) => s.includes(sp)), `no agent covers ${sp}`);
  }
});

test('the frontmatter parser covers scalars and lists', () => {
  const { frontmatter } = parseFrontmatter(
    '---\nid: x\nviews: [a, b]\nlist:\n  - one\n  - two\n---\nbody\n',
    'x.md'
  );
  assert.strictEqual(frontmatter.id, 'x');
  assert.deepStrictEqual(frontmatter.views, ['a', 'b']);
  assert.deepStrictEqual(frontmatter.list, ['one', 'two']);
});

test('a missing frontmatter fails with a clear message', () => {
  assert.throws(() => parseFrontmatter('# no frontmatter\n', 'x.md'), /no YAML frontmatter/);
});

test('an agent with an IDE path is rejected', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'daia-squad-')), 'bad.md');
  fs.writeFileSync(file,
    '---\nid: bad\nname: Bad\nsprint: SP1\nviews: []\nbok: x\ngate: sp1\nskills: []\n---\n' +
    '## Role\nx\n## Key question\nx\n## What you produce\n' +
    'Read .claude/agents/other.md\n## What you do not do\nx\n## Procedure\nx\n## Mandatory rules\nx\n');
  const agent = loadAgent(file);
  assert.ok(agent.problems.some((p) => /Art. XI/.test(p)));
});

test('each aiox-core agent has a matching agent in the squad', () => {
  const squad = loadSquad(SQUAD_DIR);
  const present = new Set(squad.agents.map((a) => a.id));
  const lineage = squad.manifest.lineage.agents;
  assert.strictEqual(Object.keys(lineage).length, 12);
  for (const [aiox, daia] of Object.entries(lineage)) {
    assert.ok(present.has(daia), `${aiox} points to an agent that does not exist: ${daia}`);
  }
});
