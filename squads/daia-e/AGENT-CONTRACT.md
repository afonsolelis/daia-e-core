# DAIA-E agent contract

This document defines the format of the agents in this squad. Article XI is
the reason for this contract. Executable artifacts MUST work **independently
of the runtime that invokes them**. The runtime can be Claude, Codex, Gemini,
Grok, a web chat with no tools, or a runtime that does not exist yet.

## Format rules

1. **Markdown with YAML frontmatter.** Nothing more.
2. **No IDE paths.** Do not refer to `.claude/`, `.codex/` or `.cursor/`.
3. **No script calls.** The agent does not run code to start.
4. **No permission badges, no hooks, no session handoffs.**
5. **The agent proposes; the kernel decides.** Each validation is `daia gate`.

The test of the format is easy: *paste the file into any chat, and it works.*
If the file needs more to work, the file violates the format.

## Mandatory frontmatter

```yaml
id: arch                  # kebab-case, unique in the squad
name: Architect           # readable name
sprint: SP3               # SP1..SP5, or "*" for a cross-sprint agent
views: [computational]    # catalog views that this agent fills
bok: SEBoK + ISO 42010    # body of knowledge that supports the agent
produces: [View, ArchitectureDecision]
gate: sp3                 # gate that validates the work of this agent
skills: [describe-software-architecture] # canonical skills that the agent uses
```

The skills are in `squads/daia-e/skills/<name>/SKILL.md`. The agent defines
the role and the boundary. The skill defines one capability that agents can
invoke and use again. Before you do the work, load the declared skills. Then
do the procedure. The installed guide in `.daia/guide.md` defines the current
sequence and the current evidence. The role procedures summarize the
responsibilities. For commands and operational checks, follow the skills and
the CLI.

## Body structure

| Section | Mandatory | Content |
|---------|-----------|---------|
| `## Role` | yes | One sentence. The question that this agent answers. |
| `## Key question` | yes | The sprint question, literal |
| `## What you produce` | yes | The artifacts and their locations |
| `## What you do not do` | yes | The explicit boundary, and the agent that gets the delegated work |
| `## Procedure` | yes | Numbered steps |
| `## Mandatory rules` | yes | The articles of the constitution that apply |

## Why the boundary is mandatory

An agent that can write anything does not answer a concern.
The `## What you do not do` section connects the agent to a *view* with a
trace. Thus, the gate can audit the agent.
