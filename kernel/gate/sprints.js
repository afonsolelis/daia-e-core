'use strict';

/**
 * The five DAIA-E sprints. A sprint is a unit of scope, not a unit of time (Art. III).
 * Thus, by design, there is no duration field here.
 */
const SPRINTS = [
  {
    id: 'SP1',
    slug: 'BIZ',
    name: 'Business Modelling',
    question: 'Why must the system exist, and for whom?',
    bok: 'BABOK (§10.35 Process Modelling, §10.43 Personas)',
    baseline: 'Business model: personas, BPMN processes, IDEF0 decomposition, business drivers, stakeholder map and hypothesis',
    produces: ['BusinessDriver', 'Stakeholder', 'Concern', 'Persona', 'BusinessProcess', 'Idef0Activity'],
    views: ['enterprise'],
  },
  {
    id: 'SP2',
    slug: 'REQ',
    name: 'Requirements and Quality Axes',
    question: 'What must the system do, and with which quality?',
    bok: 'SWEBOK (elicitation) and SEBoK (stakeholder needs and system requirements), with ISO/IEC 25010:2023 as the vocabulary',
    baseline: 'Requirements elicited from the business: FR, NFR as six-part scenarios, and the traceability matrix',
    produces: ['Requirement', 'QualityScenario'],
    views: ['information'],
  },
  {
    id: 'SP3',
    slug: 'ST',
    name: 'Architecture Description and Technical Specification',
    question: 'How will the system be structured, and why?',
    bok: 'SEBoK and SWEBOK, with RM-ODP as the viewpoint framework',
    baseline: 'Architecture: computational, engineering and technology views in that order, technical specification, skeleton and red-phase tests',
    produces: ['View', 'ArchitectureDecision', 'Correspondence', 'TestContract'],
    views: ['information', 'computational', 'engineering', 'technology'],
  },
  {
    id: 'SP4',
    slug: 'IMPL',
    name: 'Guided Generation, Verification and Refinement',
    question: 'Does the selected structure work in practice?',
    bok: 'SWEBOK (Software Construction, Software Testing and Software Quality)',
    baseline: 'Executable: code, green-phase tests and a quality report for each characteristic',
    produces: ['TestContract'],
    views: ['technology'],
  },
  {
    id: 'SP5',
    slug: 'DEMO',
    name: 'Demonstration and Validation',
    question: 'Is the initial hypothesis true?',
    bok: 'SEBoK (verification and validation)',
    baseline: 'Release for demonstration: script, evidence, metrics and declared limitations',
    produces: [],
    views: [],
  },
];

const SPRINT_IDS = SPRINTS.map((s) => s.id);

function getSprint(id) {
  const sprint = SPRINTS.find((s) => s.id === String(id).toUpperCase());
  if (!sprint) {
    throw new Error(`Unknown sprint: "${id}". Valid sprints: ${SPRINT_IDS.join(', ')}`);
  }
  return sprint;
}

function previousSprint(id) {
  const i = SPRINT_IDS.indexOf(String(id).toUpperCase());
  return i > 0 ? SPRINTS[i - 1] : null;
}

module.exports = { SPRINTS, SPRINT_IDS, getSprint, previousSprint };
