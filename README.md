# DAIA-E

> **D**esenvolvimento **A**ssistido por **I**nteligência **A**rtificial Orientado por **E**specificação

Orquestração de agentes para criação e manutenção de software, com descrição
arquitetural segundo a **ISO/IEC/IEEE 42010:2022** e **gates executáveis** por
baseline.

[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![Licença](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Dependências](https://img.shields.io/badge/depend%C3%AAncias-0-blue.svg)](package.json)

---

## A ideia em uma frase

Frameworks de agente entregam sugestões; o DAIA-E entrega um **gate que recusa**.

```console
$ daia gate SP3

x AD-ALTERNATIVE (Art. IX)
   AD-persistencia decisao sem alternativa considerada
   O LLM converge para solucoes convencionais sem explicitar que outras existiam.

BLOQUEADO — 1 violacao(oes) inegociavel(is)
$ echo $?
1
```

Isso não é um aviso. É `exit 1`, e ele para o pipeline.

## Por que existe

O código gerado por LLM costuma ser sintaticamente correto e desalinhado dos
requisitos não funcionais. A causa não é o modelo — é a ausência de
especificação à qual confrontá-lo. O DAIA-E organiza o desenvolvimento em cinco
sprints, entendidas como **unidades de delimitação de escopo e não de tempo**,
cada uma encerrada por uma baseline que **só o humano assina**.

| Sprint | Pergunta característica | Corpo de conhecimento |
|--------|------------------------|----------------------|
| **SP1 — NEG** | Por que o sistema deve existir e para quem? | BABOK |
| **SP2 — REQ** | O que precisa fazer e com que qualidade? | SWEBOK + ISO/IEC 25010:2023 |
| **SP3 — ST** | Como será estruturado e por quê? | SEBoK + ISO 42010 + RM-ODP |
| **SP4 — IMPL** | A estrutura se sustenta na prática? | SWEBOK (Construção, Testes, Qualidade) |
| **SP5 — DEMO** | A hipótese inicial se confirma? | SEBoK (V&V) |

Atravessando a progressão, o confronto arquitetural opera **em ciclo**:
QAW entre SP2 e SP3 → ATAM na SP3 → laço de reavaliação na SP4.

## Instalação

```bash
npx @daia-e/core init meu-projeto
```

Ou direto do repositório — **não há `npm install`**, porque não há dependências:

```bash
git clone https://github.com/afonsolelis/daia-e-core.git
node daia-e-core/bin/daia.js --help
```

## Uso

```bash
daia init                      # inicializa .daia/ com o metamodelo
daia status                    # onde você está nas cinco sprints
daia gate SP3                  # avalia; exit != 0 quando bloqueia
daia baseline sign SP3 --by "Nome" --rationale "por que aceito"
daia trace TC-suite --up       # do teste até a razão de negócio
daia trace --matrix            # requisito → cenário → teste
daia impact AD-cep             # o que muda se esta decisão mudar
daia squad                     # os 11 agentes e suas views
daia rules                     # as 19 regras e os artigos que as sustentam
```

## O metamodelo

A ISO 42010 define um **metamodelo** — e um metamodelo é, literalmente, um
schema. O kernel o implementa como JSON Schema validado:

```
Stakeholder ──sustenta──> Concern <──endereça── View ──segue──> Viewpoint
                              ▲                   │
                              │                   ├── modelo estático  (obrigatório na SP3)
                        ArchitectureDecision      └── modelo dinâmico  (obrigatório na SP3)
                              │
                        ≥1 alternativa preterida + critério
```

O ponto decisivo: **a norma exige correspondência entre views, e correspondência
verificável é lint.** As 19 regras não são convenções de projeto — são a norma
tornada executável.

| Regra | Artigo | Severidade |
|-------|--------|-----------|
| Toda `Concern` é endereçada por ≥1 `View` | VII | BLOCK |
| Toda `View` declara stakeholders identificados | VII | BLOCK |
| Todo `AD` registra ≥1 alternativa preterida e o critério | IX | BLOCK |
| Todo RNF tem cenário de seis partes com medida efetiva | V | BLOCK |
| Todo cenário é verificado por teste executável | V | BLOCK |
| SP3 exige modelagem estática **e** dinâmica | VIII | BLOCK |
| Testes em vermelho antes da geração; verdes na SP4 | VIII | BLOCK |
| Nenhuma baseline fecha sem assinatura humana | II | BLOCK |

`daia rules` lista as 19.

## Viewpoints plugáveis

A 42010 **não prescreve quais views devem existir** — isso é decisão de projeto.
O kernel implementa o metamodelo; o catálogo é carregável:

```bash
daia viewpoints --catalogs
```

| Catálogo | Origem | Views |
|----------|--------|-------|
| `rm-odp` *(default)* | ISO/IEC 10746 | enterprise, information, computational, engineering, technology |
| `4plus1` | Kruchten, 1995 | logical, process, development, physical, scenarios |
| `c4` | c4model.com | context, container, component, code |

## A squad

11 agentes, cada um ligado a uma *view* e a um corpo de conhecimento:

| Agente | Sprint | View | BoK |
|--------|--------|------|-----|
| `analyst` | SP1 | Enterprise | BABOK · IDEF0 |
| `po` | SP2 | Information | SWEBOK · ISO 25010 |
| `qaw` | SP2↔SP3 | *utility tree* | QAW |
| `arch` | SP3 | Computational · Engineering | SEBoK · 42010 · RM-ODP |
| `atam` | SP3, SP4 | sensibilidade e tradeoff | ATAM |
| `spec` · `test` | SP3 | contratos · testes em vermelho | SWEBOK |
| `dev` | SP4 | Technology | SWEBOK — Construção |
| `audit` | SP4 | relatório por característica | SWEBOK — Qualidade |
| `val` | SP5 | evidências e limitações | SEBoK — V&V |
| `rec` | ⊥ | baselines e assinatura humana | — |

**Os agentes são markdown + YAML puro.** Sem caminho de IDE, sem chamada a
script, sem diretiva de runtime. O teste de portabilidade é literal: *cole o
arquivo num chat qualquer e ele funciona.* O `daia squad` verifica essa
propriedade em vez de confiar nela.

O gate mora no CLI, não no agente. Consequência: **mesmo conduzindo o método por
copiar-e-colar num chat web sem ferramenta alguma, `daia gate` continua sendo a
autoridade.** O enforcement não depende do LLM.

## Manutenção de software existente

Para software que já existe, o fluxo inverte — a descrição arquitetural precisa
ser recuperada antes de ser alterada:

```bash
daia impact AD-persistencia    # o que esta mudança alcança
```

O ATAM reabre **apenas sobre os cenários que o comando listou**. Reavaliar tudo
a cada mudança torna o laço inútil por custo.

## Exemplo completo

`examples/pblrepositorymetrics/` traz o estudo de caso do artigo modelado no
metamodelo e levado de SP1 a SP5, com as cinco baselines assinadas:

```bash
daia status --root examples/pblrepositorymetrics
daia trace --matrix --root examples/pblrepositorymetrics
```

## Arquitetura do projeto

```
kernel/           zero dependências, roda sem npm install
├── schemas/      11 JSON Schemas do metamodelo
├── validator/    validador de JSON Schema próprio
├── store/        carga do grafo; hash canônico escopado por sprint
├── rules/        19 regras de correspondência
├── gate/         motor de gates SP1..SP5
├── baseline/     assinatura humana — não existe signAsAgent
├── trace/        rastreabilidade, matriz e impacto
├── squad/        carregador e validador de portabilidade
└── viewpoints/   catálogos plugáveis
bin/daia.js       CLI
squads/daia-e/    11 agentes portáteis
```

O kernel **não chama modelo de linguagem**. Ele carrega, valida, avalia e
registra. Os agentes propõem; o kernel aceita ou recusa. Essa separação é o que
torna o método auditável — e o kernel, citável.

## Testes

```bash
npm test          # 39 casos, node:test nativo
```

Incluindo verificação executável do Artigo II: assinatura sem identificação
humana é recusada, sem justificativa é recusada, e **não existe caminho de
assinatura por agente**.

## Constituição

Doze artigos em [`.daia-core/constitution.md`](.daia-core/constitution.md).
Os inegociáveis:

| | |
|---|---|
| **I** | CLI First |
| **II** | Human Decision Authority |
| **III** | Baseline-Driven Development |
| **VII** | Architectural Description (ISO 42010) |
| **VIII** | Specification Before Generation |
| **XI** | Squad-First Portability |

> Gate é código, não checklist. Um princípio sem gate executável é aspiração,
> não constituição.

## Fundamentação

> Brandão, A. C. L., Arakaki, R. & Silva, L. A. (2026). *Especificação antes da
> Geração: um Método para Desenvolvimento de Software Assistido por IA com
> Avaliação Arquitetural em Ciclo.* Revista Brasileira de Informática na Educação.

## Licença e linhagem

MIT. Trabalho derivado do [Synkra AIOX](https://github.com/SynkraAI/aiox-core),
que deriva do [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD).
A cadeia completa, o que foi preservado e o que foi substituído estão em
[ATTRIBUTION.md](ATTRIBUTION.md).

Não afiliado a SynkraAI Inc., ao BMad Method ou à BMad Code, LLC.
