# Contrato de skill DAIA-E

Skills são capacidades pequenas e invocáveis. Agentes compõem skills; o kernel
continua sendo a autoridade mecânica dos gates.

## Estrutura

```text
skills/<nome-kebab-case>/
├── SKILL.md
├── references/   # apenas quando houver detalhe carregado sob demanda
├── scripts/      # apenas para automação determinística reutilizável
└── assets/       # apenas para material copiado à saída
```

O `SKILL.md` usa o frontmatter portátil com `name` e `description`, além das
seções `## Resultado` e `## Fluxo`. `sprint`, `agent` e `gate` ficam no
`squad.json`, pois são metadados do método, não campos do padrão de skills. A
descrição deve permitir descoberta automática e dizer quando a capacidade se aplica.

## Separação de responsabilidades

- Skill: procedimento reutilizável e resultado observável.
- Agente: papel, autoridade, fronteiras e composição de skills.
- Kernel: schemas, rastreabilidade, gates e baselines.
- Runtime: skills em `.agents/skills/` (Codex) ou `.claude/skills/` (Claude); exportação manual em `.daia/export/skills/`.

Edite somente a fonte em `squads/daia-e/`. Use `daia skills sync --to <runtime>`
para regenerar projeções.
