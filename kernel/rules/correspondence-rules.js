'use strict';

/**
 * Regras de correspondencia — o lint executavel do metamodelo.
 *
 * A ISO/IEC/IEEE 42010:2022 exige que a descricao arquitetural seja coerente:
 * cada view responde a preocupacoes identificadas de partes interessadas
 * identificadas, e as correspondencias entre views sao declaradas. Um schema
 * valida um documento isolado; estas regras validam o grafo.
 *
 * Cada regra declara o artigo da Constituicao que a sustenta. Uma regra sem
 * artigo e opiniao; um artigo sem regra e aspiracao.
 */

const SEVERITY = { BLOCK: 'BLOCK', WARN: 'WARN', INFO: 'INFO' };

/** Coleta todos os campos que carregam referencias a outros documentos. */
const REF_FIELDS = [
  'concerns',
  'stakeholders',
  'addresses_concerns',
  'traces_to',
  'scenarios',
  'verified_by',
  'affects_views',
  'verifies',
  'performed_by',
  'supports',
];

function refsOf(doc) {
  const refs = [];
  for (const field of REF_FIELDS) {
    const value = doc[field];
    if (Array.isArray(value)) {
      for (const ref of value) refs.push({ field, ref });
    }
  }
  if (doc.kind === 'Correspondence') {
    refs.push({ field: 'from', ref: doc.from }, { field: 'to', ref: doc.to });
  }
  for (const field of ['activity', 'parent']) {
    if (typeof doc[field] === 'string') refs.push({ field, ref: doc[field] });
  }
  for (const ref of doc.elicitation?.sources || []) refs.push({ field: 'elicitation.sources', ref });
  return refs;
}

function finding(rule, id, message, hint) {
  return { rule: rule.id, severity: rule.severity, article: rule.article, id, message, hint };
}

