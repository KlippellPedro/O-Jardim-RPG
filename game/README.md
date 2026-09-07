# Jogo 2D de O Jardim — Fase 1 aprovada, Fase 2 em andamento

Esta pasta guarda o jogo 2D de **O Jardim RPG**. A pré-produção está fechada.
A Fase 1 (movimento, esquiva, ataque, hitbox/dano, inimigo, boneco de treino)
foi jogada pelo Pedro e aprovada na reação inicial. A Fase 2 (prova visual)
começou em 02/09/2026 pelo ambiente: uma primeira sala de Întuneric com
parallax e iluminação de humor, enquanto a arte de personagem/monstro de
verdade fica pro Pedro desenhar (ver `docs/GUIA_DE_ARTE.md`) — o visual
atual dos personagens é geométrico e explicitamente provisório.

## Documentação

- [docs/PLANEJAMENTO_INICIAL.md](docs/PLANEJAMENTO_INICIAL.md) — plano
  completo, decisões e histórico.
- [docs/VISAO_DO_JOGO.md](docs/VISAO_DO_JOGO.md) — pitch, pilares e loop
  principal.
- [docs/KITS_COMBATE.md](docs/KITS_COMBATE.md) — os cinco kits de combate.
- [docs/BIBLIA_VISUAL.md](docs/BIBLIA_VISUAL.md) — regras de paleta,
  silhueta, luz, animação tradicional e composição em camadas.
- [docs/GUIA_DE_ARTE.md](docs/GUIA_DE_ARTE.md) — como desenhar os
  personagens/monstros quadro a quadro e os fundos em camadas (o Pedro
  decidiu desenhar ele mesmo, não contratar nem usar IA de imagem).
- [docs/BRIEF_VISUAL_INTUNERIC.md](docs/BRIEF_VISUAL_INTUNERIC.md) — primeira
  composição-alvo para validar personagem, cenário e parallax juntos.

## Estrutura do projeto Godot

Godot 4.7.2-stable, GDScript, renderer GL Compatibility. Abrir
`project.godot` direto nesta pasta.

- `scenes/arena/arena_teste.tscn` — a arena cinza da Fase 1: jogador,
  inimigo e boneco de treino, sem arte de produção. Continua sendo a cena
  principal (a que roda com F5).
- `scenes/regioes/sala_intuneric.tscn` — castelo: parallax (céu/lua/
  silhueta de castelo, árvores retorcidas, névoa), tom frio com um único
  ponto quente (janela acesa), seguindo `BIBLIA_VISUAL.md`.
- `scenes/regioes/colonia_intuneric.tscn` — colônia: prédios altos e
  apertados, sem NENHUM ponto quente (de propósito — é a pista visual que
  diferencia o poder do castelo da opressão da colônia, sem precisar de
  texto). Nenhuma das duas é a cena principal — abrir e dar F6 (rodar cena
  atual) pra testar.
- `scenes/personagem/jogador.tscn` — o personagem jogável completo
  (movimento, combate, vida, visual), reaproveitado nas duas cenas acima
  em vez de duplicado.
- `scenes/personagem/visual_ayato.tscn` — o visual do Ayato: formas
  geométricas (sem textura), **provisório** até o Pedro desenhar a arte de
  verdade (ver `docs/GUIA_DE_ARTE.md`).
- `scenes/inimigo/inimigo.tscn` e `boneco_treino.tscn` — os dois alvos de
  teste do plano.
- `scripts/personagem/personagem_controller.gd` — movimento, esquiva
  (com invulnerabilidade) e ataque (liga/desliga o Hitbox).
- `scripts/combate/` — os componentes reutilizáveis: `vida.gd` (vida/dano/
  invulnerabilidade, usado por jogador/inimigo/boneco), `hitbox.gd`
  (aplica dano em quem entrar), `hurtbox.gd` (ponte pro `Vida` do dono) e
  `impacto.gd` (autoload, hit-stop a cada acerto).
- `scripts/inimigo/` — `inimigo_controller.gd` (patrulha e machuca no
  toque) e `boneco_treino.gd` (só apanha, vida praticamente infinita).
- `assets/` — reservado pra sprites/áudio de produção; vazio até ter arte
  de verdade (ver `docs/GUIA_DE_ARTE.md`).
- `referencias/` — moodboard local, **gitignored de propósito** (ver
  `referencias/fontes.md` pra status de licença). Nunca vira asset final.

7 camadas de física 2D nomeadas em Project Settings > Layer Names, pra
separar corpo físico de hitbox/hurtbox de cada lado: `Cenario`, `Jogador`,
`Inimigo`, `HitboxJogador`, `HitboxInimigo`, `HurtboxJogador`,
`HurtboxInimigo`.

Ações de entrada já configuradas em Project Settings > Input Map:
`mover_esquerda`, `mover_direita`, `pular`, `esquivar`, `atacar` (clique
esquerdo ou J). Faltam as ações de habilidade/Fluxo/especial dos cinco
kits — entram junto com a Fase 3 (contrato de personagem), não antes.

**Como verificar mudanças de cena/script antes de testar na tela:** o
Godot está instalado em `%LOCALAPPDATA%\Godot\`. Rodar headless numa CÓPIA
do projeto (pra não brigar com o editor aberto) pega erro de carregamento
sem precisar abrir janela nenhuma:

```powershell
Copy-Item -Recurse -Force game "$env:TEMP\godot_check"
& "$env:LOCALAPPDATA\Godot\Godot_v4.7.2-stable_win64_console.exe" --headless --path "$env:TEMP\godot_check" --quit-after 10
```

Pra checar uma cena que não é a principal, acrescente o caminho dela antes
de `--quit-after`, por exemplo `"res://scenes/regioes/sala_intuneric.tscn"`.
Já pegou um bug real (ver `docs/PLANEJAMENTO_INICIAL.md`, Fase 2) antes de
qualquer teste manual.

## Ao retomar (se ficar parado de novo)

1. reler o planejamento e confirmar as decisões pendentes;
2. reler [`../docs/EDITOR_CONTEUDO_CAMPANHA.md`](../docs/EDITOR_CONTEUDO_CAMPANHA.md)
   antes de integrar lore, cronologia, regras ou conteúdo publicado;
3. conferir novamente os dados e as versões atuais das ferramentas;
4. continuar pela Fase 1 (prova de diversão: combate, hitbox, inimigo,
   boneco de treino) antes de qualquer arte de produção.

Não colocar nesta pasta exportações finais, segredos, tokens, snapshots privados
ou material sem licença de uso confirmada.
