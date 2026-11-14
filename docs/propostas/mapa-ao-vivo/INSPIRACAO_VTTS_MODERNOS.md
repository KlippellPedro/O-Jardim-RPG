# Ideias de VTTs modernos (Foundry, TaleSpire, Alchemy, Roll20)

Segunda lista do Gemini, pedida pelo Pedro em 2026-11-14, antes de decidir as
levas de `INSPIRACAO_OWLBEAR_TTS.md`. São 13 ideias. Cada uma foi conferida no
código (não só nos docs), e as que faltam têm o desenho de como ficariam no nosso
VTT. As regras de sempre valem: segredo decidido no servidor, nada de arte ou
código de terceiros, e **o VTT sugere e o Mestre decide**: nenhuma regra do
Livro é aplicada em silêncio (regra fora do padrão vira aviso, não bloqueio, e o
AGENTS.md proíbe mexer em campo mecânico sem decisão de arquitetura).

## Andamento (2026-11-14)

Feitos desta lista: **ping com contexto** (D1), **faixa de retratos na
iniciativa** (B4; a câmera que acompanha a vez já existia, em "Seguir a vez com
a câmera"), **modo limpo** (D3, etapa 1: `/mapa?limpo=1` vale para a conta de
quem joga ou assiste; para o Mestre a página abre normal com um aviso, em vez do
"Ver como jogador" que o plano previa). Detalhes e testes em
`INSPIRACAO_OWLBEAR_TTS.md`.

**Quinta rodada (2026-11-14): feitas as outras nove.** Cena narrativa (A3),
gatilhos de terreno (B1), altura e telhado (B2), condições com contorno e
lembrete na virada (B3), cobertura completa pela régua (C2, agora também a
parcial e a superior, por zonas), quadro de investigação (C3), nota do jogador
no token (D2) e efeitos pontuais no mixer (A1). Os desenhos das seções abaixo
são os do plano; o que mudou na prática está na "Quinta rodada" de
`INSPIRACAO_OWLBEAR_TTS.md`. Duas decisões que tomei sozinha por sua autorização:
a nota do jogador ganhou coluna própria no token (240 caracteres) em vez de
reaproveitar as notas da ficha, e o telhado virou uma zona com telhas desenhadas
em vez de uma imagem do Acervo. Seguem pedindo decisão sua só a ressonância
entre Fluxos (C1) e o modo espectador completo (D3, etapa 2).

## 1. Conferência item por item

| # | Ideia | Já temos? | O que falta | Vale? |
| --- | --- | --- | --- | --- |
| A1 | Mixer de paisagem sonora | **Quase.** Música sincronizada com arquivos do Mestre (até 30 faixas), camadas de ambiente em loop (chuva, vento, fogueira, taverna, com volume por camada) e ajuste de volume por aparelho | efeitos pontuais (grito, espada) num botão rápido | sim, pequeno |
| A2 | Clima e efeitos de tela | **Sim, e em shader.** Chuva, tempestade, neve, neblina, areia, cinzas, brasas, folhas, calor, nuvens, Véu do Vazio, brilho de Fluxo | nada | feito |
| A3 | Modo Cena Narrativa | **Não.** Há falas de NPC com retrato e documentos, mas o grid nunca some | cena sem grade, com arte em tela cheia e retratos embaixo | **sim** |
| B1 | Gatilhos de terreno | **Só o portal** (que é um gatilho de caso único, e o escondido já funciona como armadilha) | zonas que disparam algo quando um token entra | **sim** |
| B2 | Elevação e telhados | **Não.** A camada "alto" do construtor existe mas não some sozinha | altura no token e telhado que abre quando alguém entra | sim, em duas partes |
| B3 | Condições visuais e dano contínuo | **Em parte.** Chips e carta no token, aflições e condições do Livro, Mestre põe e tira pelo token | contorno animado por condição e lembrete do dano na virada do turno | sim |
| B4 | Iniciativa interativa | **Em parte.** Lista com a vez, clicar centraliza, contorno do alcance de movimento na vez, metros andados, botão de encerrar o turno | faixa de retratos no topo e câmera que acompanha a vez | sim, pequeno |
| C1 | Ressonância elemental no mapa | **Não, e não é só código:** o Livro não tem regra de "molhado + raio" | decisão de regra antes de qualquer tela | só a metade neutra |
| C2 | Linha de visão e cobertura | **Em parte.** Paredes, portas, janelas e visão calculada no servidor; distância em metros até cada token | ferramenta de linha entre dois tokens que diz a cobertura | **sim** |
| C3 | Quadro de investigação | **Não.** Há notas na ficha, Documentos universais do Mestre e a cena de Investigações no Livro, mas nada compartilhado em tempo real | quadro com pistas e linhas, ao vivo | sim, grande, fora do mapa |
| D1 | Ping com contexto | **Em parte.** Ping simples (P e Alt + clique) e "trazer todos para a minha vista" (menu) | ping de perigo (Shift) e puxar a câmera de todos num atalho (Ctrl) | sim, pequeno |
| D2 | Anotações privadas no token | **Em parte.** O Mestre tem nota secreta em token, cena e mapa; o jogador tem as notas da ficha | nota do jogador direto no token | sim, pequeno |
| D3 | Modo espectador / streamer | **Não.** A tecla H só esconde a interface do próprio aparelho | URL limpa e visão de espectador sem segredo | sim, em duas etapas |

