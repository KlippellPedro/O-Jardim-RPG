# Plataforma O Jardim RPG

API central da futura plataforma web: contas, campanhas, personagens,
permissões do mestre, vínculo Discord, economia e auditoria.

## O que esta primeira versão entrega

- cadastro, login e logout com senha Argon2;
- sessão opaca em cookie `HttpOnly` e proteção CSRF;
- limitação persistente de tentativas de login;
- campanhas com papéis `mestre`, `assistente`, `jogador` e `observador`;
- convites temporários;
- personagens por campanha com salvamento otimista por versão;
- escolha do personagem ativo do jogador;
- liberações de informação em quatro níveis;
- vínculo de conta com Discord por código de uso único;
- vínculo de servidor Discord a uma campanha;
- carteira e inventário centralizados por personagem;
- transações idempotentes para os bots;
- trilha de auditoria para o painel do mestre;
- cargos globais `player`, `mestre`, `admin` e `criador`;
- painel administrativo com busca, filtros, alteração de cargo e desativação
  reversível de contas;
- criação de campanhas restrita a mestre/criador e CRUD com arquivamento;
- painel do mestre em seções: mesa e jogadores, personagens da campanha,
  publicação de conteúdo, controle de quem vê o quê e registro da mesa;
- convites listáveis e revogáveis, remoção de membro sem perder fichas;
- avisos automáticos para quem é afetado por uma mudança de painel;
- `GET /api/v1/contexto` com todo o estado inicial em uma requisição;
- migrações incrementais do PostgreSQL.

O site usa os adaptadores de `src/plataforma` para autenticação, campanhas,
personagens, conteúdo liberado, Discord e cofre. A campanha selecionada é a
única preferência mantida no navegador; os dados do RPG permanecem na API.

## Limites conhecidos antes de produção

- confirmação de e-mail ainda precisa ser concluída antes de abrir cadastro ao
  público geral; a recuperação de senha é feita pelo administrador, sem e-mail;
- testes de integração exigem um PostgreSQL descartável separado;
- `ID=jardim-rpg` em `discloud.config` precisa estar disponível/reservado na conta.

Não exponha esta versão como cadastro público antes dos fluxos de verificação
de e-mail e recuperação de senha estarem prontos.

## Configuração local

Requer Python 3.11+ e PostgreSQL:

```powershell
cd plataforma
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

No `.env`, use um banco de desenvolvimento e gere uma `SERVICE_API_KEY` de no
mínimo 32 caracteres. Depois:

```powershell
uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```

- Saúde: `GET /api/v1/saude`
- Documentação local: `/api/docs`
- Em produção, a documentação interativa é desativada.

## Testes

Testes unitários não acessam o banco:

```powershell
python -m unittest tests.test_unit -v
```

Para validar as migrações, configure `TEST_DATABASE_URL` com um banco
descartável. O teste cria e apaga somente um schema aleatório. Ele recusa rodar
se `TEST_DATABASE_URL` for igual a `DATABASE_URL`.

```powershell
python -m unittest tests.test_database_integration -v
```

## Discloud

A plataforma e o PostgreSQL são aplicações separadas na mesma VLAN:

1. PostgreSQL: template da Discloud com `VLAN=true` (hostname interno real,
   conferir na página Configurações do app do banco na Discloud — pode não
   ser exatamente `jardim-db`, hostnames de template às vezes vêm com
   sufixo automático).
2. Plataforma: esta pasta, com `VLAN=true` e **hostname interno `jardimapi`
   (sem hífen)** — o `discloud.config` pede `jardim-api`, mas o hostname
   configurado de fato no painel da Discloud é `jardimapi`; use sempre o
   valor real do painel, não o do `discloud.config`, se divergirem.
3. Banqueiro/Jornalista/Barista: bots separados na VLAN, chamando
   `http://jardimapi:8080/api/v1/interno`.

Variáveis de produção da plataforma:

```env
APP_ENV=production
DATABASE_URL=postgresql://...@<hostname-real-do-banco>:5432/...
SERVICE_API_KEY=segredo-compartilhado-apenas-com-os-bots
CREATOR_EMAIL=dono@exemplo.com
COOKIE_SECURE=true
ALLOWED_ORIGINS=https://jardim-rpg.discloud.app
TRUSTED_HOSTS=jardim-rpg.discloud.app,jardimapi
```

Nunca inclua o `.env` real no ZIP ou no Git. Configure os valores pelo painel.

## Conta criador

O cargo `criador` é único e reúne os acessos de administrador e de mestre. Ele é
definido por configuração do servidor — o painel nunca concede nem remove esse
cargo. Há duas formas:

- `CREATOR_EMAIL`: a conta com esse e-mail é promovida no boot da API e, se
  ainda não existir, no momento do cadastro. É a forma usada hoje
  (`dono@exemplo.com`). Como o e-mail é público, cadastre-se com ele antes
  de divulgar o site — quem se cadastrar primeiro com aquele endereço recebe o
  cargo.
- `CREATOR_USER_ID`: o UUID de uma conta já criada, disponível em
  `GET /api/v1/auth/eu`. Não pode ser adivinhado e tem prioridade sobre o
  e-mail; prefira migrar para ele depois que a conta existir.

Promover uma segunda conta rebaixa a anterior para `admin` automaticamente.

## Backup e restauração

O container da Discloud não tem `pg_dump`, então o backup é lógico: o próprio
Postgres serializa as linhas com `row_to_json` e a restauração usa
`json_populate_record`, que casa colunas pelo nome. O arquivo é JSON Lines
comprimido (`.jsonl.gz`).

Sessões de login, limites de tentativa e códigos de vínculo ficam **fora** do
backup de propósito: são estado efêmero, e uma restauração não deve ressuscitar
sessões antigas.

**O arquivo contém e-mails e hashes de senha.** Guarde em lugar privado; nunca
em canal público, repositório ou pasta compartilhada aberta. O `.gitignore` já
bloqueia `backups/` e `*.jsonl.gz`.

### Sob demanda

Administração › Backup › **Gerar e baixar backup**. É o caminho mais simples e
não depende de nada instalado.

### Automático

```powershell
python tools/backup-jardim.py --destino backups/    # baixa e rotaciona
python tools/backup-jardim.py verificar ARQUIVO     # confere sem restaurar
python tools/backup-jardim.py restaurar ARQUIVO     # devolve ao banco
```

O download usa `/api/v1/interno/backup` com a `SERVICE_API_KEY` dos bots;
mantém os 14 arquivos mais recentes. Para agendar todo dia às 3h:

```powershell
schtasks /create /tn "Backup Jardim" /tr "python C:\caminho\tools\backup-jardim.py" /sc daily /st 03:00
```

```bash
0 3 * * * cd /caminho && python tools/backup-jardim.py
```

### Restaurar depois de um desastre

1. Suba um Postgres novo e aponte `DATABASE_URL` para ele.
2. Inicie a plataforma uma vez, para as migrações criarem o schema.
3. `python tools/backup-jardim.py restaurar backups/ARQUIVO --limpar`

O `--limpar` esvazia as tabelas antes; sem ele, as linhas existentes são
mantidas e só o que falta é inserido. O script pede confirmação digitada.

Teste a restauração de vez em quando num banco descartável — backup que nunca
foi restaurado é só um arquivo.

## Contrato dos bots

Rotas `/api/v1/interno/*` exigem `X-Service-Key` e devem ficar acessíveis
apenas pela VLAN. Transações de moeda e inventário exigem uma chave de
idempotência para que uma tentativa repetida não duplique loot ou dinheiro.
