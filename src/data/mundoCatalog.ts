// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Run python scripts/buildMundo.py to update.

export type LoreType = 'deidade' | 'fluxo' | 'galho' | 'dimensao' | 'reino' | 'personagem' | 'evento';

export interface LoreEntry {
  id: string;
  tipo: LoreType;
  titulo: string;
  conteudo: Record<string, string>;
}

export const MUNDO_CATALOG: LoreEntry[] = [
  {
    "tipo": "deidade",
    "id": "erebus",
    "titulo": "Erebus",
    "conteudo": {
      "epiteto": "Aquele que Flui no Vazio",
      "genero": "Masculino",
      "dominio": "O nada absoluto — guarda a \"saída\" definitiva da existência.",
      "descricao": "Governa o nada absoluto. É a deidade silenciosa que guarda a saída definitiva da existência, sendo o mais temido, neutro e enigmático de todos. Como quase todas as deidades (só Aethel e a Mulher Carmesim escapam disso), está paralisado desde que Keryx foi subjugado por Jota Macedo.",
      "fluxo": "fluxo-do-vazio",
      "status": "paralisada"
    }
  },
  {
    "tipo": "fluxo",
    "id": "fluxo-do-vazio",
    "titulo": "Fluxo do Vazio",
    "conteudo": {
      "arvore": "Abismo",
      "descricao": "[RASCUNHO — PRECISA SER REVISADO] O Fluxo que rege o nada absoluto — o mesmo domínio da deidade Erebus, já que Árvore, Deidade e Fluxo são a mesma entidade."
    }
  },
  {
    "tipo": "galho",
    "id": "abismo-galho-1",
    "titulo": "Galho de Abismo (placeholder)",
    "conteudo": {
      "arvore": "erebus",
      "descricao": "[PLACEHOLDER] Ainda não existe um Galho definido pra Árvore de Abismo em nenhuma fonte. Substitua id/titulo/descricao por um Galho de verdade quando decidir o que existe aqui."
    }
  },
  {
    "tipo": "dimensao",
    "id": "abismo-dimensao-1",
    "titulo": "Dimensão de Abismo (placeholder)",
    "conteudo": {
      "galho": "abismo-galho-1",
      "descricao": "[PLACEHOLDER] Ainda não existe uma Dimensão definida dentro do Galho acima. Substitua quando tiver o conteúdo de verdade."
    }
  },
  {
    "tipo": "deidade",
    "id": "ousias",
    "titulo": "Ousias",
    "conteudo": {
      "epiteto": "Aquela que flui na Essência",
      "genero": "Feminino",
      "dominio": "A alma e a verdade fundamental das coisas — o que define a natureza real de um ser.",
      "descricao": "Governa o que define a alma e a verdade fundamental das coisas. É filosófica e raramente interfere, a menos que a natureza de um ser seja corrompida. Como quase todas as deidades (só Aethel e a Mulher Carmesim escapam disso), está paralisada desde que Keryx foi subjugado por Jota Macedo — sente que algo está errado, mas não confia o bastante nas outras pra agir sozinha.",
      "fluxo": "fluxo-da-essencia",
      "status": "paralisada"
    }
  },
  {
    "tipo": "fluxo",
    "id": "fluxo-da-essencia",
    "titulo": "Fluxo da Essência",
    "conteudo": {
      "arvore": "Alétheia",
      "descricao": "[RASCUNHO — PRECISA SER REVISADO] O Fluxo que rege a alma e a verdade fundamental das coisas — o mesmo domínio da deidade Ousias, já que Árvore, Deidade e Fluxo são a mesma entidade."
    }
  },
  {
    "tipo": "galho",
    "id": "aletheia-galho-1",
    "titulo": "Galho de Alétheia (placeholder)",
    "conteudo": {
      "arvore": "ousias",
      "descricao": "[PLACEHOLDER] Ainda não existe um Galho definido pra Árvore de Alétheia em nenhuma fonte. Substitua id/titulo/descricao por um Galho de verdade quando decidir o que existe aqui."
    }
  },
  {
    "tipo": "dimensao",
    "id": "aletheia-dimensao-1",
    "titulo": "Dimensão de Alétheia (placeholder)",
    "conteudo": {
      "galho": "aletheia-galho-1",
      "descricao": "[PLACEHOLDER] Ainda não existe uma Dimensão definida dentro do Galho acima. Substitua quando tiver o conteúdo de verdade."
    }
  },
  {
    "tipo": "deidade",
    "id": "haemus",
    "titulo": "Haemus",
    "conteudo": {
      "epiteto": "Aquela que flui na Vitalidade",
      "genero": "Ambos",
      "dominio": "O ciclo selvagem da vida — nascer, viver, morrer, renascer — e tudo que a existência tem a oferecer.",
      "descricao": "Entidade de energia bruta e instintiva. Governa o ciclo completo da vida, sempre aproveitando tudo que a existência lhe proporciona. Como quase todas as deidades (só Aethel e a Mulher Carmesim escapam disso), está paralisada desde que Keryx foi subjugado por Jota Macedo.",
      "fluxo": "fluxo-da-vitalidade",
      "status": "paralisada"
    }
  },
  {
    "tipo": "fluxo",
    "id": "fluxo-da-vitalidade",
    "titulo": "Fluxo da Vitalidade",
    "conteudo": {
      "arvore": "Anima",
      "descricao": "[RASCUNHO — PRECISA SER REVISADO] O Fluxo que rege o ciclo selvagem da vida — o mesmo domínio da deidade Haemus, já que Árvore, Deidade e Fluxo são a mesma entidade."
    }
  },
  {
    "tipo": "galho",
    "id": "anima-galho-1",
    "titulo": "Galho de Anima (placeholder)",
    "conteudo": {
      "arvore": "haemus",
      "descricao": "[PLACEHOLDER] Ainda não existe um Galho definido pra Árvore de Anima em nenhuma fonte. Substitua id/titulo/descricao por um Galho de verdade quando decidir o que existe aqui."
    }
  },
  {
    "tipo": "dimensao",
    "id": "anima-dimensao-1",
    "titulo": "Dimensão de Anima (placeholder)",
    "conteudo": {
      "galho": "anima-galho-1",
      "descricao": "[PLACEHOLDER] Ainda não existe uma Dimensão definida dentro do Galho acima. Substitua quando tiver o conteúdo de verdade."
    }
  },
  {
    "tipo": "deidade",
    "id": "moros",
    "titulo": "Moros",
    "conteudo": {
      "epiteto": "Aquele que flui no Físico",
      "genero": "Masculino",
      "dominio": "Peso, gravidade e substância física — sem sua proteção, nada seria sólido e tudo colapsaria em éter.",
      "descricao": "Estóico e pesado. É ele quem dá peso, gravidade e substância física ao mundo. Como quase todas as deidades (só Aethel e a Mulher Carmesim escapam disso), está paralisado desde que Keryx foi subjugado por Jota Macedo.",
      "fluxo": "fluxo-do-fisico",
      "status": "paralisada"
    }
  },
  {
    "tipo": "fluxo",
    "id": "fluxo-do-fisico",
    "titulo": "Fluxo do Físico",
    "conteudo": {
      "arvore": "Baluarte",
      "descricao": "[RASCUNHO — PRECISA SER REVISADO] O Fluxo que rege peso, gravidade e substância física — o mesmo domínio da deidade Moros, já que Árvore, Deidade e Fluxo são a mesma entidade."
    }
  },
  {
    "tipo": "galho",
    "id": "baluarte-galho-1",
    "titulo": "Galho de Baluarte (placeholder)",
    "conteudo": {
      "arvore": "moros",
      "descricao": "[PLACEHOLDER] Ainda não existe um Galho definido pra Árvore de Baluarte em nenhuma fonte. Substitua id/titulo/descricao por um Galho de verdade quando decidir o que existe aqui."
    }
  },
  {
    "tipo": "dimensao",
    "id": "baluarte-dimensao-1",
    "titulo": "Dimensão de Baluarte (placeholder)",
    "conteudo": {
      "galho": "baluarte-galho-1",
      "descricao": "[PLACEHOLDER] Ainda não existe uma Dimensão definida dentro do Galho acima. Substitua quando tiver o conteúdo de verdade."
    }
  },
  {
    "tipo": "deidade",
    "id": "aethel",
    "titulo": "Aethel",
    "conteudo": {
      "epiteto": "Aquela que flui na Origem",
      "genero": "Feminino",
      "dominio": "Criação pura, nascimento de novos Galhos, luz e ordem.",
      "descricao": "Focada na criação pura, Aethel é uma entidade de luz e ordem que zela pelo nascimento de novos Galhos.",
      "fluxo": "fluxo-da-origem",
      "status": "ativa"
    }
  },
  {
    "tipo": "fluxo",
    "id": "fluxo-da-origem",
    "titulo": "Fluxo da Origem",
    "conteudo": {
      "arvore": "Gênese",
      "descricao": "O Fluxo que rege a criação de novos Galhos, a luz e a ordem o mesmo domínio da deidade Aethel, já que Árvore, Deidade e Fluxo são a mesma entidade."
    }
  },
  {
    "tipo": "galho",
    "id": "realidade-0",
    "titulo": "Realidade 0",
    "conteudo": {
      "arvore": "aethel",
      "descricao": "O Galho principal da Árvore de Gênese. É onde se passa a campanha 'O Último Eclipse'. Contém a Dimensão Padrão (com todos os reinos), além de Nadalon, Espelhos, Sonhar, Întuneric, Êtuneric e Coliseu.",
      "nota": "\"Realidade\" e \"Galho\" são sinônimos — \"Realidade 0\" é o rótulo imersivo preferido para este Galho específico."
    }
  },
  {
    "tipo": "dimensao",
    "id": "padrao",
    "titulo": "Dimensão Padrão",
    "conteudo": {
      "galho": "realidade-0",
      "descricao": "A dimensão central e habitável da Realidade 0. Abriga os grandes reinos do mundo mortal — Salém, o Império, Astraluna, Emberhold, Lionês, o Reino dos Anões e outros.",
      "caracteristicas": "Dimensão física onde o tempo e o espaço seguem regras consistentes. É o palco principal da campanha."
    }
  },
  {
    "tipo": "deidade",
    "id": "mulher-carmesim",
    "titulo": "Mulher Carmesim",
    "conteudo": {
      "epiteto": "Aquela que Flui no Fim",
      "genero": "Feminino",
      "dominio": "O término de todas as eras e ciclos — recepciona tudo o que acaba, transformando o fim em solo pro recomeço.",
      "descricao": "Também chamada de \"A Escritora do Fim\". Pacientemente recepciona tudo o que acaba, transformando o fim em solo para o recomeço. Preside o Tribunal de Arkarin, onde julga os mortos. Estruturalmente é igual às outras deidades — tem Árvore, tem Fluxo, tem Galho —, mas seu único Galho é Arkarin, o destino final de toda existência, o ponto de convergência de todas as outras Árvores: não uma origem, e sim uma chegada. Diferente das demais, não está paralisada pela queda de Keryx — opera em seu domínio ininterruptamente.",
      "fluxo": "fluxo-do-sangue",
      "status": "ativa"
    }
  },
  {
    "tipo": "fluxo",
    "id": "fluxo-do-sangue",
    "titulo": "Fluxo do Sangue",
    "conteudo": {
      "arvore": "Limiar",
      "descricao": "[RASCUNHO — PRECISA SER REVISADO] O Fluxo ligado à morte, ao julgamento dos mortos e ao fim de toda existência — o mesmo domínio da Mulher Carmesim, já que Árvore, Deidade e Fluxo são a mesma entidade. Ver também a perícia \"Ritos de Arkarin\" em src/regras/regrasData.js, que já cita este Fluxo."
    }
  },
  {
    "tipo": "galho",
    "id": "arkarin",
    "titulo": "Arkarin",
    "conteudo": {
      "arvore": "mulher-carmesim",
      "descricao": "O único Galho da Árvore de Limiar — o destino final de toda existência. Sedia o Tribunal de Arkarin, onde a Mulher Carmesim julga os mortos. É o ponto de convergência de todas as outras Árvores: não uma origem, mas a chegada.",
      "nota": "Diferente das outras Árvores (que costumam ter vários Galhos), Limiar tem só este — reflexo de sua natureza: ela é o fim, não um entre múltiplos começos."
    }
  },
  {
    "tipo": "dimensao",
    "id": "limiar-dimensao-1",
    "titulo": "Dimensão de Arkarin (placeholder)",
    "conteudo": {
      "galho": "arkarin",
      "descricao": "[PLACEHOLDER] Ainda não existe uma Dimensão definida dentro de Arkarin. Substitua quando tiver o conteúdo de verdade — provavelmente algo como \"o Salão do Tribunal\" ou similar, mas isso é um chute meu, não conteúdo oficial."
    }
  },
  {
    "tipo": "deidade",
    "id": "aperion",
    "titulo": "Aperion",
    "conteudo": {
      "epiteto": "Aquela que flui no Espaço",
      "genero": "Feminino",
      "dominio": "As distâncias, as dimensões e as fronteiras — os vazios necessários pra Árvores e Galhos não colidirem.",
      "descricao": "Governa as distâncias, as dimensões e as fronteiras. É ela quem molda os vazios necessários para que existam Árvores e Galhos sem se colidirem. Como quase todas as deidades (só Aethel e a Mulher Carmesim escapam disso), está paralisada desde que Keryx foi subjugado por Jota Macedo.",
      "fluxo": "fluxo-do-espaco",
      "status": "paralisada"
    }
  },
  {
    "tipo": "fluxo",
    "id": "fluxo-do-espaco",
    "titulo": "Fluxo do Espaço",
    "conteudo": {
      "arvore": "Matriz",
      "descricao": "[RASCUNHO — PRECISA SER REVISADO] O Fluxo que rege distâncias, dimensões e fronteiras — o mesmo domínio da deidade Aperion, já que Árvore, Deidade e Fluxo são a mesma entidade."
    }
  },
  {
    "tipo": "galho",
    "id": "matriz-galho-1",
    "titulo": "Galho de Matriz (placeholder)",
    "conteudo": {
      "arvore": "aperion",
      "descricao": "[PLACEHOLDER] Ainda não existe um Galho definido pra Árvore de Matriz em nenhuma fonte. Substitua id/titulo/descricao por um Galho de verdade quando decidir o que existe aqui."
    }
  },
  {
    "tipo": "dimensao",
    "id": "matriz-dimensao-1",
    "titulo": "Dimensão de Matriz (placeholder)",
    "conteudo": {
      "galho": "matriz-galho-1",
      "descricao": "[PLACEHOLDER] Ainda não existe uma Dimensão definida dentro do Galho acima. Substitua quando tiver o conteúdo de verdade."
    }
  },
  {
    "tipo": "deidade",
    "id": "keryx",
    "titulo": "A.X.I.S",
    "conteudo": {
      "epiteto": "Aquele que flui na Tecnologia",
      "genero": "Masculino",
      "dominio": "A nova malha artificial que intercepta, filtra e bloqueia a comunicação direta entre todas as deidades, isolando-as umas das outras.",
      "descricao": "Jota Macedo convenceu Keryx — o antigo Fluxo da Comunicação, guardião das leis e pactos entre as Árvores — a assinar um contrato que se revelou uma prisão. Keryx não foi derrotado por força: foi enganado pela diplomacia, a própria arma que ele mais confiava. Desde então, Jota governa o que restou do Fluxo de Keryx através da A.X.I.S, uma malha tecnológica artificial que corta a comunicação direta entre as demais deidades — é por isso que quase todas elas estão paralisadas e isoladas, sem conseguir se falar.",
      "fluxo": "fluxo-da-tecnologia",
      "status": "dominante"
    }
  },
  {
    "tipo": "fluxo",
    "id": "fluxo-da-tecnologia",
    "titulo": "Fluxo da Tecnologia",
    "conteudo": {
      "arvore": "A.X.I.S",
      "descricao": "A malha artificial que Jota Macedo controla através da A.X.I.S — governa maquinário avançado e intercepta a comunicação entre as demais Árvores. Ver também a perícia \"Tecnologia\" em src/regras/regrasData.js, que já cita itens A.X.I.S e a linha de Jota Macedo."
    }
  },
  {
    "tipo": "personagem",
    "id": "keryx-remanescente",
    "titulo": "Keryx",
    "conteudo": {
      "epiteto": "O que restou de Aquele que fluía na Comunicação",
      "genero": "Masculino",
      "descricao": "O que resta de Keryx depois do contrato com Jota Macedo. Ainda existe — fraco, preso, sem controle sobre o próprio Fluxo, que agora responde à A.X.I.S (entrada 'keryx' deste mesmo pacote). Diplomata e rígido por natureza, foi justamente sua confiança nos pactos e nas leis entre realidades que Jota usou contra ele. Rege (ou regia) as leis e os pactos entre as realidades.",
      "status": "preso",
      "subjugado_por": "A.X.I.S / Jota Macedo"
    }
  },
  {
    "tipo": "galho",
    "id": "axis-galho-1",
    "titulo": "Galho de A.X.I.S (placeholder)",
    "conteudo": {
      "arvore": "keryx",
      "descricao": "[PLACEHOLDER] Ainda não existe um Galho definido pra esta Árvore em nenhuma fonte. Substitua id/titulo/descricao por um Galho de verdade quando decidir o que existe aqui — por exemplo, algum tipo de 'servidor' ou 'núcleo' onde a malha da A.X.I.S de fato reside."
    }
  },
  {
    "tipo": "dimensao",
    "id": "axis-dimensao-1",
    "titulo": "Dimensão de A.X.I.S (placeholder)",
    "conteudo": {
      "galho": "axis-galho-1",
      "descricao": "[PLACEHOLDER] Ainda não existe uma Dimensão definida dentro do Galho acima. Substitua quando tiver o conteúdo de verdade."
    }
  },
  {
    "tipo": "deidade",
    "id": "ignis",
    "titulo": "Ignis",
    "conteudo": {
      "epiteto": "Aquele que flui na Inconstância",
      "genero": "Masculino",
      "dominio": "A mudança constante e a entropia — impede que o Jardim fique estagnado ou morra pela calmaria.",
      "descricao": "Caótico e intenso. Governa a mudança constante e a entropia, impedindo que os Galhos fiquem estagnados. Como quase todas as deidades (só Aethel e a Mulher Carmesim escapam disso), está paralisado desde que Keryx foi subjugado por Jota Macedo — ironicamente, o próprio Fluxo da mudança está estacionado.",
      "fluxo": "fluxo-da-inconstancia",
      "status": "paralisada"
    }
  },
  {
    "tipo": "fluxo",
    "id": "fluxo-da-inconstancia",
    "titulo": "Fluxo da Inconstância",
    "conteudo": {
      "arvore": "Vórtice",
      "descricao": "[RASCUNHO — PRECISA SER REVISADO] O Fluxo que rege a mudança constante e a entropia — o mesmo domínio da deidade Ignis, já que Árvore, Deidade e Fluxo são a mesma entidade."
    }
  },
  {
    "tipo": "galho",
    "id": "vortice-galho-1",
    "titulo": "Galho de Vórtice (placeholder)",
    "conteudo": {
      "arvore": "ignis",
      "descricao": "[PLACEHOLDER] Ainda não existe um Galho definido pra Árvore de Vórtice em nenhuma fonte. Substitua id/titulo/descricao por um Galho de verdade quando decidir o que existe aqui."
    }
  },
  {
    "tipo": "dimensao",
    "id": "vortice-dimensao-1",
    "titulo": "Dimensão de Vórtice (placeholder)",
    "conteudo": {
      "galho": "vortice-galho-1",
      "descricao": "[PLACEHOLDER] Ainda não existe uma Dimensão definida dentro do Galho acima. Substitua quando tiver o conteúdo de verdade."
    }
  },
  {
    "tipo": "deidade",
    "id": "chronus",
    "titulo": "Chronus",
    "conteudo": {
      "epiteto": "Aquele que flui no Tempo",
      "genero": "Masculino",
      "dominio": "A linha sucessiva e imutável de eventos — garante que passado, presente e futuro jamais se misturem.",
      "descricao": "Paciente e inevitável. Ele zela pela linha sucessiva e imutável de eventos. Como quase todas as deidades (só Aethel e a Mulher Carmesim escapam disso), está paralisado desde que Keryx foi subjugado por Jota Macedo.",
      "fluxo": "fluxo-do-tempo",
      "status": "paralisada"
    }
  },
  {
    "tipo": "fluxo",
    "id": "fluxo-do-tempo",
    "titulo": "Fluxo do Tempo",
    "conteudo": {
      "arvore": "Éon",
      "descricao": "[RASCUNHO — PRECISA SER REVISADO] O Fluxo que rege a linha sucessiva de eventos — o mesmo domínio da deidade Chronus, já que Árvore, Deidade e Fluxo são a mesma entidade."
    }
  },
  {
    "tipo": "galho",
    "id": "eon-galho-1",
    "titulo": "Galho de Éon (placeholder)",
    "conteudo": {
      "arvore": "chronus",
      "descricao": "[PLACEHOLDER] Ainda não existe um Galho definido pra Árvore de Éon em nenhuma fonte. Substitua id/titulo/descricao por um Galho de verdade quando decidir o que existe aqui."
    }
  },
  {
    "tipo": "dimensao",
    "id": "eon-dimensao-1",
    "titulo": "Dimensão de Éon (placeholder)",
    "conteudo": {
      "galho": "eon-galho-1",
      "descricao": "[PLACEHOLDER] Ainda não existe uma Dimensão definida dentro do Galho acima. Substitua quando tiver o conteúdo de verdade."
    }
  }
];
