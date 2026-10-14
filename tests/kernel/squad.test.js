'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { loadSquad, loadAgent, parseFrontmatter } = require('../../kernel/squad/squad-loader');

const SQUAD_DIR = path.join(__dirname, '..', '..', 'squads', 'daia-e');

test('a squad carrega e o manifesto bate com os arquivos', () => {
  const squad = loadSquad(SQUAD_DIR);
  assert.strictEqual(squad.manifest.name, 'daia-e');
  assert.deepStrictEqual(squad.problems, [], squad.problems.join('; '));
  assert.strictEqual(squad.agents.length, 11);
});

test('Art. XI: nenhum agente viola a portabilidade', () => {
  const squad = loadSquad(SQUAD_DIR);
  for (const agent of squad.agents) {
    assert.deepStrictEqual(
      agent.problems, [],
      `${agent.id} violou o contrato: ${agent.problems.join('; ')}`
    );
  }
});

test('todo agente declara sprint, view e corpo de conhecimento', () => {
  const squad = loadSquad(SQUAD_DIR);
  for (const { id, frontmatter } of squad.agents) {
    assert.ok(frontmatter.sprint, `${id} sem sprint`);
    assert.ok(frontmatter.bok, `${id} sem bok`);
    assert.ok(Array.isArray(frontmatter.views), `${id} sem views como lista`);
  }
});

test('as cinco sprints tem ao menos um agente', () => {
  const squad = loadSquad(SQUAD_DIR);
  const declared = squad.agents.map((a) => String(a.frontmatter.sprint));
  for (const sp of ['SP1', 'SP2', 'SP3', 'SP4', 'SP5']) {
    assert.ok(declared.some((s) => s.includes(sp)), `nenhum agente cobre ${sp}`);
  }
});

test('o parser de frontmatter cobre escalares e listas', () => {
  const { frontmatter } = parseFrontmatter(
    '---\nid: x\nviews: [a, b]\nlista:\n  - um\n  - dois\n---\ncorpo\n',
    'x.md'
  );
  assert.strictEqual(frontmatter.id, 'x');
  assert.deepStrictEqual(frontmatter.views, ['a', 'b']);
  assert.deepStrictEqual(frontmatter.lista, ['um', 'dois']);
});

test('frontmatter ausente falha com mensagem explicita', () => {
  assert.throws(() => parseFrontmatter('# sem frontmatter\n', 'x.md'), /sem frontmatter/);
});

test('agente com caminho de IDE e recusado', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'daia-squad-')), 'mau.md');
  fs.writeFileSync(file,
    '---\nid: mau\nname: Mau\nsprint: SP1\nviews: []\nbok: x\ngate: sp1\nskills: []\n---\n' +
    '## Papel\nx\n## Pergunta característica\nx\n## O que você produz\n' +
    'Leia .claude/agents/outro.md\n## O que você não faz\nx\n## Procedimento\nx\n## Regras inegociáveis\nx\n');
  const agent = loadAgent(file);
  assert.ok(agent.problems.some((p) => /Art. XI/.test(p)));
});
