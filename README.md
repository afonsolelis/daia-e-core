# DAIA-E

Validador de descrição arquitetural e processo guiado para construir software,
com onboarding, skills, rastreabilidade, testes executados e baselines aprovadas.

O projeto deriva do AIOX Core. Adapta a experiência de instalação e condução por
etapas ao método DAIA-E: negócio → requisitos → arquitetura → implementação →
validação. As etapas delimitam escopo, não duração.

## Começar

Requer Node.js >= 18. Não há dependências externas.

```bash
git clone https://github.com/afonsolelis/daia-e-core.git
cd daia-e-core
node bin/daia.js init ../meu-projeto
```

Em terminal interativo, o onboarding pergunta nome, projeto novo ou existente,
objetivo, stack, restrições e runtime. Para automação:

```bash
node bin/daia.js init ../meu-projeto --yes --mode new --runtime codex \
  --name "Meu projeto" --objective "Objetivo do sistema"
node bin/daia.js next --root ../meu-projeto
```

O comando cria configuração, guia, schemas, histórico e instala skills. O nome
`daia` fica disponível ao instalar o pacote, por exemplo com `npm link` no
repositório. A publicação npm não é realizada por esses comandos.

## Fluxo guiado

```bash
daia next --json              # etapa atual, entradas, entregas, skills e bloqueios
daia skills                  # catálogo de capacidades
daia gate SP1                # inspeção sem executar comandos do projeto
daia verify SP1              # verifica a etapa e registra progresso
daia baseline sign SP1 --by "Nome" --rationale "Justificativa da decisão"
daia status                  # baselines atuais e desatualizadas
daia validate architecture   # gate SP3, incluindo evidências e pré-requisitos
```

| Etapa | Entregas | Skills |
|---|---|---|
| SP1 | stakeholders, drivers, preocupações, personas, processos BPMN, IDEF0, fronteira | model-business-context, model-business-processes, validate-business-layer |
| SP2 | requisitos elicitados do negócio e cenários mensuráveis | elicit-requirements-from-business, specify-quality-scenarios, prioritize-architecture-drivers, validate-requirements-layer |
| SP3 | views (lógica → engenharia → tecnologia), decisões, contratos e testes | describe-software-architecture, validate-engineering-layer, validate-technology-layer, evaluate-architecture-tradeoffs, write-executable-specification |
| SP4 | implementação, testes verdes, relatório de qualidade | implement-from-baseline, validate-system-evidence |
| SP5 | demonstração, confronto da hipótese e limitações | validate-system-evidence |

Cada camada tem um agente validador que emite parecer antes da camada
seguinte: `@val-neg` (negócio, BABOK), `@val-req` (elicitação, SWEBOK + SEBoK),
`@val-eng` (engenharia, SEBoK + RM-ODP) e `@val-tec` (tecnologia). As regras
mecânicas correspondentes aparecem no gate com os prefixos `BIZ-`, `ELI-`,
`ENG-` e `TEC-`. As referências estão em `docs/references/`.

Leia `.daia/guide.md` e use `.daia/schemas/` para produzir os artefatos em
`.daia/model/`. `daia next` recalcula a etapa com o estado atual;
`daia verify` registra verificações em `.daia/workflow.json`.

Para software existente, use `--mode existing`. Comece pelo inventário de
código e testes em `.daia/evidence/recovery.md`, com origem e limitações.
Views recuperadas exigem confirmação declarada após revisão humana. Testes já
existentes podem permanecer verdes na SP3.

## O que é validado

- Schemas e referências entre tipos de artefato.
- Cobertura de concerns por views, modelos estáticos/dinâmicos e alternativas.
- Existência de documentos e testes referenciados; referências fora do projeto são recusadas.
- Correspondências declaradas com origem, destino e justificativa.
- Execuções registradas dos testes e fingerprints dos arquivos declarados.
- Ordem das baselines e mudanças em documentos, testes e implementação declarada.

O resultado é validação estrutural e de evidências, **não certificação ISO**.
Coerência semântica dos diagramas, adequação das decisões, tradeoffs e significado
das medidas exigem revisão. Restrições de código podem ser verificadas por testes
de arquitetura registrados como contratos.

