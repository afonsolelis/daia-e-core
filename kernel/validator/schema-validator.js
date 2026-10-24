'use strict';

/**
 * JSON Schema validator. It covers the draft-07 subset that the DAIA-E metamodel uses.
 *
 * It has no external dependency for three reasons, in order of importance:
 *   1. the kernel runs without `npm install`, and this keeps the artifact reproducible;
 *   2. the set of keywords that the metamodel uses is small and closed;
 *   3. the ISO 42010 correspondence rules are between documents. No schema
 *      validator can express them. They are in kernel/rules.
 *
 * Supported keywords: type, const, enum, required, properties,
 * additionalProperties, items, minItems, minLength, minimum, pattern, $ref.
 */

const SUPPORTED_TYPES = ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'];

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function typeMatches(value, expected) {
  const actual = typeOf(value);
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  return actual === expected;
}

class SchemaValidator {
  /**
   * @param {Map<string, object>} registry the schemas, with an index by $id
   */
  constructor(registry) {
    this.registry = registry || new Map();
  }

  /**
   * Resolves a $ref in the form "daia-e/common#/definitions/id" or "#/definitions/x".
   */
  resolveRef(ref, localRoot) {
    const [idPart, pointer] = ref.split('#');
    const root = idPart ? this.registry.get(idPart) : localRoot;
    if (!root) throw new Error(`No schema is registered for $ref: ${ref}`);
    if (!pointer) return root;
    let node = root;
    for (const rawSegment of pointer.split('/').filter(Boolean)) {
      const segment = rawSegment.replace(/~1/g, '/').replace(/~0/g, '~');
      node = node[segment];
      if (node === undefined) throw new Error(`The pointer in $ref is not resolved: ${ref}`);
    }
    return node;
  }

  /**
   * @returns {Array<{path: string, message: string}>} an empty list if the data is valid
   */
  validate(data, schema, localRoot = schema, path = '$') {
    const errors = [];

    if (schema.$ref) {
      const merged = { ...this.resolveRef(schema.$ref, localRoot) };
      for (const [key, value] of Object.entries(schema)) {
        if (key !== '$ref' && merged[key] === undefined) merged[key] = value;
      }
      // A $ref to another schema changes the resolution base. The internal $ref
      // values of the target schema (for example "#/definitions/idRef") point to
      // the target, not to the document that refers to it.
      const [idPart] = schema.$ref.split('#');
      const nextRoot = idPart ? this.registry.get(idPart) || localRoot : localRoot;
      return this.validate(data, merged, nextRoot, path);
    }

    if (schema.const !== undefined && data !== schema.const) {
      errors.push({ path, message: `expected the constant value "${schema.const}", received "${data}"` });
      return errors;
    }

    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({ path, message: `the value "${data}" is not in the permitted enum (${schema.enum.join(', ')})` });
      return errors;
    }

    if (schema.type) {
      const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
      for (const t of allowed) {
        if (!SUPPORTED_TYPES.includes(t)) throw new Error(`The schema has a type that is not supported: ${t}`);
      }
      if (!allowed.some((t) => typeMatches(data, t))) {
        errors.push({ path, message: `expected type ${allowed.join('|')}, received ${typeOf(data)}` });
        return errors;
      }
    }

    if (typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push({ path, message: `the text has ${data.length} character(s); minimum ${schema.minLength}` });
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
        errors.push({ path, message: `"${data}" does not match the pattern ${schema.pattern}` });
      }
    }

    if (typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({ path, message: `the value ${data} is less than the minimum ${schema.minimum}` });
      }
    }

    if (Array.isArray(data)) {
      if (schema.minItems !== undefined && data.length < schema.minItems) {
        errors.push({ path, message: `the list has ${data.length} item(s); minimum ${schema.minItems}` });
      }
      if (schema.items) {
        data.forEach((item, i) => {
          errors.push(...this.validate(item, schema.items, localRoot, `${path}[${i}]`));
        });
      }
    }

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const key of schema.required || []) {
        if (data[key] === undefined) {
          errors.push({ path: `${path}.${key}`, message: 'a mandatory field is missing' });
        }
      }
      const props = schema.properties || {};
      for (const [key, value] of Object.entries(data)) {
        if (props[key]) {
          errors.push(...this.validate(value, props[key], localRoot, `${path}.${key}`));
        } else if (schema.additionalProperties === false) {
          errors.push({ path: `${path}.${key}`, message: 'the schema does not have this field' });
        }
      }
    }

    return errors;
  }
}

module.exports = { SchemaValidator, typeOf };
