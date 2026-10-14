#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const kernel = require('../kernel');
const { term, severitySymbol } = require('../kernel/util/term');
const { writeJson } = require('../kernel/util/fs-walk');
const { SPRINTS, SPRINT_IDS, getSprint } = kernel;

const EXIT = { OK: 0, BLOCKED: 1, USAGE: 2, ERROR: 3 };

/** Parser de argv minimo — sem dependencia externa (Art. I). */
function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [name, inline] = arg.slice(2).split('=');
      if (inline !== undefined) {
        flags[name] = inline;
      } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        flags[name] = argv[i + 1];
        i += 1;
      } else {
        flags[name] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function header(title) {
  console.log('');
  console.log(term.bold(title));
  console.log(term.gray('-'.repeat(Math.min(title.length, 72))));
}

function printFindings(findings) {
  const byRule = new Map();
  for (const f of findings) {
    if (!byRule.has(f.rule)) byRule.set(f.rule, []);
    byRule.get(f.rule).push(f);
  }
  for (const [rule, group] of byRule) {
    const first = group[0];
    console.log('');
    console.log(`${severitySymbol(first.severity)} ${term.bold(rule)} ${term.gray(`(Art. ${first.article})`)}`);
    for (const f of group) {
      console.log(`   ${term.cyan(f.id)} ${f.message}`);
    }
    if (first.hint) console.log(`   ${term.gray(first.hint)}`);
  }
}

function summarize(report) {
  const parts = [];
  parts.push(`${report.blocking.length} bloqueio(s)`);
  parts.push(`${report.warnings.length} alerta(s)`);
  parts.push(`${report.infos.length} informativo(s)`);
  return parts.join(' | ');
}

// ─────────────────────────────── comandos ───────────────────────────────

async function cmdInit(root, flags) {
  if (process.stdin.isTTY && !flags.yes) {
    const rl = require('node:readline/promises').createInterface({ input: process.stdin, output: process.stdout });
    try {
      for (const [key, label, fallback] of [['name','Nome',path.basename(root)], ['mode','Projeto (new/existing)','new'], ['objective','Objetivo',''], ['stack','Stack','a definir'], ['constraints','Restricoes','a definir'], ['runtime','Runtime (codex/portable)','codex']]) {
        if (!flags[key]) flags[key] = (await rl.question(`${label} [${fallback}]: `)).trim() || fallback;
      }
    } finally { rl.close(); }
  }
  if (!['new','existing'].includes(flags.mode || 'new')) throw new Error('Use --mode new|existing');
  if (!['codex','claude','portable'].includes(flags.runtime || 'codex')) throw new Error('Use --runtime codex|claude|portable');
  fs.mkdirSync(root, { recursive: true });
  require('../kernel/util/project-files').projectFile(root, '.daia/config.json');
  const daiaDir = path.join(root, '.daia');
  if (fs.existsSync(path.join(daiaDir, 'config.json'))) {
    console.error(term.red('Projeto ja inicializado. Use daia next para retomar.'));
    return EXIT.USAGE;
  }
  const catalog = flags.catalog || 'rm-odp';
  const catalogFile = path.join(__dirname, '..', 'kernel', 'viewpoints', `${catalog}.json`);
  if (!fs.existsSync(catalogFile)) {
    console.error(term.red(`Catalogo de viewpoints "${catalog}" nao existe.`));
    console.error(term.gray('Disponiveis: rm-odp (default), 4plus1, c4'));
    return EXIT.USAGE;
  }

  require('../kernel/skill/install').install(root, path.join(__dirname, '..', 'squads', 'daia-e'), flags.runtime || 'codex', false, undefined, true);
  writeJson(path.join(daiaDir, 'config.json'), {
    project: flags.name || path.basename(root),
    mode: flags.mode || 'new', objective: flags.objective || '', stack: flags.stack || '', constraints: flags.constraints || '',
    verification: {},
    method: 'DAIA-E',
    viewpointCatalog: catalog,
    modelDir: '.daia/model',
    baselineDir: '.daia/baselines',
    evidenceDir: '.daia/evidence',
    createdAt: new Date().toISOString(),
  });

  for (const sub of ['model/drivers', 'model/stakeholders', 'model/concerns', 'model/requirements',
    'model/scenarios', 'model/views', 'model/decisions', 'model/correspondences',
    'model/tests', 'baselines', 'evidence']) {
    fs.mkdirSync(path.join(daiaDir, sub), { recursive: true });
  }

  fs.cpSync(path.join(__dirname, '..', 'kernel', 'schemas'), path.join(daiaDir, 'schemas'), { recursive: true });
  fs.copyFileSync(path.join(__dirname, '..', 'squads', 'daia-e', 'guide.md'), path.join(daiaDir, 'guide.md'));
  writeJson(path.join(daiaDir, 'workflow.json'), { history: [] });
  cmdSetup(root, { to: flags.runtime || 'codex' });
  console.log(term.green('Projeto DAIA-E inicializado.'));
  console.log(`  catalogo de viewpoints: ${term.cyan(catalog)}`);
  console.log(`  modelo: ${term.gray('.daia/model/')}`);
  console.log('');
  console.log('Proximo passo: SP1 — por que o sistema deve existir e para quem?');
  console.log(term.gray('  daia next'));
  return EXIT.OK;
}

function cmdStatus(root) {
  const project = kernel.openProject(root);
  const baselines = project.baselines.load();

  header(`DAIA-E — ${project.store.config.project || path.basename(root)}`);
  console.log(`catalogo   ${term.cyan(project.store.viewpoints.name)} ${term.gray(`(${project.store.viewpoints.standard})`)}`);
  console.log(`artefatos  ${project.store.all().length}`);
  console.log(`estado     ${term.gray(project.store.stateHash().slice(0, 23))}`);

  header('Sprints');
  for (const sprint of SPRINTS) {
    const report = project.gate.evaluate(sprint.id, { baselines });
    const signed = baselines.get(sprint.id);
    let mark;
    if (signed) mark = project.baselines.verify(sprint.id).valid ? term.green('assinada') : term.red('revisao necessaria');
    else if (report.passed) mark = term.yellow('pronta para assinar');
    else mark = term.red(`${report.blocking.length} bloqueio(s)`);
    console.log(`${term.bold(sprint.id)} ${term.gray(sprint.slug.padEnd(5))} ${sprint.name.padEnd(46)} ${mark}`);
    if (signed) {
      console.log(term.gray(`     assinada por ${signed.signature.signed_by} em ${signed.signature.signed_at.slice(0, 10)}`));
    }
  }

  const orphans = project.trace.orphans();
  if (orphans.length > 0) {
    header('Artefatos orfaos');
    console.log(term.yellow(`${orphans.length} artefato(s) sem rastreio em nenhum sentido:`));
    console.log(term.gray(`  ${orphans.join(', ')}`));
  }
  console.log('');
  return EXIT.OK;
}

function cmdGate(root, positional, flags) {
  const project = kernel.openProject(root);
  const baselines = project.baselines.load();
  const target = positional[0];

  const reports = target
    ? [project.gate.evaluate(target, { baselines })]
    : project.gate.evaluateAll({ baselines });

  if (flags.json) {
    console.log(JSON.stringify(reports.map((r) => ({
      sprint: r.sprint.id,
      passed: r.passed,
      blocking: r.blocking.length,
      warnings: r.warnings.length,
      findings: r.findings,
      stateHash: r.stateHash,
      evaluatedAt: r.evaluatedAt,
    })), null, 2));
    return reports.every((r) => r.passed) ? EXIT.OK : EXIT.BLOCKED;
  }

  for (const report of reports) {
    header(`Gate ${report.sprint.id} — ${report.sprint.name}`);
    console.log(term.gray(report.sprint.question));
    console.log(term.gray(`${report.rulesEvaluated} regras | ${report.documentCount} artefatos | ${summarize(report)}`));
    const visible = flags.quiet
      ? report.findings.filter((f) => f.severity === 'BLOCK')
      : report.findings;
    if (visible.length > 0) printFindings(visible);
    console.log('');
    if (report.passed) {
      console.log(`${term.green('PASSOU')} ${term.gray('— o gate nao encerra a baseline. Art. II exige assinatura humana:')}`);
      console.log(term.gray(`  daia baseline sign ${report.sprint.id} --by "<nome>" --rationale "<razao>"`));
    } else {
      console.log(`${term.red('BLOQUEADO')} ${term.gray(`— ${report.blocking.length} violacao(oes) inegociavel(is)`)}`);
    }
  }
  console.log('');
  return reports.every((r) => r.passed) ? EXIT.OK : EXIT.BLOCKED;
}

function cmdBaseline(root, positional, flags) {
  const [action, sprintArg] = positional;
  const project = kernel.openProject(root);

  if (action === 'list' || !action) {
    const baselines = project.baselines.load();
    header('Baselines');
    for (const sprint of SPRINTS) {
      const b = baselines.get(sprint.id);
      if (!b) {
        console.log(`${term.bold(sprint.id)} ${term.gray('nao encerrada')}`);
        continue;
      }
      const check = project.baselines.verify(sprint.id);
      const state = check.valid ? term.green('valida') : term.yellow('modelo mudou desde a assinatura');
      console.log(`${term.bold(sprint.id)} ${term.green(b.signature.decision)} ${term.gray(`por ${b.signature.signed_by} em ${b.signature.signed_at.slice(0, 10)}`)} ${state}`);
      console.log(term.gray(`     "${b.signature.rationale}"`));
      if (b.signature.declared_debt) {
        for (const d of b.signature.declared_debt) console.log(term.yellow(`     divida: ${d}`));
      }
    }
    console.log('');
    return EXIT.OK;
  }

  if (action === 'sign') {
    if (!sprintArg) {
      console.error(term.red('Informe a sprint: daia baseline sign SP1 --by "<nome>" --rationale "<razao>"'));
      return EXIT.USAGE;
    }
    const sprint = getSprint(sprintArg);
    const baselines = project.baselines.load();
    const report = project.gate.evaluate(sprint.id, { baselines });

    if (!report.passed && !flags.force) {
      console.error(`${term.red('BLOQUEADO')} — o gate ${sprint.id} tem ${report.blocking.length} violacao(oes).`);
      printFindings(report.blocking);
      console.error('');
      console.error(term.gray('Corrija as violacoes, ou use --force para registrar a decisao como divida rastreavel.'));
      return EXIT.BLOCKED;
    }

    const debt = flags.debt ? String(flags.debt).split(';').map((s) => s.trim()).filter(Boolean) : [];
    if (!report.passed && flags.force) {
      for (const f of report.blocking) debt.push(`${f.rule}/${f.id}: ${f.message}`);
    }

    try {
      const baseline = project.baselines.sign(sprint.id, {
        signedBy: flags.by,
        rationale: flags.rationale,
        decision: debt.length > 0 ? 'accepted-with-debt' : (flags.decision || 'accepted'),
        debt,
        gateReport: {
          passed: report.passed,
          blocking: report.blocking.length,
          warnings: report.warnings.length,
          evaluated_at: report.evaluatedAt,
        },
      });
      console.log(term.green(`Baseline ${sprint.id} encerrada.`));
      console.log(`  decisao   ${baseline.signature.decision}`);
      console.log(`  assinante ${baseline.signature.signed_by}`);
      console.log(`  estado    ${term.gray(baseline.state_hash.slice(0, 23))}`);
      if (debt.length > 0) {
        console.log(term.yellow(`  ${debt.length} item(ns) de divida declarada`));
      }
      return EXIT.OK;
    } catch (err) {
      console.error(term.red(err.message));
      return EXIT.USAGE;
    }
  }

  console.error(term.red(`Acao desconhecida: ${action}. Use: list | sign`));
  return EXIT.USAGE;
}

function cmdTrace(root, positional, flags) {
  const project = kernel.openProject(root);
  const target = positional[0];

  if (flags.matrix) {
    const rows = project.trace.matrix();
    header('Matriz de rastreabilidade');
    console.log(term.gray('requisito      tipo             cenario        caracteristica            testes'));
    for (const r of rows) {
      const tests = r.tests.length > 0 ? r.tests.join(',') : term.red('nenhum');
      console.log(
        `${(r.requirement || '').padEnd(14)} ${(r.type || '').padEnd(16)} ` +
        `${(r.scenario || term.red('nenhum')).padEnd(14)} ${(r.characteristic || '-').padEnd(25)} ${tests}`
      );
    }
    console.log('');
    return EXIT.OK;
  }

  if (!target) {
    console.error(term.red('Informe um id: daia trace RNF-latencia   |   daia trace --matrix'));
    return EXIT.USAGE;
  }
  if (!project.store.has(target)) {
    console.error(term.red(`Artefato nao encontrado: ${target}`));
    return EXIT.USAGE;
  }

  const direction = flags.up ? 'up' : 'down';
  const tree = project.trace.chain(target, direction);
  header(`Rastreio ${direction === 'down' ? 'a jusante' : 'a montante'} de ${target}`);
  printTree(tree, '');
  console.log('');
  return EXIT.OK;
}

function printTree(node, prefix) {
  const label = node.label ? term.gray(` ${String(node.label).slice(0, 58)}`) : '';
  console.log(`${prefix}${term.cyan(node.id)} ${term.gray(node.kind || '')}${label}`);
  node.children.forEach((child, i) => {
    const last = i === node.children.length - 1;
    printTree(child, `${prefix}${last ? '  ' : '  '}`);
  });
}

function cmdImpact(root, positional) {
  const target = positional[0];
  if (!target) {
    console.error(term.red('Informe um id: daia impact AD-persistencia'));
    return EXIT.USAGE;
  }
  const project = kernel.openProject(root);
  if (!project.store.has(target)) {
    console.error(term.red(`Artefato nao encontrado: ${target}`));
    return EXIT.USAGE;
  }
  const result = project.trace.impact(target);
  header(`Impacto de mudanca em ${target}`);
  console.log(`afetados      ${result.affected.length}`);
  console.log(`views         ${result.views.join(', ') || term.gray('nenhuma')}`);
  console.log(`decisoes      ${result.decisions.join(', ') || term.gray('nenhuma')}`);
  console.log(`cenarios      ${result.scenarios.join(', ') || term.gray('nenhum')}`);
  console.log(`testes        ${result.tests.join(', ') || term.gray('nenhum')}`);
  if (result.scenarios.length > 0) {
    console.log('');
    console.log(term.yellow('O ATAM reabre apenas sobre os cenarios acima (Art. IX).'));
  }
  console.log('');
  return EXIT.OK;
}

function cmdViewpoints(root, flags) {
  const dir = path.join(__dirname, '..', 'kernel', 'viewpoints');
  if (flags.catalogs) {
    header('Catalogos disponiveis');
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const c = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      console.log(`${term.bold(c.catalog.padEnd(10))} ${c.name} ${c.default ? term.green('(default)') : ''}`);
      console.log(term.gray(`           ${c.standard} | ${c.viewpoints.length} viewpoints`));
    }
    console.log('');
    console.log(term.gray('A ISO 42010 define o metamodelo, nao o conjunto de views. Troque em .daia/config.json.'));
    console.log('');
    return EXIT.OK;
  }

  const project = kernel.openProject(root);
  header(`Catalogo ativo — ${project.store.viewpoints.name}`);
  for (const vp of project.store.viewpoints.index.values()) {
    console.log(`${term.bold(vp.id.padEnd(15))} ${term.gray(`${vp.opens_at} -> ${vp.completes_at}`)}  ${vp.frames_concerns.join(', ')}`);
  }
  console.log('');
  return EXIT.OK;
}

