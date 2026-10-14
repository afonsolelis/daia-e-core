# Contribuir com DAIA-E

Requer Node.js >= 18. Não há dependências externas.

Antes de propor mudanças, execute `npm run check`, `npm test` e
`npm run pack:check`. Os testes usam `node:test`; o teste de workflow cobre
onboarding, cinco baselines, execução de contratos e detecção de mudanças.

Edite skills e papéis em `squads/daia-e/`, nunca em projeções instaladas.
Atualize `squad.json` ao adicionar capacidades e mantenha os schemas e o guia
consistentes com os gates. Novas regras devem ter testes com casos válidos e
inválidos, incluindo o efeito sobre projetos existentes.

Use commits convencionais e descreva o problema, comportamento resultante e
verificação realizada. Mudanças no algoritmo de hash ou nos contratos requerem
nota de migração no README. Não publique pacotes nem envie alterações remotas
sem autorização do mantenedor.
