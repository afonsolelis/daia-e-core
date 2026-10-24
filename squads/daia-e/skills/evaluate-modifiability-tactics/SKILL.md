---
name: evaluate-modifiability-tactics
description: Evaluate if the decisions for change scenarios control module size, cohesion, coupling and binding time (Bass, Clements & Kazman, chapter 7). Use in SP3 and in the SP4 ATAM evaluation when there are scenarios with characteristic maintainability or flexibility.
---

# Evaluate the modifiability tactics

Show the gaps and the consequences. Do not select the tactic for the architect.

## Result

In each `ArchitectureDecision` that you evaluate, complete:

- `tactics`: the tactics that the decision applies, in the format `modifiability/<tactic>`.
- `sensitivity_points` and `tradeoff_points`, with the known trade-offs below.
- `risks`: the gaps that depend on an existing decision.

Tell the human about the scenarios that have no decision. Also tell the human about the decisions that do not state their tactic explicitly.

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`.

1. Select the `QualityScenario` items with `characteristic` `maintainability` or `flexibility`.
2. For `maintainability`, the sub_characteristic is modularity, reusability, analysability or modifiability. For `flexibility`, it is adaptability or replaceability.
3. If a `maintainability` scenario has no sub_characteristic and its stimulus is a change, use this skill.
4. If the stimulus is a test, use `evaluate-testability-tactics`.
5. Start with the scenarios that have importance H in the `utility_tree`. If there is no `utility_tree`, evaluate all scenarios and report that they have no priority. If there are no scenarios, do not use this skill.
6. Read the decisions that have each scenario in `traces_to`. A scenario without a decision is a gap for `@arch`. Do not make the decision.
7. List the probable changes that each scenario describes. They are the criterion for the questions below. Do not predict other changes.
8. Record in `tactics` only the tactics that the decision text applies explicitly.
9. If the decision names a pattern (for example, layers or publish-subscribe), record its tactic only when the text makes it clear. If you have a doubt, ask `@arch`.
10. For each probable change, verify if a tactic stops its propagation. If no tactic stops it, record a gap.
11. Go through the design checklist of §7.3 in its seven categories: allocation of responsibilities, coordination model, data model, mapping among architectural elements, resource management, binding time and choice of technology.
12. In SP4, run `daia impact <AD-id>`. Evaluate again only the listed scenarios.
13. Send the gaps to `@arch`. Record the result with `daia verify` at the applicable step.

## Catalog

**Reduce the size of a module**

| Tactic | Verification question |
|---|---|
| `split-module` | Does a module have responsibilities that change for different reasons? |

**Increase cohesion**

| Tactic | Verification question |
|---|---|
| `increase-semantic-coherence` | Are the responsibilities that the probable changes do not affect in the same module? |

**Reduce coupling**

| Tactic | Verification question |
|---|---|
| `encapsulate` | Does each module have an explicit interface that hides the details that will probably change? |
| `use-intermediary` | Does an intermediary break the direct dependencies between modules that change together? |
| `restrict-dependencies` | Is there a restriction on which module can depend on which module (layers, visibility)? |
| `refactor` | Did the decision factor out the duplication that makes two modules get the same change? |
| `abstract-common-services` | Are almost equal services generalized and parameterized? |

**Defer binding**

| Tactic | Verification question |
|---|---|
| `defer-binding` | Does the system bind values that change frequently at build, deploy, startup or runtime, as the scenario asks? Is there an explicit mechanism (configuration file, plug-in, dynamic registration)? |

## Known trade-offs

- Modifiability against performance: intermediaries and the separation of responsibilities add latency.
- Modifiability against cost: late binding needs a mechanism. The mechanism has value only if the change occurs again.

## Does not do

- It does not predict changes that the scenarios do not describe (Art. IV).
- It does not recommend a tactic without a scenario that justifies it.
