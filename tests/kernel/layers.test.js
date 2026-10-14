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

// ─────────────────────────────── negocio ───────────────────────────────

test('negocio: SP1 sem persona, processo e IDEF0 bloqueia nas tres regras', () => {
  const found = rules(blocking(DOCS.filter((d) => ['STK-a', 'BD-a'].includes(d.id)), 'SP1', {}));
  for (const rule of ['BIZ-PERSONA', 'BIZ-BPMN', 'BIZ-IDEF0', 'BIZ-DRIVER-PROCESS']) assert.ok(found.includes(rule), rule);
});

test('negocio: persona sem raia no BPMN bloqueia', () => {
  const found = blocking(DOCS, 'SP1', { 'docs/atender.bpmn': BPMN.replace('name="Operador"', 'name="Gerente"') });
  assert.ok(found.some((f) => f.rule === 'BIZ-BPMN' && /sem raia/.test(f.message)));
});

test('negocio: BPMN sem namespace, inicio ou fluxo bloqueia', () => {
  const broken = '<definitions><process id="p"><task id="t"/></process></definitions>';
  const messages = blocking(DOCS, 'SP1', { 'docs/atender.bpmn': broken }).filter((f) => f.rule === 'BIZ-BPMN').map((f) => f.message);
  for (const expected of ['namespace', 'inicio', 'fim', 'fluxo']) assert.ok(messages.some((m) => m.includes(expected)), expected);
});

test('negocio: processo sem modelo BPMN bloqueia', () => {
  const bp = DOCS.find((d) => d.id === 'BP-atender');
  const found = blocking(replace({ ...bp, models: [{ kind: 'dynamic', notation: 'texto', path: 'docs/atender.bpmn' }] }), 'SP1');
  assert.ok(found.some((f) => f.rule === 'BIZ-BPMN' && /notation BPMN/.test(f.message)));
});

test('negocio: numeracao IDEF0 incoerente e raiz duplicada bloqueiam', () => {
  const child = { ...IDF, id: 'IDF-A21', node: 'A21', parent: 'IDF-A0', title: 'Atividade mal numerada' };
  const orphanRoot = { ...IDF, id: 'IDF-outra', node: 'A5', title: 'Outra raiz' };
  const messages = blocking([...DOCS, child, orphanRoot], 'SP1').filter((f) => f.rule === 'BIZ-IDEF0').map((f) => f.message);
  assert.ok(messages.some((m) => /unica raiz A0/.test(m)));
  assert.ok(messages.some((m) => /A21 nao numera a partir de A0/.test(m)));
});

test('negocio: decomposicao com menos de 3 filhos e aviso, nao bloqueio', () => {
  const child = { ...IDF, id: 'IDF-A1', node: 'A1', parent: 'IDF-A0', title: 'Unica subatividade' };
  const report = kernel.openProject(scaffold([...DOCS, child])).gate.evaluate('SP1');
  assert.strictEqual(report.passed, true, JSON.stringify(report.blocking));
  assert.ok(report.warnings.some((f) => f.rule === 'BIZ-IDEF0-SPAN'));
});

// ────────────────────────────── elicitacao ─────────────────────────────

const RF = {
  id: 'RF-registrar', kind: 'Requirement', type: 'functional', statement: 'Registrar a solicitacao recebida',
  traces_to: ['BP-atender'], elicitation: { technique: 'process-analysis', sources: ['BP-atender', 'PER-operador'] },
  sprint: 'SP2', provenance: P,
};

test('elicitacao: requisito derivado de processo com fontes passa a SP2', () => {
  const report = kernel.openProject(scaffold([...DOCS, RF])).gate.evaluate('SP2');
  assert.strictEqual(report.passed, true, JSON.stringify(report.blocking));
});

test('elicitacao: requisito sem elicitation bloqueia', () => {
  const { elicitation, ...bare } = RF;
  assert.ok(rules(blocking([...DOCS, bare], 'SP2')).includes('ELI-SOURCE'));
});

test('elicitacao: fonte de elicitacao de tipo errado bloqueia', () => {
  const req = { ...RF, elicitation: { technique: 'interview', sources: ['BD-a'] } };
  assert.ok(blocking([...DOCS, req], 'SP2').some((f) => f.rule === 'ELI-SOURCE' && /deve ser/.test(f.message)));
});

