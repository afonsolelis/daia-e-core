'use strict';

const fs = require('node:fs');
const { projectFile } = require('../util/project-files');
const { inspectBpmn } = require('../util/bpmn');

/**
 * Regras das camadas de validacao: negocio, elicitacao, engenharia e tecnologia.
 *
 * Cada camada deriva da anterior e e conferida por um agente validador:
 *   negocio     (BABOK)          personas, processos BPMN e decomposicao IDEF0
 *   elicitacao  (SWEBOK + SEBoK) requisitos elicitados a partir do negocio
 *   engenharia  (SEBoK + RM-ODP) view engineering derivada dos requisitos
 *   tecnologia  (RM-ODP)         view technology que realiza a engenharia
 *
 * As regras sao estruturais: conferem existencia, tipos, numeracao e
 * rastreio. Adequacao do processo e da decomposicao segue sendo revisao humana.
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

/** A view tem correspondencia declarada com alguma view dos viewpoints dados? */
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

/** O requisito deriva do negocio, direto ou por uma necessidade que deriva? */
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
  // ───────────────────────────── negocio ─────────────────────────────
  {
    id: 'BIZ-PERSONA',
    title: 'O negocio declara personas derivadas de partes interessadas',
    article: 'X',
    layer: 'business',
    severity: BLOCK,
    sprints: ALL,
    check(store) {
      const out = [];
      if (!store.all('Persona').length) {
        out.push(finding(this, 'SP1', 'nenhuma persona declarada',
          'BABOK §10.43 — os processos sao modelados a partir de quem os executa.'));
      }
      for (const per of store.all('Persona')) {
        for (const ref of per.stakeholders || []) {
          if (store.has(ref) && kindOf(store, ref) !== 'Stakeholder') {
            out.push(finding(this, per.id, `${ref} nao e Stakeholder`, 'Persona representa partes interessadas identificadas.'));
          }
        }
      }
      return out;
    },
  },

  {
    id: 'BIZ-BPMN',
    title: 'Todo processo de negocio tem modelo BPMN com raia por persona',
    article: 'X',
    layer: 'business',
    severity: BLOCK,
    sprints: ALL,
    check(store) {
      const out = [];
      if (!store.all('BusinessProcess').length) {
        out.push(finding(this, 'SP1', 'nenhum processo de negocio declarado',
          'BABOK §10.35 — modele os processos em BPMN antes de elicitar requisitos.'));
      }
      for (const bp of store.all('BusinessProcess')) {
        for (const ref of bp.performed_by || []) {
          if (store.has(ref) && kindOf(store, ref) !== 'Persona') out.push(finding(this, bp.id, `performed_by: ${ref} nao e Persona`));
        }
        for (const ref of bp.supports || []) {
          if (store.has(ref) && kindOf(store, ref) !== 'BusinessDriver') out.push(finding(this, bp.id, `supports: ${ref} nao e BusinessDriver`));
        }
        const bpmn = (bp.models || []).filter((m) => /^bpmn/i.test(m.notation || ''));
        if (!bpmn.length) {
          out.push(finding(this, bp.id, 'processo sem modelo com notation BPMN', 'Declare models: [{kind: "dynamic", notation: "BPMN 2.0", path: "<arquivo>.bpmn"}].'));
          continue;
        }
        const lanes = new Set();
        for (const model of bpmn) {
          let text;
          try { text = fs.readFileSync(projectFile(store.root, model.path), 'utf8'); } catch { continue; } // ARTIFACT-FILE ja reporta
          const result = inspectBpmn(text);
          for (const problem of result.problems) out.push(finding(this, bp.id, `${model.path}: ${problem}`, 'O modelo precisa de inicio, atividades, fluxo e fim.'));
          for (const lane of result.lanes) lanes.add(lane.toLowerCase());
        }
        for (const ref of bp.performed_by || []) {
          const per = store.get(ref);
          if (per?.kind === 'Persona' && !lanes.has(per.name.toLowerCase()) && !lanes.has(per.id.toLowerCase())) {
            out.push(finding(this, bp.id, `persona "${per.name}" sem raia (lane) no BPMN`,
              'Nomeie a lane ou o participant com o nome da persona.'));
          }
        }
      }
      return out;
    },
  },

  {
    id: 'BIZ-IDEF0',
    title: 'A decomposicao IDEF0 tem raiz A0, numeracao coerente e processos ancorados',
    article: 'X',
    layer: 'business',
    severity: BLOCK,
    sprints: ALL,
    check(store) {
      const out = [];
      const activities = store.all('Idef0Activity');
      const roots = activities.filter((a) => !a.parent);
      if (!activities.length) {
        out.push(finding(this, 'SP1', 'nenhuma atividade IDEF0 declarada', 'Declare ao menos o no A0 com entradas, controles, saidas e mecanismos.'));
      } else if (roots.length !== 1 || roots[0].node !== 'A0') {
        out.push(finding(this, 'SP1', `esperada uma unica raiz A0; encontradas: ${roots.map((r) => `${r.id}(${r.node})`).join(', ') || 'nenhuma'}`,
          'Toda atividade, exceto A0, declara parent.'));
      }
      const nodes = new Map();
      for (const a of activities) {
        if (nodes.has(a.node)) out.push(finding(this, a.id, `no ${a.node} repetido em ${nodes.get(a.node)}`));
        nodes.set(a.node, a.id);
        if (!a.parent) continue;
        const parent = store.get(a.parent);
        if (parent && parent.kind !== 'Idef0Activity') {
          out.push(finding(this, a.id, `parent ${a.parent} nao e Idef0Activity`));
        } else if (parent) {
          const prefix = parent.node === 'A0' ? 'A' : parent.node;
          if (!new RegExp(`^${prefix}[1-9]$`).test(a.node)) {
            out.push(finding(this, a.id, `no ${a.node} nao numera a partir de ${parent.node}`, `Filhos de ${parent.node} sao ${prefix}1..${prefix}9.`));
          }
        }
      }
      for (const bp of store.all('BusinessProcess')) {
        if (bp.activity && store.has(bp.activity) && kindOf(store, bp.activity) !== 'Idef0Activity') {
          out.push(finding(this, bp.id, `activity ${bp.activity} nao e Idef0Activity`));
        }
      }
      return out;
    },
  },

  {
    id: 'BIZ-DRIVER-PROCESS',
    title: 'Todo direcionador e sustentado por ao menos um processo',
    article: 'IV',
    layer: 'business',
    severity: BLOCK,
    sprints: ALL,
    check(store) {
      const supported = new Set(store.all('BusinessProcess').flatMap((bp) => bp.supports || []));
      return store.all('BusinessDriver').filter((bd) => !supported.has(bd.id)).map((bd) =>
        finding(this, bd.id, 'direcionador sem processo de negocio que o sustente',
          'Um direcionador que nenhum processo realiza nao tem ancora operacional.'));
    },
  },

  {
    id: 'BIZ-IDEF0-SPAN',
    title: 'Cada decomposicao IDEF0 tem entre 3 e 6 atividades',
    article: 'X',
    layer: 'business',
    severity: WARN,
    sprints: ALL,
    check(store) {
      return store.all('Idef0Activity').map((a) => [a, children(store, a).length]).filter(([, n]) => n > 0 && (n < 3 || n > 6))
        .map(([a, n]) => finding(this, a.id, `${a.node} decomposta em ${n} atividade(s)`, 'FIPS 183 recomenda de 3 a 6 caixas por diagrama.'));
    },
  },

  {
    id: 'BIZ-PERSONA-USED',
    title: 'Toda persona executa ao menos um processo',
    article: 'X',
    layer: 'business',
    severity: WARN,
    sprints: ALL,
    check(store) {
      const used = new Set(store.all('BusinessProcess').flatMap((bp) => bp.performed_by || []));
      return store.all('Persona').filter((p) => !used.has(p.id)).map((p) =>
        finding(this, p.id, 'persona fora de qualquer processo', 'Remova a persona ou modele o processo que ela executa.'));
    },
  },

  // ──────────────────────────── elicitacao ───────────────────────────
  {
    id: 'ELI-SOURCE',
    title: 'Todo requisito registra tecnica e fontes de elicitacao',
    article: 'IV',
    layer: 'requirements',
    severity: BLOCK,
    sprints: FROM_SP2,
    check(store) {
      const out = [];
      const SOURCES = ['Persona', 'Stakeholder', 'BusinessProcess', 'Idef0Activity'];
      for (const req of store.all('Requirement')) {
        if (!req.elicitation) {
          out.push(finding(this, req.id, 'requisito sem elicitation', 'SWEBOK v4 §1.2 — declare technique e sources (PER-*, STK-*, BP-*, IDF-*).'));
          continue;
        }
        for (const ref of req.elicitation.sources || []) {
          if (!store.has(ref)) out.push(finding(this, req.id, `fonte de elicitacao inexistente: ${ref}`));
          else if (!SOURCES.includes(kindOf(store, ref))) out.push(finding(this, req.id, `fonte ${ref} deve ser ${SOURCES.join('/')}`));
        }
      }
      return out;
    },
  },

  {
    id: 'ELI-FROM-BUSINESS',
    title: 'Todo requisito funcional deriva de processo ou atividade de negocio',
    article: 'IV',
    layer: 'requirements',
    severity: BLOCK,
    sprints: FROM_SP2,
    check(store) {
      return store.all('Requirement').filter((r) => r.type === 'functional' && !groundedInBusiness(store, r)).map((r) =>
        finding(this, r.id, 'requisito funcional sem origem em BP-*, IDF-* ou necessidade derivada deles',
          'SEBoK — requisitos de sistema transformam necessidades levantadas na analise de negocio.'));
    },
  },

  {
    id: 'ELI-ACTIVITY-COVERAGE',
    title: 'Toda atividade IDEF0 automatizada e coberta por requisito funcional',
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
        .map((a) => finding(this, a.id, `atividade ${a.node} "${a.title}" dentro da fronteira sem requisito funcional`,
          'Derive o requisito ou mude automation para manual/external, registrando a fronteira.'));
    },
  },

  {
    id: 'ELI-BOUNDARY',
    title: 'Requisito nao deriva de atividade fora da fronteira',
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
            out.push(finding(this, req.id, `deriva de ${a.node}, marcada como ${a.automation}`, 'Confirme se a fronteira do sistema mudou.'));
          }
        }
      }
      return out;
    },
  },

  // ──────────────────────────── engenharia ───────────────────────────
  {
    id: 'ENG-VIEW',
    title: 'A view engineering existe, com modelo de implantacao, e deriva dos requisitos',
    article: 'VII',
    layer: 'engineering',
    severity: BLOCK,
    sprints: FROM_SP3,
    check(store) {
      if (!store.viewpoints.index.has('engineering')) return [];
      const views = viewsOf(store, 'engineering');
      if (!views.length) {
        return [finding(this, 'SP3', 'nenhuma view engineering declarada',
          'SEBoK — a arquitetura fisica distribui as funcoes logicas em nos, canais e politicas.')];
      }
      const out = [];
      for (const view of views) {
        if (!(view.models || []).some((m) => m.kind === 'deployment')) {
          out.push(finding(this, view.id, 'view engineering sem modelo de kind deployment'));
        }
        if (!corresponds(store, view, ['computational', 'information'])) {
          out.push(finding(this, view.id, 'view engineering sem correspondencia com computational/information',
            'Declare COR-* (rule: realizes) ligando a engenharia ao modelo logico.'));
        }
        const grounded = affectedBy(store, view).some((ad) =>
          (ad.traces_to || []).some((ref) => ['Requirement', 'QualityScenario'].includes(kindOf(store, ref))));
        if (!grounded) {
          out.push(finding(this, view.id, 'nenhuma decisao rastreada a requisito afeta a view engineering',
            'Registre AD-* com affects_views e traces_to para RF/RNF/QS.'));
        }
      }
      return out;
    },
  },

  // ──────────────────────────── tecnologia ───────────────────────────
  {
    id: 'TEC-VIEW',
    title: 'A view technology realiza a engenharia por decisoes registradas',
    article: 'IX',
    layer: 'technology',
    severity: BLOCK,
    sprints: FROM_SP3,
    check(store) {
      if (!store.viewpoints.index.has('technology')) return [];
      const views = viewsOf(store, 'technology');
      if (!views.length) {
        return [finding(this, 'SP3', 'nenhuma view technology declarada', 'A selecao de tecnologia e decisao, nao premissa.')];
      }
      const out = [];
      for (const view of views) {
        if (!corresponds(store, view, ['engineering'])) {
          out.push(finding(this, view.id, 'view technology sem correspondencia com a view engineering',
            'A tecnologia so e escolhida depois da engenharia que ela realiza.'));
        }
        if (!affectedBy(store, view).length) {
          out.push(finding(this, view.id, 'nenhuma decisao arquitetural afeta a view technology',
            'Cada escolha tecnologica e AD-* com alternativa preterida (Art. IX).'));
        }
      }
      return out;
    },
  },
];

module.exports = { LAYER_RULES, groundedInBusiness };
