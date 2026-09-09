'use strict';

const { refsOf } = require('../rules/correspondence-rules');

/**
 * Motor de rastreabilidade.
 *
 * Art. IV: a cadeia necessidade -> requisito do sistema -> requisito de
 * software -> decisao arquitetural DEVE permanecer navegavel. Navegavel
 * significa nos dois sentidos: de um driver ate o teste que o verifica, e
 * de um teste de volta ate a razao de negocio que o justifica.
 */
class TraceabilityEngine {
  constructor(store) {
    this.store = store;
    this.forward = new Map();
    this.backward = new Map();
    this.build();
  }

  build() {
    for (const doc of this.store.all()) {
      if (!this.forward.has(doc.id)) this.forward.set(doc.id, new Set());
      for (const { ref } of refsOf(doc)) {
        if (!ref) continue;
        this.forward.get(doc.id).add(ref);
        if (!this.backward.has(ref)) this.backward.set(ref, new Set());
        this.backward.get(ref).add(doc.id);
      }
    }
  }

  /** Quem este documento referencia. */
  upstream(id) {
    return [...(this.forward.get(id) || [])].sort();
  }

  /** Quem referencia este documento. */
  downstream(id) {
    return [...(this.backward.get(id) || [])].sort();
  }

  /**
   * Cadeia completa a partir de um id, em profundidade, no sentido pedido.
   * Ciclos sao cortados — o grafo deveria ser aciclico, mas nao se assume.
   */
  chain(id, direction = 'down', depth = 0, seen = new Set()) {
    if (seen.has(id) || depth > 12) return { id, truncated: true, children: [] };
    seen.add(id);
    const next = direction === 'down' ? this.downstream(id) : this.upstream(id);
    const doc = this.store.get(id);
    return {
      id,
      kind: doc ? doc.kind : 'AUSENTE',
      label: doc ? (doc.statement || doc.title || doc.name || '') : 'referencia quebrada',
      children: next.map((n) => this.chain(n, direction, depth + 1, seen)),
    };
  }

  /** Artefatos que nao sao referenciados por ninguem e nao referenciam nada. */
  orphans() {
    return this.store
      .all()
      .filter((d) => this.upstream(d.id).length === 0 && this.downstream(d.id).length === 0)
      .map((d) => d.id);
  }

  /**
   * Matriz de rastreabilidade requisito -> cenario -> teste.
   * E a evidencia que a SP5 exporta.
   */
  matrix() {
    const rows = [];
    for (const req of this.store.all('Requirement')) {
      const scenarios = (req.scenarios || []).map((id) => this.store.get(id)).filter(Boolean);
      if (scenarios.length === 0) {
        // Requisito funcional nao exige cenario de qualidade (Art. V trata de RNF),
        // mas ainda pode ser verificado por contrato de teste direto.
        rows.push({
          requirement: req.id,
          type: req.type,
          scenario: null,
          characteristic: null,
          tests: this.testsVerifying(req.id),
        });
        continue;
      }
      for (const qs of scenarios) {
        rows.push({
          requirement: req.id,
          type: req.type,
          scenario: qs.id,
          characteristic: qs.characteristic,
          tests: this.testsVerifying(qs.id),
        });
      }
    }
    return rows;
  }

  /** Contratos de teste que verificam um artefato. */
  testsVerifying(id) {
    return this.store
      .all('TestContract')
      .filter((tc) => (tc.verifies || []).includes(id))
      .map((tc) => tc.id)
      .sort();
  }

  /**
   * Analise de impacto: dado um id, o que e afetado por mudanca nele.
   * Base do laco de manutencao — o ATAM reabre so nos cenarios afetados.
   */
  impact(id) {
    // O grafo tem duas classes de aresta com sentidos opostos:
    //  - dependencia (traces_to, scenarios, addresses_concerns): aponta do
    //    derivado para a origem, logo o impacto de mudar a origem flui ao contrario;
    //  - efeito (affects_views): aponta do agente para o afetado, e o impacto
    //    segue a propria seta.
    // Percorrer so uma direcao perde metade do alcance real de uma mudanca.
    const affected = new Set();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift();
      const next = [...this.downstream(current)];
      const doc = this.store.get(current);
      if (doc && Array.isArray(doc.affects_views)) next.push(...doc.affects_views);
      for (const dep of next) {
        if (dep !== id && !affected.has(dep)) {
          affected.add(dep);
          queue.push(dep);
        }
      }
    }
    const docs = [...affected].map((x) => this.store.get(x)).filter(Boolean);
    return {
      root: id,
      affected: [...affected].sort(),
      views: docs.filter((d) => d.kind === 'View').map((d) => d.id),
      decisions: docs.filter((d) => d.kind === 'ArchitectureDecision').map((d) => d.id),
      scenarios: docs.filter((d) => d.kind === 'QualityScenario').map((d) => d.id),
      tests: docs.filter((d) => d.kind === 'TestContract').map((d) => d.id),
    };
  }
}

module.exports = { TraceabilityEngine };
