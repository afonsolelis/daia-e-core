'use strict';

/**
 * Correspondence rules: the executable lint of the metamodel.
 *
 * ISO/IEC/IEEE 42010:2022 states that the architecture description must be coherent.
 * Each view answers identified concerns of identified stakeholders.
 * The correspondences between views are declared.
 * A schema validates one document. These rules validate the graph.
 *
 * Each rule declares the constitution article that supports it.
 * A rule without an article is an opinion. An article without a rule is only an aim.
 */

const SEVERITY = { BLOCK: 'BLOCK', WARN: 'WARN', INFO: 'INFO' };

/** The fields that contain references to other documents. */
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
    title: 'Each reference points to a document that exists',
    article: 'IV',
    severity: SEVERITY.BLOCK,
    sprints: ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      const out = [];
      for (const doc of store.all()) {
        for (const { field, ref } of refsOf(doc)) {
          if (ref && !store.has(ref)) {
            out.push(
              finding(this, doc.id, `broken reference in "${field}": ${ref} does not exist in the model`,
                'Create the referenced document or correct the id.')
            );
          }
        }
      }
      return out;
    },
  },

  {
    id: 'CONCERN-ADDRESSED',
    title: 'Each Concern is addressed by one View or more',
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
          finding(this, c.id, `no view addresses this concern: "${c.statement.slice(0, 60)}..."`,
            'ISO 42010 §5.4: add a view that answers each identified concern.')
        );
    },
  },

  {
    id: 'VIEW-STAKEHOLDER',
    title: 'Each View declares identified stakeholders',
    article: 'VII',
    severity: SEVERITY.BLOCK,
    sprints: ['SP3', 'SP4', 'SP5'],
    check(store) {
      return store
        .all('View')
        .filter((v) => !Array.isArray(v.stakeholders) || v.stakeholders.length === 0)
        .map((v) =>
          finding(this, v.id, 'the view declares no stakeholder',
            'Declare the stakeholders of the view. A view that answers no stakeholder is only a diagram.')
        );
    },
  },

  {
    id: 'VIEW-VIEWPOINT',
    title: 'The viewpoint of each View exists in the active catalog',
    article: 'VII',
    severity: SEVERITY.BLOCK,
    sprints: ['SP3', 'SP4', 'SP5'],
    check(store) {
      const known = store.viewpoints.index;
      return store
        .all('View')
        .filter((v) => !known.has(v.viewpoint))
        .map((v) =>
          finding(this, v.id, `viewpoint "${v.viewpoint}" is not in the catalog ${store.viewpoints.catalog}`,
            `Use one of these viewpoints: ${[...known.keys()].join(', ')}`)
        );
    },
  },

  {
    id: 'STATIC-AND-DYNAMIC',
    title: 'SP3 must have a static model and a dynamic model',
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
          finding(this, 'MODEL', 'no view declares a static model',
            'Add a static model. Without it, the decisions can give structures that do not hold the real data.')
        );
      }
      if (!kinds.has('dynamic')) {
        out.push(
          finding(this, 'MODEL', 'no view declares a dynamic model',
            'Add a dynamic model. Without it, structures can be correct at rest but incorrect in operation.')
        );
      }
      return out;
    },
  },

  {
    id: 'AD-ALTERNATIVE',
    title: 'Each architecture decision records a rejected alternative and the criterion',
    article: 'IX',
    severity: SEVERITY.BLOCK,
    sprints: ['SP3', 'SP4', 'SP5'],
    check(store) {
      const out = [];
      for (const ad of store.all('ArchitectureDecision')) {
        const alts = ad.alternatives || [];
        if (alts.length === 0) {
          out.push(
            finding(this, ad.id, 'the decision records no alternative',
              'Record the alternatives. An LLM tends to select conventional solutions and not show the other options.')
          );
          continue;
        }
        alts.forEach((alt, i) => {
          if (!alt.rejected_because || alt.rejected_because.trim().length < 10) {
            out.push(
              finding(this, ad.id, `alternative ${i + 1} ("${alt.option}") has no rejection criterion`,
                'Record the criterion, not the preference.')
            );
          }
        });
      }
      return out;
    },
  },

  {
    id: 'AD-TRACE',
    title: 'Each architecture decision traces to a requirement or a concern',
    article: 'IV',
    severity: SEVERITY.BLOCK,
    sprints: ['SP3', 'SP4', 'SP5'],
    check(store) {
      return store
        .all('ArchitectureDecision')
        .filter((ad) => !Array.isArray(ad.traces_to) || ad.traces_to.length === 0)
        .map((ad) =>
          finding(this, ad.id, 'the architecture decision has no trace to a requirement or a concern',
            'Add traces_to. Keep the chain stakeholder need -> requirement -> decision complete.')
        );
    },
  },

  {
    id: 'NFR-SCENARIO',
    title: 'Each non-functional requirement has a quality scenario',
    article: 'V',
    severity: SEVERITY.BLOCK,
    sprints: ['SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      return store
        .all('Requirement')
        .filter((r) => r.type === 'non-functional')
        .filter((r) => !Array.isArray(r.scenarios) || r.scenarios.length === 0)
        .map((r) =>
          finding(this, r.id, 'the non-functional requirement has no quality scenario',
            'Write the quality as a six-part scenario with a response measure, not as an adjective.')
        );
    },
  },

  {
    id: 'SCENARIO-MEASURABLE',
    title: 'Each quality scenario has a measurable response measure',
    article: 'V',
    severity: SEVERITY.BLOCK,
    sprints: ['SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      const PLACEHOLDERS = ['tbd', 'todo', 'n/a', '?', '-', 'to be defined', 'fast', 'acceptable', 'a definir', 'rapido', 'aceitavel'];
      const out = [];
      for (const qs of store.all('QualityScenario')) {
        const m = qs.response_measure || {};
        const threshold = String(m.threshold ?? '').trim().toLowerCase();
        if (!threshold || PLACEHOLDERS.includes(threshold)) {
          out.push(
            finding(this, qs.id, `the response measure has no real threshold (received: "${m.threshold}")`,
              'Give a numeric threshold. "Fast" is not a measurable response.')
          );
        }
      }
      return out;
    },
  },

  {
    id: 'SCENARIO-VERIFIED',
    title: 'Each quality scenario is verified by an executable test',
    article: 'V',
    severity: SEVERITY.BLOCK,
    sprints: ['SP4', 'SP5'],
    check(store) {
      // The direction is from the test to the scenario: the contract declares what it verifies.
      // The scenario does not know which tests exist. Thus it is independent of SP3.
      const verified = new Set();
      for (const tc of store.all('TestContract')) {
        for (const target of tc.verifies || []) verified.add(target);
      }
      return store
        .all('QualityScenario')
        .filter((qs) => !verified.has(qs.id))
        .map((qs) =>
          finding(this, qs.id, 'no test verifies the quality scenario',
            'Add a test contract that verifies the scenario. A scenario without a test is only a promise.')
        );
    },
  },

  {
    id: 'TEST-PHASE-RED',
    title: 'In SP3, the test contracts exist in the red phase',
    article: 'VIII',
    severity: SEVERITY.BLOCK,
    sprints: ['SP3'],
    check(store, context = {}) {
      const contracts = store.all('TestContract');
      if (contracts.length === 0) {
        return [
          finding(this, 'TC', 'no test contract is declared before the code generation',
            'Declare the test contracts. They lock the behavior before the model generates code.'),
        ];
      }
      // The red phase is mandatory only when SP3 closes. After the signature, green is
      // the expected state. A new check of the phase after the generation would stop
      // each new signature of SP3.
      const sp3Closed = context.baselines && context.baselines.has('SP3');
      if (sp3Closed || store.config.mode === 'existing') return [];

      return contracts
        .filter((tc) => tc.phase !== 'red')
        .map((tc) =>
          finding(this, tc.id, `the contract is in phase "${tc.phase}" before SP3 closes`,
            'Set the phase to red. SP3 closes with red tests. Green tests are the SP4 baseline.')
        );
    },
  },

  {
    id: 'TEST-PHASE-GREEN',
    title: 'In SP4, the test contracts are in the green phase',
    article: 'VIII',
    severity: SEVERITY.BLOCK,
    sprints: ['SP4', 'SP5'],
    check(store) {
      return store
        .all('TestContract')
        .filter((tc) => tc.phase !== 'green')
        .map((tc) =>
          finding(this, tc.id, `the contract is still in phase "${tc.phase}" when SP4 closes`,
            'Make the tests green. The executable baseline must have green tests.')
        );
    },
  },

  {
    id: 'REQ-TRACE',
    title: 'Each requirement traces to a business driver or a concern',
    article: 'IV',
    severity: SEVERITY.BLOCK,
    sprints: ['SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      return store
        .all('Requirement')
        .filter((r) => !Array.isArray(r.traces_to) || r.traces_to.length === 0)
        .map((r) =>
          finding(this, r.id, 'the requirement has no trace to a business driver or a concern',
            'Add traces_to. A specification does not invent requirements. It only derives them.')
        );
    },
  },

  {
    id: 'RECOVERED-CONFIRMED',
    title: 'A human must confirm each view recovered from existing code',
    article: 'II',
    severity: SEVERITY.BLOCK,
    sprints: ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      return store
        .all()
        .filter((d) => d.status === 'recovered' && d.confirmed !== true)
        .map((d) =>
          finding(this, d.id, 'a human did not confirm this artifact recovered from code',
            'Review the origin with the human. Then record confirmed: true in the recovered view.')
        );
    },
  },

  {
    id: 'SP1-FOUNDATION',
    title: 'SP1 declares business drivers and stakeholders',
    article: 'X',
    severity: SEVERITY.BLOCK,
    sprints: ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      const out = [];
      if (store.all('BusinessDriver').length === 0) {
        out.push(finding(this, 'SP1', 'no business driver is declared',
          'BABOK: declare why the system must exist and for whom.'));
      }
      if (store.all('Stakeholder').length === 0) {
        out.push(finding(this, 'SP1', 'no stakeholder is declared',
          'ISO 42010: declare the identified stakeholders.'));
      }
      return out;
    },
  },

  {
    id: 'HYPOTHESIS-DECLARED',
    title: 'SP1 declares the hypothesis that SP5 must test',
    article: 'X',
    severity: SEVERITY.WARN,
    sprints: ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'],
    check(store) {
      const withHypothesis = store.all('BusinessDriver').filter((d) => d.hypothesis);
      if (withHypothesis.length > 0) return [];
      return [
        finding(this, 'SP1', 'no business driver declares a hypothesis',
          'Declare a hypothesis. SP5 asks if the initial hypothesis is true. Without it, SP5 has nothing to validate.'),
      ];
    },
  },

  {
    id: 'ATAM-SENSITIVITY',
    title: 'Architecture decisions declare sensitivity points',
    article: 'IX',
    severity: SEVERITY.WARN,
    sprints: ['SP3', 'SP4', 'SP5'],
    check(store) {
      return store
        .all('ArchitectureDecision')
        .filter((ad) => !Array.isArray(ad.sensitivity_points) || ad.sensitivity_points.length === 0)
        .map((ad) =>
          finding(this, ad.id, 'the decision declares no sensitivity point',
            'ATAM: declare the quality attribute that is sensitive to this decision.')
        );
    },
  },

  {
    id: 'VIEW-SPRINT-ORDER',
    title: 'A view does not open before the sprint that its viewpoint sets',
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
            finding(this, view.id, `the view opens in ${view.sprint}, before ${vp.opens_at}, the sprint set for the viewpoint "${vp.id}"`,
              'Move the view to the correct sprint. Fill the architecture description in sprint order.')
          );
        }
      }
      return out;
    },
  },

  {
    id: 'CHARACTERISTIC-COVERAGE',
    title: 'Coverage of the ISO 25010 non-functional characteristics',
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
        finding(this, 'ISO25010', `${missing.length} of 8 non-functional characteristics have no scenario: ${missing.join(', ')}`,
          'Full coverage is not mandatory. If you omit a characteristic deliberately, record that decision.'),
      ];
    },
  },
];

RULES.push(...require('./layer-rules').LAYER_RULES);

module.exports = { RULES, SEVERITY, refsOf };
