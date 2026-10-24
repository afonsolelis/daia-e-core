'use strict';

/**
 * DAIA-E kernel — specification-driven development with AI assistance.
 *
 * The kernel does not call a language model. It loads the architecture model,
 * validates it against the ISO/IEC/IEEE 42010:2022 metamodel, evaluates the
 * correspondence rules and records baselines. The agents propose. The kernel
 * accepts or rejects.
 *
 * The kernel has no external dependencies. It runs without `npm install`.
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

/** Loads the full project in one call. */
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
