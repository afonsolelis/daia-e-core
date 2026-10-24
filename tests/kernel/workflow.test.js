'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const kernel = require('../../kernel');
const { BPMN } = require('../fixtures/business');
const { next } = require('../../kernel/workflow/workflow');
const { install } = require('../../kernel/skill/install');
const CLI = path.resolve(__dirname, '../../bin/daia.js');
const SQUAD = path.resolve(__dirname, '../../squads/daia-e');
const P = { drafted_by: 'human' };
function temp(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'daia-workflow-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function run(root, args, expected = 0) {
  const result = spawnSync(process.execPath, [CLI, ...args, '--root', root], { encoding: 'utf8' });
  assert.equal(result.status, expected, result.stdout + result.stderr);
  return result.stdout;
}
function write(root, file, value) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}
function doc(root, value) { write(root, `.daia/model/${value.id}.json`, { provenance: P, ...value }); }
function sign(root, sprint) { run(root, ['baseline', 'sign', sprint, '--by', 'Test person', '--rationale', 'Synthetic approval of the automated test']); }

test('onboarding to SP5, resume, evidence and baseline invalidation', t => {
  const root = temp(t);
  run(root, ['init', '--yes', '--objective', 'Show the full path']);
  assert.ok(fs.existsSync(path.join(root, '.agents/skills/describe-software-architecture/SKILL.md')));
  assert.equal(JSON.parse(run(root, ['next', '--json'])).sprint, 'SP1');
  run(root, ['init', '--yes'], 2);
  doc(root, { id: 'STK-user', kind: 'Stakeholder', name: 'Operator', sprint: 'SP1' });
  doc(root, { id: 'BD-service', kind: 'BusinessDriver', statement: 'Give a correct response to the operator', stakeholders: ['STK-user'], hypothesis: 'A test can prove the response', sprint: 'SP1' });
  doc(root, { id: 'CON-result', kind: 'Concern', statement: 'Is the response correct?', stakeholders: ['STK-user'], sprint: 'SP1' });
  run(root, ['gate', 'SP1'], 1); // without persona, BPMN and IDEF0 the business layer does not close
  doc(root, { id: 'PER-operator', kind: 'Persona', name: 'Operator', stakeholders: ['STK-user'], goals: ['Get a correct response'], evidence: 'Synthetic interview of the test', sprint: 'SP1' });
  doc(root, { id: 'IDF-A0', kind: 'Idef0Activity', node: 'A0', title: 'Respond to operator', controls: ['response rule'], outputs: ['response'], mechanisms: ['Operator'], automation: 'system', sprint: 'SP1' });
  write(root, 'docs/serve.bpmn', BPMN);
  doc(root, { id: 'BP-respond', kind: 'BusinessProcess', name: 'Respond to operator', trigger: 'Operator asks for a response', outcome: 'Response delivered', performed_by: ['PER-operator'], supports: ['BD-service'], activity: 'IDF-A0', models: [{ kind: 'dynamic', notation: 'BPMN 2.0', path: 'docs/serve.bpmn' }], sprint: 'SP1' });
  run(root, ['verify', 'SP1']); sign(root, 'SP1');
  assert.equal(next(kernel.openProject(root)).sprint, 'SP2');
  doc(root, { id: 'FR-response', kind: 'Requirement', type: 'functional', statement: 'Respond true when implemented', traces_to: ['BP-respond'], elicitation: { technique: 'process-analysis', sources: ['BP-respond', 'PER-operator'] }, sprint: 'SP2' });
  run(root, ['verify', 'SP2']); sign(root, 'SP2');
  write(root, 'architecture.md', '# Model\nEntity: Response. Flow: request -> respond.');
  doc(root, { id: 'VW-service', kind: 'View', viewpoint: 'computational', addresses_concerns: ['CON-result'], stakeholders: ['STK-user'], sprint: 'SP3', models: [{ kind: 'static', path: 'architecture.md' }, { kind: 'dynamic', path: 'architecture.md' }] });
  doc(root, { id: 'AD-service', kind: 'ArchitectureDecision', title: 'Local response', decision: 'Calculate the response in the local process', alternatives: [{ option: 'Remote service', rejected_because: 'There is no need for distribution' }], traces_to: ['FR-response'], affects_views: ['VW-service'], sprint: 'SP3' });
  doc(root, { id: 'VW-engineering', kind: 'View', viewpoint: 'engineering', addresses_concerns: ['CON-result'], stakeholders: ['STK-user'], sprint: 'SP3', models: [{ kind: 'deployment', path: 'architecture.md' }] });
  doc(root, { id: 'VW-technology', kind: 'View', viewpoint: 'technology', addresses_concerns: ['CON-result'], stakeholders: ['STK-user'], sprint: 'SP3', models: [{ kind: 'other', path: 'architecture.md' }] });
  doc(root, { id: 'COR-eng-comp', kind: 'Correspondence', rule: 'realizes', from: 'VW-engineering', to: 'VW-service', rationale: 'A local process hosts the component', sprint: 'SP3' });
  doc(root, { id: 'COR-tec-eng', kind: 'Correspondence', rule: 'realizes', from: 'VW-technology', to: 'VW-engineering', rationale: 'Node.js runs the local process', sprint: 'SP3' });
  doc(root, { id: 'AD-runtime', kind: 'ArchitectureDecision', title: 'Runtime Node.js', decision: 'Run the local process in Node.js', alternatives: [{ option: 'Python', rejected_because: 'The kernel and the tests already use Node.js' }], traces_to: ['FR-response'], affects_views: ['VW-engineering', 'VW-technology'], sprint: 'SP3' });
  write(root, 'implementation.json', { ready: false });
  write(root, 'contract.cjs', "const assert = require('node:assert/strict'); assert.equal(require('./implementation.json').ready, true);\n");
  const tc = { id: 'TC-response', kind: 'TestContract', verifies: ['FR-response'], test_path: 'contract.cjs', phase: 'red', sprint: 'SP3' };
  doc(root, tc);
  const config = JSON.parse(fs.readFileSync(path.join(root, '.daia/config.json')));
  config.verification = { 'TC-response': { command: process.execPath, args: ['contract.cjs'], inputs: ['implementation.json'] } };
  write(root, '.daia/config.json', config);
  run(root, ['gate', 'SP3'], 1); // phase alone is no longer evidence
  run(root, ['verify', 'SP3']); sign(root, 'SP3');
  write(root, 'implementation.json', { ready: true });
  doc(root, { ...tc, phase: 'green' });
  write(root, '.daia/evidence/quality-report.md', '# Quality\nObserved functional result: the contract ran with success and the response is true.\n## Limitations\nSynthetic example without load or integrations.');
  run(root, ['gate', 'SP4'], 1);
  run(root, ['verify', 'SP4']); sign(root, 'SP4');
  write(root, '.daia/evidence/validation.md', '# Validation\nHypothesis confirmed in this example: the contract observed a true response.\n## Limitations\nIt does not show performance or that the method is better.');
  run(root, ['verify', 'SP5']); sign(root, 'SP5');
  assert.equal(JSON.parse(run(root, ['next', '--json'])).state, 'complete');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, '.daia/workflow.json'))).history.length, 5);
  write(root, 'implementation.json', { ready: false });
  assert.equal(next(kernel.openProject(root)).sprint, 'SP4');
  run(root, ['gate', 'SP5'], 1);
  write(root, 'architecture.md', '# Changed model');
  assert.equal(next(kernel.openProject(root)).sprint, 'SP3');
});

test('installation is idempotent and keeps customizations before it writes', t => {
  const root = temp(t);
  install(root, SQUAD);
  install(root, SQUAD);
  const relative = '.agents/skills/model-business-context/SKILL.md';
  write(root, relative, 'My customization');
  assert.throws(() => install(root, SQUAD), /Conflict/);
  assert.equal(fs.readFileSync(path.join(root, relative), 'utf8'), 'My customization');
  assert.throws(() => install(root, SQUAD, '../outside'), /Supported runtimes/);
});

test('installation rejects symbolic links in the destination', t => {
  const root = temp(t), outside = temp(t);
  fs.symlinkSync(outside, path.join(root, '.agents'), 'dir');
  assert.throws(() => install(root, SQUAD), /Symbolic link/);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test('onboarding accepts a positional directory and flags without interaction', t => {
  const parent = temp(t), root = path.join(parent, 'new');
  const result = spawnSync(process.execPath, [CLI, 'init', root, '--yes', '--mode', 'existing', '--runtime', 'portable'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, '.daia/config.json'))).mode, 'existing');
});
