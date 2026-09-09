'use strict';

/**
 * Saída de terminal sem dependência externa.
 * Respeita NO_COLOR e ausência de TTY (Art. I — o CLI é a fonte da verdade,
 * e precisa funcionar em CI tanto quanto no terminal interativo).
 */

const ENABLED = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

const CODES = {
  reset: 0,
  bold: 1,
  dim: 2,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  gray: 90,
};

function paint(name, text) {
  if (!ENABLED) return String(text);
  return `\x1b[${CODES[name]}m${text}\x1b[${CODES.reset}m`;
}

const term = {
  bold: (t) => paint('bold', t),
  dim: (t) => paint('dim', t),
  red: (t) => paint('red', t),
  green: (t) => paint('green', t),
  yellow: (t) => paint('yellow', t),
  blue: (t) => paint('blue', t),
  cyan: (t) => paint('cyan', t),
  gray: (t) => paint('gray', t),
};

const SYMBOLS = {
  block: term.red('x'),
  warn: term.yellow('!'),
  info: term.blue('i'),
  ok: term.green('v'),
  arrow: term.gray('->'),
};

function severitySymbol(severity) {
  if (severity === 'BLOCK') return SYMBOLS.block;
  if (severity === 'WARN') return SYMBOLS.warn;
  return SYMBOLS.info;
}

module.exports = { term, SYMBOLS, severitySymbol, ENABLED };
