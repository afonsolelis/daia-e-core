'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { SchemaValidator } = require('../../kernel/validator/schema-validator');
const { walk, readJson } = require('../../kernel/util/fs-walk');

function buildRegistry() {
  const dir = path.join(__dirname, '..', '..', 'kernel', 'schemas');
  const registry = new Map();
  for (const file of walk(dir, '.json')) {
    const schema = readJson(file);
    if (schema.$id) registry.set(schema.$id, schema);
    registry.set(path.basename(file, '.schema.json'), schema);
  }
  const common = readJson(path.join(dir, '_common.schema.json'));
  registry.set(common.$id, common);
  return registry;
}

const registry = buildRegistry();
const validator = new SchemaValidator(registry);

test('aceita documento valido', () => {
  const doc = {
    id: 'STK-professor', kind: 'Stakeholder', name: 'Professor',
    sprint: 'SP1', provenance: { drafted_by: 'human' },
  };
  assert.deepStrictEqual(validator.validate(doc, registry.get('stakeholder')), []);
});

test('recusa campo obrigatorio ausente', () => {
  const doc = { id: 'STK-x', kind: 'Stakeholder', sprint: 'SP1', provenance: { drafted_by: 'human' } };
  const errors = validator.validate(doc, registry.get('stakeholder'));
  assert.ok(errors.some((e) => e.path === '$.name' && /obrigatorio/.test(e.message)));
});

test('recusa campo nao previsto quando additionalProperties e false', () => {
  const doc = {
    id: 'STK-x', kind: 'Stakeholder', name: 'X', sprint: 'SP1',
    provenance: { drafted_by: 'human' }, inventado: true,
  };
  const errors = validator.validate(doc, registry.get('stakeholder'));
  assert.ok(errors.some((e) => e.path === '$.inventado'));
});

test('recusa valor fora do enum', () => {
  const doc = {
    id: 'STK-x', kind: 'Stakeholder', name: 'X', sprint: 'SP9',
    provenance: { drafted_by: 'human' },
  };
  const errors = validator.validate(doc, registry.get('stakeholder'));
  assert.ok(errors.some((e) => /enum/.test(e.message)));
});

test('resolve $ref entre schemas distintos', () => {
  const doc = {
    id: 'CON-x', kind: 'Concern', statement: 'uma preocupacao suficientemente longa',
    stakeholders: ['STK-professor'], sprint: 'SP1', provenance: { drafted_by: 'ai' },
  };
  assert.deepStrictEqual(validator.validate(doc, registry.get('concern')), []);
});

test('aplica pattern de id atraves de $ref cross-schema', () => {
  const doc = {
    id: 'CON-x', kind: 'Concern', statement: 'uma preocupacao suficientemente longa',
    stakeholders: ['id-invalido'], sprint: 'SP1', provenance: { drafted_by: 'ai' },
  };
  const errors = validator.validate(doc, registry.get('concern'));
  assert.ok(errors.some((e) => /padrao/.test(e.message)), 'id fora do padrao deveria falhar');
});

test('exige minItems em lista', () => {
  const doc = {
    id: 'CON-x', kind: 'Concern', statement: 'uma preocupacao suficientemente longa',
    stakeholders: [], sprint: 'SP1', provenance: { drafted_by: 'ai' },
  };
  const errors = validator.validate(doc, registry.get('concern'));
  assert.ok(errors.some((e) => /minimo 1/.test(e.message)));
});

test('todos os schemas do kernel sao JSON valido com $id', () => {
  const dir = path.join(__dirname, '..', '..', 'kernel', 'schemas');
  const files = walk(dir, '.json');
  assert.ok(files.length >= 10, 'esperado ao menos 10 schemas');
  for (const file of files) {
    const schema = readJson(file);
    assert.ok(schema.$id, `${path.basename(file)} sem $id`);
    assert.ok(schema.title, `${path.basename(file)} sem title`);
  }
});

test('decisao aceita taticas no formato atributo/tatica e rejeita formato livre', () => {
  const P = { drafted_by: 'ai' };
  const base = {
    id: 'AD-a', kind: 'ArchitectureDecision', title: 'replicar o servico de pedidos',
    decision: 'replicamos o servico em modo ativo', traces_to: ['QS-a'],
    alternatives: [{ option: 'cold spare', rejected_because: 'failover lento demais para o cenario' }],
    sprint: 'SP3', provenance: P,
  };
  const ok = { ...base, tactics: ['availability/active-redundancy', 'performance/introduce-concurrency'] };
  assert.deepStrictEqual(validator.validate(ok, registry.get('decision')), []);
  const bad = { ...base, tactics: ['active redundancy'] };
  assert.ok(validator.validate(bad, registry.get('decision')).length > 0);
});
