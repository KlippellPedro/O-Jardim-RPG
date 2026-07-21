# Análise histórica: centralizar tudo na Discloud

> **Nota de 16/07/2026:** este arquivo registra decisões e hipóteses antigas.
> Para implementação, vale o `Plano_Banco_Central.md`: PostgreSQL em template da
> Discloud, acesso por VLAN privada e segredos nas variáveis da aplicação.

> Análise honesta do plano proposto. Onde eu não tive 100% de certeza, está marcado
> com "⚠️ não confirmado". Preços e regras da Discloud podem mudar — vale reconferir.

## Veredito em uma linha

Centralizar **bots + banco + sistema de fichas** na Discloud é viável (com ajustes e no
**Platinum**). **Auto-hospedar o VTT (Owlbear Rodeo) na Discloud NÃO é viável** — isso é o
que quebra o plano. E a divisão de RAM proposta **subdimensiona os apps web**.

## Fatos da Discloud (verificados na doc oficial)

- Qualquer app com porta/web (site, API, dashboard) = **`TYPE=site`**, e isso **exige o
  plano Platinum ou superior**, **mínimo de 512 MB cada**, ouvindo na **porta 8080 / host
  0.0.0.0**, com **1 subdomínio** — ou seja, **uma porta por app**.
- A Discloud roda **linguagens** (Node, Python, Java, Ruby, Go, PHP, Rust) **e também
  aceita `Dockerfile`** (correção — eu tinha dito que não rodava Docker; a página de
  sites deles anuncia suporte a Dockerfile). O que **não** encaixa é o Owlbear Legacy
  especificamente, porque ele é **`docker-compose`** (vários containers) e precisa de
  **~5 GB só pra buildar** — isso sim a Discloud não faz. Um app **único** (nosso VTT) via
  Dockerfile ou linguagem, sim.
- **Banco**: dá pra usar **templates gerenciados** (MySQL, PostgreSQL, Redis, MongoDB) em
  discloud.com/templates, ou um **Mongo Atlas externo**. A **VLAN** (rede privada entre teus
  apps) existe de verdade.

## Respostas às 4 perguntas

### 1) A divisão de RAM (2 GB) é realista e segura?

**Não como está.** Correções:

- **Fichas (site)** e **VTT (site)** precisam de **≥ 512 MB cada** (não 400/450) e **só rodam
  no Platinum**. Dois sites já são ≥ 1024 MB.
- **Bots**: 3 bots de texto ≈ 120–150 MB cada ≈ ~400 MB (ok, apertado). **Mas a música do
  Barista (Lavalink, ~512 MB+ de Java) não cabe** nesse orçamento — música fica de fora.
- Melhor caso realista no Platinum, **sem** o VTT: Fichas 512 + Bots 400 + Banco 250 ≈
  **1160 MB**, sobrando ~840 MB. **Cabe sem o VTT. Com o VTT, estoura.**

### 2) O Owlbear a 450 MB aguenta 4–6 players em tempo real?

A pergunta nem chega nesse ponto, por dois motivos:

- **Não dá pra rodar o Owlbear na Discloud.** O **Owlbear Rodeo Legacy (1.0)** é
  auto-hospedável (código no GitHub, **licença não-comercial** — jogo entre amigos é
  permitido), **mas é um `docker-compose`** e a própria doc deles diz que precisa de
  **~5 GB de RAM só pra fazer o build**. A Discloud não roda Docker e o Platinum tem 2 GB.
  Inviável.
- Mesmo que rodasse: 450 MB < 512 MB (mínimo de site), e sync de tokens em tempo real usa
  **WebSocket** — ⚠️ não confirmei se o proxy de site da Discloud suporta WebSocket
  persistente. Com 2 vCPUs divididas entre tudo, seria arriscado.

### 3) Gargalos / limitações da Discloud

- **Só o Platinum roda web app**, e **cada site = 1 porta (8080) + 1 subdomínio** → fichas e
  VTT seriam **2 apps separados**, cada um ≥ 512 MB.
- **Sem Docker arbitrário** → mata o Owlbear self-host e qualquer stack que não seja
  "código numa das linguagens suportadas".
- **Build pesado não roda**: apps que exigem muita RAM pra buildar (Owlbear, ~5 GB) não
  buildam no Platinum.
- **Banco**: ⚠️ o template gerenciado provavelmente consome RAM do teu plano (não achei o
  custo exato). Um banco externo grátis (abaixo) tira esse peso.
- **Tempo real**: WebSocket + 2 vCPUs compartilhadas entre bots, fichas, banco e VTT → risco
  de travar justo durante a sessão.

### 4) Otimizações recomendadas

- **Não auto-hospede o VTT.** Use o **Owlbear Rodeo 2.0 hospedado** (grátis, oficial): zero
  RAM tua, zero manutenção, aguenta os players. Resolve o maior risco de uma vez.
- **Banco: use um gerenciado externo grátis** — **Supabase** ou **Neon** (Postgres grátis),
  ou **Mongo Atlas**. Mais robusto e libera ~250 MB da Discloud.
- **Música (Barista)**: não cabe nesse orçamento. Ou hospeda o Lavalink num VPS separado, ou
  repensa a fonte de música. (Já tínhamos flagado isso.)
