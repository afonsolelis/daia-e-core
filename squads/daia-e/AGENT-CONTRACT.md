# Contrato de agente DAIA-E

Este documento define o formato dos agentes desta squad. Ele existe porque o
Artigo XI exige que os artefatos executáveis funcionem **independentemente do
runtime que os invoca** — Claude, Codex, Gemini, Grok, um chat web sem
ferramenta alguma, ou um runtime que ainda não existe.

## Regras do formato

1. **Markdown com frontmatter YAML.** Nada além disso.
2. **Sem caminho de IDE.** Nenhuma referência a `.claude/`, `.codex/`, `.cursor/`.
3. **Sem chamada a script.** O agente não executa código para se ativar.
4. **Sem badge de permissão, sem hook, sem handoff de sessão.**
5. **O agente propõe; o kernel decide.** Toda validação é `daia gate`.

O teste do formato é simples: *cole o arquivo num chat qualquer e ele funciona.*
Se precisar de mais alguma coisa para funcionar, o formato foi violado.

## Frontmatter obrigatório

```yaml
id: arch                  # kebab-case, unico na squad
name: Arquiteto           # nome legivel
sprint: SP3               # SP1..SP5, ou "*" para transversal
views: [computational]    # views do catalogo que este agente preenche
bok: SEBoK + ISO 42010    # corpo de conhecimento que o fundamenta
produces: [View, ArchitectureDecision]
gate: sp3                 # gate que valida o trabalho deste agente
```

## Estrutura do corpo

| Seção | Obrigatória | Conteúdo |
|-------|-------------|----------|
| `## Papel` | sim | Uma frase. O que este agente responde. |
| `## Pergunta característica` | sim | A pergunta da sprint, literal |
| `## O que você produz` | sim | Artefatos e onde eles vivem |
| `## O que você não faz` | sim | Fronteira explícita — a quem delegar |
| `## Procedimento` | sim | Passos numerados |
| `## Regras inegociáveis` | sim | Artigos da Constituição que se aplicam |

## Por que a fronteira é obrigatória

Um agente que pode escrever qualquer coisa não responde a preocupação nenhuma.
A seção `## O que você não faz` é o que torna o agente rastreável a uma *view* —
e, portanto, auditável pelo gate.
