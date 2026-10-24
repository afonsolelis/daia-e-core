# DAIA-E skill contract

Skills are small capabilities that agents can invoke. Agents use skills. The
kernel stays the mechanical authority of the gates.

## Structure

```text
skills/<kebab-case-name>/
├── SKILL.md
├── references/   # only for detail that the agent loads on demand
├── scripts/      # only for deterministic automation that skills use again
└── assets/       # only for material that the skill copies to the output
```

The `SKILL.md` file uses the portable frontmatter with `name` and
`description`. It also has the sections `## Result` and `## Procedure`. The
fields `sprint`, `agent` and `gate` are in `squad.json`. These fields are
method metadata, not fields of the skill standard. The description MUST let a
runtime find the skill automatically. It MUST tell when the capability applies.

## Separation of responsibilities

- Skill: a procedure that agents can use again, and a result that you can observe.
- Agent: the role, the authority, the boundaries and the skills that the agent uses.
- Kernel: the schemas, the traceability, the gates and the baselines.
- Runtime: skills in `.agents/skills/` (Codex) or `.claude/skills/` (Claude); manual export in `.daia/export/skills/`.

Edit only the source in `squads/daia-e/`. To make the projections again, use
`daia skills sync --to <runtime>`.
