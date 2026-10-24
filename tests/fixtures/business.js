'use strict';

/** The minimum business model that satisfies the SP1 BABOK layer. */
const P = { drafted_by: 'ai-assisted' };

const BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="d" targetNamespace="x">
  <bpmn:process id="serve">
    <bpmn:laneSet><bpmn:lane id="l1" name="Operator"/></bpmn:laneSet>
    <bpmn:startEvent id="s"/>
    <bpmn:userTask id="t" name="Record request"/>
    <bpmn:endEvent id="e"/>
    <bpmn:sequenceFlow id="f1" sourceRef="s" targetRef="t"/>
    <bpmn:sequenceFlow id="f2" sourceRef="t" targetRef="e"/>
  </bpmn:process>
</bpmn:definitions>
`;

const FILES = { 'docs/serve.bpmn': BPMN };

const DOCS = [
  { id: 'STK-a', kind: 'Stakeholder', name: 'Party A', sprint: 'SP1', provenance: P },
  { id: 'BD-a', kind: 'BusinessDriver', statement: 'a valid business driver',
    stakeholders: ['STK-a'], hypothesis: 'the hypothesis to test in SP5', sprint: 'SP1', provenance: P },
  { id: 'PER-operator', kind: 'Persona', name: 'Operator', stakeholders: ['STK-a'],
    goals: ['Record requests without rework'], evidence: 'Interview with the service team', sprint: 'SP1', provenance: P },
  { id: 'IDF-A0', kind: 'Idef0Activity', node: 'A0', title: 'Handle request', inputs: ['request'],
    controls: ['service policy'], outputs: ['recorded request'], mechanisms: ['Operator'],
    automation: 'system', sprint: 'SP1', provenance: P },
  { id: 'BP-serve', kind: 'BusinessProcess', name: 'Handle request', trigger: 'Customer sends a request',
    outcome: 'Request recorded', performed_by: ['PER-operator'], supports: ['BD-a'], activity: 'IDF-A0',
    models: [{ kind: 'dynamic', notation: 'BPMN 2.0', path: 'docs/serve.bpmn' }], sprint: 'SP1', provenance: P },
];

module.exports = { P, BPMN, FILES, DOCS };