function cmdSquad(root, positional, flags) {
  const { loadSquad } = require('../kernel/squad/squad-loader');
  const { loadSkills, validateAgentSkills } = require('../kernel/skill/skill-loader');
  const squadDir = flags.squad ? path.resolve(String(flags.squad)) : path.join(__dirname, '..', 'squads', 'daia-e');
  const squad = loadSquad(squadDir);
  const skillLibrary = loadSkills(squadDir);
  squad.problems.push(...skillLibrary.problems);
  squad.problems.push(...validateAgentSkills(squad, new Set(skillLibrary.skills.map((skill) => skill.id))));
  const [action] = positional;

  if (action === 'adapt') return cmdSetup(root, flags);

  header(`Squad ${squad.manifest.name} v${squad.manifest.version}`);
  console.log(term.gray(squad.manifest.description));
  console.log('');
  console.log(term.gray('agente      sprint     bok'));
  for (const agent of squad.agents) {
    const fm = agent.frontmatter;
    const mark = agent.problems.length === 0 ? term.green('v') : term.red('x');
    console.log(`${mark} ${String(fm.id).padEnd(10)} ${String(fm.sprint).padEnd(10)} ${fm.bok}`);
    for (const problem of agent.problems) console.log(term.red(`    ${problem}`));
  }
  for (const problem of squad.problems) console.log(term.red(`! ${problem}`));

  const conform = squad.agents.every((a) => a.problems.length === 0) && squad.problems.length === 0;
  console.log('');
  console.log(conform
    ? term.green('Todos os agentes conformes ao contrato de portabilidade (Art. XI).')
    : term.red('Ha violacoes do contrato de agente.'));
  console.log(term.gray('Cole qualquer um destes arquivos num chat e ele funciona. Esse e o teste.'));
  console.log('');
  return conform ? EXIT.OK : EXIT.BLOCKED;
}

