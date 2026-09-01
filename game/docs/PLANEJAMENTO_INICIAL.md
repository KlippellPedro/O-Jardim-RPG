# Planejamento inicial — jogo 2D de O Jardim RPG

**Estado:** ideia documentada e pausada  
**Data do levantamento:** 30 de agosto de 2026  
**Natureza:** pré-produção; as propostas criativas abaixo não são lore canônica

## Objetivo

Investigar um jogo 2D de ação e exploração, inspirado pela sensação de um
metroidvania como *Hollow Knight*, mas com identidade própria de O Jardim. O
principal diferencial seria poder usar personagens criados na plataforma do
RPG sem reduzir o resultado a um jogo simples, genérico ou visualmente sem
personalidade.

O objetivo inicial não é reproduzir a escala de *Hollow Knight*. É construir um
trecho curto com movimento, combate, arte, áudio e integração suficientes para
provar que a proposta é divertida e tem qualidade.

## Contexto técnico já existente

O repositório não começaria do zero. No levantamento desta data, ele já possuía:

- frontend React/TypeScript;
- API FastAPI e PostgreSQL;
- contas, campanhas, personagens e seleção de personagem ativo;
- ficha flexível em JSON, com concorrência otimista por versão;
- carteira e inventário centralizados fora do JSON da ficha;
- classes, raças, perícias, Legados, equipamentos e magia em `data/`;
- sessão de mesa, iniciativa, participantes e avisos em tempo real;
- conteúdo oficial separado de publicações editoriais globais e por campanha.

O catálogo observado possuía 28 classes, 25 entradas de raça e 11 Fluxos. A
documentação de dados registrava 330 magias, além de rituais, selos e
encantamentos. Esses números são um retrato da data do levantamento e precisam
ser recalculados quando o projeto for retomado.

Consequência: a plataforma atual pode ser a fonte da identidade do personagem,
mas o jogo precisa de uma camada própria de adaptação. Tentar executar
automaticamente todo texto narrativo da ficha produziria regras ambíguas e um
escopo inviável.

## Direção de jogo recomendada

Um jogo solo de ação e exploração lateral, com estrutura de
**metroidvania de expedições**:

- um pequeno hub no Jardim;
- portais ou manifestações que levam a regiões associadas às Árvores;
- mapas artesanais com caminhos interligados, atalhos e segredos;
- combate responsivo, chefes e habilidades de travessia;
- capítulos ou expedições que permitam acrescentar regiões gradualmente;
- personagens diferentes compartilhando a mesma campanha de jogo.

### Gancho criativo provisório

Uma manifestação instável do Jardim poderia gerar “ecos” dos personagens e
levá-los a regiões fraturadas das Árvores. Isso explicaria personagens de
campanhas, níveis e origens diferentes no mesmo espaço e permitiria separar a
progressão do videogame da ficha de mesa.

Esse gancho é apenas uma proposta de design. Não deve ser promovido a lore nem
publicado sem aprovação explícita do Criador.

## Tradução da ficha para o jogo

O jogo não deve consumir a ficha inteira e tentar interpretar descrições em
linguagem natural. A API deve produzir um **manifesto jogável**, sanitizado e
versionado, a partir de adaptadores escritos e testados.

| Campo do RPG | Uso proposto no jogo |
| --- | --- |
| Nome e retrato | Identidade, seleção e diálogos |
| Árvore | Origem, apresentação e possíveis afinidades narrativas |
| Raça | Aparência modular, uma passiva e, quando adequado, mobilidade |
| Classe | Arquétipo, ataques e habilidades principais |
| Fluxo | Magias, tipo de efeito, paleta e efeitos visuais |
| Poderes | Habilidades equipáveis somente quando houver adaptador explícito |
| Armas e itens | Equipamentos reconhecidos por uma lista compatível |
| Atributos | Valores normalizados para as escalas do jogo de ação |
| Nível | Libera opções; não é copiado diretamente como poder bruto |

Um kit jogável de referência teria:

- movimento, pulo, esquiva e ataque básico;
- duas habilidades de classe;
- uma manifestação do Fluxo;
- uma técnica especial;
- uma passiva racial;
- arma e acessórios suportados.

Conteúdo ainda não adaptado deve aparecer como não suportado, sem criar efeitos
por adivinhação. Uma ficha pode manter nome e aparência mesmo que parte de seu
kit ainda não tenha implementação.

## Progressão e integridade

Na primeira versão, a integração deve ser **somente leitura**:

- importar o personagem não altera a ficha da mesa;
- XP, desbloqueios e save do videogame vivem num perfil separado;
- recompensas do jogo não entram automaticamente na carteira ou inventário da
  campanha;
