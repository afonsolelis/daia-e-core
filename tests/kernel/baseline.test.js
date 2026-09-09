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
    { id: 'STK-a', kind: 'Stakeholder', name: 'Parte A', sprint: 'SP1', provenance: P },
    { id: 'BD-a', kind: 'BusinessDriver', statement: 'um direcionador valido para o teste',
      stakeholders: ['STK-a'], hypothesis: 'hipotese a confrontar', sprint: 'SP1', provenance: P },
  ];
  for (const d of docs) fs.writeFileSync(path.join(model, `${d.id}.json`), JSON.stringify(d));
  return root;
}

const VALID = { signedBy: 'Afonso Brandao', rationale: 'baseline revisada e assumida pelo autor' };

test('Art. II: assinatura sem identificacao humana e recusada', () => {
  const project = kernel.openProject(scaffold());
  assert.throws(
    () => project.baselines.sign('SP1', { rationale: VALID.rationale }),
    /identificacao humana/
  );
});

test('Art. II: assinatura sem justificativa e recusada', () => {
  const project = kernel.openProject(scaffold());
  assert.throws(
    () => project.baselines.sign('SP1', { signedBy: VALID.signedBy }),
    /justificativa/
  );
});

test('Art. II: justificativa vazia ou trivial e recusada', () => {
  const project = kernel.openProject(scaffold());
  assert.throws(() => project.baselines.sign('SP1', { signedBy: 'A', rationale: 'ok' }), /identificacao|justificativa/);
});

test('Art. II: nao existe caminho de assinatura por agente', () => {
  const project = kernel.openProject(scaffold());
  assert.strictEqual(typeof project.baselines.signAsAgent, 'undefined',
    'a ausencia de assinatura por agente e deliberada, nao um esquecimento');
  const baseline = project.baselines.sign('SP1', VALID);
  assert.ok(baseline.signature.signed_by);
  assert.strictEqual(baseline.signature.agent, undefined);
});

test('assinatura valida registra quem, quando e por que', () => {
  const project = kernel.openProject(scaffold());
  const baseline = project.baselines.sign('SP1', VALID);
  assert.strictEqual(baseline.signature.signed_by, VALID.signedBy);
  assert.strictEqual(baseline.signature.rationale, VALID.rationale);
  assert.strictEqual(baseline.signature.decision, 'accepted');
  assert.match(baseline.signature.signed_at, /^\d{4}-\d{2}-\d{2}/);
  assert.match(baseline.state_hash, /^sha256:[0-9a-f]{64}$/);
});

test('divida declarada exige itens explicitos', () => {
  const project = kernel.openProject(scaffold());
  assert.throws(
    () => project.baselines.sign('SP1', { ...VALID, decision: 'accepted-with-debt', debt: [] }),
    /divida/
  );
});

test('a assinatura cobre um estado especifico do modelo', () => {
  const root = scaffold();
  const project = kernel.openProject(root);
  project.baselines.sign('SP1', VALID);
  assert.strictEqual(project.baselines.verify('SP1').valid, true);

  fs.writeFileSync(
    path.join(root, '.daia', 'model', 'STK-b.json'),
    JSON.stringify({ id: 'STK-b', kind: 'Stakeholder', name: 'Parte B', sprint: 'SP1', provenance: { drafted_by: 'ai' } })
  );
  const reloaded = kernel.openProject(root);
  const check = reloaded.baselines.verify('SP1');
  assert.strictEqual(check.valid, false);
  assert.match(check.reason, /modelo mudou/);
});

test('o hash de baseline e escopado por sprint', () => {
  const root = scaffold();
  const project = kernel.openProject(root);
  const hashSp1 = project.store.stateHash('SP1');

  fs.writeFileSync(
    path.join(root, '.daia', 'model', 'AD-a.json'),
    JSON.stringify({
      id: 'AD-a', kind: 'ArchitectureDecision', title: 'decisao de SP3',
      decision: 'uma decisao qualquer registrada', traces_to: ['BD-a'],
      alternatives: [{ option: 'outra via', rejected_because: 'criterio suficientemente descrito' }],
      sprint: 'SP3', provenance: { drafted_by: 'ai' },
    })
  );
  const reloaded = kernel.openProject(root);
  assert.strictEqual(reloaded.store.stateHash('SP1'), hashSp1,
    'acrescentar artefato de SP3 nao pode invalidar a baseline de SP1');
  assert.notStrictEqual(reloaded.store.stateHash('SP3'), hashSp1);
});

test('a fase do teste nao entra no hash: o contrato nao muda ao ficar verde', () => {
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
