// O `id` continua sendo o mesmo slug da Deidade (usado nas rotas /deidades/{id},
// no localStorage e nos nomes dos .glb) — só o `titulo` (nome da Árvore, exibido
// no globo 3D) e o `rgb` (cor da Árvore) mudaram, seguindo a tabela de
// referência "Estrutura do Jardim". A Deidade (Aethel, Ousias...) continua
// sendo o nome usado nas páginas de detalhe/prosa importadas.
//
// `keryx` é um caso especial: a Árvore Parley foi subjugada pela A.X.I.S (o
// Fluxo tecnológico de Jota Macedo) — fisicamente é a mesma Árvore/local, só
// que agora dominada por uma gaiola artificial (ver modeloId: 'axis' e
// tools/blender/generate_tree.py --mode axis). `titulo`/`rgb` passam a
// refletir a identidade dominante (A.X.I.S, neon) em todo canto que já lê
// esses campos (breadcrumbs, cor de destaque nas páginas de detalhe...);
// `tituloSubjugada`/`rgbSubjugada` guardam a identidade original (Parley,
// prata) só pra o efeito de reflexo/glitch no rótulo 3D (ver tree3d.js) —
// um sinal de que Parley ainda existe, fraca, por baixo do controle da A.X.I.S.
//
// `mulher-carmesim` também é um caso especial: `isolada: true` faz a cena 3D
// (tree3d.js) plantar a cúpula dela num canto fixo e isolado, fora do
// espalhamento/relaxamento comum das outras Árvores — reflete a lore (ela "é
// e não é uma Árvore", representa o Fim de tudo).
export const ARVORES = [
  { id: 'aethel',          titulo: 'Gênese',   rgb: '214,120,156' }, // Rosa
  { id: 'ousias',          titulo: 'Alétheia', rgb: '222,198,88'  }, // Amarelo
  {
    id: 'keryx', titulo: 'A.X.I.S', rgb: '53,216,236', // Azul-neon artificial
    modeloId: 'axis', subjugada: true,
    tituloSubjugada: 'Parley', rgbSubjugada: '192,198,206', // Prata (identidade original)
  },
  { id: 'haemus',          titulo: 'Anima',    rgb: '86,172,92'   }, // Verde
  { id: 'ignis',           titulo: 'Vórtice',  rgb: '222,114,42'  }, // Laranja
  { id: 'moros',           titulo: 'Baluarte', rgb: '116,82,52'   }, // Marrom
  { id: 'aperion',         titulo: 'Matriz',   rgb: '132,84,188'  }, // Roxo
  { id: 'chronus',         titulo: 'Éon',      rgb: '168,138,72'  }, // Dourado envelhecido
  { id: 'erebus',          titulo: 'Abismo',   rgb: '34,30,40'    }, // Preto
  { id: 'mulher-carmesim', titulo: 'Limiar',   rgb: '134,28,48', isolada: true }, // Vermelho vinho
];

export function corDaArvore(arvoreId) {
  return ARVORES.find(arvore => arvore.id === arvoreId)?.rgb || '160,160,170';
}
