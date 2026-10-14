'use strict';

/** Modelo de negocio minimo que satisfaz a camada BABOK da SP1. */
const P = { drafted_by: 'ai-assisted' };

const BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="d" targetNamespace="x">
  <bpmn:process id="atender">
    <bpmn:laneSet><bpmn:lane id="l1" name="Operador"/></bpmn:laneSet>
    <bpmn:startEvent id="s"/>
    <bpmn:userTask id="t" name="Registrar solicitacao"/>
    <bpmn:endEvent id="e"/>
    <bpmn:sequenceFlow id="f1" sourceRef="s" targetRef="t"/>
    <bpmn:sequenceFlow id="f2" sourceRef="t" targetRef="e"/>
  </bpmn:process>
</bpmn:definitions>
`;

const FILES = { 'docs/atender.bpmn': BPMN };

const DOCS = [
  { id: 'STK-a', kind: 'Stakeholder', name: 'Parte A', sprint: 'SP1', provenance: P },
  { id: 'BD-a', kind: 'BusinessDriver', statement: 'um direcionador de negocio valido',
    stakeholders: ['STK-a'], hypothesis: 'a hipotese a confrontar na SP5', sprint: 'SP1', provenance: P },
  { id: 'PER-operador', kind: 'Persona', name: 'Operador', stakeholders: ['STK-a'],
    goals: ['Registrar solicitacoes sem retrabalho'], evidence: 'Entrevista com a equipe de atendimento', sprint: 'SP1', provenance: P },
  { id: 'IDF-A0', kind: 'Idef0Activity', node: 'A0', title: 'Atender solicitacao', inputs: ['solicitacao'],
    controls: ['politica de atendimento'], outputs: ['solicitacao registrada'], mechanisms: ['Operador'],
    automation: 'system', sprint: 'SP1', provenance: P },
  { id: 'BP-atender', kind: 'BusinessProcess', name: 'Atender solicitacao', trigger: 'Cliente envia solicitacao',
    outcome: 'Solicitacao registrada', performed_by: ['PER-operador'], supports: ['BD-a'], activity: 'IDF-A0',
    models: [{ kind: 'dynamic', notation: 'BPMN 2.0', path: 'docs/atender.bpmn' }], sprint: 'SP1', provenance: P },
];

module.exports = { P, BPMN, FILES, DOCS };
