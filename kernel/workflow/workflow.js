'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { writeJson } = require('../util/fs-walk');
const STEPS = [
  { sprint: 'SP1', title: 'Contexto, personas e processos', skills: ['model-business-context', 'model-business-processes', 'validate-business-layer'], inputs: ['objetivo, stakeholders, restricoes'], outputs: ['BusinessDriver', 'Stakeholder', 'Concern', 'Persona', 'BusinessProcess (BPMN)', 'Idef0Activity'] },
  { sprint: 'SP2', title: 'Requisitos e qualidade', skills: ['elicit-requirements-from-business', 'specify-quality-scenarios', 'prioritize-architecture-drivers', 'validate-requirements-layer'], inputs: ['baseline SP1'], outputs: ['Requirement', 'QualityScenario'] },
  { sprint: 'SP3', title: 'Arquitetura, contratos e testes', skills: ['describe-software-architecture', 'validate-engineering-layer', 'validate-technology-layer', 'evaluate-architecture-tradeoffs', 'evaluate-availability-tactics', 'evaluate-interoperability-tactics', 'evaluate-modifiability-tactics', 'evaluate-performance-tactics', 'evaluate-security-tactics', 'evaluate-testability-tactics', 'evaluate-usability-tactics', 'write-executable-specification'], inputs: ['baseline SP2'], outputs: ['View', 'ArchitectureDecision', 'Correspondence', 'TestContract'] },
  { sprint: 'SP4', title: 'Implementacao e verificacao', skills: ['implement-from-baseline', 'validate-system-evidence'], inputs: ['baseline SP3'], outputs: ['codigo, testes executados, quality-report.md'] },
  { sprint: 'SP5', title: 'Demonstracao e validacao', skills: ['validate-system-evidence'], inputs: ['baseline SP4'], outputs: ['validation.md: hipotese, resultados, limitacoes'] },
];
function next(project) {
  const baselines = project.baselines.load();
  for (const step of STEPS) {
    const signed = baselines.get(step.sprint);
    const signedCurrent = signed && project.baselines.verify(step.sprint).valid && signed.gate_report?.passed !== false;
    if (signedCurrent && ['SP1', 'SP2', 'SP3'].includes(step.sprint)) continue;
    const report = project.gate.evaluate(step.sprint, { baselines });
    if (signedCurrent && report.passed) continue;
    return { ...step, state: signed ? 'revisar-baseline' : report.passed ? 'aguarda-aprovacao' : 'em-producao',
      blocking: report.blocking, command: report.passed ? `daia baseline sign ${step.sprint} --by "Nome" --rationale "Justificativa humana"` : `daia gate ${step.sprint}`,
      guide: '.daia/guide.md', schemas: '.daia/schemas/' };
  }
  return { state: 'complete', title: 'Todas as baselines estao atualizadas' };
}
function record(project, report) {
  const file = path.join(project.store.root, '.daia', 'workflow.json');
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { history: [] };
  old.history.push({ sprint: report.sprint.id, passed: report.passed, stateHash: report.stateHash, at: report.evaluatedAt });
  old.next = next(project);
  writeJson(file, old);
}
module.exports = { STEPS, next, record };