test('elicitacao: requisito funcional rastreado so ao direcionador bloqueia', () => {
  const found = rules(blocking([...DOCS, { ...RF, traces_to: ['BD-a'] }], 'SP2'));
  assert.ok(found.includes('ELI-FROM-BUSINESS'));
  assert.ok(found.includes('ELI-ACTIVITY-COVERAGE'));
});

test('elicitacao: necessidade derivada do negocio fundamenta requisito de sistema (SEBoK)', () => {
  const need = { ...RF, id: 'RF-necessidade', level: 'stakeholder-need', statement: 'O operador precisa registrar sem retrabalho' };
  const sys = { ...RF, level: 'system', traces_to: ['RF-necessidade'] };
  const found = rules(blocking([...DOCS, need, sys], 'SP2'));
  assert.ok(!found.includes('ELI-FROM-BUSINESS'), JSON.stringify(found));
});

test('elicitacao: atividade manual fica fora da cobertura exigida', () => {
  const report = kernel.openProject(scaffold(replace({ ...IDF, automation: 'manual' }))).gate.evaluate('SP2');
  assert.ok(!rules(report.blocking).includes('ELI-ACTIVITY-COVERAGE'));
});

// ───────────────────────── engenharia e tecnologia ─────────────────────

const CON = { id: 'CON-a', kind: 'Concern', statement: 'a solicitacao fica registrada?', stakeholders: ['STK-a'], sprint: 'SP1', provenance: P };
const view = (id, viewpoint, kind) => ({ id, kind: 'View', viewpoint, addresses_concerns: ['CON-a'], stakeholders: ['STK-a'],
  models: [{ kind, path: 'docs/atender.bpmn' }], sprint: 'SP3', provenance: P });
const COMP = view('VW-comp', 'computational', 'dynamic');
const ENG = view('VW-eng', 'engineering', 'deployment');
const TEC = view('VW-tec', 'technology', 'other');
const cor = (id, from, to) => ({ id, kind: 'Correspondence', rule: 'realizes', from, to, rationale: 'realizacao declarada', sprint: 'SP3', provenance: P });
const AD = { id: 'AD-a', kind: 'ArchitectureDecision', title: 'Processo unico', decision: 'Executar em um unico processo local',
  alternatives: [{ option: 'Microsservicos', rejected_because: 'Nao ha carga que justifique distribuicao' }],
  traces_to: ['RF-registrar'], affects_views: ['VW-eng', 'VW-tec'], sprint: 'SP3', provenance: P };
const SP3 = [...DOCS, RF, CON, COMP, ENG, TEC, cor('COR-1', 'VW-eng', 'VW-comp'), cor('COR-2', 'VW-tec', 'VW-eng'), AD];
const layerRules = (docs) => blocking(docs, 'SP3').filter((f) => ['ENG-VIEW', 'TEC-VIEW'].includes(f.rule));

test('engenharia e tecnologia encadeadas passam nas regras de camada', () => {
  assert.deepStrictEqual(layerRules(SP3), []);
});

test('engenharia: ausencia da view engineering bloqueia', () => {
  assert.ok(layerRules(SP3.filter((d) => d.id !== 'VW-eng')).some((f) => f.rule === 'ENG-VIEW' && /nenhuma view/.test(f.message)));
});

test('engenharia: sem correspondencia com o modelo logico bloqueia', () => {
  assert.ok(layerRules(SP3.filter((d) => d.id !== 'COR-1')).some((f) => f.rule === 'ENG-VIEW' && /correspondencia/.test(f.message)));
});

test('tecnologia: sem correspondencia com engenharia nem decisao bloqueia', () => {
  const docs = SP3.filter((d) => d.id !== 'COR-2').map((d) => (d.id === 'AD-a' ? { ...d, affects_views: ['VW-eng'] } : d));
  const messages = layerRules(docs).filter((f) => f.rule === 'TEC-VIEW').map((f) => f.message);
  assert.ok(messages.some((m) => /engineering/.test(m)));
  assert.ok(messages.some((m) => /nenhuma decisao/.test(m)));
});

test('catalogo sem engineering/technology nao aplica essas camadas', () => {
  const found = blocking([...DOCS, RF], 'SP3', FILES, { viewpointCatalog: 'c4' });
  assert.ok(!rules(found).some((r) => ['ENG-VIEW', 'TEC-VIEW'].includes(r)));
});
