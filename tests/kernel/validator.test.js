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

test('accepts a valid document', () => {
  const doc = {
    id: 'STK-teacher', kind: 'Stakeholder', name: 'Teacher',
    sprint: 'SP1', provenance: { drafted_by: 'human' },
  };
  assert.deepStrictEqual(validator.validate(doc, registry.get('stakeholder')), []);
});

test('rejects a missing mandatory field', () => {
  const doc = { id: 'STK-x', kind: 'Stakeholder', sprint: 'SP1', provenance: { drafted_by: 'human' } };
  const errors = validator.validate(doc, registry.get('stakeholder'));
  assert.ok(errors.some((e) => e.path === '$.name' && /mandatory/.test(e.message)));
});

test('rejects an unknown field if additionalProperties is false', () => {
  const doc = {
    id: 'STK-x', kind: 'Stakeholder', name: 'X', sprint: 'SP1',
    provenance: { drafted_by: 'human' }, invented: true,
  };
  const errors = validator.validate(doc, registry.get('stakeholder'));
  assert.ok(errors.some((e) => e.path === '$.invented'));
});

test('rejects a value that is not in the enum', () => {
  const doc = {
    id: 'STK-x', kind: 'Stakeholder', name: 'X', sprint: 'SP9',
    provenance: { drafted_by: 'human' },
  };
  const errors = validator.validate(doc, registry.get('stakeholder'));
  assert.ok(errors.some((e) => /enum/.test(e.message)));
});

test('resolves a $ref between different schemas', () => {
  const doc = {
    id: 'CON-x', kind: 'Concern', statement: 'a concern that is long enough',
    stakeholders: ['STK-professor'], sprint: 'SP1', provenance: { drafted_by: 'ai' },
  };
  assert.deepStrictEqual(validator.validate(doc, registry.get('concern')), []);
});

test('applies the id pattern through a cross-schema $ref', () => {
  const doc = {
    id: 'CON-x', kind: 'Concern', statement: 'a concern that is long enough',
    stakeholders: ['invalid-id'], sprint: 'SP1', provenance: { drafted_by: 'ai' },
  };
  const errors = validator.validate(doc, registry.get('concern'));
  assert.ok(errors.some((e) => /pattern/.test(e.message)), 'an id that does not match the pattern must fail');
});

test('applies minItems to a list', () => {
  const doc = {
    id: 'CON-x', kind: 'Concern', statement: 'a concern that is long enough',
    stakeholders: [], sprint: 'SP1', provenance: { drafted_by: 'ai' },
  };
  const errors = validator.validate(doc, registry.get('concern'));
  assert.ok(errors.some((e) => /minimum 1/.test(e.message)));
});

test('all kernel schemas are valid JSON with $id', () => {
  const dir = path.join(__dirname, '..', '..', 'kernel', 'schemas');
  const files = walk(dir, '.json');
  assert.ok(files.length >= 10, 'expected at least 10 schemas');
  for (const file of files) {
    const schema = readJson(file);
    assert.ok(schema.$id, `${path.basename(file)} has no $id`);
    assert.ok(schema.title, `${path.basename(file)} has no title`);
  }
});

test('a decision accepts tactics in the attribute/tactic form and rejects free text', () => {
  const P = { drafted_by: 'ai' };
  const base = {
    id: 'AD-a', kind: 'ArchitectureDecision', title: 'replicate the order service',
    decision: 'we replicate the service in active mode', traces_to: ['QS-a'],
    alternatives: [{ option: 'cold spare', rejected_because: 'the failover is too slow for the scenario' }],
    sprint: 'SP3', provenance: P,
  };
  const ok = { ...base, tactics: ['availability/active-redundancy', 'performance/introduce-concurrency'] };
  assert.deepStrictEqual(validator.validate(ok, registry.get('decision')), []);
  const bad = { ...base, tactics: ['active redundancy'] };
  assert.ok(validator.validate(bad, registry.get('decision')).length > 0);
});
