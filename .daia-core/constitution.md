# DAIA-E Constitution

> **Version:** 1.0.0 | **Ratified:** 2026-09-09
> **Derivada de:** Synkra AIOX Constitution v1.1.0 (MIT) — que por sua vez deriva do BMad Method
> **Método de referência:** Brandão, A. C. L., Arakaki, R. & Silva, L. A. (2026). *Especificação antes da Geração: um Método para Desenvolvimento de Software Assistido por IA com Avaliação Arquitetural em Ciclo.* RBIE.

Este documento define os princípios inegociáveis do **DAIA-E** — *Desenvolvimento Assistido por Inteligência Artificial Orientado por Especificação*. Todos os agentes, tasks e workflows DEVEM respeitar estes princípios. Violações são bloqueadas por gates executáveis no CLI, nunca por checklist documental.

---

## Derivação em relação ao AIOX

O DAIA-E não rompe com o AIOX: ele preserva o que é neutro quanto ao método e substitui o que é específico do desenvolvimento ágil *story-driven*.

| Artigo | Origem | Situação |
|--------|--------|----------|
| I — CLI First | AIOX I | **Preservado** integralmente |
| II — Human Decision Authority | AIOX II (Agent Authority) | **Refundado** — a autoridade migra do agente para o humano |
| III — Baseline-Driven Development | AIOX III (Story-Driven) | **Substituído** — a unidade é a baseline, não a story |
| IV — Traceability & No Invention | AIOX IV | **Preservado e expandido** |
| V — Quality as Specified Scenario | AIOX V (Quality First) | **Expandido** — acrescenta ISO/IEC 25010:2023 |
| VI — Absolute Imports | AIOX VI | **Preservado** (regra técnica, neutra quanto ao método) |
| VII — Architectural Description | — | **Novo** (ISO/IEC/IEEE 42010:2022) |
| VIII — Specification Before Generation | — | **Novo** (tese central do método) |
| IX — Recorded Alternative | — | **Novo** (análise de alternativas, SEBoK) |
| X — Body of Knowledge Anchoring | — | **Novo** (BABOK, SWEBOK, SEBoK) |
| XI — Squad-First Portability | AIOX XI | **Preservado** integralmente |
| XII — Model Governance | AIOX XII | **Adaptado** — *story binding* passa a *baseline binding* |

---

## Core Principles

### I. CLI First (NON-NEGOTIABLE)

O CLI é a fonte da verdade onde toda execução, validação e automação vivem.

**Regras:**
- MUST: Toda funcionalidade nova DEVE funcionar 100% via CLI antes de qualquer UI
- MUST: Dashboards apenas observam, NUNCA controlam ou tomam decisões
- MUST: A UI NUNCA é requisito para operação do sistema
- MUST: **Todo gate DEVE ser executável pelo CLI**, sem depender de hooks de nenhuma IDE

**Justificativa acrescentada pelo DAIA-E:** a paridade de hooks entre IDEs é desigual — Cursor e GitHub Copilot não possuem *lifecycle hooks* equivalentes. Um gate ancorado em hook seria inaplicável em metade dos ambientes. O gate no CLI é a única forma de o método valer independentemente do runtime, inclusive quando conduzido por um LLM sem ferramenta alguma.

**Gate:** `daia gate` — BLOCK

---

### II. Human Decision Authority (NON-NEGOTIABLE)

A IA generativa assiste à produção de artefatos em **todas** as sprints. O que preserva o caráter deliberado das decisões não é restringir a participação da IA a um momento, e sim exigir decisão humana registrada no encerramento de cada baseline.

**Regras:**
- MUST: Nenhuma baseline é encerrada sem decisão humana registrada e assinada
- MUST: A assinatura registra quem decidiu, quando, e sobre qual estado do modelo (hash)
- MUST NOT: Nenhum agente pode encerrar baseline, assinar por humano ou inferir aprovação de silêncio
- MUST: A IA PODE redigir, propor e sugerir qualquer artefato, inclusive os direcionadores de negócio
- MUST: Agentes DEVEM delegar quando fora de seu escopo de *view*

**Distinção em relação ao AIOX:** o AIOX concentra autoridades em agentes (`git push` é exclusivo de `@devops`). No DAIA-E a autoridade que importa não é distribuída entre agentes — é retida pelo humano, e incide sobre o encerramento de baseline.