function cmdSkills(root, positional, flags) {
  const { loadSkills, syncSkills } = require('../kernel/skill/skill-loader');
  const squadDir = flags.squad ? path.resolve(String(flags.squad)) : path.join(__dirname, '..', 'squads', 'daia-e');
  const library = loadSkills(squadDir);
  const [action, requestedId] = positional;

  if (action === 'sync' || action === 'install') {
    const result = require('../kernel/skill/install').install(root, squadDir, flags.to || 'codex', true, requestedId);
    console.log(JSON.stringify(result, null, 2));
    return EXIT.OK;
  }

  header('Skills DAIA-E');
  for (const skill of library.skills) {
    const valid = skill.problems.length === 0;
    console.log(`${valid ? term.green('v') : term.red('x')} ${term.bold(skill.id.padEnd(38))} ${String(skill.frontmatter.sprint).padEnd(8)} @${skill.frontmatter.agent}`);
    console.log(term.gray(`  ${skill.frontmatter.description}`));
    for (const problem of skill.problems) console.log(term.red(`  ${problem}`));
  }
  for (const problem of library.problems) console.log(term.red(`! ${problem}`));
  console.log('');
  console.log(term.gray('Instale no runtime: daia skills sync --to codex'));
  console.log('');
  return library.skills.every((skill) => skill.problems.length === 0) && library.problems.length === 0
    ? EXIT.OK : EXIT.BLOCKED;
}

