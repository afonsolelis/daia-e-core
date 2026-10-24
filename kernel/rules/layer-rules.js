'use strict';

const fs = require('node:fs');
const { projectFile } = require('../util/project-files');
const { inspectBpmn } = require('../util/bpmn');

/**
 * Rules of the validation layers: business, elicitation, engineering and technology.
 *
 * Each layer derives from the layer before it. A validator agent examines each layer:
 *   business     (BABOK)          personas, BPMN processes and IDEF0 decomposition
 *   elicitation  (SWEBOK + SEBoK) requirements elicited from the business
 *   engineering  (SEBoK + RM-ODP) engineering view derived from the requirements
 *   technology   (RM-ODP)         technology view that realizes the engineering
 *
 * The rules are structural. They examine existence, types, numbers and traces.
 * A human still reviews if the process and the decomposition are adequate.
 */

const BLOCK = 'BLOCK';
const WARN = 'WARN';
const ALL = ['SP1', 'SP2', 'SP3', 'SP4', 'SP5'];
const FROM_SP2 = ['SP2', 'SP3', 'SP4', 'SP5'];
const FROM_SP3 = ['SP3', 'SP4', 'SP5'];

function finding(rule, id, message, hint) {
  return { rule: rule.id, severity: rule.severity, article: rule.article, layer: rule.layer, id, message, hint };
}

function kindOf(store, id) {
  return store.get(id)?.kind;
}

function children(store, idf) {
  return store.all('Idef0Activity').filter((a) => a.parent === idf.id);
}

function viewsOf(store, viewpoint) {
  return store.all('View').filter((v) => v.viewpoint === viewpoint);
}

/** Does the view have a declared correspondence with a view of the given viewpoints? */
function corresponds(store, view, viewpoints) {
  return store.all('Correspondence').some((c) => {
    const other = c.from === view.id ? c.to : c.to === view.id ? c.from : null;
    const target = other && store.get(other);
    return target?.kind === 'View' && viewpoints.includes(target.viewpoint);
  });
}

function affectedBy(store, view) {
  return store.all('ArchitectureDecision').filter((ad) => (ad.affects_views || []).includes(view.id));
}

/** Does the requirement derive from the business, directly or through a stakeholder need that derives from it? */
function groundedInBusiness(store, req, seen = new Set()) {
  if (seen.has(req.id)) return false;
  seen.add(req.id);
  return (req.traces_to || []).some((ref) => {
    const target = store.get(ref);
    if (!target) return false;
    if (['BusinessProcess', 'Idef0Activity'].includes(target.kind)) return true;
    return target.kind === 'Requirement' && target.level === 'stakeholder-need' && groundedInBusiness(store, target, seen);
  });
}

