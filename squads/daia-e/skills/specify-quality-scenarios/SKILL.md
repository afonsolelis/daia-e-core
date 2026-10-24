---
name: specify-quality-scenarios
description: Change stakeholder needs into requirements that have a trace. Change quality attributes into measurable quality scenarios with six parts. Use in requirements engineering or when you correct vague NFR.
---

# Specify requirements and quality

Use ISO/IEC 25010 as a vocabulary, not as a mandatory checklist. A scenario without an effective threshold is not a specification yet.

## Result

Make the `Requirement` and `QualityScenario` artifacts in `.daia/model/`. Each NFR MUST point to a scenario with `source`, `stimulus`, `artifact`, `environment`, `response` and `response_measure` (`metric`, `operator`, `threshold`).

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`. Record the result with `daia verify` in the applicable step.

1. Read the business drivers and the concerns that the human signed in SP1.
2. Get the requirements from them. Do not add functions or technologies that nobody asked for.
3. Identify only the quality characteristics that are relevant to the context.
4. Agree on metrics and limits that you can observe with the human.
5. Do not accept "fast", "acceptable" or "TBD" as a measure.
6. Run `daia gate SP2`. Show the gaps to the human.

Do not decide the architecture in this skill. Do not write tests in this skill.
