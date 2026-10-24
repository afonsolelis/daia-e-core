---
name: validate-system-evidence
description: Organize the measures by quality characteristic. Compare the business hypothesis with the evidence and the limitations. Use in the SP4 audit and in the SP5 validation.
---

# Validate the system evidence

Keep these three items separate: conformance to the scenario, technical verification and validation of the hypothesis. Do not generalize past the evidence that you collected.

## Result

Make these items in `.daia/evidence/`: one report for each ISO 25010 characteristic, a demonstration script, the measures compared with the thresholds, the verdict on the hypothesis, and the explicit limitations.

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`. Record the result with `daia verify` in the applicable step.

1. Run `daia trace --matrix`. Relate each requirement, scenario, test and measure.
2. Organize the report by characteristic. Do not organize it by file or by component.
3. Declare the characteristics that have no scenario. Declare the negative results.
4. Get the hypothesis from SP1.
5. Classify the hypothesis as confirmed, refuted or `inconclusive`.
6. Run the applicable SP4 and SP5 gates. Show the evidence to the human for a decision.

Do not state causality, superiority or a generalization that the design does not support.
