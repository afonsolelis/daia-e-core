---
name: evaluate-testability-tactics
description: Evaluate if the decisions for testability scenarios control and observe the system state and limit its complexity (Bass, Clements & Kazman, chapter 10). Use in SP3 and in the SP4 ATAM evaluation when there are scenarios with characteristic maintainability and sub_characteristic testability.
---

# Evaluate the testability tactics

Show the gaps and the consequences. Do not select the tactic for the architect.

## Result

In each `ArchitectureDecision` that you evaluate, complete:

- `tactics`: the tactics that the decision applies, in the format `testability/<tactic>`.
- `sensitivity_points` and `tradeoff_points`, with the known trade-offs below.
- `risks`: the gaps that depend on an existing decision.

Tell the human about the scenarios that have no decision. Also tell the human about the decisions that do not state their tactic explicitly.

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`.

1. Select the `QualityScenario` items with `characteristic` `maintainability` and sub_characteristic testability.
2. If a `maintainability` scenario has no sub_characteristic and its stimulus is a test, use this skill.
3. If the stimulus is a change, use `evaluate-modifiability-tactics`.
4. Start with the scenarios that have importance H in the `utility_tree`. If there is no `utility_tree`, evaluate all scenarios and report that they have no priority. If there are no scenarios, do not use this skill.
5. Read the decisions that have each scenario in `traces_to`. A scenario without a decision is a gap for `@arch`. Do not make the decision.
6. For each component under test, ask this question: can I put it in an arbitrary state and observe the result?
7. Record in `tactics` only the tactics that the decision text applies explicitly.
8. If the decision names a mechanism (for example, dependency injection), record its tactic only when the text makes it clear. If you have a doubt, ask `@arch`.
9. If no tactic controls and observes the component, record a gap.
10. Go through the design checklist of §10.3 in its seven categories: allocation of responsibilities, coordination model, data model, mapping among architectural elements, resource management, binding time and choice of technology.
11. In SP4, run `daia impact <AD-id>`. Evaluate again only the listed scenarios.
12. Send the gaps to `@arch`. Record the result with `daia verify` at the applicable step.

## Catalog

**Control and observe the system state**

| Tactic | Verification question |
|---|---|
| `specialized-interfaces` | Are there separate test interfaces to read, write, reset and report the state? |
| `record-playback` | Can the system record the inputs that cross an interface and replay them after a failure? |
| `localize-state-storage` | Is the state in one location, and can a test set it to any value? |
| `abstract-data-sources` | Does the data come from abstract interfaces that a test can replace with test sources? |
| `sandbox` | Is there an isolated instance, with virtualization of the clock, the network and the resources? |
| `executable-assertions` | Does the system verify critical invariants, preconditions and postconditions at runtime? |

**Limit complexity**

| Tactic | Verification question |
|---|---|
| `limit-structural-complexity` | Are there cyclic dependencies, deep hierarchies or external dependencies that are not isolated? |
| `limit-nondeterminism` | Can the decision remove unrestricted parallelism or other sources of nondeterminism? Where it cannot, is there record/playback? |

## Known trade-offs

- Testability against performance: test interfaces and test instrumentation cost cycles.
- Testability against security: test interfaces in production make the attack surface larger.
- Testability against fidelity: in critical systems, production code with test code is different from the tested code.

## Does not do

- It does not write tests. The skill `write-executable-specification` writes them.
- It does not recommend a tactic without a scenario that justifies it.
