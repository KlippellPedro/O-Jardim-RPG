# Rodar o Jardim na máquina

O banco de produção fica na VLAN da Discloud e **não aceita conexão de fora**.
Para desenvolver, testar migrações ou provar que um backup restaura, use o
Postgres do `docker-compose.yml`.

## Subir o banco

```powershell
docker compose up -d
```

Sobem dois bancos:

| Serviço | Porta | Para quê |
| --- | --- | --- |
| `postgres` | 5433 | desenvolvimento; os dados sobrevivem ao `down` |
| `postgres-teste` | 5434 | testes de integração; vive em memória e some ao desligar |

A porta 5433 é proposital: 5432 costuma já estar ocupada por um Postgres
instalado na máquina, e a colisão dá um erro confuso.

Para desligar: `docker compose down`. Para desligar **apagando os dados de
desenvolvimento**: `docker compose down -v`.

## Rodar a plataforma

Os `.env` locais já apontam para `127.0.0.1:5433`.

```powershell
cd plataforma
.venv-test\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```

O site fica em <http://127.0.0.1:8080>. As migrações rodam sozinhas no start —
se o log disser "schema central atualizado", o banco está pronto.

Crie sua conta pela própria tela de cadastro. Como `CREATOR_EMAIL` está no
`plataforma/.env`, a conta com aquele e-mail vira criador no ato do cadastro.

## Rodar os testes

Unitários (não precisam de banco):

```powershell
cd plataforma
.venv-test\Scripts\python.exe -m unittest tests.test_unit -v
```

Integração — inclui o **ciclo completo de backup e restauração**, que é a única
prova de que o backup serve para alguma coisa:

```powershell
cd plataforma
$env:TEST_DATABASE_URL = "postgresql://jardim:jardim-local@127.0.0.1:5434/jardim_teste"
.venv-test\Scripts\python.exe -m unittest tests.test_database_integration -v
```

O teste cria e apaga um schema aleatório, e **se recusa a rodar** se
`TEST_DATABASE_URL` for igual a `DATABASE_URL` — proteção contra apontar sem
querer para produção.

## Rodar os bots

`bots/banqueiro/.env` e `bots/barista/.env` também apontam para o banco local.
Cada bot precisa do próprio `DISCORD_TOKEN`, que já está lá.

```powershell
cd bots\banqueiro
python main.py
```

## Restaurar um backup de produção aqui

Serve para conferir se um arquivo é restaurável, sem risco nenhum:

```powershell
python tools\backup-jardim.py --destino backups\        # baixa de produção
docker compose up -d
cd plataforma
.venv-test\Scripts\python.exe -m uvicorn main:app --port 8080   # cria o schema, depois encerre
python ..\tools\backup-jardim.py restaurar ..\backups\ARQUIVO --limpar
```

Agora o site local sobe com uma cópia dos dados de produção. Lembre que o
arquivo contém e-mails e senhas cifradas: apague quando terminar.
