# Referências dos corpos de conhecimento

As cópias locais ficam em `docs/references/bok/` e **não são versionadas**
(`.gitignore`). As licenças não permitem redistribuição:

| Arquivo local | Obra | Licença |
|---|---|---|
| `bok/babok-v3.pdf` | IIBA. *A Guide to the Business Analysis Body of Knowledge (BABOK Guide)*, v3, 2015 | Cópia de membro IIBA, sem distribuição |
| `bok/swebok-v4.pdf` | IEEE Computer Society. *Guide to the Software Engineering Body of Knowledge (SWEBOK Guide)*, v4.0, 2024 | Uso educacional e pessoal, sem redistribuição |
| `bok/sebok-v2.14.pdf` | BKCASE. *Guide to the Systems Engineering Body of Knowledge (SEBoK)*, v2.14 | CC BY-NC-ND 3.0 (partes da Stevens) |
| `bok/taticas_arquiteturais_bass_clements_kazman.md` | Resumo de táticas de Bass, Clements & Kazman, *Software Architecture in Practice*, 3ª ed., 2013 (caps. 5–11) | Copyright do livro; resumo local, sem distribuição |

Para reproduzir o ambiente, obtenha cada obra na fonte oficial e salve com o
nome acima.

## Onde cada obra entra no método

| Camada | Validador | Seções | Regras do gate |
|---|---|---|---|
| Negócio (SP1) | `val-neg` | BABOK §10.43 Stakeholder List, Map, or Personas; §10.35 Process Modelling (BPMN, IDEF0); §4 Elicitation and Collaboration | `BIZ-PERSONA`, `BIZ-BPMN`, `BIZ-IDEF0`, `BIZ-DRIVER-PROCESS`, `BIZ-IDEF0-SPAN`, `BIZ-PERSONA-USED` |
| Elicitação (SP2) | `val-req` | SWEBOK v4 cap. 1 §2 Requirements Elicitation (§2.1 fontes, §2.2 técnicas), §7.3 Tracing; SEBoK Stakeholder Needs Definition, System Requirements Definition | `ELI-SOURCE`, `ELI-FROM-BUSINESS`, `ELI-ACTIVITY-COVERAGE`, `ELI-BOUNDARY` |
| Engenharia (SP3) | `val-eng` | SEBoK Logical Architecture, Physical Architecture; RM-ODP Engineering viewpoint | `ENG-VIEW` |
| Tecnologia (SP3) | `val-tec` | RM-ODP Technology viewpoint; SEBoK análise de alternativas | `TEC-VIEW` |
| Táticas (SP3) | `evaluate-*-tactics` (sete skills, uma por atributo) | Bass, Clements & Kazman caps. 5–11 | campo `tactics` em `ArchitectureDecision` |

As skills `evaluate-*-tactics` não dependem do arquivo local: carregam o catálogo
de táticas de cada atributo. O resumo em `bok/` serve de consulta humana.

A numeração IDEF0 e a faixa de 3 a 6 atividades por diagrama seguem a
FIPS PUB 183 (1993), que a BABOK cita como notação de escopo.
