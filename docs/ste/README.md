# DAIA-E writing standard (STE)

DAIA-E text is in English. The text follows the principles of ASD-STE100
Simplified Technical English (STE), Issue 9.

This file is the DAIA-E style contract. It is not the ASD-STE100
specification. The specification is available from ASD
(<https://www.asd-ste100.org>). DAIA-E does not copy the STE dictionary. The
word list in [`technical-names.json`](technical-names.json) is the DAIA-E list
of technical names, technical verbs and words to replace.

## Why DAIA-E uses STE

1. The main readers of the squad text are LLM agents. Short and literal
   sentences give fewer interpretations.
2. Many human readers do not speak English as a first language.
3. The kernel vocabulary (View, Viewpoint, Concern, Stakeholder) is English.
   One language for the model and for the text removes translation errors.

## Text categories

Each file has one category. The category sets the rules that apply.

| Category | Files | Rules |
|----------|-------|-------|
| **Procedural** | agent `## Procedure`, skill `## Procedure`, CLI hints, numbered steps in any file | All rules. Maximum 20 words for each sentence. |
| **Descriptive** | agents, skills, contracts, schema descriptions, kernel messages, code comments, constitution rules | All rules. Maximum 25 words for each sentence. |
| **Explanatory** | README, guide, constitution justifications, references | Rules W1–W4 and S2–S5. Maximum 30 words for each sentence. The passive voice is permitted when the agent is not known. |

Code identifiers, JSON keys, enum values, commands, paths, standard names and
quoted titles are not text. The rules do not apply to them.

## Word rules

- **W1 — One word, one meaning.** Use a word with one meaning in all the
  documentation. For example, *baseline* is always the signed state of the
  model, never a "reference point".
- **W2 — Use the technical names.** Use the names in
  `technical-names.json`. Do not use synonyms. Write *requirement*, not
  *need* or *requisite*. Write *finding*, not *issue* or *problem*.
- **W3 — Replace the words in the `replace` list.** For example, write
  *make sure*, not *ensure*; write *use*, not *utilize*.
- **W4 — Do not use contractions.** Write *do not*, not *don't*.
- **W5 — Do not use the -ing form of a verb**, except in a technical name
  (*Process Modelling*) or a quoted title.
- **W6 — Use the verb tenses that follow:** infinitive, imperative, simple
  present, simple past and simple future. Use the past participle only as an
  adjective or in the passive voice.
- **W7 — Do not make noun clusters of more than three words.** Write *the
  hash of the model state*, not *model state hash value*.

## Sentence rules

- **S1 — Keep sentences short.** See the table above.
- **S2 — Write one topic in each sentence.** Write one instruction in each
  procedural sentence, unless the two actions occur at the same time.
- **S3 — Use the active voice** in procedural text. Use the active voice in
  descriptive text when possible.
- **S4 — Use the imperative** for instructions: *Run `daia gate SP1`.*
- **S5 — Put the condition first:** *If the gate blocks, stop.* Not: *Stop
  if the gate blocks.*
- **S6 — Write a maximum of six sentences in a paragraph.** One paragraph has
  one topic.
- **S7 — Use articles** (*a*, *an*, *the*) and the word *that* where they make
  the sentence clear. Do not write in telegraph style.

## Rule words

The constitution and the contracts use these words with one meaning only:

| Word | Meaning |
|------|---------|
| **MUST** | An obligation. The gate or a human review enforces it. |
| **MUST NOT** | A prohibition. |
| **SHOULD** | A recommendation. The gate gives a warning. |
| **CAN** | A permission. |

## Examples

| Do not write | Write |
|--------------|-------|
| Ensure that all requirements are properly traced before proceeding. | Make sure that each requirement has a trace. Then go to the next step. |
| The baseline is closed by the human after review. | The human reviews the baseline. Then the human signs it. |
| Don't generalize from a single instantiation. | Do not generalize from one instantiation. |
| Leveraging the gate output, identify blocking findings. | Read the gate report. Find the blocking findings. |

## Status of this standard

The STE linter is not available yet. A future test will examine the rules
W2–W5, S1 and S6 automatically. Until then, the reviewer examines the text.