Resumo: 1 ideia já está feita e superada (A2), 8 têm uma parte pronta e uma
lacuna pequena ou média, e 4 não existiam (A3, B1, B2, C3). Só C1 trava antes de
codar, porque pede uma regra nova que é do Pedro, não do código.

## 2. Como cada uma ficaria no nosso VTT

### A1. Efeitos pontuais no mixer (P)

O mixer de hoje já separa música e ambiente. Falta o terceiro andar do Alchemy:
sons de um golpe só.
- O Mestre sobe os próprios arquivos (o envio de trilha já existe, 20 MB, assinatura
  conferida) marcados como "efeito": tocam uma vez, para todos, sem acertar o
  ponto da faixa como a música faz.
- Uma fileira de botões rápidos no painel Trilha sonora (até 12 favoritos) e o
  nome do efeito aparece para o Mestre. O jogador ouve, não vê o painel.
- Não entra som de terceiros no repositório. Vale a mesma regra do ambiente,
  que toca de um repositório público pelo jsDelivr: só entra efeito de lá se a
  licença for conferida arquivo por arquivo.
- O volume de efeitos entra no ajuste local por aparelho, junto do ambiente.

### A3. Cena Narrativa (M)

Uma cena do tipo "narrativa" no lugar da cena de grade. O Mestre põe na mesa e a
tela de todos muda.
- **Fundo**: uma imagem do Acervo em tela cheia com movimento lento (câmera que
  anda e aproxima uns 3% ao longo de um minuto, parada para quem pede menos
  movimento). O clima, a trilha e o ambiente continuam valendo por cima.
- **Retratos embaixo**: quem está na cena (os personagens de jogador e os NPCs
  que o Mestre escolher), com a moldura de nível já pronta. Quem fala acende,
  como a vez acende hoje.
- **Falas**: o balão de fala que existe (retrato + texto) vira legenda grande
  embaixo, no estilo de visual novel, e mantém o histórico das últimas falas.
- **O que não existe nesse modo**: grade, régua, névoa, tokens soltos. O Mestre
  volta ao mapa com um clique e os tokens estão onde estavam.
- **Segredo**: NPC que o Mestre não escolheu mostrar nunca chega ao jogador. Vale
  a mesma regra do token escondido, porque o retrato sai da mesma lista.
- Fica melhor com a leva 3 do plano anterior ("Mostrar imagem"), que já precisa
  da liberação curta de imagem no Acervo.

### B1. Gatilhos de terreno (M a G)

Generaliza o portal, que já tem a conta feita (`portal_atingido`, decidido no
servidor ao gravar a posição, com o escondido sem aviso).
- **O que é**: uma zona (casa, retângulo, círculo ou polígono) da cena, só do
  Mestre, que reage quando um token entra. Guardada em
  `mapa_cenas.estrutura.gatilhos`, sem migração, como portas e portais.
- **Ações possíveis**: mostrar um texto a quem pisou ("Você sente o chão ceder"),
  mostrar um texto a todos, trancar ou abrir uma porta, tocar um efeito de magia
  ou de clima, tocar um som, e **mostrar ao Mestre o cartão da armadilha** do
  Perigos do Ambiente (queda, laje oca etc.), com a regra, a DT e o dano já
  escritos no Livro.
