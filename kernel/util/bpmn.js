'use strict';

/**
 * Structural inspection of BPMN 2.0 XML, with no parser dependency.
 *
 * Verifies the minimum that BABOK §10.35 asks of a process model: a trigger
 * event, activities, flow and an outcome. Extracts the names of lanes and
 * participants to compare them with the personas. It does not validate the
 * XML against the OMG XSD. It does not interpret the semantics of the flow.
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
  if (!text.includes(BPMN_NS)) problems.push('the BPMN 2.0 namespace is missing');
  if (!count(text, 'process')) problems.push('no <process>');
  if (!count(text, 'startEvent')) problems.push('no start event');
  if (!count(text, 'endEvent')) problems.push('no end event');
  if (!ACTIVITY_TAGS.some((tag) => count(text, tag))) problems.push('no activity');
  if (!count(text, 'sequenceFlow')) problems.push('no sequence flow');
  return { problems, lanes: [...names(text, 'lane'), ...names(text, 'participant')] };
}

module.exports = { inspectBpmn, BPMN_NS };
