'use strict';

/**
 * As cinco sprints do DAIA-E. Sprint e unidade de delimitacao de escopo,
 * nao de tempo (Art. III) — nao ha campo de duracao aqui, por construcao.
 */
const SPRINTS = [
  {
    id: 'SP1',
    slug: 'NEG',
    name: 'Modelagem de Negocio',
    question: 'Por que o sistema deve existir e para quem?',
    bok: 'BABOK (§10.35 Process Modelling, §10.43 Personas)',
    baseline: 'Modelo de negocio: personas, processos em BPMN, decomposicao IDEF0, direcionadores, mapa de stakeholders e hipotese',
    produces: ['BusinessDriver', 'Stakeholder', 'Concern', 'Persona', 'BusinessProcess', 'Idef0Activity'],
    views: ['enterprise'],
  },
  {
    id: 'SP2',
    slug: 'REQ',
    name: 'Requisitos e Eixos de Qualidade',
    question: 'O que o sistema precisa fazer e com que qualidade?',
    bok: 'SWEBOK (elicitacao) e SEBoK (necessidades e requisitos de sistema), com a ISO/IEC 25010:2023 como vocabulario',
    baseline: 'Requisitos elicitados do negocio: RF, RNF como cenarios de seis partes e matriz de rastreabilidade',
    produces: ['Requirement', 'QualityScenario'],
    views: ['information'],
  },
  {
    id: 'SP3',
    slug: 'ST',
    name: 'Descricao Arquitetural e Especificacao Tecnica',
    question: 'Como o sistema sera estruturado e por que?',
    bok: 'SEBoK e SWEBOK, com RM-ODP como arcabouco de viewpoints',
    baseline: 'Arquitetural: views computational, engineering e technology nessa ordem, especificacao tecnica, esqueleto e testes em fase vermelha',
    produces: ['View', 'ArchitectureDecision', 'Correspondence', 'TestContract'],
    views: ['information', 'computational', 'engineering', 'technology'],
  },
  {
    id: 'SP4',
    slug: 'IMPL',
    name: 'Geracao Guiada, Verificacao e Refinamento',
    question: 'A estrutura decidida se sustenta na pratica?',
    bok: 'SWEBOK (Construcao, Testes e Gerencia da Qualidade)',
    baseline: 'Executavel: codigo, testes em fase verde, relatorio de qualidade por caracteristica',
    produces: ['TestContract'],
    views: ['technology'],
  },
  {
    id: 'SP5',
    slug: 'DEMO',
    name: 'Demonstracao e Validacao',
    question: 'A hipotese inicial se confirma?',
    bok: 'SEBoK (verificacao e validacao)',
    baseline: 'Release demonstravel: roteiro, evidencias, metricas e limitacoes declaradas',
    produces: [],
    views: [],
  },
];

const SPRINT_IDS = SPRINTS.map((s) => s.id);

function getSprint(id) {
  const sprint = SPRINTS.find((s) => s.id === String(id).toUpperCase());
  if (!sprint) {
    throw new Error(`Sprint desconhecida: "${id}". Validas: ${SPRINT_IDS.join(', ')}`);
  }
  return sprint;
}

function previousSprint(id) {
  const i = SPRINT_IDS.indexOf(String(id).toUpperCase());
  return i > 0 ? SPRINTS[i - 1] : null;
}

module.exports = { SPRINTS, SPRINT_IDS, getSprint, previousSprint };
