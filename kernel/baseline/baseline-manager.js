'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { readJson, writeJson, walk } = require('../util/fs-walk');
const { SchemaValidator } = require('../validator/schema-validator');
const { getSprint } = require('../gate/sprints');

/**
 * Gerencia o encerramento de baselines.
 *
 * Art. II (NON-NEGOTIABLE): nenhuma baseline e encerrada sem decisao humana
 * registrada. A IA generativa assiste a producao de artefatos em todas as
 * sprints — inclusive na captacao dos direcionadores de negocio — mas a
 * assinatura e humana.
 *
 * Registro declaratorio local: nao autentica a identidade de quem invoca a API.
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
   * Encerra uma baseline com decisao humana registrada.
   *
   * @param {string} sprintId
   * @param {{signedBy: string, rationale: string, decision?: string, debt?: string[], gateReport?: object}} input
   */
  sign(sprintId, input) {
    const sprint = getSprint(sprintId);

    if (!input.signedBy || String(input.signedBy).trim().length < 2) {
      throw new Error(
        'Assinatura exige identificacao humana (--by). ' +
          'Art. II: a IA pode redigir e propor qualquer artefato, mas nao pode assinar por humano.'
      );
    }
    if (!input.rationale || String(input.rationale).trim().length < 10) {
      throw new Error(
        'Assinatura exige justificativa (--rationale) com ao menos 10 caracteres. ' +
          'Uma baseline aceita sem razao registrada nao e decisao, e formalidade.'
      );
    }

    const decision = input.decision || 'accepted';
    if (decision === 'accepted-with-debt' && (!input.debt || input.debt.length === 0)) {
      throw new Error('A decisao "accepted-with-debt" exige ao menos um item de divida declarado (--debt).');
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
      throw new Error(`Baseline invalida: ${detail}`);
    }

    writeJson(this.fileFor(sprint.id), baseline);
    return baseline;
  }

  /** Verifica se a assinatura ainda cobre o estado atual do modelo. */
  verify(sprintId) {
    const baseline = this.get(sprintId);
    if (!baseline) return { exists: false, valid: false, reason: 'baseline nao encerrada' };
    if (this.validator.validate(baseline, this.store.schemas.get('baseline')).length ||
        !['accepted', 'accepted-with-debt'].includes(baseline.signature?.decision)) {
      return { exists: true, valid: false, reason: 'baseline invalida ou rejeitada' };
    }
    const current = this.store.stateHash(baseline.sprint);
    if (baseline.state_hash !== current) {
      return {
        exists: true,
        valid: false,
        reason: 'o modelo mudou desde a assinatura',
        signed: baseline.state_hash,
        current,
      };
    }
    return { exists: true, valid: true, baseline };
  }
}

module.exports = { BaselineManager };
