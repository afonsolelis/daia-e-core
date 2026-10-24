'use strict';
const fs = require('node:fs');
const { projectFile, referencedFiles } = require('../util/project-files');
const { evidenceProblems } = require('../verification/runner');
function architectureFindings(store, sprint) {
  const findings = [];
  const add = (rule, id, message) => findings.push({ rule, id, message, severity: 'BLOCK', article: 'VII' });
  const expected = { stakeholders: ['Stakeholder'], concerns: ['Concern'], addresses_concerns: ['Concern'],
    affects_views: ['View'], scenarios: ['QualityScenario'], verifies: ['Requirement', 'QualityScenario'] };
  for (const doc of store.all()) {
    const traceKinds = doc.kind === 'Requirement' ? ['BusinessDriver', 'Concern', 'BusinessProcess', 'Idef0Activity', 'Requirement'] :
      doc.kind === 'ArchitectureDecision' ? ['Requirement', 'Concern', 'QualityScenario', 'BusinessDriver'] : null;
    if (traceKinds) for (const ref of doc.traces_to || []) {
      if (store.has(ref) && !traceKinds.includes(store.get(ref).kind)) add('TRACE-TYPE', doc.id, `Invalid trace origin: ${ref}`);
    }
    for (const [field, kinds] of Object.entries(expected)) {
      for (const ref of Array.isArray(doc[field]) ? doc[field] : []) {
        const target = store.get(ref);
        if (target && !kinds.includes(target.kind)) add('REF-TYPE', doc.id, `${field}: ${ref} must be ${kinds.join('/')}`);
      }
    }
    for (const file of referencedFiles(doc)) {
      try { if (!fs.statSync(projectFile(store.root, file)).isFile()) throw new Error('not a file'); }
      catch { add('ARTIFACT-FILE', doc.id, `The file does not exist or is not safe: ${file}`); }
    }
    if (doc.kind === 'Correspondence' && (doc.from === doc.to || !doc.rationale?.trim())) {
      add('CORRESPONDENCE', doc.id, 'A correspondence must link two different elements and must have a rationale that a human can review');
    }
  }
  const required = sprint === 'SP2' ? ['Requirement'] : ['SP3','SP4','SP5'].includes(sprint)
    ? ['Requirement', 'Concern', 'View', 'ArchitectureDecision', 'TestContract'] : [];
  for (const kind of required) if (!store.all(kind).length) add('STAGE-CONTENT', sprint, `No ${kind} is declared`);
  if (['SP3','SP4','SP5'].includes(sprint) && store.all('View').length > 1 && !store.all('Correspondence').length) {
    add('CORRESPONDENCE', sprint, 'Declare correspondences between the views');
  }
  for (const problem of evidenceProblems(store, sprint)) add('TEST-EVIDENCE', problem.id, problem.message);
  const reports = sprint === 'SP4' ? ['quality-report.md'] : sprint === 'SP5' ? ['quality-report.md', 'validation.md'] : [];
  if (store.config.mode === 'existing') reports.push('recovery.md');
  for (const report of reports) {
    try {
      const text = fs.readFileSync(projectFile(store.root, `${store.config.evidenceDir}/${report}`), 'utf8');
      if (text.trim().length < 80 || !/limitations|limita[cç][oõ]es/i.test(text)) throw new Error('incomplete');
    } catch { add('REVIEW-EVIDENCE', sprint, `Write ${report} with the results and the limitations (a human review is necessary)`); }
  }
  return findings;
}
module.exports = { architectureFindings };
