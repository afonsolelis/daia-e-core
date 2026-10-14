'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const kernel = require('../../kernel');
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
function sign(root, sprint) { run(root, ['baseline', 'sign', sprint, '--by', 'Pessoa de teste', '--rationale', 'Aprovacao sintetica do teste automatizado']); }

test('onboarding ate SP5, retomada, evidencia e invalidacao de baseline', t => {
  const root = temp(t);
  run(root, ['init', '--yes', '--objective', 'Demonstrar o percurso']);
  assert.ok(fs.existsSync(path.join(root, '.agents/skills/describe-software-architecture/SKILL.md')));
  assert.equal(JSON.parse(run(root, ['next', '--json'])).sprint, 'SP1');
  run(root, ['init', '--yes'], 2);
  doc(root, { id: 'STK-user', kind: 'Stakeholder', name: 'Operador', sprint: 'SP1' });
  doc(root, { id: 'BD-service', kind: 'BusinessDriver', statement: 'Entregar resposta correta ao operador', stakeholders: ['STK-user'], hypothesis: 'Resposta pode ser comprovada por teste', sprint: 'SP1' });
  doc(root, { id: 'CON-result', kind: 'Concern', statement: 'A resposta esta correta?', stakeholders: ['STK-user'], sprint: 'SP1' });
  run(root, ['verify', 'SP1']); sign(root, 'SP1');
  assert.equal(next(kernel.openProject(root)).sprint, 'SP2');
  doc(root, { id: 'RF-response', kind: 'Requirement', type: 'functional', statement: 'Responder verdadeiro quando implementado', traces_to: ['BD-service'], sprint: 'SP2' });
  run(root, ['verify', 'SP2']); sign(root, 'SP2');
  write(root, 'architecture.md', '# Modelo\nEntidade: Resposta. Fluxo: solicitar -> responder.');
  doc(root, { id: 'VW-service', kind: 'View', viewpoint: 'computational', addresses_concerns: ['CON-result'], stakeholders: ['STK-user'], sprint: 'SP3', models: [{ kind: 'static', path: 'architecture.md' }, { kind: 'dynamic', path: 'architecture.md' }] });
  doc(root, { id: 'AD-service', kind: 'ArchitectureDecision', title: 'Resposta local', decision: 'Calcular a resposta no processo local', alternatives: [{ option: 'Servico remoto', rejected_because: 'Nao existe necessidade de distribuicao' }], traces_to: ['RF-response'], affects_views: ['VW-service'], sprint: 'SP3' });
  write(root, 'implementation.json', { ready: false });
  write(root, 'contract.cjs', "const assert = require('node:assert/strict'); assert.equal(require('./implementation.json').ready, true);\n");
  const tc = { id: 'TC-response', kind: 'TestContract', verifies: ['RF-response'], test_path: 'contract.cjs', phase: 'red', sprint: 'SP3' };
  doc(root, tc);
  const config = JSON.parse(fs.readFileSync(path.join(root, '.daia/config.json')));
  config.verification = { 'TC-response': { command: process.execPath, args: ['contract.cjs'], inputs: ['implementation.json'] } };
  write(root, '.daia/config.json', config);
  run(root, ['gate', 'SP3'], 1); // phase alone is no longer evidence
  run(root, ['verify', 'SP3']); sign(root, 'SP3');
  write(root, 'implementation.json', { ready: true });
  doc(root, { ...tc, phase: 'green' });
  write(root, '.daia/evidence/quality-report.md', '# Qualidade\nResultado funcional observado: contrato executado com sucesso e resposta verdadeira.\n## Limitacoes\nExemplo sintetico sem carga ou integracoes.');
  run(root, ['gate', 'SP4'], 1);
  run(root, ['verify', 'SP4']); sign(root, 'SP4');
  write(root, '.daia/evidence/validation.md', '# Validacao\nHipotese confirmada neste exemplo: resposta verdadeira observada pelo contrato.\n## Limitacoes\nNao demonstra desempenho nem superioridade do metodo.');
  run(root, ['verify', 'SP5']); sign(root, 'SP5');
  assert.equal(JSON.parse(run(root, ['next', '--json'])).state, 'complete');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, '.daia/workflow.json'))).history.length, 5);
  write(root, 'implementation.json', { ready: false });
  assert.equal(next(kernel.openProject(root)).sprint, 'SP4');
  run(root, ['gate', 'SP5'], 1);
  write(root, 'architecture.md', '# Modelo alterado');
  assert.equal(next(kernel.openProject(root)).sprint, 'SP3');
});

test('instalacao e idempotente e preserva customizacoes antes de escrever', t => {
  const root = temp(t);
  install(root, SQUAD);
  install(root, SQUAD);
  const relative = '.agents/skills/model-business-context/SKILL.md';
  write(root, relative, 'Minha customizacao');
  assert.throws(() => install(root, SQUAD), /Conflito/);
  assert.equal(fs.readFileSync(path.join(root, relative), 'utf8'), 'Minha customizacao');
  assert.throws(() => install(root, SQUAD, '../outside'), /Runtime/);
});

test('instalacao recusa links simbolicos no destino', t => {
  const root = temp(t), outside = temp(t);
  fs.symlinkSync(outside, path.join(root, '.agents'), 'dir');
  assert.throws(() => install(root, SQUAD), /simbolico/);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test('onboarding aceita diretorio posicional e flags sem interacao', t => {
  const parent = temp(t), root = path.join(parent, 'novo');
  const result = spawnSync(process.execPath, [CLI, 'init', root, '--yes', '--mode', 'existing', '--runtime', 'portable'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, '.daia/config.json'))).mode, 'existing');
});