const RULES = [
  {
    id: 'REF-INTEGRITY',
    title: 'Toda referencia aponta para documento existente',
    article: 'IV',
    severity: SEVERITY.BLOCK,
    sprints: ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      const out = [];
      for (const doc of store.all()) {
        for (const { field, ref } of refsOf(doc)) {
          if (ref && !store.has(ref)) {
            out.push(
              finding(this, doc.id, `referencia quebrada em "${field}": ${ref} nao existe no modelo`,
                'Crie o documento referenciado ou corrija o id.')
            );
          }
        }
      }
      return out;
    },
  },

  {
    id: 'CONCERN-ADDRESSED',
    title: 'Toda Concern e enderecada por ao menos uma View',
    article: 'VII',
    severity: SEVERITY.BLOCK,
    sprints: ['SP3', 'SP4', 'SP5'],
    check(store) {
      const addressed = new Set();
      for (const view of store.all('View')) {
        for (const con of view.addresses_concerns || []) addressed.add(con);
      }
      return store
        .all('Concern')
        .filter((c) => !addressed.has(c.id))
        .map((c) =>
          finding(this, c.id, `preocupacao nao enderecada por nenhuma view: "${c.statement.slice(0, 60)}..."`,
            'ISO 42010 §5.4 — toda preocupacao identificada exige uma view que a responda.')
        );
    },
  },

  {
    id: 'VIEW-STAKEHOLDER',
    title: 'Toda View declara partes interessadas identificadas',
    article: 'VII',
    severity: SEVERITY.BLOCK,
    sprints: ['SP3', 'SP4', 'SP5'],
    check(store) {
      return store
        .all('View')
        .filter((v) => !Array.isArray(v.stakeholders) || v.stakeholders.length === 0)
        .map((v) =>
          finding(this, v.id, 'view sem parte interessada declarada',
            'Uma view que nao responde a ninguem nao e uma view — e um diagrama.')
        );
    },
  },

  {
    id: 'VIEW-VIEWPOINT',
    title: 'O viewpoint da View existe no catalogo ativo',
    article: 'VII',
    severity: SEVERITY.BLOCK,
    sprints: ['SP3', 'SP4', 'SP5'],
    check(store) {
      const known = store.viewpoints.index;
      return store
        .all('View')
        .filter((v) => !known.has(v.viewpoint))
        .map((v) =>
          finding(this, v.id, `viewpoint "${v.viewpoint}" ausente do catalogo ${store.viewpoints.catalog}`,
            `Viewpoints disponiveis: ${[...known.keys()].join(', ')}`)
        );
    },
  },

  {
    id: 'STATIC-AND-DYNAMIC',
    title: 'A SP3 exige modelagem estatica e dinamica',
    article: 'VIII',
    severity: SEVERITY.BLOCK,
    sprints: ['SP3', 'SP4', 'SP5'],
    check(store) {
      const kinds = new Set();
      for (const view of store.all('View')) {
        for (const model of view.models || []) kinds.add(model.kind);
      }
      const out = [];
      if (!kinds.has('static')) {
        out.push(
          finding(this, 'MODEL', 'nenhum modelo estatico declarado em nenhuma view',
            'Sem modelagem estatica a decisao arquitetural tende a produzir estruturas que nao acomodam os dados reais.')
        );
      }
      if (!kinds.has('dynamic')) {
        out.push(
          finding(this, 'MODEL', 'nenhum modelo dinamico declarado em nenhuma view',
            'Sem modelagem dinamica a decisao tende a produzir estruturas corretas em repouso e inadequadas em operacao.')
        );
      }
      return out;
    },
  },

  {
    id: 'AD-ALTERNATIVE',
    title: 'Toda decisao arquitetural registra alternativa preterida e criterio',
    article: 'IX',
    severity: SEVERITY.BLOCK,
    sprints: ['SP3', 'SP4', 'SP5'],
    check(store) {
      const out = [];
      for (const ad of store.all('ArchitectureDecision')) {
        const alts = ad.alternatives || [];
        if (alts.length === 0) {
          out.push(
            finding(this, ad.id, 'decisao sem alternativa considerada',
              'O LLM converge para solucoes convencionais sem explicitar que outras existiam.')
          );
          continue;
        }
        alts.forEach((alt, i) => {
          if (!alt.rejected_because || alt.rejected_because.trim().length < 10) {
            out.push(
              finding(this, ad.id, `alternativa ${i + 1} ("${alt.option}") sem criterio de preterição`,
                'Registre o criterio, nao a preferencia.')
            );
          }
        });
      }
      return out;
    },
  },

  {
    id: 'AD-TRACE',
    title: 'Toda decisao arquitetural rastreia para requisito ou preocupacao',
    article: 'IV',
    severity: SEVERITY.BLOCK,
    sprints: ['SP3', 'SP4', 'SP5'],
    check(store) {
      return store
        .all('ArchitectureDecision')
        .filter((ad) => !Array.isArray(ad.traces_to) || ad.traces_to.length === 0)
        .map((ad) =>
          finding(this, ad.id, 'decisao arquitetural sem rastreio a requisito ou preocupacao',
            'A cadeia necessidade -> requisito -> decisao precisa permanecer navegavel.')
        );
    },
  },

  {
    id: 'NFR-SCENARIO',
    title: 'Todo requisito nao funcional tem cenario de qualidade',
    article: 'V',
    severity: SEVERITY.BLOCK,
    sprints: ['SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      return store
        .all('Requirement')
        .filter((r) => r.type === 'non-functional')
        .filter((r) => !Array.isArray(r.scenarios) || r.scenarios.length === 0)
        .map((r) =>
          finding(this, r.id, 'requisito nao funcional sem cenario de qualidade',
            'Qualidade nao e adjetivo: expresse como cenario de seis partes com medida.')
        );
    },
  },

  {
    id: 'SCENARIO-MEASURABLE',
    title: 'Todo cenario tem medida de resposta efetiva',
    article: 'V',
    severity: SEVERITY.BLOCK,
    sprints: ['SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      const PLACEHOLDERS = ['tbd', 'todo', 'n/a', '?', '-', 'a definir', 'rapido', 'aceitavel'];
      const out = [];
      for (const qs of store.all('QualityScenario')) {
        const m = qs.response_measure || {};
        const threshold = String(m.threshold ?? '').trim().toLowerCase();
        if (!threshold || PLACEHOLDERS.includes(threshold)) {
          out.push(
            finding(this, qs.id, `medida de resposta sem limiar efetivo (recebido: "${m.threshold}")`,
              'Sem limiar nao ha cenario — "rapido" nao e resposta mensuravel.')
          );
        }
      }
      return out;
    },
  },

  {
    id: 'SCENARIO-VERIFIED',
    title: 'Todo cenario de qualidade e verificado por teste executavel',
    article: 'V',
    severity: SEVERITY.BLOCK,
    sprints: ['SP4', 'SP5'],
    check(store) {
      // A direcao e do teste para o cenario: o contrato declara o que verifica.
      // O cenario nao precisa saber quais testes existem — isso o desacopla da SP3.
      const verified = new Set();
      for (const tc of store.all('TestContract')) {
        for (const target of tc.verifies || []) verified.add(target);
      }
      return store
        .all('QualityScenario')
        .filter((qs) => !verified.has(qs.id))
        .map((qs) =>
          finding(this, qs.id, 'cenario de qualidade sem teste que o verifique',
            'Um cenario nao verificado e uma promessa, nao uma garantia.')
        );
    },
  },

  {
    id: 'TEST-PHASE-RED',
    title: 'Na SP3 os contratos de teste existem em fase vermelha',
    article: 'VIII',
    severity: SEVERITY.BLOCK,
    sprints: ['SP3'],
    check(store, context = {}) {
      const contracts = store.all('TestContract');
      if (contracts.length === 0) {
        return [
          finding(this, 'TC', 'nenhum contrato de teste declarado antes da geracao',
            'Os testes travam os contratos comportamentais antes de o modelo gerar codigo.'),
        ];
      }
      // A exigencia de fase vermelha vale no momento de encerrar a SP3. Depois de
      // assinada, o verde e o estado esperado — reavaliar a fase retroativamente
      // impediria qualquer reassinatura da SP3 apos a geracao.
      const sp3Closed = context.baselines && context.baselines.has('SP3');
      if (sp3Closed || store.config.mode === 'existing') return [];

      return contracts
        .filter((tc) => tc.phase !== 'red')
        .map((tc) =>
          finding(this, tc.id, `contrato em fase "${tc.phase}" antes do encerramento da SP3`,
            'A SP3 encerra com os testes em vermelho; o verde e baseline da SP4.')
        );
    },
  },

  {
    id: 'TEST-PHASE-GREEN',
    title: 'Na SP4 os contratos de teste estao em fase verde',
    article: 'VIII',
    severity: SEVERITY.BLOCK,
    sprints: ['SP4', 'SP5'],
    check(store) {
      return store
        .all('TestContract')
        .filter((tc) => tc.phase !== 'green')
        .map((tc) =>
          finding(this, tc.id, `contrato ainda em fase "${tc.phase}" no encerramento da SP4`,
            'A baseline executavel exige os testes em verde.')
        );
    },
  },

  {
    id: 'REQ-TRACE',
    title: 'Todo requisito deriva de direcionador ou preocupacao',
    article: 'IV',
    severity: SEVERITY.BLOCK,
    sprints: ['SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      return store
        .all('Requirement')
        .filter((r) => !Array.isArray(r.traces_to) || r.traces_to.length === 0)
        .map((r) =>
          finding(this, r.id, 'requisito sem rastreio a direcionador ou preocupacao',
            'Especificacoes nao inventam — apenas derivam.')
        );
    },
  },

  {
    id: 'RECOVERED-CONFIRMED',
    title: 'Views recuperadas de codigo existente exigem confirmacao humana',
    article: 'II',
    severity: SEVERITY.BLOCK,
    sprints: ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      return store
        .all()
        .filter((d) => d.status === 'recovered' && d.confirmed !== true)
        .map((d) =>
          finding(this, d.id, 'artefato recuperado de codigo ainda nao confirmado por humano',
            'Revise a origem com o humano e registre confirmed: true na view recuperada.')
        );
    },
  },

  {
    id: 'SP1-FOUNDATION',
    title: 'A SP1 estabelece direcionadores e partes interessadas',
    article: 'X',
    severity: SEVERITY.BLOCK,
    sprints: ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      const out = [];
      if (store.all('BusinessDriver').length === 0) {
        out.push(finding(this, 'SP1', 'nenhum direcionador de negocio declarado',
          'BABOK — por que o sistema deve existir e para quem.'));
      }
      if (store.all('Stakeholder').length === 0) {
        out.push(finding(this, 'SP1', 'nenhuma parte interessada declarada',
          'ISO 42010 exige partes interessadas identificadas.'));
      }
      return out;
    },
  },

  {
    id: 'HYPOTHESIS-DECLARED',
    title: 'A SP1 declara a hipotese que a SP5 deve confrontar',
    article: 'X',
    severity: SEVERITY.WARN,
    sprints: ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      const withHypothesis = store.all('BusinessDriver').filter((d) => d.hypothesis);
      if (withHypothesis.length > 0) return [];
      return [
        finding(this, 'SP1', 'nenhum direcionador declara hipotese',
          'A SP5 pergunta se a hipotese inicial se confirma — sem hipotese nao ha o que validar.'),
      ];
    },
  },

  {
    id: 'ATAM-SENSITIVITY',
    title: 'Decisoes arquiteturais declaram pontos de sensibilidade',
    article: 'IX',
    severity: SEVERITY.WARN,
    sprints: ['SP3', 'SP4', 'SP5'],
    check(store) {
      return store
        .all('ArchitectureDecision')
        .filter((ad) => !Array.isArray(ad.sensitivity_points) || ad.sensitivity_points.length === 0)
        .map((ad) =>
          finding(this, ad.id, 'decisao sem ponto de sensibilidade declarado',
            'ATAM — que atributo de qualidade e sensivel a esta decisao?')
        );
    },
  },

  {
    id: 'VIEW-SPRINT-ORDER',
    title: 'A view nao abre antes da sprint prevista pelo viewpoint',
    article: 'III',
    severity: SEVERITY.WARN,
    sprints: ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      const order = { SP1: 1, SP2: 2, SP3: 3, SP4: 4, SP5: 5 };
      const out = [];
      for (const view of store.all('View')) {
        const vp = store.viewpoints.index.get(view.viewpoint);
        if (!vp || !vp.opens_at || !view.sprint) continue;
        if (order[view.sprint] < order[vp.opens_at]) {
          out.push(
            finding(this, view.id, `view aberta em ${view.sprint}, antes de ${vp.opens_at} previsto para o viewpoint "${vp.id}"`,
              'A descricao arquitetural se preenche progressivamente, mas nao fora de ordem.')
          );
        }
      }
      return out;
    },
  },

  {
    id: 'CHARACTERISTIC-COVERAGE',
    title: 'Cobertura das caracteristicas nao funcionais da ISO 25010',
    article: 'V',
    severity: SEVERITY.INFO,
    sprints: ['SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      const NON_FUNCTIONAL = [
        'performance_efficiency', 'compatibility', 'interaction_capability',
        'reliability', 'security', 'maintainability', 'flexibility', 'safety',
      ];
      const covered = new Set(store.all('QualityScenario').map((qs) => qs.characteristic));
      const missing = NON_FUNCTIONAL.filter((c) => !covered.has(c));
      if (missing.length === 0) return [];
      return [
        finding(this, 'ISO25010', `${missing.length} de 8 caracteristicas nao funcionais sem cenario: ${missing.join(', ')}`,
          'Cobertura total nao e exigida — a ausencia deliberada e decisao registravel.'),
      ];
    },
  },
];

RULES.push(...require('./layer-rules').LAYER_RULES);

module.exports = { RULES, SEVERITY, refsOf };