**Gate:** `daia baseline sign` — BLOCK

---

### III. Baseline-Driven Development (NON-NEGOTIABLE)

O desenvolvimento organiza-se em cinco sprints, entendidas como **unidades de delimitação de escopo e não de tempo**, cada uma encerrada por uma baseline.

| Sprint | Pergunta característica | Baseline de encerramento |
|--------|------------------------|--------------------------|
| **SP1 — NEG** | Por que o sistema deve existir e para quem? | Modelo de negócio: decomposição IDEF0, direcionadores, mapa de stakeholders, hipótese |
| **SP2 — REQ** | O que o sistema precisa fazer e com que qualidade? | Requisitos: RF, RNF como cenários de seis partes, matriz de rastreabilidade |
| **SP3 — ST** | Como o sistema será estruturado e por quê? | Arquitetural: especificação técnica, esqueleto, documentos de especificação, testes em fase vermelha |
| **SP4 — IMPL** | A estrutura decidida se sustenta na prática? | Executável: código, testes em fase verde, relatório de qualidade por característica |
| **SP5 — DEMO** | A hipótese inicial se confirma? | Release demonstrável: roteiro, evidências, métricas e limitações declaradas |

**Regras:**
- MUST: Nenhum artefato de uma sprint é produzido antes de a baseline anterior estar encerrada
- MUST: Toda baseline registra o estado do modelo no momento do encerramento
- MUST NOT: Sprint NÃO é unidade de tempo — prazo não encerra baseline
- MUST NOT: Nenhum código de produto é escrito antes da baseline SP3

**Substituição explícita:** o DAIA-E **não é** *story-driven*. Não há exigência de story associada a código. A unidade de rastreabilidade é a cadeia necessidade → requisito → decisão arquitetural → teste, não o cartão de backlog.

**Gate:** `daia gate sp{1..5}` — BLOCK

---

### IV. Traceability & No Invention (MUST)

Especificações não inventam — apenas derivam. E toda derivação é rastreável em ambos os sentidos.

**Regras:**
- MUST: Todo statement de especificação DEVE rastrear para um requisito funcional (RF-*), um requisito não funcional (RNF-*), uma restrição (CON-*) ou um direcionador de negócio (BD-*) verificado
- MUST: A cadeia necessidade → requisito do sistema → requisito de software → decisão arquitetural DEVE permanecer navegável
- MUST NOT: Adicionar funcionalidades ausentes dos requisitos
- MUST NOT: Assumir detalhes de implementação não pesquisados ou especificar tecnologias não validadas
- MUST: Toda `Concern` identificada DEVE ser endereçada por ao menos uma `View`

**Justificativa acrescentada:** no desenvolvimento assistido por LLM a invenção não é acidental — o modelo preenche lacunas por padrão estatístico. A rastreabilidade bidirecional é o que torna a invenção detectável.

**Gate:** `daia trace --strict` — BLOCK

---

### V. Quality as Specified Scenario (MUST)

Qualidade não é adjetivo — é cenário mensurável, e a medição é verificada, não afirmada.

**Regras:**
- MUST: Todo RNF é expresso como **cenário de seis partes** — fonte, estímulo, artefato, ambiente, resposta e medida de resposta
- MUST: Todo cenário referencia ao menos uma característica da ISO/IEC 25010:2023 como vocabulário
- MUST: Todo cenário de qualidade tem ao menos um teste executável que o verifica
- MUST: As verificações aplicáveis ao projeto passam sem erro. Nesta biblioteca: `npm run check` e `npm test`; empacotamento: `npm run pack:check`. Compilação e tipos só se aplicam quando configurados.
- MUST: O relatório de qualidade da SP4 é organizado **por característica**, não por arquivo
- SHOULD: A cobertura de testes não diminui entre baselines

**Distinção em relação ao AIOX:** o AIOX define qualidade por verificações de ferramenta (lint, typecheck, test, build). O DAIA-E preserva essas verificações e acrescenta o eixo que falta — a qualidade **especificada** e rastreada ao vocabulário normativo.

**Gate:** `daia gate sp4` — BLOCK

---

### VI. Absolute Imports (SHOULD)

Imports relativos criam acoplamento e dificultam refatoração.

**Regras:**
- SHOULD: Sempre usar imports absolutos com alias `@/`
- SHOULD NOT: Usar imports relativos (`../../../`)
- EXCEPTION: Imports dentro do mesmo módulo podem ser relativos