- o cliente nunca recebe chave interna dos bots ou credencial administrativa;
- nenhuma decisão importante de economia pode confiar no executável do jogador.

Caso recompensas sincronizadas sejam desejadas no futuro, o servidor precisará
validar e autorizar os resultados. Um jogo cliente pode ser modificado e não é
uma fonte confiável para moeda, itens ou progressão oficial.

## Integração proposta com a plataforma

Fluxo de autenticação recomendado para uma aplicação nativa:

1. o jogo solicita e mostra um código temporário;
2. o jogador confirma o código no site já autenticado;
3. a API entrega um token curto, revogável e limitado ao jogo;
4. o jogo lista os personagens permitidos;
5. um endpoint próprio entrega apenas o manifesto jogável publicado.

Não enviar ao jogo:

- senha do usuário;
- `SERVICE_API_KEY`;
- rascunhos editoriais;
- `corpoMestre`;
- conteúdo oculto para aquele personagem ou campanha;
- o JSON completo quando o manifesto sanitizado for suficiente.

O Mundo efetivo continua seguindo
[`../../docs/EDITOR_CONTEUDO_CAMPANHA.md`](../../docs/EDITOR_CONTEUDO_CAMPANHA.md):
base oficial em `data/`, publicação global e, onde aplicável, publicação da
campanha. O jogo deve consumir somente conteúdo resolvido e autorizado pela
API, nunca snapshots editoriais diretamente.

## Tecnologia recomendada no levantamento

- **Motor:** Godot 4;
- **linguagem:** GDScript;
- **primeiro alvo:** Windows, teclado e controle;
- **estrutura:** projeto em `game/`, mantendo referências por ID aos dados
  oficiais;
- **dados específicos:** adaptadores próprios do jogo, sem alterar a semântica
  das regras de mesa;
- **testes:** validação do contrato do manifesto no backend e testes de lógica
  do jogo executáveis sem interface quando possível.

Em 30 de agosto de 2026, a versão estável observada era Godot 4.7.2. A versão
deve ser confirmada novamente antes de criar `project.godot`. GDScript foi
preferido por simplicidade e por manter possível uma demonstração Web; na data
do levantamento, Godot 4 com C# ainda não tinha exportação Web oficial.

Fontes verificadas na data:

- <https://godotengine.org/download/archive/>
- <https://docs.godotengine.org/en/stable/tutorials/2d/introduction_to_2d.html>
- <https://docs.godotengine.org/en/stable/tutorials/animation/2d_skeletons.html>
- <https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html>

## Direção visual recomendada

Os fundos e modelos existentes ajudam a indicar clima, mas não constituem um
pacote completo de produção para um jogo 2D. Ainda seriam necessários sprites
ou personagens recortados, animações, inimigos, objetos, cenários em camadas,
colisões, interface, efeitos e áudio de combate.

Direção sugerida:

- cenários 2D pintados, sombrios e com silhueta clara;
- parallax, luzes 2D, partículas e shaders;
- personagens montados em camadas sobre um esqueleto 2D compartilhado;
- roupas, armas, cabeça e detalhes raciais modulares;
- retrato original do personagem em seleção e diálogo;
- linguagem visual distinta para cada Fluxo;
- animações com boa antecipação, impacto, pausa curta no acerto e resposta
  sonora forte.

O sistema modular reduz o custo de animar vários personagens. Mesmo assim,
arte e animação provavelmente serão o maior gargalo de produção. Todo asset
existente ou novo precisa ter autoria e licença verificadas antes de uma
publicação, sobretudo se houver intenção comercial.

## Primeiro vertical slice

Escopo de referência, ainda sujeito a aprovação:

- jogo solo para Windows;
- teclado e controle;
- um hub pequeno;
- uma região artesanal ligada a uma única Árvore;
- cerca de 10 a 15 salas interligadas;
- atalhos, checkpoint, save e pelo menos um segredo;
- três famílias de inimigos;
- um mini-chefe e um chefe;
- três personagens reais representando corpo a corpo, distância e magia;
- uma cena narrativa curta;
- interface, som, partículas e iluminação próximos da direção final.

Essas quantidades são limites de escopo propostos, não estimativas garantidas
de prazo ou custo.

## Ordem de produção

### Fase 0 — decisões de pré-produção

- escolher três personagens reais como casos de teste;
- definir Windows ou Web como alvo prioritário;
- confirmar solo ou cooperativo;
- aprovar a direção visual;
- escolher a primeira Árvore e o enquadramento narrativo;
- escrever os kits jogáveis desses personagens;
- verificar licença dos assets que servirão como referência ou produção.

