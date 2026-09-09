'use strict';

/**
 * Validador de JSON Schema — subconjunto draft-07 suficiente para o metamodelo DAIA-E.
 *
 * Escrito sem dependência externa por três razões, nesta ordem de peso:
 *   1. o kernel roda sem `npm install`, o que sustenta a reprodutibilidade do artefato;
 *   2. o conjunto de palavras-chave usado pelo metamodelo e pequeno e fechado;
 *   3. as regras de correspondencia da ISO 42010 sao entre documentos, e nenhum
 *      validador de schema as expressaria — elas vivem em kernel/rules.
 *
 * Palavras-chave suportadas: type, const, enum, required, properties,
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
   * @param {Map<string, object>} registry schemas indexados por $id
   */
  constructor(registry) {
    this.registry = registry || new Map();
  }

  /**
   * Resolve um $ref no formato "daia-e/common#/definitions/id" ou "#/definitions/x".
   */
  resolveRef(ref, localRoot) {
    const [idPart, pointer] = ref.split('#');
    const root = idPart ? this.registry.get(idPart) : localRoot;
    if (!root) throw new Error(`Schema nao registrado para $ref: ${ref}`);
    if (!pointer) return root;
    let node = root;
    for (const rawSegment of pointer.split('/').filter(Boolean)) {
      const segment = rawSegment.replace(/~1/g, '/').replace(/~0/g, '~');
      node = node[segment];
      if (node === undefined) throw new Error(`Ponteiro nao resolvido em $ref: ${ref}`);
    }
    return node;
  }

  /**
   * @returns {Array<{path: string, message: string}>} lista vazia quando valido
   */
  validate(data, schema, localRoot = schema, path = '$') {
    const errors = [];

    if (schema.$ref) {
      const merged = { ...this.resolveRef(schema.$ref, localRoot) };
      for (const [key, value] of Object.entries(schema)) {
        if (key !== '$ref' && merged[key] === undefined) merged[key] = value;
      }
      // Um $ref para outro schema muda a base de resolucao: os $ref internos do
      // schema alvo (ex.: "#/definitions/idRef") apontam para o alvo, nao para
      // o documento que o referenciou.
      const [idPart] = schema.$ref.split('#');
      const nextRoot = idPart ? this.registry.get(idPart) || localRoot : localRoot;
      return this.validate(data, merged, nextRoot, path);
    }

    if (schema.const !== undefined && data !== schema.const) {
      errors.push({ path, message: `esperado o valor constante "${schema.const}", recebido "${data}"` });
      return errors;
    }

    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({ path, message: `valor "${data}" fora do enum permitido (${schema.enum.join(', ')})` });
      return errors;
    }

    if (schema.type) {
      const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
      for (const t of allowed) {
        if (!SUPPORTED_TYPES.includes(t)) throw new Error(`Tipo nao suportado no schema: ${t}`);
      }
      if (!allowed.some((t) => typeMatches(data, t))) {
        errors.push({ path, message: `esperado tipo ${allowed.join('|')}, recebido ${typeOf(data)}` });
        return errors;
      }
    }

    if (typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push({ path, message: `texto com ${data.length} caractere(s); minimo ${schema.minLength}` });
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
        errors.push({ path, message: `"${data}" nao casa com o padrao ${schema.pattern}` });
      }
    }

    if (typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({ path, message: `valor ${data} abaixo do minimo ${schema.minimum}` });
      }
    }

    if (Array.isArray(data)) {
      if (schema.minItems !== undefined && data.length < schema.minItems) {
        errors.push({ path, message: `lista com ${data.length} item(ns); minimo ${schema.minItems}` });
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
          errors.push({ path: `${path}.${key}`, message: 'campo obrigatorio ausente' });
        }
      }
      const props = schema.properties || {};
      for (const [key, value] of Object.entries(data)) {
        if (props[key]) {
          errors.push(...this.validate(value, props[key], localRoot, `${path}.${key}`));
        } else if (schema.additionalProperties === false) {
          errors.push({ path: `${path}.${key}`, message: 'campo nao previsto no schema' });
        }
      }
    }

    return errors;
  }
}

module.exports = { SchemaValidator, typeOf };