**Gate:** ESLint — INFO

---

### VII. Architectural Description (NON-NEGOTIABLE)

A arquitetura é descrita segundo o arcabouço da **ISO/IEC/IEEE 42010:2022**, que estabelece as relações entre parte interessada, preocupação, *viewpoint*, *view* e correspondência entre *views*.

**O que a norma fornece e o que não fornece:** a 42010 define o **metamodelo** da descrição arquitetural — exige que cada *view* responda a preocupações identificadas de partes interessadas identificadas — mas **não prescreve quais views devem existir**. O conjunto concreto é decisão do projeto.

**Regras:**
- MUST: Toda `View` declara os `Stakeholder` e as `Concern` a que responde
- MUST: Toda `Concern` registrada é endereçada por ao menos uma `View`
- MUST: As correspondências entre *views* são declaradas e verificadas — é o que impede a descrição de se fragmentar em documentos mutuamente inconsistentes
- MUST: O catálogo de *viewpoints* é **plugável**; o default é RM-ODP (ISO/IEC 10746)
- MUST: A descrição arquitetural **não é artefato de uma sprint** — começa na SP1 e se completa na SP4

**Catálogo default — RM-ODP:**

| View | Preocupação que responde | Sprint |
|------|--------------------------|--------|
| *Enterprise* | Quem são as partes interessadas, que políticas regem o domínio, que objetivo o sistema serve | SP1 |
| *Information* | Que entidades existem, como se relacionam, sob que restrições | SP2, SP3 |
| *Computational* | Como o sistema se decompõe em unidades e como elas interagem | SP3 |
| *Engineering* | Como a solução se distribui, persiste e se implanta | SP3 |
| *Technology* | Que produtos concretos instanciam o mecanismo decidido | SP3, SP4 |

**Gate:** `daia gate sp3` — BLOCK

---

### VIII. Specification Before Generation (NON-NEGOTIABLE)

A ordem interna do método é deliberada: **as especificações são escritas antes dos testes, e os testes antes da implementação.**

**Regras:**
- MUST: Antes de qualquer decisão arquitetural, duas modelagens são obrigatórias — a **estática** (o que existe: entidades, atributos, relações) e a **dinâmica** (o que acontece: fluxos, sequências, transições de estado)
- MUST: Os testes que travam os contratos comportamentais existem em fase vermelha antes de a geração começar
- MUST NOT: Nenhum código de produto é gerado antes da baseline SP3 estar encerrada
- MUST: A saída do modelo generativo é imediatamente confrontável contra teste executável

**Justificativa:** uma decisão arquitetural tomada sem modelagem estática tende a produzir estruturas que não acomodam os dados reais; sem modelagem dinâmica, estruturas corretas em repouso e inadequadas em operação.

**Gate:** `daia gate sp3`, `daia gate sp4` — BLOCK

---

### IX. Recorded Alternative (MUST)

Toda decisão arquitetural relevante registra ao menos uma alternativa considerada e o critério pelo qual foi preterida.

**Regras:**
- MUST: Todo `AD` (decisão arquitetural) registra ≥1 alternativa considerada e o critério de preterição
- MUST: Todo `AD` rastreia para ≥1 requisito ou preocupação que o motiva
- MUST: O confronto arquitetural opera **em ciclo**: QAW entre SP2 e SP3, ATAM na SP3, e reabertura como laço de reavaliação na SP4
- MUST: Na SP4 o ATAM reabre apenas sobre os cenários de qualidade afetados

**Justificativa:** esta exigência torna-se especialmente importante no desenvolvimento assistido por LLM, dado que o modelo tende a convergir para soluções convencionais sem explicitar que outras existiam.

**Gate:** `daia gate sp3` — BLOCK

---

### X. Body of Knowledge Anchoring (MUST)

Cada sprint ancora-se no corpo de conhecimento adequado à pergunta que responde.

| Sprint | Corpo de conhecimento |
|--------|----------------------|
| SP1 | **BABOK** — análise de negócio, IDEF0 |
| SP2 | **SWEBOK**, com a ISO/IEC 25010:2023 como vocabulário |
| SP3 | **SEBoK** e SWEBOK, com RM-ODP como arcabouço de *viewpoints* |
| SP4 | **SWEBOK** — Construção, Testes e Gerência da Qualidade |
| SP5 | **SEBoK** — verificação e validação |

