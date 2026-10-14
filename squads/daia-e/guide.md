# Guia DAIA-E

Comece com `daia next --json`. O comando calcula a etapa a partir das baselines
e dos gates atuais; `daia verify` registra o progresso em `.daia/workflow.json`.
Leia a skill indicada e os schemas em `.daia/schemas/` antes de produzir JSON.
Use IDs estaveis, campos `kind`, `sprint` e `provenance` e referencias entre IDs.
As skills ficam em `.agents/skills/` no Codex e os papeis em `.daia/agents/`.

## Software existente

Antes de SP1, inventarie codigo, integracoes, testes e documentos existentes.
Registre origem e incertezas em `.daia/evidence/recovery.md`. Recupere as views
com `status: recovered` e solicite revisao humana antes de definir `confirmed: true`.
Preserve testes existentes verdes; contratos novos devem ser escritos antes da
implementacao da mudanca. Configure `mode: existing` no onboarding.

## Percurso

1. SP1: stakeholders, necessidades, fronteira e hipotese; `daia gate SP1`.
2. SP2: requisitos rastreaveis, cenarios de seis partes e prioridades; `daia gate SP2`.
3. SP3: modelos estatico/dinamico, decisoes com alternativas, correspondencias,
   especificacao e contratos de teste; `daia verify SP3`.
4. SP4: implemente apos aprovacao de SP3, execute testes e escreva
   `.daia/evidence/quality-report.md` com medidas, limiares e limitacoes.
5. SP5: escreva `.daia/evidence/validation.md` com roteiro, hipotese, resultados
   e limitacoes. A aprovacao de cada baseline continua sendo decisao humana.

## Execucao dos testes

Configure comandos sem shell em `.daia/config.json`, por contrato:

```json
{"verification":{"TC-exemplo":{"command":"node","args":["--test","tests/exemplo.test.js"],"inputs":["src/exemplo.js","package.json"]}}}
```

`daia verify SP3` executa esses comandos e grava exit code, saida e fingerprints.
Declare todos os arquivos locais que influenciam o resultado em `inputs`.
O arquivo de teste e o modelo sao incluidos automaticamente. Dependencias externas,
servicos e arquivos omitidos nao sao cobertos pelo fingerprint.
Atualize `phase` somente conforme o resultado observado. Uma falha vermelha exige
revisao: o exit code sozinho nao distingue comportamento ausente de erro no teste.

## Limites da validacao

O gate verifica estrutura, referencias tipadas, arquivos, rastreabilidade e
evidencias declaradas. Nao certifica conformidade integral com ISO 42010, nao
interpreta semanticamente todo diagrama e nao prova que uma arquitetura e boa.
Use testes de arquitetura como contratos para restricoes executaveis.
Tradeoffs, fronteiras, adequacao e resultados exigem revisao humana.
A assinatura local registra uma aprovacao declarada; nao autentica identidade.
