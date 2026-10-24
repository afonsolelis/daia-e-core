'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const kernel = require('../../kernel');
const business = require('../fixtures/business');

/** Creates a temporary DAIA-E project with the given documents. */
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
const STK = { id: 'STK-a', kind: 'Stakeholder', name: 'Party A', sprint: 'SP1', provenance: P };
const BD = {
  id: 'BD-a', kind: 'BusinessDriver', statement: 'a valid business driver',
  stakeholders: ['STK-a'], hypothesis: 'the hypothesis that SP5 tests', sprint: 'SP1', provenance: P,
};

test('SP1 blocks without a business driver and a stakeholder', () => {
  const root = scaffold([]);
  const report = kernel.openProject(root).gate.evaluate('SP1');
  assert.strictEqual(report.passed, false);
  assert.ok(report.blocking.some((f) => f.rule === 'SP1-FOUNDATION'));
});

test('SP1 passes with the minimum foundation', () => {
  const root = scaffold(business.DOCS);
  const report = kernel.openProject(root).gate.evaluate('SP1');
  assert.strictEqual(report.passed, true, JSON.stringify(report.blocking));
});

test('a broken reference blocks in each sprint', () => {
  const root = scaffold([STK, { ...BD, stakeholders: ['STK-missing'] }]);
  const report = kernel.openProject(root).gate.evaluate('SP1');
  assert.ok(report.blocking.some((f) => f.rule === 'REF-INTEGRITY'));
});

test('a decision without an alternative blocks SP3 (Art. IX)', () => {
  const ad = {
    id: 'AD-a', kind: 'ArchitectureDecision', title: 'a decision',
    decision: 'we decided a relevant thing', alternatives: [],
    traces_to: ['BD-a'], sprint: 'SP3', provenance: P,
  };
  const root = scaffold([STK, BD, ad]);
  const report = kernel.openProject(root).gate.evaluate('SP3');
  const rules = report.blocking.map((f) => f.rule);
  assert.ok(rules.includes('SCHEMA') || rules.includes('AD-ALTERNATIVE'));
});

test('a scenario with a placeholder threshold blocks (Art. V)', () => {
  const qs = {
    id: 'QS-a', kind: 'QualityScenario', characteristic: 'reliability',
    source: 'source', stimulus: 'stimulus', artifact: 'artifact',
    environment: 'environment', response: 'response',
    response_measure: { metric: 'time', operator: '<=', threshold: 'TBD' },
    traces_to: ['BD-a'], sprint: 'SP2', provenance: P,
  };
  const root = scaffold([STK, BD, qs]);
  const report = kernel.openProject(root).gate.evaluate('SP2');
  assert.ok(report.blocking.some((f) => f.rule === 'SCENARIO-MEASURABLE'));
});

test('a concern that no view addresses blocks SP3 (Art. VII)', () => {
  const con = {
    id: 'CON-a', kind: 'Concern', statement: 'a concern that no view addresses',
    stakeholders: ['STK-a'], sprint: 'SP1', provenance: P,
  };
  const root = scaffold([STK, BD, con]);
  const report = kernel.openProject(root).gate.evaluate('SP3');
  assert.ok(report.blocking.some((f) => f.rule === 'CONCERN-ADDRESSED'));
});

test('SP3 must have static and dynamic models (Art. VIII)', () => {
  const root = scaffold([STK, BD]);
  const report = kernel.openProject(root).gate.evaluate('SP3');
  const messages = report.blocking.filter((f) => f.rule === 'STATIC-AND-DYNAMIC');
  assert.strictEqual(messages.length, 2, 'expected one block for the static model and one for the dynamic model');
});

test('the viewpoint catalog is pluggable', () => {
  const root = scaffold([STK, BD], { viewpointCatalog: 'c4' });
  const project = kernel.openProject(root);
  assert.strictEqual(project.store.viewpoints.catalog, 'c4');
  assert.ok(project.store.viewpoints.index.has('container'));
});

test('a catalog that does not exist fails with an explicit message', () => {
  const root = scaffold([], { viewpointCatalog: 'does-not-exist' });
  assert.throws(() => kernel.openProject(root), /"does-not-exist"/);
});

test('the baseline order is verified (Art. III)', () => {
  const root = scaffold([STK, BD]);
  const project = kernel.openProject(root);
  const report = project.gate.evaluate('SP2', { baselines: new Map() });
  assert.ok(report.blocking.some((f) => f.rule === 'BASELINE-ORDER'));
});

test('the README tutorial example passes gate SP1 without blocks or warnings', () => {
  const root = path.join(__dirname, '..', '..', 'examples', 'first-project');
  const report = kernel.openProject(root).gate.evaluate('SP1');
  const findings = report.findings.filter((f) => f.severity === 'BLOCK' || f.severity === 'WARN');
  assert.deepStrictEqual(findings, []);
  assert.ok(!fs.existsSync(path.join(root, '.daia', 'baselines')), 'the example has no signed baseline');
});
