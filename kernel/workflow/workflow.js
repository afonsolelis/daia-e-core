'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { writeJson } = require('../util/fs-walk');
const STEPS = [
  { sprint: 'SP1', title: 'Context, personas and processes', skills: ['model-business-context', 'model-business-processes', 'validate-business-layer'], inputs: ['objective, stakeholders, constraints'], outputs: ['BusinessDriver', 'Stakeholder', 'Concern', 'Persona', 'BusinessProcess (BPMN)', 'Idef0Activity'] },
  { sprint: 'SP2', title: 'Requirements and quality', skills: ['elicit-requirements-from-business', 'specify-quality-scenarios', 'prioritize-architecture-drivers', 'validate-requirements-layer'], inputs: ['baseline SP1'], outputs: ['Requirement', 'QualityScenario'] },
  { sprint: 'SP3', title: 'Architecture, contracts and tests', skills: ['describe-software-architecture', 'validate-engineering-layer', 'validate-technology-layer', 'evaluate-architecture-tradeoffs', 'evaluate-availability-tactics', 'evaluate-interoperability-tactics', 'evaluate-modifiability-tactics', 'evaluate-performance-tactics', 'evaluate-security-tactics', 'evaluate-testability-tactics', 'evaluate-usability-tactics', 'write-executable-specification'], inputs: ['baseline SP2'], outputs: ['View', 'ArchitectureDecision', 'Correspondence', 'TestContract'] },
  { sprint: 'SP4', title: 'Implementation and verification', skills: ['implement-from-baseline', 'validate-system-evidence'], inputs: ['baseline SP3'], outputs: ['code, executed tests, quality-report.md'] },
  { sprint: 'SP5', title: 'Demonstration and validation', skills: ['validate-system-evidence'], inputs: ['baseline SP4'], outputs: ['validation.md: hypothesis, results, limitations'] },
];
function next(project) {
  const baselines = project.baselines.load();
  for (const step of STEPS) {
    const signed = baselines.get(step.sprint);
    const signedCurrent = signed && project.baselines.verify(step.sprint).valid && signed.gate_report?.passed !== false;
    if (signedCurrent && ['SP1', 'SP2', 'SP3'].includes(step.sprint)) continue;
    const report = project.gate.evaluate(step.sprint, { baselines });
    if (signedCurrent && report.passed) continue;
    return { ...step, state: signed ? 'review-baseline' : report.passed ? 'wait-for-approval' : 'in-progress',
      blocking: report.blocking, command: report.passed ? `daia baseline sign ${step.sprint} --by "Name" --rationale "Human rationale"` : `daia gate ${step.sprint}`,
      guide: '.daia/guide.md', schemas: '.daia/schemas/' };
  }
  return { state: 'complete', title: 'All baselines are up to date' };
}
function record(project, report) {
  const file = path.join(project.store.root, '.daia', 'workflow.json');
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { history: [] };
  old.history.push({ sprint: report.sprint.id, passed: report.passed, stateHash: report.stateHash, at: report.evaluatedAt });
  old.next = next(project);
  writeJson(file, old);
}
module.exports = { STEPS, next, record };