### Fase 1 — prova de diversão

- personagem temporário numa arena cinza;
- correr, pular, cair, esquivar e atacar;
- hitboxes, dano, invulnerabilidade, câmera e controle;
- um inimigo e um boneco de treino;
- testar repetidamente antes de produzir conteúdo visual.

Não incluir banco, login, lore completa ou criação modular nesta fase.

### Fase 2 — prova visual

- uma sala com aparência próxima do resultado final;
- um personagem modular animado;
- um inimigo finalizado;
- iluminação, parallax, partículas, impacto e áudio;
- teste de desempenho no hardware-alvo.

### Fase 3 — contrato de personagem

- definir o schema versionado do manifesto jogável;
- criar adaptadores para os três personagens;
- validar IDs de classe, raça, Fluxo, poderes e itens;
- implementar vínculo por código temporário;
- garantir que a API só exponha conteúdo autorizado e publicado.

### Fase 4 — vertical slice

- hub, região, salas, atalhos e checkpoints;
- três famílias de inimigos;
- mini-chefe e chefe;
- narrativa curta;
- save separado da ficha;
- interface, acessibilidade básica e suporte a controle;
- testes com jogadores e revisão do escopo.

### Fase 5 — decisão de produção

Somente após testar o vertical slice decidir entre:

- metroidvania maior e contínuo;
- capítulos artesanais por Árvore;
- expedições repetíveis com hub;
- combinação controlada dessas estruturas.

## Fora do primeiro escopo

- implementar as 28 classes de uma vez;
- adaptar todas as raças, magias e equipamentos;
- multiplayer ou cooperativo online;
- PvP;
- mundo procedural completo;
- sincronizar recompensas com a economia oficial;
- reproduzir literalmente níveis e fórmulas da mesa;
- permitir que o jogo edite lore ou regras;
- publicar, empacotar ou distribuir antes da validação do vertical slice.

Multiplayer deve ser tratado como um projeto próprio, porque altera arquitetura,
combate, câmera, pausa, save, segurança e testes.

## Riscos principais

1. **Escopo:** muitas combinações de classe, raça, Fluxo, poderes e itens.
2. **Arte:** qualidade visual exige um pipeline consistente, não apenas fundos.
3. **Animação:** corpos muito diferentes podem quebrar um rig modular único.
4. **Ambiguidade:** textos narrativos não são regras executáveis.
5. **Balanceamento:** níveis de mesa não cabem diretamente num jogo de ação.
6. **Segurança:** o cliente não pode decidir recompensas oficiais.
7. **Conteúdo privado:** rascunhos e campos de Mestre não podem chegar ao jogo.
8. **Licenças:** imagens, músicas, fontes e referências precisam de procedência.
9. **Manutenção:** IDs oficiais podem evoluir; adaptadores precisam de testes.

## Decisões pendentes para a retomada

1. O alvo inicial será Windows ou navegador?
2. O primeiro jogo será estritamente solo?
3. Quais três personagens existentes serão os casos de teste?
4. Qual Árvore receberá a primeira região?
5. O visual será pintura recortada, animação quadro a quadro, pixel art ou 2.5D?
6. O personagem precisa reproduzir exatamente sua aparência ou uma manifestação
   estilizada é aceitável?
7. A experiência será canônica, paralela ou explicitamente uma simulação?
8. O jogo será gratuito, privado para a mesa ou candidato a lançamento público?

## Checklist de retomada

- [ ] Recontar classes, raças, Fluxos e conteúdo mágico atual.
- [ ] Revisar alterações feitas na ficha e na API desde agosto de 2026.
- [ ] Ler novamente a documentação editorial.
- [ ] Escolher três personagens e registrar seus dados permitidos.
- [ ] Escrever uma página de visão do jogo.
- [ ] Escrever os três kits de combate.
- [ ] Fazer uma pequena bíblia visual.
- [ ] Confirmar licenças dos assets de referência.
- [ ] Confirmar a versão estável do Godot e plataformas suportadas.
- [ ] Criar o projeto Godot somente depois dessas decisões.
- [ ] Construir a prova de diversão antes da integração com a plataforma.

## Resumo da decisão atual

A ideia é tecnicamente viável porque O Jardim já tem dados estruturados e uma
plataforma de personagens. A abordagem recomendada é importar a identidade da
ficha por uma API segura e converter somente conteúdos com adaptadores
explícitos. O primeiro objetivo deve ser um vertical slice solo, pequeno e
visualmente convincente. O projeto permanece pausado até que as prioridades
atuais do RPG sejam concluídas.