- **Por padrão pergunta ao Mestre**: aparece "Ana pisou em Laje oca. Disparar?"
  com os botões de disparar e ignorar. Só texto, som e porta podem disparar
  sozinhos, e só se o Mestre ligar isso naquela zona. O dano e a Condição nunca
  são aplicados sem o Mestre apertar.
- **Uma vez ou sempre**, e "só jogador" ou "qualquer token".
- **Na tela do Mestre**: zonas pontilhadas, com o ícone da ação, só dele.
- **Servidor**: `normalizar_gatilhos`, um teto por cena, e a mesma entrada do
  arrasto em tempo real e da rota de mover (o token que cruza uma zona entre dois
  pontos também dispara, não só o ponto onde soltou).
- **Teste importante**: gatilho escondido não aparece no GET do jogador nem no
  tempo real.

### B2. Elevação e telhados (M, em duas partes)

**Altura no token (P).** Um campo "altura em metros" (voo, escalada, buraco) no
menu do token e um selo "↑ 6 m". A régua e a magia passam a medir em 3D
(Pitágoras com a diferença de altura), e o selo some quando é 0. Soltar um token
de uma altura para o chão mostra ao Mestre o cartão de **Queda** do Perigos do
Ambiente (não aplica o dano sozinho).

**Telhado inteligente (M).** No construtor, uma sala ganha a opção "Telhado": uma
peça na camada alto que cobre a sala. Na mesa, o telhado desenha opaco e **some
com um fade quando um token que a pessoa vê entra na sala**, e volta ao sair. A
decisão é do navegador, em cima de tokens que ele já conhece, então não precisa de
servidor nem vaza nada (com a visão por paredes ligada, o interior já só aparece
a quem enxerga lá dentro). O Mestre tem a chave "telhado sempre aberto".

### B3. Condições com contorno e lembrete na virada (M)

- **Contorno animado**: cada condição ou aflição ganha um estilo no token feito
  com as partículas e shaders do clima e da magia: Queimando solta brasas,
  Envenenado pulsa em verde, Congelado cria cristais na borda, Sangrando goteja.
  Fica numa tabela curta (`motor/estadosToken.ts`), com o chip de hoje por cima.
  Desligável por aparelho, e parado para quem pede menos movimento.
- **Lembrete do dano contínuo**: quando a vez de um token com condição de efeito
  por turno chega (ex.: Queimando, "1d6 de Fogo no fim do turno"), o dono e o
  Mestre recebem um aviso "Marcos está Queimando: 1d6 de Fogo" com o botão
  **Rolar**, que rola no servidor e registra nas Rolagens. Aplicar na Vida segue
  sendo um clique do Mestre.
- **De onde vem o número**: as condições são texto no catálogo
  (`data/regras/condicoes.ts`). Um script lê as frases de efeito por turno e gera
  um arquivo derivado, com teste que falha se uma frase fugir do padrão. Nenhum
  campo mecânico vira editável, e o que o script não entender fica sem lembrete
  (o aviso nunca chuta). As aflições já têm intervalo e dano no catálogo.

### B4. Iniciativa na tela e câmera na vez (P)

- **Faixa de retratos no topo**: a ordem do turno com os retratos (a moldura que o
  token já usa), a vez acesa e a rodada. O jogador só vê quem a Sessão mostra a
  ele, então escondido e desconhecido seguem os degraus que já existem.
- **Câmera suave na vez**: opcional por aparelho, ao virar o turno a tela desliza
  até o token da vez. Padrão ligado só no aparelho do Mestre. O contorno do
  alcance de movimento já existe (Footprints) e liga junto.

### C1. Ressonância entre Fluxos (decisão antes de código)

O que o Gemini descreve ("molhado + raio vira eletrificado") **não é uma regra do
Livro**: o sistema diz que resistência e vulnerabilidade valem por elemento e que
há 11 Fluxos em círculo de vantagem e desvantagem, mais 11 Fusões de dois
Fluxos, e nenhum desses textos tem uma tabela de reação entre elementos no chão.
Fazer a tela primeiro seria criar regra por baixo dos panos.

