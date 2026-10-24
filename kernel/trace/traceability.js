'use strict';

const { refsOf } = require('../rules/correspondence-rules');

/**
 * Traceability engine.
 *
 * Art. IV: the chain need -> system requirement -> software requirement ->
 * architecture decision MUST stay navigable. Navigable means in the two
 * directions: from a driver to the test that verifies it, and from a test
 * back to the business reason for it.
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

  /** The documents that this document refers to. */
  upstream(id) {
    return [...(this.forward.get(id) || [])].sort();
  }

  /** The documents that refer to this document. */
  downstream(id) {
    return [...(this.backward.get(id) || [])].sort();
  }

  /**
   * The full chain from an id, depth first, in the given direction.
   * The engine cuts cycles. The graph must be acyclic, but the engine does not accept that as true.
   */
  chain(id, direction = 'down', depth = 0, seen = new Set()) {
    if (seen.has(id) || depth > 12) return { id, truncated: true, children: [] };
    seen.add(id);
    const next = direction === 'down' ? this.downstream(id) : this.upstream(id);
    const doc = this.store.get(id);
    return {
      id,
      kind: doc ? doc.kind : 'MISSING',
      label: doc ? (doc.statement || doc.title || doc.name || '') : 'broken reference',
      children: next.map((n) => this.chain(n, direction, depth + 1, seen)),
    };
  }

  /** The artifacts that no document refers to and that refer to no document. */
  orphans() {
    return this.store
      .all()
      .filter((d) => this.upstream(d.id).length === 0 && this.downstream(d.id).length === 0)
      .map((d) => d.id);
  }

  /**
   * The traceability matrix requirement -> scenario -> test.
   * SP5 exports it as evidence.
   */
  matrix() {
    const rows = [];
    for (const req of this.store.all('Requirement')) {
      const scenarios = (req.scenarios || []).map((id) => this.store.get(id)).filter(Boolean);
      if (scenarios.length === 0) {
        // A functional requirement does not need a quality scenario (Art. V is about NFR).
        // A test contract can still verify it directly.
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

  /** The test contracts that verify an artifact. */
  testsVerifying(id) {
    return this.store
      .all('TestContract')
      .filter((tc) => (tc.verifies || []).includes(id))
      .map((tc) => tc.id)
      .sort();
  }

  /**
   * Impact analysis: for an id, find what a change to it affects.
   * This is the base of the maintenance loop. ATAM opens again only for the affected scenarios.
   */
  impact(id) {
    // The graph has two classes of edge with opposite directions:
    //  - dependency (traces_to, scenarios, addresses_concerns): it points from
    //    the derived artifact to the origin. A change to the origin has an impact in the opposite direction;
    //  - effect (affects_views): it points from the cause to the affected artifact.
    //    The impact goes in the direction of the arrow.
    // If the search goes in one direction only, it loses half of the real range of a change.
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
