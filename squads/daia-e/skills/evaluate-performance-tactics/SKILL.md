---
name: evaluate-performance-tactics
description: Evaluate if the decisions for performance scenarios control the resource demand and manage the shared resources (Bass, Clements & Kazman, chapter 8). Use in SP3 and in the SP4 ATAM evaluation when there are scenarios with characteristic performance_efficiency.
---

# Evaluate the performance tactics

Show the gaps and the consequences. Do not select the tactic for the architect.

## Result

In each `ArchitectureDecision` that you evaluate, complete:

- `tactics`: the tactics that the decision applies, in the format `performance/<tactic>`.
- `sensitivity_points` and `tradeoff_points`, with the known trade-offs below.
- `risks`: the gaps that depend on an existing decision.

Tell the human about the scenarios that have no decision. Also tell the human about the decisions that do not state their tactic explicitly.

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`.

1. Select the `QualityScenario` items with `characteristic` `performance_efficiency`. The sub_characteristic is time behaviour, resource utilization or capacity.
2. Also select the `flexibility` scenarios with sub_characteristic scalability.
3. Start with the scenarios that have importance H in the `utility_tree`. If there is no `utility_tree`, evaluate all scenarios and report that they have no priority. If there are no scenarios, do not use this skill.
4. Read the decisions that have each scenario in `traces_to`. A scenario without a decision is a gap for `@arch`. Do not make the decision.
5. Divide the response time into computation time and blocked time. Find which of the two the decision changes.
6. Record in `tactics` only the tactics that the decision text applies explicitly.
7. If the decision names a pattern (for example, cache or load balancer), record its tactic only when the text makes it clear. If you have a doubt, ask `@arch`.
8. If no demand tactic or resource tactic controls the bottleneck that you found, record a gap.
9. Go through the design checklist of §8.3 in its seven categories: allocation of responsibilities, coordination model, data model, mapping among architectural elements, resource management, binding time and choice of technology.
10. In SP4, run `daia impact <AD-id>`. Evaluate again only the listed scenarios.
11. Send the gaps to `@arch`. Record the result with `daia verify` at the applicable step.

## Catalog

**Control resource demand**

| Tactic | Verification question |
|---|---|
| `manage-sampling-rate` | Can the system decrease the sample rate of environmental data streams, with a controlled loss? |
| `limit-event-response` | Does the system limit the events above a maximum rate? Is there a policy for the excess events (discard, log, notify)? |
| `prioritize-events` | Do events have an explicit priority when resources are not sufficient? |
| `reduce-overhead` | Did the decision remove the intermediaries and separations that are not necessary? Are the components that cooperate in the same location? |
| `bound-execution-times` | Do iterative algorithms have a limit of time or of iterations? |
| `increase-resource-efficiency` | Did someone review the algorithms in the critical paths? |

**Manage resources**

| Tactic | Verification question |
|---|---|
| `increase-resources` | Is more resource the most direct way to meet the response measure? What is the cost? |
| `introduce-concurrency` | Does the system process independent streams in different threads or processes? |
| `maintain-multiple-copies-computations` | Are there replicas of the computation, with a load balancer? |
| `maintain-multiple-copies-data` | Is there a cache or a data replication? What is the consistency policy? |
| `bound-queue-sizes` | Do the queues have a maximum size? |
| `schedule-resources` | Does the schedule policy (FIFO, fixed priority, RM/DM, EDF, static) agree with the scenario? |

## Known trade-offs

- Performance against modifiability: co-location and fewer layers decrease latency, but they increase coupling.
- Performance against cost: more resources give a fast result, but they cost much.
- Performance against consistency: caches and replicas need a coherence policy.

## Does not do

- It does not set performance targets. The scenario sets them (`specify-quality-scenarios`).
- It does not recommend a tactic without a scenario that justifies it.