Há duas metades:
- **A metade neutra, que cabe já (M):** **Zonas persistentes de magia.** Uma magia
  de área com duração em rodadas ("Fumaça de 3 m, cobertura parcial até o começo
  do próximo turno") deixa uma marca no mapa (círculo na cor do Fluxo, com o nome
  e o tempo que falta) que **some sozinha** quando a duração acaba, contada pelo
  turno da Sessão. É só um lembrete visual do que o Livro já diz e serve a todas
  as magias de área. Entra com a ponte da ficha.
- **A metade de regra (do Pedro):** uma tabela curta de **reações de terreno**
  ("Água + Raio: a área fica eletrificada por 1 rodada") só vira tela depois de o
  Pedro decidir o texto e os números. Se ele quiser, o desenho é: o Mestre marca
  a zona com um rótulo (Molhado, Em chamas, Gelo, Eletrificado), e o VTT mostra o
  cartão da reação quando uma magia compatível cai sobre ela, sem aplicar nada.

### C2. Linha de visão e cobertura (M)

- **Ferramenta**: segurar Alt e levar o mouse de um token a outro (ou clicar em
  dois) traça uma linha com a distância em metros e o resultado: **sem
  cobertura**, **cobertura parcial (+2 de Defesa)**, **cobertura superior
  (+5)** ou **cobertura total (não pode ser alvo direto)**, que são exatamente os
  nomes e valores do Livro de Regras.
- **Cobertura total** vem das paredes que o servidor já tem: linha bloqueada por
  parede, porta fechada ou porta secreta. Janela e porta aberta deixam passar.
- **Cobertura parcial e superior** vêm de uma marca nas peças do construtor
  (`cobertura: nenhuma | parcial | superior`). A mobília do Jardim já nasce com um
  padrão (mesa e barril parcial, coluna e estátua superior), e o Mestre muda
  peça a peça. É só dado de cena, não regra nova.
- **Quem calcula**: o servidor (`POST .../linha`), porque as paredes não vão ao
  jogador. O jogador só pergunta entre dois tokens que ele já enxerga, e a
  resposta é só o resultado, sem a posição das paredes.
- **É uma dica**: o número aparece na tela, o Mestre aplica como quiser (nada
  vira Defesa sozinho). Combina com o alcance da magia na ponte da ficha, que
  passa a dizer "fora do alcance" e "sem linha de visão".

### C3. Quadro de investigação (G, fora do mapa)

Uma página na campanha, não dentro do canvas do mapa: **O Quadro**.
- **Cartões**: nota, imagem do Acervo, documento do Mestre e NPC do Registro
  Universal. **Linhas** ligando cartões, com rótulo ("viu com", "pagou a").
  Arrastar, zoom e tela infinita no Pixi que o mapa já usa.
- **Quem vê o quê**: cartão e linha criados pelo Mestre podem ser "só dele"
  (rascunho de teoria) ou "da mesa". O jogador cria os próprios cartões, e o
  Mestre os vê. Imagem e documento só entram se o Mestre já mostrou aquilo à mesa
  (nada vaza por arrastar um cartão).
- **Tempo real**: mesmo molde da `mesa` do mapa (um documento por campanha, versão
  e diferença pelo tempo real). Conflito é o último que mexeu no cartão. Teto de
  cartões e de linhas por quadro, e o quadro entra em `TABELAS` do backup.
- **Casa com o que já existe**: a classe Detetive, a cena de Investigações do
  Livro e os Documentos universais. É a maior peça deste lote e só vale para
  campanhas de investigação, então fica por último.

### D1. Ping com contexto (P)

- Clique ou Alt + clique: o ping de hoje.
- **Shift + clique**: ping de perigo, vermelho e com o som mais seco.
- **Ctrl + clique** (só no Mestre): puxa a tela de todos para onde ele está
  olhando, a mesma ação do menu "Trazer todos para a minha vista", agora num
  gesto. Jogador não puxa a tela de ninguém, mas segue pedindo pela Central.
- A mensagem `ping` ganha um campo `tipo` conferido no servidor (normal ou
  perigo) e o mesmo limite de envios.

### D2. Nota do jogador no token (P)