- **Fichas**: se puderem morar num host web grátis (**Render / Vercel / Railway**), você tira
  a exigência de Platinum e os bots cabem no **Gold (1 GB, R$ 5,99)**.

## Arquitetura enxuta que eu recomendo (híbrida)

| Peça | Onde | Por quê |
| --- | --- | --- |
| Bots (Consultor, Ajudante, dados do Barista) | Discloud **Gold** ou **Platinum** | leve, VLAN, persistente |
| Sistema de fichas (web) | Discloud **Platinum** *ou* Render/Vercel grátis | site = precisa Platinum na Discloud |
| Banco de dados | **Supabase/Neon (Postgres grátis)** externo | robusto, não gasta RAM do plano |
| VTT (mapas) | **Owlbear Rodeo 2.0 hospedado (grátis)** | Discloud não roda o self-host |
| Mídia dos mapas | Cloudinary/Imgur | como já planejado |

## É "melhor" centralizar tudo na Discloud?

- **Vale a pena** centralizar **bots + banco (+ fichas, se for Platinum)**: VLAN, dados
  persistentes, sem depender do teu PC ligado.
- **Não vale** forçar o **VTT** ali — use o hospedado.
- O **híbrido** acima é mais **robusto e mais barato** que empilhar tudo num container de
  2 GB, e evita "todos os ovos numa cesta só" (se a Discloud cair, cai tudo junto).

## Pra agora (bem mais simples)

Pra só colocar os **bots** no ar 24/7, o **Gold (1 GB)** já roda **Consultor + Ajudante** com
folga (sites/fichas é que exigem Platinum). O Consultor sozinho cabe até no grátis se
apertar a RAM. A infra grande (fichas + VTT + banco) dá pra montar depois, com calma.

---

## Cenário Diamond (4 GB / 4 vCPU) com VTT PRÓPRIO — revisão

Com duas mudanças do teu plano novo, a coisa **fica viável**:
1. o **VTT é nosso** (app único em código/Dockerfile), não o Owlbear docker-compose;
2. a **ficha vira DB-backed** (sem import/export de JSON) + um **dashboard** de mestre.

### Orçamento de RAM no Diamond (4096 MB)

| App (cada um é um deploy) | RAM | Obs. |
| --- | ---: | --- |
| Bots (Consultor + Ajudante + Barista-dados) | ~450 MB | 3 bots de texto |
| Ficha + Dashboard (site) | ~512 MB | mín. de site |
| VTT próprio (site, tempo real) | ~700 MB | folga p/ WebSocket + players |
| Banco (se na Discloud) | ~300 MB | ou 0 se usar externo |
| **Subtotal** | **~1960 MB** | sobra **~2130 MB** |

Ou seja: **cabe com folga**, e ainda dá pra encaixar a **música do Barista (Lavalink
~512 MB)** se quiser. No Diamond não falta RAM.

### O que fica MUITO melhor com a ficha no banco (sem JSON)

Vira **fonte única de verdade**: o **dashboard** (mestre libera itens/poderes por player),
os **bots** (leem os mesmos dados — acaba o `/importar` e o export/import) e o **VTT** (puxa
ficha/tokens) leem e escrevem **no mesmo banco**. Isso é o jeito certo de fazer.

### Ainda flago, com honestidade

- **WebSocket (tempo real do VTT):** ⚠️ não achei declaração explícita da Discloud, MAS os
  sites deles ficam atrás de **Cloudflare** (que suporta WebSocket) — então é **muito
  provável que funcione**. Vale um teste pequeno (um "eco" de WebSocket) antes de investir
  pesado no VTT.
- **Cada web app = 1 deploy, 1 subdomínio, porta 8080.** Ficha e VTT são **2 apps
  separados** (os dois exigem plano de site, que o Diamond cobre).
- **Construir um VTT é projeto grande** (canvas de mapa, tokens, fog of war, sync em tempo
  real, login). Dá pra fazer por fases, mas não é de um fim de semana — é o item mais pesado.
- **Banco:** dá pra hospedar na Discloud (template gerenciado, VLAN) OU externo grátis
  (**Supabase/Neon** = Postgres com realtime e login prontos, que ajudam no VTT e no
  dashboard). Externo tira ~300 MB da Discloud e sobrevive a qualquer restart. Com 4 GB,
  qualquer um dos dois funciona.
- **Bots:** hoje usam **SQLite**; pra compartilhar o banco central, a gente troca pra
  **Postgres/MySQL**. Nosso `db.py` é uma camada limpa, então é uma mudança contida.
- **Tudo num provedor só:** se a Discloud cair, cai tudo junto. Banco externo (ou backups)
  reduz o risco.

### Veredito do cenário Diamond

**Sim, dá pra fazer tudo isso no Diamond** — banco central + bots (com mais funções) + ficha
DB-backed com dashboard + VTT próprio, com RAM sobrando. Os únicos "poréns" reais são:
confirmar o WebSocket (provável que sim) e o **tamanho do projeto do VTT**. Recomendo montar
por fases: (1) banco central + migrar os bots pra ele; (2) ficha DB-backed + dashboard;
(3) VTT por último, começando por um protótipo simples.
