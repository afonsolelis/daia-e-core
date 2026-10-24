'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const kernel = require('../../kernel');
const { P, BPMN, FILES, DOCS } = require('../fixtures/business');

function scaffold(docs, files = FILES, config = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'daia-layers-'));
  const model = path.join(root, '.daia', 'model');
  fs.mkdirSync(model, { recursive: true });
  fs.writeFileSync(path.join(root, '.daia', 'config.json'), JSON.stringify({ viewpointCatalog: 'rm-odp', ...config }));
  for (const doc of docs) fs.writeFileSync(path.join(model, `${doc.id}.json`), JSON.stringify(doc));
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
  return root;
}

function blocking(docs, sprint, files, config) {
  const report = kernel.openProject(scaffold(docs, files, config)).gate.evaluate(sprint);
  return report.blocking;
}

function rules(findings) {
  return findings.map((f) => f.rule);
}

const without = (id) => DOCS.filter((d) => d.id !== id);
const replace = (doc) => [...without(doc.id), doc];
const IDF = DOCS.find((d) => d.id === 'IDF-A0');
// The fixture ids can change. Find the fixture documents by kind.
const BP = DOCS.find((d) => d.kind === 'BusinessProcess');
const PER = DOCS.find((d) => d.kind === 'Persona');
const BPMN_PATH = Object.keys(FILES)[0];

// ─────────────────────────────── business ──────────────────────────────

test('business: SP1 without persona, process and IDEF0 blocks on the business rules', () => {
  const found = rules(blocking(DOCS.filter((d) => ['STK-a', 'BD-a'].includes(d.id)), 'SP1', {}));
  for (const rule of ['BIZ-PERSONA', 'BIZ-BPMN', 'BIZ-IDEF0', 'BIZ-DRIVER-PROCESS']) assert.ok(found.includes(rule), rule);
});

test('business: a persona without a lane in the BPMN model blocks', () => {
  const found = blocking(DOCS, 'SP1', { [BPMN_PATH]: BPMN.replace(`name="${PER.name}"`, 'name="Manager"') });
  assert.ok(found.some((f) => f.rule === 'BIZ-BPMN' && /has no lane/.test(f.message)));
});

test('business: BPMN without namespace, start event or flow blocks', () => {
  const broken = '<definitions><process id="p"><task id="t"/></process></definitions>';
  const messages = blocking(DOCS, 'SP1', { [BPMN_PATH]: broken }).filter((f) => f.rule === 'BIZ-BPMN').map((f) => f.message);
  for (const expected of ['namespace', 'start', 'end', 'flow']) assert.ok(messages.some((m) => m.includes(expected)), expected);
});

test('business: a process without a BPMN model blocks', () => {
  const found = blocking(replace({ ...BP, models: [{ kind: 'dynamic', notation: 'text', path: BPMN_PATH }] }), 'SP1');
  assert.ok(found.some((f) => f.rule === 'BIZ-BPMN' && /notation BPMN/.test(f.message)));
});

test('business: incoherent IDEF0 numbers and a second root block', () => {
  const child = { ...IDF, id: 'IDF-A21', node: 'A21', parent: 'IDF-A0', title: 'Activity with an incorrect number' };
  const orphanRoot = { ...IDF, id: 'IDF-other', node: 'A5', title: 'Other root' };
  const messages = blocking([...DOCS, child, orphanRoot], 'SP1').filter((f) => f.rule === 'BIZ-IDEF0').map((f) => f.message);
  assert.ok(messages.some((m) => /one root A0/.test(m)));
  assert.ok(messages.some((m) => /A21 does not follow the numbers of A0/.test(m)));
});

test('business: a decomposition with fewer than 3 children is a warning, not a block', () => {
  const child = { ...IDF, id: 'IDF-A1', node: 'A1', parent: 'IDF-A0', title: 'Only subactivity' };
  const report = kernel.openProject(scaffold([...DOCS, child])).gate.evaluate('SP1');
  assert.strictEqual(report.passed, true, JSON.stringify(report.blocking));
  assert.ok(report.warnings.some((f) => f.rule === 'BIZ-IDEF0-SPAN'));
});

// ────────────────────────────── elicitation ────────────────────────────

const FR = {
  id: 'FR-register', kind: 'Requirement', type: 'functional', statement: 'Register the received request',
  traces_to: [BP.id], elicitation: { technique: 'process-analysis', sources: [BP.id, PER.id] },
  sprint: 'SP2', provenance: P,
};

test('elicitation: a requirement derived from a process with sources passes SP2', () => {
  const report = kernel.openProject(scaffold([...DOCS, FR])).gate.evaluate('SP2');
  assert.strictEqual(report.passed, true, JSON.stringify(report.blocking));
});