function cmdSetup(root, flags) {
  const result = require('../kernel/skill/install').install(root,
    flags.squad ? path.resolve(String(flags.squad)) : path.join(__dirname, '..', 'squads', 'daia-e'),
    flags.to || flags.runtime || 'codex');
  console.log(JSON.stringify(result, null, 2));
  return EXIT.OK;
}

function cmdNext(root, flags) {
  const step = require('../kernel/workflow/workflow').next(kernel.openProject(root));
  if (flags.json) console.log(JSON.stringify(step, null, 2));
  else {
    header(step.sprint ? step.sprint + ' — ' + step.title : step.title);
    console.log('Estado: ' + step.state);
    if (step.skills) console.log('Skills: ' + step.skills.join(', '));
    if (step.inputs) console.log('Entradas: ' + step.inputs.join(', '));
    if (step.outputs) console.log('Entregas: ' + step.outputs.join(', '));
    if (step.command) console.log('Verificacao: ' + step.command);
    if (step.guide) console.log('Guia: ' + step.guide + ' | Schemas: ' + step.schemas);
    if (step.blocking?.length) printFindings(step.blocking);
  }
  return EXIT.OK;
}

function cmdVerify(root, positional) {
  const project = kernel.openProject(root);
  const workflow = require('../kernel/workflow/workflow');
  const sprint = positional[0] || workflow.next(project).sprint;
  if (!sprint) { console.log('Fluxo concluido.'); return EXIT.OK; }
  getSprint(sprint);
  if (['SP3','SP4','SP5'].includes(sprint.toUpperCase())) {
    const results = require('../kernel/verification/runner').verifyTests(project.store);
    for (const result of results) console.log(result.id + ': ' + result.phase);
  }
  const report = project.gate.evaluate(sprint, { baselines: project.baselines.load() });
  workflow.record(project, report);
  printFindings(report.findings);
  console.log(report.passed ? 'Verificado; aguarda decisao humana.' : 'Bloqueado.');
  return report.passed ? EXIT.OK : EXIT.BLOCKED;
}

