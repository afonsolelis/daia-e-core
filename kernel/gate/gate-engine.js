'use strict';

const { RULES, SEVERITY } = require('../rules/correspondence-rules');
const { getSprint } = require('./sprints');
const { SchemaValidator } = require('../validator/schema-validator');
const { architectureFindings } = require('../rules/architecture');

/**
 * Gate engine.
 *
 * A gate examines the model against the rules of one sprint and returns a verdict.
 * The CLI changes the verdict into an exit code. BLOCK gives an exit code that is not 0.
 *
 * Art. I: the CLI runs the gate. The gate does not use a hook of an IDE.
 * Art. II: a gate that passes does NOT close the baseline. The human signature is a different step.
 */
class GateEngine {
  constructor(store) {
    this.store = store;
  }

  rulesFor(sprintId) {
    return RULES.filter((rule) => rule.sprints.includes(sprintId));
  }

  /**
   * @param {string} sprintId SP1..SP5
   * @param {{previousBaselineRequired?: boolean, baselines?: Map<string, object>}} options
   */
  evaluate(sprintId, options = {}) {
    const sprint = getSprint(sprintId);
    const findings = [];

    // Structural errors come before the rules. The gate cannot examine a model that does not load.
    for (const err of this.store.parseErrors) {
      findings.push({
        rule: 'PARSE',
        severity: SEVERITY.BLOCK,
        article: 'IV',
        id: err.file,
        message: err.message,
        hint: 'Correct the document. Then run the gate again.',
      });
    }
    for (const err of this.store.schemaErrors) {
      findings.push({
        rule: 'SCHEMA',
        severity: SEVERITY.BLOCK,
        article: 'IV',
        id: err.id,
        message: `${err.path}: ${err.message}`,
        hint: 'Correct the document. It does not agree with the schema of its kind.',
      });
    }

    for (const rule of this.rulesFor(sprint.id)) {
      let produced;
      try {
        produced = rule.check(this.store, { baselines: options.baselines }) || [];
      } catch (err) {
        produced = [{
          rule: rule.id,
          severity: SEVERITY.BLOCK,
          article: rule.article,
          id: 'RULE-ERROR',
          message: `the rule failed when it ran: ${err.message}`,
          hint: 'Report this kernel defect. The model is not the cause.',
        }];
      }
      findings.push(...produced);
    }

    if (!this.store.parseErrors.length && !this.store.schemaErrors.length) {
      findings.push(...architectureFindings(this.store, sprint.id));
    }
    // Art. III: a sprint does not close before the human signs the sprint before it.
    const preceding = ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'].slice(0, ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'].indexOf(sprint.id));
    for (const id of options.baselines ? preceding : []) {
      const previous = getSprint(id);
      const signed = options.baselines.get(previous.id);
      if (!signed) {
        findings.push({
          rule: 'BASELINE-ORDER',
          severity: SEVERITY.BLOCK,
          article: 'III',
          id: previous.id,
          message: `baseline ${previous.id} is not closed`,
          hint: `Run: daia baseline sign ${previous.id} --by "<name>" --rationale "<reason>"`,
        });
      } else if (new SchemaValidator(this.store.schemas).validate(signed, this.store.schemas.get('baseline')).length ||
          signed.state_hash !== this.store.stateHash(previous.id) || !['accepted', 'accepted-with-debt'].includes(signed.signature?.decision)) {
        findings.push({
          rule: 'BASELINE-DRIFT',
          severity: SEVERITY.BLOCK,
          article: 'II',
          id: previous.id,
          message: `the model changed after the signature of ${previous.id}`,
          hint: 'If the change is deliberate, sign the baseline again. A signature covers one specific state.',
        });
      }
    }

    const blocking = findings.filter((f) => f.severity === SEVERITY.BLOCK);
    const warnings = findings.filter((f) => f.severity === SEVERITY.WARN);
    const infos = findings.filter((f) => f.severity === SEVERITY.INFO);

    return {
      sprint,
      passed: blocking.length === 0,
      findings,
      blocking,
      warnings,
      infos,
      rulesEvaluated: this.rulesFor(sprint.id).length,
      documentCount: this.store.all().length,
      stateHash: this.store.stateHash(),
      evaluatedAt: new Date().toISOString(),
    };
  }

  /** Examines all the sprints in order. `daia status` uses this function. */
  evaluateAll(options = {}) {
    return ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'].map((id) => this.evaluate(id, options));
  }
}

module.exports = { GateEngine };
