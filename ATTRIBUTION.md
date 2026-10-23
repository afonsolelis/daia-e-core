# Atribuição e Linhagem

O DAIA-E é um trabalho derivado. Esta página registra a cadeia completa, o que foi
preservado e o que foi substituído — exigência do Artigo IV da Constituição
(*Traceability & No Invention*).

## Cadeia de derivação

```
BMad Method (Brian Madison, BMad Code LLC, MIT)
      │  método ágil story-driven para desenvolvimento assistido por IA
      ▼
Synkra AIOX (SynkraAI Inc., MIT) — v5.4.1
      │  framework de orquestração de agentes, CLI First, arquitetura de squads
      ▼
DAIA-E (Afonso Cesar Lelis Brandão, MIT) — este projeto
         método baseline-driven com descrição arquitetural ISO/IEC/IEEE 42010
```

Fork realizado a partir de `SynkraAI/aiox-core@4ef6530f` (v5.4.1, 2026-08-15).

## O que foi preservado do AIOX

| Elemento | Situação |
|----------|----------|
| Artigo I — CLI First | Preservado integralmente, com justificativa acrescentada |
| Artigo VI — Absolute Imports | Preservado |
| Artigo XI — Squad-First Portability | Preservado, com regra de portabilidade acrescentada |
| Conceito de *squad* como unidade modular | Preservado |
| Hierarquia CLI → Observability → UI | Preservada |

## O que foi substituído

| Elemento do AIOX | Substituição no DAIA-E | Razão |
|------------------|------------------------|-------|
| Artigo III — Story-Driven Development | Artigo III — Baseline-Driven Development | O DAIA-E não é ágil: a sprint é unidade de escopo, não de tempo |
| Artigo II — Agent Authority | Artigo II — Human Decision Authority | A autoridade que importa é humana, não distribuída entre agentes |
| Gates documentais (checklists) | Gates executáveis no CLI | Um princípio sem gate executável é aspiração |
| 35 agentes, 204 tasks | Squad DAIA-E de 23 agentes ligados a sprints e *views*, compondo skills | Cada agente responde a uma preocupação rastreável |
| Camada Pro (licenciamento, telemetria) | Removida | Artefato de pesquisa não comporta licenciamento comercial |
| 24 dependências npm | Zero dependências externas | Reprodutibilidade: o kernel roda sem `npm install` |

## Código removido do fork

`pro/`, `packages/`, `bin/`, `scripts/`, `.aiox-core/` (exceto as constituições),
`docs/`, `tests/`, `squads/claude-code-mastery`, `outputs/`, `audits/`,
`governance/`, `compat/` e as projeções de runtime (`.codex/`, `.grok/`,
`.gemini/`, `.antigravity/`, `.cursor/`, `.kimi/`).

Nenhum código do AIOX permanece no DAIA-E além das duas constituições preservadas
em `.daia-core/`, mantidas para efeito de rastreabilidade documental. O kernel,
o CLI e a squad são escritos do zero.

## Agentes derivados do AIOX

Os 12 agentes de `.aiox-core/development/agents/` em
`SynkraAI/aiox-core@4ef6530f` (MIT) têm correspondente na squad. Os textos foram
reescritos no contrato de agente do DAIA-E; o que se aproveitou foi o
conhecimento de cada papel: princípios, fronteiras, procedimentos e armadilhas
comuns. Cada agente derivado termina com uma seção `## Derivação do AIOX` que
registra o que foi preservado, substituído e removido. O mapa fica em
`lineage`, no `squad.json`, e um teste verifica que todo destino existe.

| aiox-core | DAIA-E |
|-----------|--------|
| `aiox-master` | `daia-master` |
| `analyst` | `analyst` |
| `architect` | `arch` |
| `data-engineer` | `data-engineer` |
| `dev` | `dev` |
| `devops` | `devops` |
| `pm` | `pm` |
| `po` | `po` |
| `qa` | `qa` |
| `sm` | `sm` |
| `squad-creator` | `squad-creator` |
| `ux-design-expert` | `ux-design-expert` |

Não foram trazidos: o bloco de ativação (saudação, badges, handoffs), os
comandos com prefixo `*`, as dependências de tasks, templates e scripts, a
integração obrigatória com CodeRabbit e os comandos do AIOX Pro. Todos dependem
de runtime ou de scripts, o que o Artigo XI proíbe.

## Fundamentação do método

O método DAIA-E é adaptado de:

> Brandão, A. C. L., Arakaki, R. & Silva, L. A. (2026). *An RM-ODP Method to
> Model PBL Digital Twins for Supporting Closed-Loop Supervision.* MethodsX
> (no prelo).

## Referências normativas

| Norma | Uso |
|-------|-----|
| ISO/IEC/IEEE 42010:2022 | Metamodelo da descrição arquitetural |
| ISO/IEC 10746 (RM-ODP) | Catálogo de *viewpoints* default |
| ISO/IEC 25010:2023 | Vocabulário de qualidade de produto |
| BABOK, SWEBOK v4, SEBoK | Corpos de conhecimento por sprint |
| QAW / ATAM (SEI) | Confronto arquitetural em ciclo |