function cmdDoctor(root) {
  header('daia doctor');
  const checks = [];
  const nodeOk = Number(process.versions.node.split('.')[0]) >= 18;
  checks.push({ ok: nodeOk, label: `Node.js ${process.versions.node}`, hint: 'Requer >= 18' });
  // A ausencia de .daia nao e defeito: este mesmo repositorio e a ferramenta,
  // nao um projeto que a usa. Reportar como informativo, nao como falha.
  const hasDaia = fs.existsSync(path.join(root, '.daia'));
  if (!hasDaia) {
    console.log(`${term.blue('i')} nenhum projeto DAIA-E neste diretorio`);
    console.log(term.gray('  Rode `daia init` para criar um, ou passe --root <projeto>'));
  }

  let project = null;
  if (hasDaia) {
    try {
      project = kernel.openProject(root);
      checks.push({ ok: true, label: `modelo carregado (${project.store.all().length} artefatos)` });
      checks.push({
        ok: project.store.parseErrors.length === 0,
        label: `documentos bem formados (${project.store.parseErrors.length} erro(s))`,
      });
      checks.push({
        ok: project.store.schemaErrors.length === 0,
        label: `documentos validos contra schema (${project.store.schemaErrors.length} erro(s))`,
      });
    } catch (err) {
      checks.push({ ok: false, label: `falha ao carregar modelo: ${err.message}` });
    }
  }
  checks.push({ ok: true, label: `${kernel.RULES.length} regras de correspondencia carregadas` });
  checks.push({ ok: Object.keys(require('../package.json').dependencies || {}).length === 0,
    label: 'zero dependencias externas' });

  for (const c of checks) {
    console.log(`${c.ok ? term.green('v') : term.red('x')} ${c.label}`);
    if (!c.ok && c.hint) console.log(term.gray(`  ${c.hint}`));
  }
  console.log('');
  return checks.every((c) => c.ok) ? EXIT.OK : EXIT.BLOCKED;
}