**Regras:**
- MUST: Cada agente declara o BoK que o fundamenta e a *view* que preenche
- MUST: A definição da fronteira do sistema é **decisão de projeto registrada**, não constatação — determina o que será implementado, o que será simulado, o que permanece externo e o que fica fora de escopo
- SHOULD: Divergências entre BoKs são registradas, não silenciadas

**Gate:** `daia gate sp{1..5}` — WARN

---

### XI. Squad-First Portability (NON-NEGOTIABLE)

`squads/` é a fonte da verdade dos artefatos executáveis. Projeções de runtime (`.claude/`, `.codex/`, `.gemini/`, `.grok/`) são **derivadas, nunca canônicas**.

**Regras:**
- MUST: Scripts, templates, dados e checklists que pertencem a um squad vivem sob `squads/{squad}/`
- MUST: Projeções de IDE contêm frontmatter + instruções apenas — **não** lógica executável oculta
- MUST: A direção de sincronia é sempre `squads/` → projeção, nunca o inverso
- MUST: Artefatos executáveis DEVEM funcionar independentemente do runtime que os invoca
- MUST: **A definição de agente na fonte é markdown + YAML puro** — sem caminho de IDE, sem chamada a script, sem badge de permissão. Um humano lê. Qualquer LLM lê.

**Hierarquia de portabilidade:**
```
squads/daia-e/ (SOT) → .claude/ → .codex/ → .gemini/ → .grok/ → runtimes futuros
```

**Justificativa:** artefatos que vivem sob uma única pasta de IDE ficam presos ao host. O valor está no processo, não na ferramenta.

**Gate:** validadores de sincronia — WARN

---

### XII. Model Governance (MUST)

Acesso a modelo por automação DEVE respeitar tetos de orçamento, autoridade de roteamento, vínculo a baseline e varredura de intenção.

**Regras:**
- MUST: Todo laço de auto-dispatch declara teto de orçamento antes da primeira chamada
- MUST: Configuração de roteamento exige revisão de `@arch` (PR)
- MUST: **Baseline binding** — trabalho auto-despachado DEVE vincular-se a uma sprint e baseline válidas
- MUST NOT: Auto-dispatch anônimo de código de produto (trabalho-sombra)
- MUST: Intenções vindas de automação são varridas contra injeção de prompt antes do processamento

**Adaptação:** o AIOX exige vínculo a *story* (XII-C). No DAIA-E o vínculo é a **baseline**, coerente com o Artigo III.

**Gate:** gates de permissão/pre-dispatch — BLOCK

---

## Governance

### Amendment Process

1. Proposta documentada com justificativa e rastreio ao método publicado
2. Review por `@arch` e `@rec`
3. Aprovação exige **decisão humana registrada** (Artigo II)
4. Implementação com atualização de versão
5. Propagação para templates, tasks e projeções de runtime

### Versioning

- **MAJOR:** Remoção ou redefinição incompatível de princípio
- **MINOR:** Novo princípio ou expansão significativa
- **PATCH:** Clarificações e correções de texto

### Gate Severity Levels

| Severidade | Comportamento | Uso |
|------------|---------------|-----|
| BLOCK | Impede execução, exit ≠ 0 | NON-NEGOTIABLE, MUST críticos |
| WARN | Permite continuar com alerta | MUST não críticos |
| INFO | Apenas reporta | SHOULD |

**Princípio de enforcement:** gate é código, não checklist. Um princípio que não tem gate executável é aspiração, não constituição.

---

## Normative References

| Referência | Uso no método |
|-----------|---------------|
| ISO/IEC/IEEE 42010:2022 | Metamodelo da descrição arquitetural (Art. VII) |
| ISO/IEC 10746 (RM-ODP) | Catálogo de *viewpoints* default (Art. VII) |
| ISO/IEC 25010:2023 | Vocabulário de qualidade de produto (Art. V) |
| BABOK | Análise de negócio, SP1 (Art. X) |
| SWEBOK v4 | Requisitos, construção, testes, qualidade (Art. X) |
| SEBoK | Perspectiva sistêmica, V&V (Art. X) |
| QAW / ATAM (SEI) | Confronto arquitetural em ciclo (Art. IX) |

---

*DAIA-E Constitution v1.0.0*
*CLI First | Baseline-Driven | Human Decision Authority | Specification Before Generation | Squad-First Portability*
