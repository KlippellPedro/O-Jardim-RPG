# Gerente — O Jardim RPG

Bot de consulta às regras publicadas para jogadores. Ele não depende de IA,
API paga ou banco: lê os documentos empacotados junto da aplicação e mostra
as informações estruturadas do sistema.

## Comandos

- `/regras` — navega por raças, classes, perícias, Legados, magias e fundamentos;
  em Magias a navegação desce primeiro pelo Fluxo, porque o catálogo tem 330
  entradas e um Select do Discord só comporta 25 opções;
- `/regra <termo>` — busca direta com sugestões de raça, classe, perícia, Legado ou magia;
- `/fontes` — lista os seis arquivos públicos consultados;
- `/ajuda` — explica os comandos.

As respostas vêm diretamente dos dados publicados. Quando não encontra um
nome, o bot orienta a navegar por `/regras`. O arquivo protegido
`data/regras/mestre-v1.json` é deliberadamente excluído do pacote.

## Fontes

- `data/regras/regras-publicas-v1.md` (gerado de `data/regras/regras.ts`)
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