test('elicitation: a requirement without elicitation blocks', () => {
  const { elicitation, ...bare } = FR;
  assert.ok(rules(blocking([...DOCS, bare], 'SP2')).includes('ELI-SOURCE'));
});

test('elicitation: an elicitation source of the wrong kind blocks', () => {
  const req = { ...FR, elicitation: { technique: 'interview', sources: ['BD-a'] } };
  assert.ok(blocking([...DOCS, req], 'SP2').some((f) => f.rule === 'ELI-SOURCE' && /must be/.test(f.message)));
});

test('elicitation: a functional requirement traced only to the business driver blocks', () => {
  const found = rules(blocking([...DOCS, { ...FR, traces_to: ['BD-a'] }], 'SP2'));
  assert.ok(found.includes('ELI-FROM-BUSINESS'));
  assert.ok(found.includes('ELI-ACTIVITY-COVERAGE'));
});

test('elicitation: a stakeholder need derived from the business grounds a system requirement (SEBoK)', () => {
  const need = { ...FR, id: 'FR-need', level: 'stakeholder-need', statement: 'The operator must register without rework' };
  const sys = { ...FR, level: 'system', traces_to: ['FR-need'] };
  const found = rules(blocking([...DOCS, need, sys], 'SP2'));
  assert.ok(!found.includes('ELI-FROM-BUSINESS'), JSON.stringify(found));
});

test('elicitation: a manual activity is outside the mandatory coverage', () => {
  const report = kernel.openProject(scaffold(replace({ ...IDF, automation: 'manual' }))).gate.evaluate('SP2');
  assert.ok(!rules(report.blocking).includes('ELI-ACTIVITY-COVERAGE'));
});

// ───────────────────────── engineering and technology ──────────────────

const CON = { id: 'CON-a', kind: 'Concern', statement: 'is the request recorded?', stakeholders: ['STK-a'], sprint: 'SP1', provenance: P };
const view = (id, viewpoint, kind) => ({ id, kind: 'View', viewpoint, addresses_concerns: ['CON-a'], stakeholders: ['STK-a'],
  models: [{ kind, path: BPMN_PATH }], sprint: 'SP3', provenance: P });
const COMP = view('VW-comp', 'computational', 'dynamic');
const ENG = view('VW-eng', 'engineering', 'deployment');
const TEC = view('VW-tec', 'technology', 'other');
const cor = (id, from, to) => ({ id, kind: 'Correspondence', rule: 'realizes', from, to, rationale: 'declared realization', sprint: 'SP3', provenance: P });
const AD = { id: 'AD-a', kind: 'ArchitectureDecision', title: 'Single process', decision: 'Run in one local process',
  alternatives: [{ option: 'Microservices', rejected_because: 'The load is too small for a distributed system' }],
  traces_to: ['FR-register'], affects_views: ['VW-eng', 'VW-tec'], sprint: 'SP3', provenance: P };
const SP3 = [...DOCS, FR, CON, COMP, ENG, TEC, cor('COR-1', 'VW-eng', 'VW-comp'), cor('COR-2', 'VW-tec', 'VW-eng'), AD];
const layerRules = (docs) => blocking(docs, 'SP3').filter((f) => ['ENG-VIEW', 'TEC-VIEW'].includes(f.rule));

test('chained engineering and technology views pass the layer rules', () => {
  assert.deepStrictEqual(layerRules(SP3), []);
});

test('engineering: no engineering view blocks', () => {
  assert.ok(layerRules(SP3.filter((d) => d.id !== 'VW-eng')).some((f) => f.rule === 'ENG-VIEW' && /no engineering view/.test(f.message)));
});

test('engineering: no correspondence with the logical model blocks', () => {
  assert.ok(layerRules(SP3.filter((d) => d.id !== 'COR-1')).some((f) => f.rule === 'ENG-VIEW' && /correspondence/.test(f.message)));
});

test('technology: no correspondence with engineering and no decision blocks', () => {
  const docs = SP3.filter((d) => d.id !== 'COR-2').map((d) => (d.id === 'AD-a' ? { ...d, affects_views: ['VW-eng'] } : d));
  const messages = layerRules(docs).filter((f) => f.rule === 'TEC-VIEW').map((f) => f.message);
  assert.ok(messages.some((m) => /engineering/.test(m)));
  assert.ok(messages.some((m) => /no architecture decision/.test(m)));
});

test('a catalog without engineering and technology does not apply these layers', () => {
  const found = blocking([...DOCS, FR], 'SP3', FILES, { viewpointCatalog: 'c4' });
  assert.ok(!rules(found).some((r) => ['ENG-VIEW', 'TEC-VIEW'].includes(r)));
});
