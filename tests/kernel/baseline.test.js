'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const kernel = require('../../kernel');

function scaffold() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'daia-baseline-'));
  const model = path.join(root, '.daia', 'model');
  fs.mkdirSync(model, { recursive: true });
  fs.mkdirSync(path.join(root, '.daia', 'baselines'), { recursive: true });
  fs.writeFileSync(path.join(root, '.daia', 'config.json'), JSON.stringify({ viewpointCatalog: 'rm-odp' }));
  const P = { drafted_by: 'ai-assisted' };
  const docs = [
    { id: 'STK-a', kind: 'Stakeholder', name: 'Party A', sprint: 'SP1', provenance: P },
    { id: 'BD-a', kind: 'BusinessDriver', statement: 'a valid business driver for the test',
      stakeholders: ['STK-a'], hypothesis: 'the hypothesis to test', sprint: 'SP1', provenance: P },
  ];
  for (const d of docs) fs.writeFileSync(path.join(model, `${d.id}.json`), JSON.stringify(d));
  return root;
}

const VALID = { signedBy: 'Afonso Brandao', rationale: 'baseline reviewed and accepted by the author' };

test('Art. II: a signature without a human identification is refused', () => {
  const project = kernel.openProject(scaffold());
  assert.throws(
    () => project.baselines.sign('SP1', { rationale: VALID.rationale }),
    /human identification/
  );
});

test('Art. II: a signature without a rationale is refused', () => {
  const project = kernel.openProject(scaffold());
  assert.throws(
    () => project.baselines.sign('SP1', { signedBy: VALID.signedBy }),
    /rationale/
  );
});

test('Art. II: an empty or trivial rationale is refused', () => {
  const project = kernel.openProject(scaffold());
  assert.throws(() => project.baselines.sign('SP1', { signedBy: 'A', rationale: 'ok' }), /identification|rationale/);
});

test('the declarative record keeps the signer and does not claim authentication', () => {
  const project = kernel.openProject(scaffold());
  assert.strictEqual(typeof project.baselines.signAsAgent, 'undefined',
    'the public API uses sign to record a declared decision');
  const baseline = project.baselines.sign('SP1', VALID);
  assert.ok(baseline.signature.signed_by);
  assert.strictEqual(baseline.signature.agent, undefined);
});

test('a valid signature records who, when and why', () => {
  const project = kernel.openProject(scaffold());
  const baseline = project.baselines.sign('SP1', VALID);
  assert.strictEqual(baseline.signature.signed_by, VALID.signedBy);
  assert.strictEqual(baseline.signature.rationale, VALID.rationale);
  assert.strictEqual(baseline.signature.decision, 'accepted');
  assert.match(baseline.signature.signed_at, /^\d{4}-\d{2}-\d{2}/);
  assert.match(baseline.state_hash, /^sha256:[0-9a-f]{64}$/);
});

test('declared debt must have explicit items', () => {
  const project = kernel.openProject(scaffold());
  assert.throws(
    () => project.baselines.sign('SP1', { ...VALID, decision: 'accepted-with-debt', debt: [] }),
    /debt item/
  );
});

test('the signature covers one specific state of the model', () => {
  const root = scaffold();
  const project = kernel.openProject(root);
  project.baselines.sign('SP1', VALID);
  assert.strictEqual(project.baselines.verify('SP1').valid, true);

  fs.writeFileSync(
    path.join(root, '.daia', 'model', 'STK-b.json'),
    JSON.stringify({ id: 'STK-b', kind: 'Stakeholder', name: 'Party B', sprint: 'SP1', provenance: { drafted_by: 'ai' } })
  );
  const reloaded = kernel.openProject(root);
  const check = reloaded.baselines.verify('SP1');
  assert.strictEqual(check.valid, false);
  assert.match(check.reason, /model changed/);
});

test('the baseline hash has the scope of a sprint', () => {
  const root = scaffold();
  const project = kernel.openProject(root);
  const hashSp1 = project.store.stateHash('SP1');

  fs.writeFileSync(
    path.join(root, '.daia', 'model', 'AD-a.json'),
    JSON.stringify({
      id: 'AD-a', kind: 'ArchitectureDecision', title: 'SP3 decision',
      decision: 'a recorded decision for the test', traces_to: ['BD-a'],
      alternatives: [{ option: 'other option', rejected_because: 'criterion with a sufficient description' }],
      sprint: 'SP3', provenance: { drafted_by: 'ai' },
    })
  );
  const reloaded = kernel.openProject(root);
  assert.strictEqual(reloaded.store.stateHash('SP1'), hashSp1,
    'a new SP3 artifact must not invalidate the SP1 baseline');
  assert.notStrictEqual(reloaded.store.stateHash('SP3'), hashSp1);
});

test('the test phase is not in the hash: the contract does not change when it becomes green', () => {
  const root = scaffold();
  const tcPath = path.join(root, '.daia', 'model', 'TC-a.json');
  const tc = {
    id: 'TC-a', kind: 'TestContract', verifies: ['BD-a'],
    test_path: 'tests/a.test.js', phase: 'red', sprint: 'SP3',
    provenance: { drafted_by: 'ai' },
  };
  fs.writeFileSync(tcPath, JSON.stringify(tc));
  const before = kernel.openProject(root).store.stateHash('SP3');

  fs.writeFileSync(tcPath, JSON.stringify({ ...tc, phase: 'green' }));
  const after = kernel.openProject(root).store.stateHash('SP3');
  assert.strictEqual(before, after);
});
