# Gerente — O Jardim RPG

Bot de consulta às regras publicadas para jogadores. Ele não depende de IA,
API paga ou banco: lê os documentos empacotados junto da aplicação e mostra
as informações estruturadas do sistema.

## Comandos

- `/regras` — navega por raças, classes, perícias, Legados e fundamentos;
- `/regra <termo>` — busca direta com sugestões de raça, classe, perícia ou Legado;
- `/fontes` — lista os sete arquivos públicos consultados;
- `/ajuda` — explica os comandos.

As respostas vêm diretamente dos dados publicados. Quando não encontra um
nome, o bot orienta a navegar por `/regras`. O arquivo protegido
`data/regras/mestre-v1.json` é deliberadamente excluído do pacote.

## Fontes

- `docs/regras/fundamentos-v1.md`
- `docs/regras/balanceamento-v0.2.md`
- `data/ficha/classes.json`
- `data/ficha/legados.json`
- `data/ficha/legados-novos.json`
- `data/ficha/pericias.json`
- `data/ficha/racas.json`

No repositório, o bot lê esses caminhos diretamente. O script
`tools/build-discloud-packages.ps1` copia as mesmas fontes para a pasta
`fontes/` dentro do ZIP de deploy.

## Configuração

Copie `.env.example` para `.env` apenas no ambiente local e preencha:

- `DISCORD_TOKEN` — obrigatório;
- `GUILD_ID` — opcional; quando definido, publica os comandos somente nesse
  servidor e remove cópias globais antigas para não exibir duplicados.

O token nunca deve ser commitado ou enviado em mensagens.

## Testes

```powershell
python -m pytest bots/Gerente/tests -q
```

Os testes validam a carga das fontes, buscas importantes e a exclusão das
regras internas do mestre.
