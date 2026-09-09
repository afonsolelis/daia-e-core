'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const kernel = require('../../kernel');

const P = { drafted_by: 'ai-assisted' };

function scaffold() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'daia-trace-'));
  const model = path.join(root, '.daia', 'model');
  fs.mkdirSync(model, { recursive: true });
  fs.writeFileSync(path.join(root, '.daia', 'config.json'), JSON.stringify({ viewpointCatalog: 'rm-odp' }));
  const docs = [
    { id: 'STK-a', kind: 'Stakeholder', name: 'Professor', sprint: 'SP1', provenance: P },
    { id: 'CON-a', kind: 'Concern', statement: 'uma preocupacao rastreavel do professor',
      stakeholders: ['STK-a'], sprint: 'SP1', provenance: P },
    { id: 'BD-a', kind: 'BusinessDriver', statement: 'direcionador de negocio do caso',
      stakeholders: ['STK-a'], hypothesis: 'hipotese', sprint: 'SP1', provenance: P },
    { id: 'RNF-a', kind: 'Requirement', type: 'non-functional', statement: 'requisito nao funcional do caso',
      traces_to: ['BD-a'], scenarios: ['QS-a'], sprint: 'SP2', provenance: P },
    { id: 'QS-a', kind: 'QualityScenario', characteristic: 'maintainability',
      source: 'origem', stimulus: 'estimulo', artifact: 'artefato', environment: 'ambiente',
      response: 'resposta', response_measure: { metric: 'complexidade', operator: '<=', threshold: 10 },
      traces_to: ['RNF-a'], sprint: 'SP2', provenance: P },
    { id: 'TC-a', kind: 'TestContract', verifies: ['QS-a'], test_path: 'tests/a.test.js',
      phase: 'green', sprint: 'SP3', provenance: P },
    { id: 'VW-a', kind: 'View', viewpoint: 'computational', addresses_concerns: ['CON-a'],
      stakeholders: ['STK-a'], models: [{ kind: 'dynamic', path: 'docs/a.md' }], sprint: 'SP3', provenance: P },
    { id: 'AD-a', kind: 'ArchitectureDecision', title: 'decisao do caso',
      decision: 'decidimos a estrutura do modulo', traces_to: ['RNF-a'], affects_views: ['VW-a'],
      alternatives: [{ option: 'alternativa preterida', rejected_because: 'criterio registrado com detalhe' }],
      sprint: 'SP3', provenance: P },
  ];
  for (const d of docs) fs.writeFileSync(path.join(model, `${d.id}.json`), JSON.stringify(d));
  return root;
}

test('a cadeia a montante vai do teste ate a parte interessada (Art. IV)', () => {
  const { trace } = kernel.openProject(scaffold());
  const chain = trace.chain('TC-a', 'up');
  const ids = [];
  (function collect(node) {
    ids.push(node.id);
    node.children.forEach(collect);
  })(chain);
  for (const expected of ['TC-a', 'QS-a', 'RNF-a', 'BD-a', 'STK-a']) {
    assert.ok(ids.includes(expected), `cadeia deveria alcancar ${expected}; obteve ${ids.join(' -> ')}`);
  }
});

test('a matriz liga requisito, cenario e teste', () => {
  const { trace } = kernel.openProject(scaffold());
  const row = trace.matrix().find((r) => r.requirement === 'RNF-a');
  assert.strictEqual(row.scenario, 'QS-a');
  assert.strictEqual(row.characteristic, 'maintainability');
  assert.deepStrictEqual(row.tests, ['TC-a']);
});

test('o impacto segue dependencia e efeito', () => {
  const { trace } = kernel.openProject(scaffold());
  const viaDependencia = trace.impact('QS-a');
  assert.ok(viaDependencia.affected.includes('TC-a'), 'teste depende do cenario');
  assert.ok(viaDependencia.affected.includes('RNF-a'), 'requisito depende do cenario');

  const viaEfeito = trace.impact('AD-a');
  assert.ok(viaEfeito.views.includes('VW-a'), 'a decisao declara afetar a view');
});

test('o impacto nao inclui o proprio no e termina em grafo ciclico', () => {
  const { trace } = kernel.openProject(scaffold());
  const result = trace.impact('BD-a');
  assert.ok(!result.affected.includes('BD-a'));
});

test('orfaos sao artefatos sem rastreio em nenhum sentido', () => {
  const root = scaffold();
  fs.writeFileSync(
    path.join(root, '.daia', 'model', 'STK-orfao.json'),
    JSON.stringify({ id: 'STK-orfao', kind: 'Stakeholder', name: 'Ninguem', sprint: 'SP1', provenance: P })
  );
  const { trace } = kernel.openProject(root);
  assert.ok(trace.orphans().includes('STK-orfao'));
});
