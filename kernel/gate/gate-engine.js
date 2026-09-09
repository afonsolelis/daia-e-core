'use strict';

const { RULES, SEVERITY } = require('../rules/correspondence-rules');
const { getSprint, previousSprint } = require('./sprints');

/**
 * Motor de gates.
 *
 * Um gate avalia o modelo contra as regras aplicaveis a uma sprint e devolve
 * um veredito. O CLI traduz o veredito em exit code — BLOCK produz exit != 0.
 *
 * Art. I: o gate e executavel pelo CLI e nao depende de hook de nenhuma IDE.
 * Art. II: passar no gate NAO encerra a baseline; a assinatura humana e outra etapa.
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

    // Erros estruturais precedem as regras: um modelo que nao carrega nao se avalia.
    for (const err of this.store.parseErrors) {
      findings.push({
        rule: 'PARSE',
        severity: SEVERITY.BLOCK,
        article: 'IV',
        id: err.file,
        message: err.message,
        hint: 'Corrija o documento antes de avaliar o gate.',
      });
    }
    for (const err of this.store.schemaErrors) {
      findings.push({
        rule: 'SCHEMA',
        severity: SEVERITY.BLOCK,
        article: 'IV',
        id: err.id,
        message: `${err.path}: ${err.message}`,
        hint: 'O documento nao satisfaz o schema do seu tipo.',
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
          message: `regra falhou ao executar: ${err.message}`,
          hint: 'Isto e um defeito do kernel, nao do modelo.',
        }];
      }
      findings.push(...produced);
    }

    // Art. III: nenhuma sprint fecha antes da anterior estar assinada.
    const previous = previousSprint(sprint.id);
    if (previous && options.baselines) {
      const signed = options.baselines.get(previous.id);
      if (!signed) {
        findings.push({
          rule: 'BASELINE-ORDER',
          severity: SEVERITY.BLOCK,
          article: 'III',
          id: previous.id,
          message: `baseline ${previous.id} nao foi encerrada`,
          hint: `Rode: daia baseline sign ${previous.id} --by "<nome>" --rationale "<razao>"`,
        });
      } else if (signed.state_hash && signed.state_hash !== this.store.stateHash(previous.id)) {
        findings.push({
          rule: 'BASELINE-DRIFT',
          severity: SEVERITY.WARN,
          article: 'II',
          id: previous.id,
          message: `o modelo mudou desde a assinatura de ${previous.id}`,
          hint: 'A assinatura cobre um estado especifico. Reassine se a mudanca for deliberada.',
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

  /** Avalia todas as sprints em ordem — usado por `daia status`. */
  evaluateAll(options = {}) {
    return ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'].map((id) => this.evaluate(id, options));
  }
}

module.exports = { GateEngine };
