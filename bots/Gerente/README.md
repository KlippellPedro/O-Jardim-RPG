# Gerente — O Jardim RPG

Bot de consulta às regras publicadas para jogadores. Ele não depende de IA,
API paga ou banco: indexa os documentos empacotados junto da aplicação e
mostra trechos acompanhados do arquivo-fonte.

## Comandos

- `/duvida <pergunta>` — procura os trechos mais relacionados a uma pergunta;
- `/regra <termo>` — busca direta por regra, raça, classe, perícia ou Legado;
- `/fontes` — lista os sete arquivos públicos consultados;
- `/ajuda` — explica os comandos.

As respostas são **extrativas**. Quando não encontra evidência suficiente, o
bot pede para reformular ou confirmar com o mestre. O arquivo protegido
`data/regras/mestre-v1.json` é deliberadamente excluído do índice.

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
- `GUILD_ID` — opcional, recomendado no servidor de teste para sincronização
  imediata dos slash commands.

O token nunca deve ser commitado ou enviado em mensagens.

## Testes

```powershell
python -m pytest bots/Gerente/tests -q
```

Os testes validam a carga das fontes, buscas importantes e a exclusão das
regras internas do mestre.
