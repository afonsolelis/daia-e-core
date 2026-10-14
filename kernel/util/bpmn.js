'use strict';

/**
 * Inspecao estrutural de BPMN 2.0 XML, sem dependencia de parser.
 *
 * Verifica o minimo que a BABOK §10.35 exige de um modelo de processo —
 * evento de disparo, atividades, fluxo e resultado — e extrai os nomes de
 * raias e participantes para confronto com as personas. Nao valida o XML
 * contra o XSD da OMG nem interpreta a semantica do fluxo.
 */

const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const ACTIVITY_TAGS = ['task', 'userTask', 'manualTask', 'serviceTask', 'scriptTask', 'businessRuleTask',
  'sendTask', 'receiveTask', 'subProcess', 'callActivity'];

function count(text, tag) {
  return (text.match(new RegExp(`<(?:[\\w-]+:)?${tag}[\\s>/]`, 'g')) || []).length;
}

function names(text, tag) {
  const out = [];
  const re = new RegExp(`<(?:[\\w-]+:)?${tag}\\b[^>]*?\\bname="([^"]*)"`, 'g');
  for (let m = re.exec(text); m; m = re.exec(text)) out.push(m[1].trim());
  return out;
}

function inspectBpmn(text) {
  const problems = [];
  if (!text.includes(BPMN_NS)) problems.push('namespace BPMN 2.0 ausente');
  if (!count(text, 'process')) problems.push('nenhum <process>');
  if (!count(text, 'startEvent')) problems.push('nenhum evento de inicio');
  if (!count(text, 'endEvent')) problems.push('nenhum evento de fim');
  if (!ACTIVITY_TAGS.some((tag) => count(text, tag))) problems.push('nenhuma atividade');
  if (!count(text, 'sequenceFlow')) problems.push('nenhum fluxo de sequencia');
  return { problems, lanes: [...names(text, 'lane'), ...names(text, 'participant')] };
}

module.exports = { inspectBpmn, BPMN_NS };
