---
name: evaluate-interoperability-tactics
description: Evaluate if the decisions for interoperability scenarios apply the tactics to locate services and to manage interfaces (Bass, Clements & Kazman, chapter 6). Use in SP3 and in the SP4 ATAM evaluation when there are scenarios with characteristic compatibility.
---

# Evaluate the interoperability tactics

Show the gaps and the consequences. Do not select the tactic for the architect.

## Result

In each `ArchitectureDecision` that you evaluate, complete:

- `tactics`: the tactics that the decision applies, in the format `interoperability/<tactic>`.
- `sensitivity_points` and `tradeoff_points`, with the known trade-offs below.
- `risks`: the gaps that depend on an existing decision.

Tell the human about the scenarios that have no decision. Also tell the human about the decisions that do not state their tactic explicitly.

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`.

1. Select the `QualityScenario` items with `characteristic` `compatibility`. The sub_characteristic is interoperability.
2. Start with the scenarios that have importance H in the `utility_tree`. If there is no `utility_tree`, evaluate all scenarios and report that they have no priority. If there are no scenarios, do not use this skill.
3. Read the decisions that have each scenario in `traces_to`. A scenario without a decision is a gap for `@arch`. Do not make the decision.
4. Record in `tactics` only the tactics that the decision text applies explicitly.
5. If the decision names a pattern (for example, ESB or mediator), record its tactic only when the text makes it clear. If you have a doubt, ask `@arch`.
6. For each integration point of the scenario, answer the verification questions. A tactic that is not there is a gap only when the scenario needs it.
7. Go through the design checklist of §6.3 in its seven categories: allocation of responsibilities, coordination model, data model, mapping among architectural elements, resource management, binding time and choice of technology.
8. In SP4, run `daia impact <AD-id>`. Evaluate again only the listed scenarios.
9. Send the gaps to `@arch`. Record the result with `daia verify` at the applicable step.

## Catalog

| Tactic | Family | Verification question |
|---|---|---|
| `discover-service` | Locate | Does the system find the service through a directory or a registry, and not through a fixed address? |
| `orchestrate` | Manage interfaces | Does an explicit control coordinate the sequence of calls between services? |
| `tailor-interface` | Manage interfaces | Is there a plan for translation, buffers or hidden functions for consumers that are not trusted? |

## Known trade-offs

- Interoperability against performance: intermediaries and translation add latency.
- Interoperability against security: directories and exposed interfaces make the attack surface larger.

## Does not do

- It does not make an integration that is not in the requirements (Art. IV).
- It does not recommend a tactic without a scenario that justifies it.