function cmdRules() {
  header('Regras de correspondencia');
  for (const rule of kernel.RULES) {
    console.log(`${severitySymbol(rule.severity)} ${term.bold(rule.id.padEnd(24))} ${term.gray(`Art. ${rule.article.padEnd(4)} ${rule.sprints.join(',')}`)}`);
    console.log(`   ${rule.title}`);
  }
  console.log('');
  console.log(term.gray('Gate e codigo, nao checklist. Um principio sem gate executavel e aspiracao.'));
  console.log('');
  return EXIT.OK;
}

function usage() {
  console.log(`
${term.bold('daia')} — DAIA-E: Desenvolvimento Assistido por IA Orientado por Especificacao

${term.bold('COMANDOS')}
  init [--catalog rm-odp|4plus1|c4] [--name <nome>]
                            Inicializa o modelo arquitetural em .daia/
  setup [--to codex|portable]
                            Instala agentes e skills no runtime do projeto
  next [--json]             Proxima etapa, skills, entregas e bloqueios
  verify [SP1..SP5]          Executa testes configurados e registra progresso
  validate architecture     Valida descricao e evidencias arquiteturais
  status                    Estado das cinco sprints e das baselines
  gate [SP1..SP5] [--json] [--quiet]
                            Avalia as regras. Exit != 0 quando ha bloqueio.
  baseline list             Lista as baselines e verifica as assinaturas
  baseline sign <SP> --by <nome> --rationale <razao> [--debt "a;b"] [--force]
                            Encerra a baseline com decisao humana registrada
  trace <id> [--up]         Cadeia de rastreabilidade a partir de um artefato
  trace --matrix            Matriz requisito -> cenario -> teste
  impact <id>               O que e afetado por mudanca neste artefato
  viewpoints [--catalogs]   Catalogo ativo, ou catalogos disponiveis
  squad [adapt --to <alvo>] Lista a squad, ou projeta os agentes para um runtime
  skills [sync [id] --to <runtime>]
                            Lista skills ou exporta para Codex/portable
  rules                     Regras de correspondencia e artigos que as sustentam
  doctor                    Diagnostico do ambiente e do modelo

${term.bold('ARTIGOS INEGOCIAVEIS')}
  I    CLI First                       VII   Architectural Description (ISO 42010)
  II   Human Decision Authority        VIII  Specification Before Generation
  III  Baseline-Driven Development     XI    Squad-First Portability

${term.gray('Nenhuma baseline e encerrada sem decisao humana registrada.')}
`);
  return EXIT.USAGE;
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [command, ...rest] = positional;
  const root = flags.root ? path.resolve(String(flags.root)) : command === 'init' && rest[0] ? path.resolve(rest[0]) : process.cwd();

  if (flags.help || command === 'help') { usage(); return EXIT.OK; }
  if (flags.version) {
    console.log(kernel.VERSION);
    return EXIT.OK;
  }

  if (!command) return usage();
  const needsProject = ['status', 'gate', 'baseline', 'trace', 'impact', 'next', 'verify', 'validate'];
  if (needsProject.includes(command) && !fs.existsSync(path.join(root, '.daia'))) {
    console.error(term.red('Nenhum projeto DAIA-E aqui.'));
    console.error(term.gray('Rode: daia init'));
    return EXIT.USAGE;
  }

  switch (command) {
    case 'init': return cmdInit(root, flags);
    case 'setup': return cmdSetup(root, flags);
    case 'next': return cmdNext(root, flags);
    case 'verify': return cmdVerify(root, rest);
    case 'validate':
      if (rest[0] !== 'architecture') throw new Error('Use daia validate architecture');
      return cmdGate(root, ['SP3'], flags);
    case 'status': return cmdStatus(root);
    case 'gate': return cmdGate(root, rest, flags);
    case 'baseline': return cmdBaseline(root, rest, flags);
    case 'trace': return cmdTrace(root, rest, flags);
    case 'impact': return cmdImpact(root, rest);
    case 'viewpoints': return cmdViewpoints(root, flags);
    case 'squad': return cmdSquad(root, rest, flags);
    case 'skills': return cmdSkills(root, rest, flags);
    case 'rules': return cmdRules();
    case 'doctor': return cmdDoctor(root);
    default:
      console.error(term.red(`Comando desconhecido: ${command}`));
      return usage();
  }
}

main().then(code => { process.exitCode = code; }).catch(err => {
  console.error(term.red('Erro: ' + err.message));
  if (process.env.DAIA_DEBUG) console.error(err.stack);
  process.exitCode = EXIT.ERROR;
});
