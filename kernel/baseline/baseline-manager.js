'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { readJson, writeJson, walk } = require('../util/fs-walk');
const { SchemaValidator } = require('../validator/schema-validator');
const { getSprint } = require('../gate/sprints');

/**
 * Manages the closure of baselines.
 *
 * Art. II (NON-NEGOTIABLE): a baseline does not close without a recorded human decision.
 * Generative AI helps to produce artifacts in all sprints, also to elicit the business drivers.
 * But only a human signs.
 *
 * This is a local declarative record. It does not authenticate the identity of the API caller.
 */
class BaselineManager {
  constructor(store) {
    this.store = store;
    this.dir = path.join(store.root, store.config.baselineDir);
    this.validator = new SchemaValidator(store.schemas);
  }

  load() {
    const baselines = new Map();
    for (const file of walk(this.dir, '.json')) {
      const doc = readJson(file);
      if (doc && doc.sprint) baselines.set(doc.sprint, doc);
    }
    return baselines;
  }

  get(sprintId) {
    return this.load().get(String(sprintId).toUpperCase()) || null;
  }

  fileFor(sprintId) {
    return path.join(this.dir, `${String(sprintId).toLowerCase()}.json`);
  }

  /**
   * Closes a baseline with a recorded human decision.
   *
   * @param {string} sprintId
   * @param {{signedBy: string, rationale: string, decision?: string, debt?: string[], gateReport?: object}} input
   */
  sign(sprintId, input) {
    const sprint = getSprint(sprintId);

    if (!input.signedBy || String(input.signedBy).trim().length < 2) {
      throw new Error(
        'A signature must have a human identification (--by). ' +
          'Art. II: AI can write and propose each artifact, but AI cannot sign for a human.'
      );
    }
    if (!input.rationale || String(input.rationale).trim().length < 10) {
      throw new Error(
        'A signature must have a rationale (--rationale) of 10 characters or more. ' +
          'A baseline accepted without a recorded reason is a formality, not a decision.'
      );
    }

    const decision = input.decision || 'accepted';
    if (decision === 'accepted-with-debt' && (!input.debt || input.debt.length === 0)) {
      throw new Error('The decision "accepted-with-debt" must declare one debt item or more (--debt).');
    }

    const baseline = {
      kind: 'Baseline',
      sprint: sprint.id,
      title: sprint.baseline,
      state_hash: this.store.stateHash(sprint.id),
      artifact_count: this.store.bySprintUpTo(sprint.id).length,
      signature: {
        signed_by: String(input.signedBy).trim(),
        signed_at: new Date().toISOString(),
        decision,
        rationale: String(input.rationale).trim(),
        ...(input.debt && input.debt.length ? { declared_debt: input.debt } : {}),
      },
      ...(input.gateReport ? { gate_report: input.gateReport } : {}),
    };

    const errors = this.validator.validate(baseline, this.store.schemas.get('baseline'));
    if (errors.length > 0) {
      const detail = errors.map((e) => `${e.path}: ${e.message}`).join('; ');
      throw new Error(`Invalid baseline: ${detail}`);
    }

    writeJson(this.fileFor(sprint.id), baseline);
    return baseline;
  }

  /** Verifies if the signature still covers the current state of the model. */
  verify(sprintId) {
    const baseline = this.get(sprintId);
    if (!baseline) return { exists: false, valid: false, reason: 'the baseline is not closed' };
    if (this.validator.validate(baseline, this.store.schemas.get('baseline')).length ||
        !['accepted', 'accepted-with-debt'].includes(baseline.signature?.decision)) {
      return { exists: true, valid: false, reason: 'the baseline is invalid or rejected' };
    }
    const current = this.store.stateHash(baseline.sprint);
    if (baseline.state_hash !== current) {
      return {
        exists: true,
        valid: false,
        reason: 'the model changed after the signature',
        signed: baseline.state_hash,
        current,
      };
    }
    return { exists: true, valid: true, baseline };
  }
}

module.exports = { BaselineManager };
