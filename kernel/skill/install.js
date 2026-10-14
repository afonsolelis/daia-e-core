'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { loadSquad } = require('../squad/squad-loader');
const { loadSkills, validateAgentSkills } = require('./skill-loader');
const { projectFile } = require('../util/project-files');

function install(root, squadDir, runtime = 'codex', onlySkills = false, id, dryRun = false) {
  if (!['codex', 'claude', 'portable'].includes(runtime)) throw new Error('Runtime suportado: codex, claude ou portable. Outros runtimes: use exportacao portable.');
  const squad = loadSquad(squadDir);
  const library = loadSkills(squadDir);
  const problems = [...squad.problems, ...library.problems, ...squad.agents.flatMap(a => a.problems),
    ...library.skills.flatMap(s => s.problems), ...validateAgentSkills(squad, new Set(library.skills.map(s => s.id)))];
  if (problems.length) throw new Error(problems.join('\n'));
  if (id && !library.skills.some(s => s.id === id)) throw new Error(`Skill desconhecida: ${id}`);
  const base = runtime === 'codex' ? '.agents/skills' : runtime === 'claude' ? '.claude/skills' : '.daia/export/skills';
  const files = [];
  function collect(source, target) {
    const stat = fs.lstatSync(source);
    if (stat.isSymbolicLink()) throw new Error(`Link simbolico na fonte: ${source}`);
    if (stat.isDirectory()) for (const name of fs.readdirSync(source)) collect(path.join(source, name), `${target}/${name}`);
    else files.push([target, fs.readFileSync(source)]);
  }
  for (const skill of library.skills.filter(s => !id || s.id === id)) collect(skill.dir, `${base}/${skill.id}`);
  if (!onlySkills) for (const agent of squad.agents) collect(agent.file, `.daia/agents/${agent.id}.md`);
  // Preflight the whole operation: never silently overwrite edited or foreign files.
  for (const [relative, content] of files) {
    const destination = projectFile(root, relative);
    if (fs.existsSync(destination) && !fs.readFileSync(destination).equals(content)) {
      throw new Error(`Conflito: ${relative}. Preserve sua versao ou mova-a antes de reinstalar.`);
    }
  }
  for (const [relative, content] of dryRun ? [] : files) {
    const destination = projectFile(root, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (!fs.existsSync(destination)) fs.writeFileSync(destination, content, { flag: 'wx' });
  }
  return { runtime, skills: library.skills.filter(s => !id || s.id === id).length, files: files.length, destination: base };
}
module.exports = { install };
