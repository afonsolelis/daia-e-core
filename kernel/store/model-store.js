'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { digestFile, referencedFiles } = require('../util/project-files');

const { walk, readJson } = require('../util/fs-walk');
const { SchemaValidator } = require('../validator/schema-validator');

const KERNEL_DIR = path.join(__dirname, '..');
const SCHEMA_DIR = path.join(KERNEL_DIR, 'schemas');
const VIEWPOINT_DIR = path.join(KERNEL_DIR, 'viewpoints');

/** Prefixo de id por tipo de artefato. O prefixo e a chave do roteamento de schema. */
const KIND_BY_PREFIX = {
  STK: 'stakeholder',
  CON: 'concern',
  VW: 'view',
  COR: 'correspondence',
  AD: 'decision',
  BD: 'driver',
  RF: 'requirement',
  RNF: 'requirement',
  QS: 'quality-scenario',
  TC: 'test-contract',
  PER: 'persona',
  BP: 'process',
  IDF: 'idef0',
};

const DEFAULT_CONFIG = {
  viewpointCatalog: 'rm-odp',
  modelDir: '.daia/model',
  baselineDir: '.daia/baselines',
  evidenceDir: '.daia/evidence',
};

/**
 * Carrega o modelo arquitetural de disco, valida cada documento contra o
 * schema do seu tipo e indexa tudo por id para as regras de correspondencia.
 *
 * O store nao interpreta o metodo — ele so garante que o grafo existe e e
 * bem formado. As regras da ISO 42010 vivem em kernel/rules.
 */
class ModelStore {
  constructor(rootDir) {
    this.root = rootDir || process.cwd();
    this.config = this.loadConfig();
    this.schemas = this.loadSchemas();
    this.validator = new SchemaValidator(this.schemas);
    this.documents = new Map();
    this.byKind = new Map();
    this.files = new Map();
    this.parseErrors = [];
    this.schemaErrors = [];
    this.viewpoints = this.loadViewpointCatalog();
  }

  loadConfig() {
    const file = path.join(this.root, '.daia', 'config.json');
    if (!fs.existsSync(file)) return { ...DEFAULT_CONFIG };
    try {
      return { ...DEFAULT_CONFIG, ...readJson(file) };
    } catch (err) {
      throw new Error(`Configuracao invalida em .daia/config.json: ${err.message}`);
    }
  }

  loadSchemas() {
    const registry = new Map();
    for (const file of walk(SCHEMA_DIR, '.json')) {
      const schema = readJson(file);
      if (schema.$id) registry.set(schema.$id, schema);
      registry.set(path.basename(file, '.schema.json'), schema);
    }
    const common = readJson(path.join(SCHEMA_DIR, '_common.schema.json'));
    registry.set(common.$id, common);
    return registry;
  }

  loadViewpointCatalog() {
    const name = this.config.viewpointCatalog;
    const file = path.join(VIEWPOINT_DIR, `${name}.json`);
    if (!fs.existsSync(file)) {
      throw new Error(
        `Catalogo de viewpoints "${name}" nao encontrado. ` +
          'A ISO 42010 nao prescreve views — declare um catalogo valido em .daia/config.json.'
      );
    }
    const catalog = readJson(file);
    const index = new Map();
    for (const vp of catalog.viewpoints) index.set(vp.id, vp);
    return { catalog: catalog.catalog, name: catalog.name, standard: catalog.standard, index };
  }

  /** Deduz o schema a partir do prefixo do id. */
  schemaNameFor(id) {
    const prefix = String(id).split('-')[0];
    return KIND_BY_PREFIX[prefix] || null;
  }

  load() {
    const modelDir = path.join(this.root, this.config.modelDir);
    for (const file of walk(modelDir, '.json')) {
      let doc;
      try {
        doc = readJson(file);
      } catch (err) {
        this.parseErrors.push({ file, message: err.message });
        continue;
      }
      if (!doc || !doc.id) {
        this.parseErrors.push({ file, message: 'documento sem campo "id"' });
        continue;
      }
      const schemaName = this.schemaNameFor(doc.id);
      if (!schemaName) {
        this.parseErrors.push({
          file,
          message: `prefixo de id desconhecido em "${doc.id}" (esperado um de: ${Object.keys(KIND_BY_PREFIX).join(', ')})`,
        });
        continue;
      }
      if (this.documents.has(doc.id)) {
        this.parseErrors.push({ file, message: `id duplicado: ${doc.id}` });
        continue;
      }

      const schema = this.schemas.get(schemaName);
      const errors = this.validator.validate(doc, schema);
      for (const e of errors) {
        this.schemaErrors.push({ file, id: doc.id, path: e.path, message: e.message });
      }

      this.documents.set(doc.id, doc);
      this.files.set(doc.id, file);
      const kind = doc.kind || schemaName;
      if (!this.byKind.has(kind)) this.byKind.set(kind, []);
      this.byKind.get(kind).push(doc);
    }
    return this;
  }

