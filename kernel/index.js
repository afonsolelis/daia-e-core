'use strict';

/**
 * DAIA-E kernel — Desenvolvimento Assistido por Inteligencia Artificial
 * Orientado por Especificacao.
 *
 * O kernel nao chama modelo de linguagem. Ele carrega o modelo arquitetural,
 * valida contra o metamodelo da ISO/IEC/IEEE 42010:2022, avalia as regras de
 * correspondencia e registra baselines. Os agentes propoem; o kernel aceita
 * ou recusa.
 *
 * Zero dependencias externas: o kernel roda sem `npm install`.
 */

const { ModelStore, KIND_BY_PREFIX, DEFAULT_CONFIG } = require('./store/model-store');
const { SchemaValidator } = require('./validator/schema-validator');
const { GateEngine } = require('./gate/gate-engine');
const { SPRINTS, SPRINT_IDS, getSprint, previousSprint } = require('./gate/sprints');
const { BaselineManager } = require('./baseline/baseline-manager');
const { TraceabilityEngine } = require('./trace/traceability');
const { RULES, SEVERITY } = require('./rules/correspondence-rules');
const { loadSkills } = require('./skill/skill-loader');
const { install } = require('./skill/install');

/** Carrega o projeto inteiro numa chamada. */
function openProject(rootDir) {
  const store = new ModelStore(rootDir).load();
  const baselines = new BaselineManager(store);
  return {
    store,
    baselines,
    gate: new GateEngine(store),
    trace: new TraceabilityEngine(store),
  };
}

module.exports = {
  openProject,
  ModelStore,
  SchemaValidator,
  GateEngine,
  BaselineManager,
  TraceabilityEngine,
  SPRINTS,
  SPRINT_IDS,
  getSprint,
  previousSprint,
  RULES,
  SEVERITY,
  loadSkills,
  install,
  KIND_BY_PREFIX,
  DEFAULT_CONFIG,
  VERSION: require('../package.json').version,
};