const LAYER_RULES = [
  // ───────────────────────────── business ────────────────────────────
  {
    id: 'BIZ-PERSONA',
    title: 'The business layer declares personas derived from stakeholders',
    article: 'X',
    layer: 'business',
    severity: BLOCK,
    sprints: ALL,
    check(store) {
      const out = [];
      if (!store.all('Persona').length) {
        out.push(finding(this, 'SP1', 'no persona is declared',
          'BABOK §10.43: declare the personas. Model each process from the persona that does it.'));
      }
      for (const per of store.all('Persona')) {
        for (const ref of per.stakeholders || []) {
          if (store.has(ref) && kindOf(store, ref) !== 'Stakeholder') {
            out.push(finding(this, per.id, `${ref} is not a Stakeholder`, 'Link the persona only to identified stakeholders.'));
          }
        }
      }
      return out;
    },
  },

  {
    id: 'BIZ-BPMN',
    title: 'Each business process has a BPMN model with a lane for each persona',
    article: 'X',
    layer: 'business',
    severity: BLOCK,
    sprints: ALL,
    check(store) {
      const out = [];
      if (!store.all('BusinessProcess').length) {
        out.push(finding(this, 'SP1', 'no business process is declared',
          'BABOK §10.35: model the processes in BPMN before you elicit requirements.'));
      }
      for (const bp of store.all('BusinessProcess')) {
        for (const ref of bp.performed_by || []) {
          if (store.has(ref) && kindOf(store, ref) !== 'Persona') out.push(finding(this, bp.id, `performed_by: ${ref} is not a Persona`));
        }
        for (const ref of bp.supports || []) {
          if (store.has(ref) && kindOf(store, ref) !== 'BusinessDriver') out.push(finding(this, bp.id, `supports: ${ref} is not a BusinessDriver`));
        }
        const bpmn = (bp.models || []).filter((m) => /^bpmn/i.test(m.notation || ''));
        if (!bpmn.length) {
          out.push(finding(this, bp.id, 'the process has no model with notation BPMN', 'Declare models: [{kind: "dynamic", notation: "BPMN 2.0", path: "<file>.bpmn"}].'));
          continue;
        }
        const lanes = new Set();
        for (const model of bpmn) {
          let text;
          try { text = fs.readFileSync(projectFile(store.root, model.path), 'utf8'); } catch { continue; } // ARTIFACT-FILE reports this finding
          const result = inspectBpmn(text);
          for (const problem of result.problems) out.push(finding(this, bp.id, `${model.path}: ${problem}`, 'Add a start event, activities, a sequence flow and an end event to the model.'));
          for (const lane of result.lanes) lanes.add(lane.toLowerCase());
        }
        for (const ref of bp.performed_by || []) {
          const per = store.get(ref);
          if (per?.kind === 'Persona' && !lanes.has(per.name.toLowerCase()) && !lanes.has(per.id.toLowerCase())) {
            out.push(finding(this, bp.id, `persona "${per.name}" has no lane in the BPMN model`,
              'Give the lane or the participant the name of the persona.'));
          }
        }
      }
      return out;
    },
  },

  {
    id: 'BIZ-IDEF0',
    title: 'The IDEF0 decomposition has the root A0, coherent node numbers and anchored processes',
    article: 'X',
    layer: 'business',
    severity: BLOCK,
    sprints: ALL,
    check(store) {
      const out = [];
      const activities = store.all('Idef0Activity');
      const roots = activities.filter((a) => !a.parent);
      if (!activities.length) {
        out.push(finding(this, 'SP1', 'no IDEF0 activity is declared', 'Declare the node A0 with inputs, controls, outputs and mechanisms.'));
      } else if (roots.length !== 1 || roots[0].node !== 'A0') {
        out.push(finding(this, 'SP1', `one root A0 is expected; roots found: ${roots.map((r) => `${r.id}(${r.node})`).join(', ') || 'none'}`,
          'Declare parent in each activity, except A0.'));
      }
      const nodes = new Map();
      for (const a of activities) {
        if (nodes.has(a.node)) out.push(finding(this, a.id, `node ${a.node} is also used in ${nodes.get(a.node)}`));
        nodes.set(a.node, a.id);
        if (!a.parent) continue;
        const parent = store.get(a.parent);
        if (parent && parent.kind !== 'Idef0Activity') {
          out.push(finding(this, a.id, `parent ${a.parent} is not an Idef0Activity`));
        } else if (parent) {
          const prefix = parent.node === 'A0' ? 'A' : parent.node;
          if (!new RegExp(`^${prefix}[1-9]$`).test(a.node)) {
            out.push(finding(this, a.id, `node ${a.node} does not follow the numbers of ${parent.node}`, `Number the children of ${parent.node} from ${prefix}1 to ${prefix}9.`));
          }
        }
      }
      for (const bp of store.all('BusinessProcess')) {
        if (bp.activity && store.has(bp.activity) && kindOf(store, bp.activity) !== 'Idef0Activity') {
          out.push(finding(this, bp.id, `activity ${bp.activity} is not an Idef0Activity`));
        }
      }
      return out;
    },
  },

  {
    id: 'BIZ-DRIVER-PROCESS',
    title: 'Each business driver is supported by one process or more',
    article: 'IV',
    layer: 'business',
    severity: BLOCK,
    sprints: ALL,
    check(store) {
      const supported = new Set(store.all('BusinessProcess').flatMap((bp) => bp.supports || []));
      return store.all('BusinessDriver').filter((bd) => !supported.has(bd.id)).map((bd) =>
        finding(this, bd.id, 'no business process supports the business driver',
          'Model a process that supports the driver. Without a process, the driver has no operational anchor.'));
    },
  },

  {
    id: 'BIZ-IDEF0-SPAN',
    title: 'Each IDEF0 decomposition has 3 to 6 activities',
    article: 'X',
    layer: 'business',
    severity: WARN,
    sprints: ALL,
    check(store) {
      return store.all('Idef0Activity').map((a) => [a, children(store, a).length]).filter(([, n]) => n > 0 && (n < 3 || n > 6))
        .map(([a, n]) => finding(this, a.id, `${a.node} is decomposed into ${n} activity(ies)`, 'Use 3 to 6 boxes in each diagram, as FIPS 183 recommends.'));
    },
  },

  {
    id: 'BIZ-PERSONA-USED',
    title: 'Each persona does one process or more',
    article: 'X',
    layer: 'business',
    severity: WARN,
    sprints: ALL,
    check(store) {
      const used = new Set(store.all('BusinessProcess').flatMap((bp) => bp.performed_by || []));
      return store.all('Persona').filter((p) => !used.has(p.id)).map((p) =>
        finding(this, p.id, 'the persona is not in a process', 'Remove the persona or model the process that it does.'));
    },
  },

  // ──────────────────────────── elicitation ──────────────────────────
  {
    id: 'ELI-SOURCE',
    title: 'Each requirement records the elicitation technique and sources',
    article: 'IV',
    layer: 'requirements',
    severity: BLOCK,
    sprints: FROM_SP2,
    check(store) {
      const out = [];
      const SOURCES = ['Persona', 'Stakeholder', 'BusinessProcess', 'Idef0Activity'];
      for (const req of store.all('Requirement')) {
        if (!req.elicitation) {
          out.push(finding(this, req.id, 'the requirement has no elicitation', 'SWEBOK v4 §1.2: declare technique and sources (PER-*, STK-*, BP-*, IDF-*).'));
          continue;
        }
        for (const ref of req.elicitation.sources || []) {
          if (!store.has(ref)) out.push(finding(this, req.id, `the elicitation source does not exist: ${ref}`));
          else if (!SOURCES.includes(kindOf(store, ref))) out.push(finding(this, req.id, `source ${ref} must be ${SOURCES.join('/')}`));
        }
      }
      return out;
    },
  },

  {
    id: 'ELI-FROM-BUSINESS',
    title: 'Each functional requirement derives from a business process or a business activity',
    article: 'IV',
    layer: 'requirements',
    severity: BLOCK,
    sprints: FROM_SP2,
    check(store) {
      return store.all('Requirement').filter((r) => r.type === 'functional' && !groundedInBusiness(store, r)).map((r) =>
        finding(this, r.id, 'the functional requirement has no origin in BP-*, IDF-* or a stakeholder need derived from them',
          'SEBoK: trace each system requirement to a stakeholder need from the business analysis.'));
    },
  },

  {
    id: 'ELI-ACTIVITY-COVERAGE',
    title: 'Each automated IDEF0 activity is covered by a functional requirement',
    article: 'X',
    layer: 'requirements',
    severity: BLOCK,
    sprints: FROM_SP2,
    check(store) {
      const covered = new Set();
      for (const req of store.all('Requirement').filter((r) => r.type === 'functional')) {
        for (const ref of req.traces_to || []) {
          const target = store.get(ref);
          if (target?.kind === 'Idef0Activity') covered.add(target.id);
          if (target?.kind === 'BusinessProcess' && target.activity) covered.add(target.activity);
        }
      }
      return store.all('Idef0Activity')
        .filter((a) => a.automation === 'system' && !children(store, a).length && !covered.has(a.id))
        .map((a) => finding(this, a.id, `activity ${a.node} "${a.title}" is in the system boundary and has no functional requirement`,
          'Derive the requirement, or set automation to manual or external and record the boundary.'));
    },
  },

  {
    id: 'ELI-BOUNDARY',
    title: 'A requirement does not derive from an activity outside the system boundary',
    article: 'X',
    layer: 'requirements',
    severity: WARN,
    sprints: FROM_SP2,
    check(store) {
      const out = [];
      for (const req of store.all('Requirement')) {
        for (const ref of req.traces_to || []) {
          const a = store.get(ref);
          if (a?.kind === 'Idef0Activity' && a.automation !== 'system') {
            out.push(finding(this, req.id, `derives from ${a.node}, which has automation ${a.automation}`, 'Confirm if the system boundary changed.'));
          }
        }
      }
      return out;
    },
  },

  // ──────────────────────────── engineering ──────────────────────────
  {
    id: 'ENG-VIEW',
    title: 'The engineering view exists, has a deployment model and derives from the requirements',
    article: 'VII',
    layer: 'engineering',
    severity: BLOCK,
    sprints: FROM_SP3,
    check(store) {
      if (!store.viewpoints.index.has('engineering')) return [];
      const views = viewsOf(store, 'engineering');
      if (!views.length) {
        return [finding(this, 'SP3', 'no engineering view is declared',
          'SEBoK: declare the physical architecture. It puts the logical functions on nodes, channels and policies.')];
      }
      const out = [];
      for (const view of views) {
        if (!(view.models || []).some((m) => m.kind === 'deployment')) {
          out.push(finding(this, view.id, 'the engineering view has no model of kind deployment'));
        }
        if (!corresponds(store, view, ['computational', 'information'])) {
          out.push(finding(this, view.id, 'the engineering view has no correspondence with a computational or information view',
            'Declare a COR-* (rule: realizes) that links the engineering view to the logical model.'));
        }
        const grounded = affectedBy(store, view).some((ad) =>
          (ad.traces_to || []).some((ref) => ['Requirement', 'QualityScenario'].includes(kindOf(store, ref))));
        if (!grounded) {
          out.push(finding(this, view.id, 'no decision with a trace to a requirement affects the engineering view',
            'Record an AD-* with affects_views and with traces_to an FR, NFR or QS.'));
        }
      }
      return out;
    },
  },

  // ──────────────────────────── technology ───────────────────────────
  {
    id: 'TEC-VIEW',
    title: 'The technology view realizes the engineering view through recorded decisions',
    article: 'IX',
    layer: 'technology',
    severity: BLOCK,
    sprints: FROM_SP3,
    check(store) {
      if (!store.viewpoints.index.has('technology')) return [];
      const views = viewsOf(store, 'technology');
      if (!views.length) {
        return [finding(this, 'SP3', 'no technology view is declared', 'Declare the technology view. A technology selection is a decision, not a premise.')];
      }
      const out = [];
      for (const view of views) {
        if (!corresponds(store, view, ['engineering'])) {
          out.push(finding(this, view.id, 'the technology view has no correspondence with the engineering view',
            'Declare the correspondence. Select the technology only after the engineering view that it realizes.'));
        }
        if (!affectedBy(store, view).length) {
          out.push(finding(this, view.id, 'no architecture decision affects the technology view',
            'Record each technology selection as an AD-* with a rejected alternative (Art. IX).'));
        }
      }
      return out;
    },
  },
];

module.exports = { LAYER_RULES, groundedInBusiness };
