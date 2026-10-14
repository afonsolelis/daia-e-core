'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const kernel = require('../../kernel');
const business = require('../fixtures/business');

/** Cria um projeto DAIA-E temporario com os documentos dados. */
function scaffold(docs, config = {}, files = business.FILES) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'daia-test-'));
  const model = path.join(root, '.daia', 'model');
  fs.mkdirSync(model, { recursive: true });
  fs.mkdirSync(path.join(root, '.daia', 'baselines'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.daia', 'config.json'),
    JSON.stringify({ viewpointCatalog: 'rm-odp', ...config })
  );
  for (const doc of docs) {
    fs.writeFileSync(path.join(model, `${doc.id}.json`), JSON.stringify(doc, null, 2));
  }
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
  return root;
}

const P = { drafted_by: 'ai-assisted' };
const STK = { id: 'STK-a', kind: 'Stakeholder', name: 'Parte A', sprint: 'SP1', provenance: P };
const BD = {
  id: 'BD-a', kind: 'BusinessDriver', statement: 'um direcionador de negocio valido',
  stakeholders: ['STK-a'], hypothesis: 'a hipotese a confrontar na SP5', sprint: 'SP1', provenance: P,
};

test('SP1 bloqueia sem direcionador nem parte interessada', () => {
  const root = scaffold([]);
  const report = kernel.openProject(root).gate.evaluate('SP1');
  assert.strictEqual(report.passed, false);
  assert.ok(report.blocking.some((f) => f.rule === 'SP1-FOUNDATION'));
});

test('SP1 passa com fundacao minima', () => {
  const root = scaffold(business.DOCS);
  const report = kernel.openProject(root).gate.evaluate('SP1');
  assert.strictEqual(report.passed, true, JSON.stringify(report.blocking));
});

test('referencia quebrada bloqueia em qualquer sprint', () => {
  const root = scaffold([STK, { ...BD, stakeholders: ['STK-inexistente'] }]);
  const report = kernel.openProject(root).gate.evaluate('SP1');
  assert.ok(report.blocking.some((f) => f.rule === 'REF-INTEGRITY'));
});

test('decisao sem alternativa bloqueia a SP3 (Art. IX)', () => {
  const ad = {
    id: 'AD-a', kind: 'ArchitectureDecision', title: 'uma decisao',
    decision: 'decidimos alguma coisa relevante', alternatives: [],
    traces_to: ['BD-a'], sprint: 'SP3', provenance: P,
  };
  const root = scaffold([STK, BD, ad]);
  const report = kernel.openProject(root).gate.evaluate('SP3');
  const rules = report.blocking.map((f) => f.rule);
  assert.ok(rules.includes('SCHEMA') || rules.includes('AD-ALTERNATIVE'));
});

test('cenario com limiar placeholder bloqueia (Art. V)', () => {
  const qs = {
    id: 'QS-a', kind: 'QualityScenario', characteristic: 'reliability',
    source: 'origem', stimulus: 'estimulo', artifact: 'artefato',
    environment: 'ambiente', response: 'resposta',
    response_measure: { metric: 'tempo', operator: '<=', threshold: 'TBD' },
    traces_to: ['BD-a'], sprint: 'SP2', provenance: P,
  };
  const root = scaffold([STK, BD, qs]);
  const report = kernel.openProject(root).gate.evaluate('SP2');
  assert.ok(report.blocking.some((f) => f.rule === 'SCENARIO-MEASURABLE'));
});

test('preocupacao nao enderecada por view bloqueia a SP3 (Art. VII)', () => {
  const con = {
    id: 'CON-a', kind: 'Concern', statement: 'uma preocupacao nao enderecada',
    stakeholders: ['STK-a'], sprint: 'SP1', provenance: P,
  };
  const root = scaffold([STK, BD, con]);
  const report = kernel.openProject(root).gate.evaluate('SP3');
  assert.ok(report.blocking.some((f) => f.rule === 'CONCERN-ADDRESSED'));
});

test('SP3 exige modelagem estatica e dinamica (Art. VIII)', () => {
  const root = scaffold([STK, BD]);
  const report = kernel.openProject(root).gate.evaluate('SP3');
  const messages = report.blocking.filter((f) => f.rule === 'STATIC-AND-DYNAMIC');
  assert.strictEqual(messages.length, 2, 'esperado bloqueio para estatica e para dinamica');
});

test('catalogo de viewpoints e plugavel', () => {
  const root = scaffold([STK, BD], { viewpointCatalog: 'c4' });
  const project = kernel.openProject(root);
  assert.strictEqual(project.store.viewpoints.catalog, 'c4');
  assert.ok(project.store.viewpoints.index.has('container'));
});

test('catalogo inexistente falha com mensagem explicita', () => {
  const root = scaffold([], { viewpointCatalog: 'nao-existe' });
  assert.throws(() => kernel.openProject(root), /nao prescreve views/);
});

test('a ordem das baselines e verificada (Art. III)', () => {
  const root = scaffold([STK, BD]);
  const project = kernel.openProject(root);
  const report = project.gate.evaluate('SP2', { baselines: new Map() });
  assert.ok(report.blocking.some((f) => f.rule === 'BASELINE-ORDER'));
});
