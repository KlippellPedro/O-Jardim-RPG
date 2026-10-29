# Revisão do Divino

Raça especial de deuses e semideuses: nove Domínios, escada 1 / 18 / 48 e a regra da fé (bônus por número de fiéis, confirmados pelo Mestre). Os Domínios estão bem equilibrados entre si e quase todos dizem o teste e o que o sucesso faz. O problema grande é a distância entre Deus e Semideus, e o pequeno é o teste "contra o seu Carisma", que aparece em onze habilidades.

## Achados (do mais grave ao menos grave)

- [ERRO] `regra_fe`: "o nível da fé só muda quando o mMestreconfirmar", palavra colada. O mesmo defeito estava em sete textos do Espírito. *(Aplicado nos oito.)*
- [ERRO] `tempestade / raio-divino`, `ceu-em-furia`, `senhor-da-tempestade` (`descricao` e `dano`): "dano elétrico". *(Aplicado: "dano de raio".)*
- [INCOERÊNCIA] `naturezas_divinas / deus` × `semideus`: o Deus soma +6 Vida, +8 Mana, +4 Estamina e +2 Defesa só por ser Deus, e mais até +6 Vida e +12 Mana pela fé. Com isso o Divino Deus tem pacote 25 no nível 1 (43 com grande culto), o maior do jogo nessa altura; o segundo é o Autômato Enorme, com 15. O Semideus não recebe nada no lugar, então ninguém escolhe Semideus por regra. → Ver Decisão 7.
- [INCOERÊNCIA] onze testes "contra o seu Carisma": Nome de Batalha, Acordo Divino, Raízes que Prendem, Mundo Selvagem, Raio Divino, Céu em Fúria, Senhor da Tempestade, Sol nas Mãos, Toque Frio, A Hora Chegou e Parar o Coração. → Ver Decisão 1. Sugestão: Religião.
- [INCOERÊNCIA] `natureza / terra-viva` (18): para inimigos, 2d6 no começo de cada turno, sem teste e sem tipo. → Ver Decisão 5.
- [MELHORIA] `luz / sol-nas-maos`, `morte / toque-frio`, `morte / a-hora-chegou`, `morte / parar-o-coracao`: dano sem tipo. → Luz no Sol nas Mãos; nos três da Morte, pergunta para o questionário final (Escuridão ou o Fim).
- [MELHORIA] `guerra / furia-sagrada`: marcada como automatizada (`automatizada: true`), mas o efeito (vantagem no primeiro ataque de cada combate, +1d6 no primeiro acerto) é de mesa e a ficha não aplica sozinha. → `automatizada: false`.
- [MELHORIA] `forma-maior / forma-divina`: "não pode ser derrubado". → "não pode ficar Caído".