Uma aba "Minhas notas" no menu do token do próprio personagem, ao lado das artes e
do loot: munição, objetivo pessoal, segredo. **O Mestre também lê**, como o
Gemini descreveu, e os outros jogadores nunca.
- A decisão é de onde guardar: reaproveitar o campo de notas da ficha (aparece nos
  dois lugares, nada de dado duplicado) ou um campo novo no token. A primeira é
  melhor, e o servidor já esconde a ficha dos outros jogadores.
- Sem migração se for pela ficha. O salvamento é o mesmo da nota do Mestre
  (guarda sozinho pouco depois de parar de digitar).

### D3. Modo espectador e streamer (P e depois G)

**Etapa 1, URL limpa (P).** `/mapa?limpo=1` esconde toda a interface, o menu, o
cursor e os avisos, mostrando só o mapa, para usar como fonte do OBS. Fica
amarrada ao papel de quem abriu a página: **o Mestre transmitindo vê o recorte
dele**, então a Etapa 1 inclui um **"Ver como jogador"** (a página pede o estado
com o recorte de jogador, o servidor entrega só o que um jogador recebe). Sem
isso o Mestre abriria o OBS com tudo à mostra.
**Etapa 2, link de espectador (G, só se o Pedro quiser).** Um papel novo
"espectador" com link de validade curta, que recebe o recorte de "jogadores sem
personagem" e nada mais, sem login. É a parte delicada: mexe em autenticação e em
tempo real, e só vale se alguém de fato transmitir.

## 3. Ordem geral, juntando os dois documentos

Junta as 4 levas de `INSPIRACAO_OWLBEAR_TTS.md` com esta lista. A ordem pensa
no que muda mais a mesa por esforço, e deixa o que mexe em regra para depois de
o Pedro decidir.

1. **Pequenas e seguras** (tudo P): régua dobrada, dado visto por todos, ping
   com contexto, nota do jogador no token, faixa de retratos e câmera na vez,
   altura no token, efeitos pontuais no mixer, e a Etapa 1 do modo espectador
   (com "Ver como jogador").
2. **Desenho livre e setas.** (M, do outro documento.)
3. **O Mestre montando a mesa:** estados do token por tecla, encontros salvos e
   limpar a cena, fonte de tokens.
4. **A ficha conversa com o mapa:** ponte ficha para mapa com alcance e área da
   magia, resultado flutuante, e **Zonas persistentes de magia** (C1, metade neutra).
5. **Régua de combate completa:** linha de visão e cobertura (C2), que usa o
   alcance da etapa 4.
6. **Cena do Mestre de verdade:** gatilhos de terreno (B1), Cena Narrativa (A3),
   mostrar imagem do Acervo e telhado inteligente (B2).
7. **Visual:** estilos de efeito por tipo de dano e contornos de condição (B3).
8. **Por último:** quadro de investigação (C3) e o link de espectador (D3, etapa 2).

Fica fora até o Pedro decidir a regra: **reações de terreno** (C1, metade de
regra).

## 4. Decisões para o Pedro

1. **Reações de terreno (molhado + raio...):** quer escrever essa regra no Livro
   primeiro, ou deixa de fora? (Sem regra escrita, não faço a tela.)
2. **Gatilhos:** concorda que o padrão é perguntar ao Mestre antes de disparar,
   e só texto, som e porta disparam sozinhos quando ele ligar? (recomendado)
3. **Dano contínuo:** o VTT só lembra e rola, e aplicar na Vida é clique do
   Mestre? (recomendado)
4. **Nota do jogador:** guardar nas notas da ficha, para o Mestre ler as mesmas?
   (recomendado)
5. **Modo espectador:** só a URL limpa com "Ver como jogador", ou também o link
   de espectador sem login? (recomendado: só a limpa por enquanto)
6. **Cena Narrativa:** o fundo anda devagar (parallax leve) por padrão, ou fica
   parado e o Mestre liga? (recomendado: anda, com opção de parar)
7. **Ordem:** segue a lista da seção 3, ou há algo que a sua mesa precisa antes?

## Referências

- `INSPIRACAO_OWLBEAR_TTS.md` (primeira lista), `PLANO.md`,
  `CONSTRUTOR_E_EXTENSOES.md`, `TEMPO_REAL.md`.
- Livro de Regras: Combate (cobertura, Ver e ser visto, condições), Perigos do
  Ambiente (queda e armadilhas), Condições e Aflições, Investigações.
