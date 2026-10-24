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
    { id: 'STK-a', kind: 'Stakeholder', name: 'Teacher', sprint: 'SP1', provenance: P },
    { id: 'CON-a', kind: 'Concern', statement: 'a concern of the teacher that has a trace',
      stakeholders: ['STK-a'], sprint: 'SP1', provenance: P },
    { id: 'BD-a', kind: 'BusinessDriver', statement: 'the business driver of the case',
      stakeholders: ['STK-a'], hypothesis: 'hypothesis', sprint: 'SP1', provenance: P },
    { id: 'NFR-a', kind: 'Requirement', type: 'non-functional', statement: 'the non-functional requirement of the case',
      traces_to: ['BD-a'], scenarios: ['QS-a'], sprint: 'SP2', provenance: P },
    { id: 'QS-a', kind: 'QualityScenario', characteristic: 'maintainability',
      source: 'source', stimulus: 'stimulus', artifact: 'artifact', environment: 'environment',
      response: 'response', response_measure: { metric: 'complexity', operator: '<=', threshold: 10 },
      traces_to: ['NFR-a'], sprint: 'SP2', provenance: P },
    { id: 'TC-a', kind: 'TestContract', verifies: ['QS-a'], test_path: 'tests/a.test.js',
      phase: 'green', sprint: 'SP3', provenance: P },
    { id: 'VW-a', kind: 'View', viewpoint: 'computational', addresses_concerns: ['CON-a'],
      stakeholders: ['STK-a'], models: [{ kind: 'dynamic', path: 'docs/a.md' }], sprint: 'SP3', provenance: P },
    { id: 'AD-a', kind: 'ArchitectureDecision', title: 'the decision of the case',
      decision: 'we decide the structure of the module', traces_to: ['NFR-a'], affects_views: ['VW-a'],
      alternatives: [{ option: 'rejected alternative', rejected_because: 'the criterion is recorded in detail' }],
      sprint: 'SP3', provenance: P },
  ];
  for (const d of docs) fs.writeFileSync(path.join(model, `${d.id}.json`), JSON.stringify(d));
  return root;
}

test('the upstream chain goes from the test to the stakeholder (Art. IV)', () => {
  const { trace } = kernel.openProject(scaffold());
  const chain = trace.chain('TC-a', 'up');
  const ids = [];
  (function collect(node) {
    ids.push(node.id);
    node.children.forEach(collect);
  })(chain);
  for (const expected of ['TC-a', 'QS-a', 'NFR-a', 'BD-a', 'STK-a']) {
    assert.ok(ids.includes(expected), `the chain must reach ${expected}; got ${ids.join(' -> ')}`);
  }
});

test('the matrix links requirement, scenario and test', () => {
  const { trace } = kernel.openProject(scaffold());
  const row = trace.matrix().find((r) => r.requirement === 'NFR-a');
  assert.strictEqual(row.scenario, 'QS-a');
  assert.strictEqual(row.characteristic, 'maintainability');
  assert.deepStrictEqual(row.tests, ['TC-a']);
});

test('the impact follows dependency and effect', () => {
  const { trace } = kernel.openProject(scaffold());
  const byDependency = trace.impact('QS-a');
  assert.ok(byDependency.affected.includes('TC-a'), 'the test depends on the scenario');
  assert.ok(byDependency.affected.includes('NFR-a'), 'the requirement depends on the scenario');

  const byEffect = trace.impact('AD-a');
  assert.ok(byEffect.views.includes('VW-a'), 'the decision declares that it affects the view');
});

test('the impact does not include the node itself and stops in a cyclic graph', () => {
  const { trace } = kernel.openProject(scaffold());
  const result = trace.impact('BD-a');
  assert.ok(!result.affected.includes('BD-a'));
});

test('orphans are artifacts with no trace in either direction', () => {
  const root = scaffold();
  fs.writeFileSync(
    path.join(root, '.daia', 'model', 'STK-orphan.json'),
    JSON.stringify({ id: 'STK-orphan', kind: 'Stakeholder', name: 'Nobody', sprint: 'SP1', provenance: P })
  );
  const { trace } = kernel.openProject(root);
  assert.ok(trace.orphans().includes('STK-orphan'));
});