  get(id) {
    return this.documents.get(id) || null;
  }

  has(id) {
    return this.documents.has(id);
  }

  all(kind) {
    if (!kind) return [...this.documents.values()];
    return this.byKind.get(kind) || [];
  }

  fileOf(id) {
    return this.files.get(id) || null;
  }

  /** Artefatos de uma sprint especifica. */
  bySprint(sprint) {
    return this.all().filter((d) => d.sprint === sprint);
  }

  /** Artefatos ate uma sprint, inclusive — o escopo de uma baseline. */
  bySprintUpTo(sprint) {
    const ORDER = { SP1: 1, SP2: 2, SP3: 3, SP4: 4, SP5: 5 };
    const ceiling = ORDER[String(sprint).toUpperCase()] || 0;
    return this.all().filter((d) => (ORDER[d.sprint] || 0) <= ceiling);
  }

  /**
   * Hash canonico do estado do modelo. Entra na baseline: alterar o modelo
   * depois de assinada invalida a assinatura (Art. II).
   *
   * O escopo importa. Uma baseline de SP2 cobre os artefatos ate a SP2 — nao o
   * modelo inteiro. Sem isso, avancar para a SP3 invalidaria retroativamente
   * toda assinatura anterior, o que tornaria a deteccao de deriva inutil por
   * excesso de ruido.
   *
   * @param {string} [upToSprint] SP1..SP5; omitido, cobre o modelo inteiro
   */
  stateHash(upToSprint) {
    const ORDER = { SP1: 1, SP2: 2, SP3: 3, SP4: 4, SP5: 5 };
    const ceiling = upToSprint ? ORDER[String(upToSprint).toUpperCase()] : Infinity;
    if (upToSprint && !ceiling) throw new Error(`Sprint invalida no escopo do hash: ${upToSprint}`);

    const canonical = [...this.documents.keys()]
      .sort()
      .filter((id) => {
        const doc = this.documents.get(id);
        const rank = ORDER[doc.sprint] || 0;
        return rank <= ceiling;
      })
      .map((id) => {
        const doc = this.documents.get(id);
        const files = referencedFiles(doc).map(file => {
          try { return [file, digestFile(this.root, file)]; }
          catch { return [file, 'missing-or-unsafe']; }
        });
        return `${id}:${JSON.stringify(sortKeys(stripVolatile(doc)))}:${JSON.stringify(files)}`;
      })
      .join('\n');
    let execution = '';
    if (upToSprint && ceiling >= 4) {
      const inputs = Object.values(this.config.verification || {}).flatMap(check => check.inputs || []);
      inputs.push(`${this.config.evidenceDir}/quality-report.md`);
      if (ceiling >= 5) inputs.push(`${this.config.evidenceDir}/validation.md`);
      execution = JSON.stringify({ checks: this.config.verification || {}, phases: this.all('TestContract').map(tc => [tc.id, tc.phase]),
        files: [...new Set(inputs)].sort().map(file => {
          try { return [file, digestFile(this.root, file)]; } catch { return [file, 'missing-or-unsafe']; }
        }) });
    }
    return `sha256:${crypto.createHash('sha256').update(JSON.stringify([...this.viewpoints.index]) + canonical + execution).digest('hex')}`;
  }
}

/**
 * Campos excluidos do hash canonico da baseline.
 *
 * `phase` e estado de execucao, nao conteudo do contrato: o mesmo contrato de
 * teste nasce vermelho na SP3 e fica verde na SP4 sem que nada nele tenha sido
 * decidido de novo. Incluir a fase no hash faria a SP4 invalidar a assinatura
 * da SP3 por um fato que a SP3 ja previa.
 */
const VOLATILE_FIELDS = new Set(['phase']);

function stripVolatile(doc) {
  const clean = {};
  for (const [k, v] of Object.entries(doc)) {
    if (!VOLATILE_FIELDS.has(k)) clean[k] = v;
  }
  return clean;
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sortKeys(value[k]);
        return acc;
      }, {});
  }
  return value;
}

module.exports = { ModelStore, KIND_BY_PREFIX, DEFAULT_CONFIG };