## Evidências executáveis

Em `.daia/config.json`, configure por contrato:

```json
{
  "verification": {
    "TC-exemplo": {
      "command": "node",
      "args": ["--test", "tests/exemplo.test.js"],
      "inputs": ["src/exemplo.js", "package.json"]
    }
  }
}
```

`daia verify SP3` executa os comandos configurados (sem shell), com timeout de
60 segundos por contrato, e registra saída, exit code e fingerprint. O teste e
o modelo entram automaticamente no fingerprint; declare todos os demais arquivos
relevantes em `inputs`. Serviços externos, ambiente e arquivos omitidos não são
cobertos. Execute apenas comandos de projetos em que confia.

O gate não aceita apenas `phase: green`: exige evidência compatível e atual.
Uma falha vermelha precisa ser inspecionada para distinguir comportamento ainda
não implementado de defeito no teste. O sistema não altera `phase` sozinho.

SP4 exige `quality-report.md`; SP5 exige também `validation.md` em
`.daia/evidence/`, com resultados e limitações. A presença do relatório é
verificável; a qualidade de suas conclusões depende da revisão.

## Aprovações e mudanças

A baseline registra nome, justificativa, data e hash. É uma **aprovação local
declarada**, não autenticação de identidade ou assinatura criptográfica.
Agentes só podem registrá-la após autorização explícita da pessoa.

Mudanças nos artefatos referenciados invalidam a baseline correspondente.
Na SP4/SP5, os arquivos de implementação declarados em `inputs` e os relatórios
também são cobertos. Baselines antigas devem ser revistas após esta atualização,
pois o algoritmo passou a incluir conteúdo de arquivos.

`--force` registra aceitação excepcional com dívida; não transforma evidência
ausente em comprovação. O fluxo continua mostrando bloqueios não resolvidos.

```bash
daia trace TC-exemplo --up
daia trace --matrix
daia impact AD-exemplo
daia baseline list
```

## Instalação de skills

```bash
daia setup --to codex
daia setup --to claude
daia skills sync describe-software-architecture --to codex
daia setup --to portable
```

Claude recebe skills em `.claude/skills/`, conforme sua
[documentação](https://code.claude.com/docs/en/skills). Codex recebe skills em `.agents/skills/`, conforme a
[documentação oficial](https://learn.chatgpt.com/docs/build-skills).
Os 11 papéis são material de referência em `.daia/agents/`; não são registrados
como subagentes nativos. A exportação `portable` grava skills em
`.daia/export/skills/` para integração manual em outros hosts. Não há promessa
de ativação automática em hosts não testados.

A instalação valida a biblioteca antes de gravar, é idempotente e recusa
conflitos com conteúdo diferente. Preserve ou mova customizações antes de
reinstalar. Projeções antigas em `.codex/skills/` não são apagadas
automaticamente; revise-as para evitar duplicação.

## Estrutura e desenvolvimento

```text
kernel/            schemas, regras, baselines, verificação e workflow
bin/daia.js        CLI e onboarding
squads/daia-e/     agentes, skills e guia canônicos
tests/kernel/     testes unitários e percurso completo SP1–SP5
docs/legacy/      regras AIOX arquivadas, sem ativação automática
```

```bash
npm run check       # sintaxe de todos os arquivos JavaScript do produto e testes
npm test            # testes, incluindo onboarding, evidências e retomada
npm run pack:check  # conteúdo do pacote npm
```

Não há compilação nem checagem estática de tipos nesta biblioteca JavaScript.
Os catálogos RM-ODP, C4 e 4+1 são selecionados com `--catalog` no onboarding.
O kernel não chama modelos de linguagem; as skills orientam o assistente do host.

## Licença e linhagem

MIT. Derivado do [Synkra AIOX](https://github.com/SynkraAI/aiox-core), por sua vez
derivado do BMad Method. Consulte [ATTRIBUTION.md](ATTRIBUTION.md) e a
[constituição](.daia-core/constitution.md). Sem afiliação aos projetos de origem.
