# Povos e culturas: plano de implementação

**Implementado em 2026-10-28, sem commit:**
- campo `povo` nas 23 raças jogáveis;
- seção "O que todo povo carrega" (`src/pages/Regras/components/PovoDaRaca.tsx`) nas páginas de raça e no compêndio do Livro;
- seção "Montar a cultura de um povo", com seis tabelas de 1d8, na estante "O mundo reage" do Guia do Mestre;
- teste `tests/frontend/povosECulturas.test.ts`;
- mural `2026-10-28-o-que-todo-povo-carrega`.

Proposta aceita pelo Pedro em 2026-10-27 ("Sim, povos e culturas"). A cultura depende da Árvore, da realidade e da dimensão, então nada vira regra de mundo inteiro. Separar o fixo do que muda:

1. **O que todo povo carrega**, em qualquer Árvore: só o que vem do corpo e da natureza da raça. São de três a quatro linhas por raça, sem dizer onde nem como o povo vive. Exemplos: todo vampiro precisa de sangue, então toda sociedade vampira tem acordo sobre quem alimenta quem; golem não come, então não tem culinária; elfo não esquece.
2. **A cultura mora no lugar.** Khazad, Salém, Nadalon, Întuneric, Emberhold e Lionês já têm descrição e governo na lore e continuam como estão. Em outra Árvore pode existir outro povo anão, ou nenhum.
3. **Tabelas no Guia do Mestre** para montar a cultura local, em seis eixos: governo, relação com o Fluxo, os mortos, a comida, os estrangeiros e a festa. O Mestre cruza as tabelas com as linhas fixas da raça.

## Onde mexer (levantado em 2026-10-27)

- **Dados:** campo novo `povo: string[]` nas 23 raças jogáveis de `data/ficha/racas.json` (a Entidade e a raça personalizada ficam sem ele). Editar como texto cru, sem `json.dump`. Acrescentar `povo?: string[]` em `IRaca` (`src/types/catalogo.ts`). Depois rodar `npm run check:server-content`.
- **Página:** um componente compartilhado ("O que todo povo carrega"), renderizado em `src/pages/Regras/RegraDetalhesPage.tsx` logo depois de `<RacaPage raca={raca} />` (linha ~145) e também na página genérica de fallback. Assim as 25 páginas de raça ganham a seção sem editar uma por uma. O wrapper fica em `relative z-10`, porque as páginas usam fundo `fixed`.
- **Guia do Mestre:** tudo inline no `corpo` do tópico `mestre` de `data/regras/regras.ts`, dentro de `<section class="regras-estante regras-estante--mundo">` (linha ~4025). Um tópico novo vazaria para o jogador. Cada tabela vai num `<details class="regras-details">` com `<span class="regras-details-contagem">1d8</span>`, mais um "como usar" e um exemplo (anões numa Árvore sem Khazad). O resultado é anotado nas Notas internas do Mestre (Biblioteca da campanha); se a cultura valer para todas as mesas, o Criador publica uma entrada de lore do tipo Cultura, que já existe no editor e nunca foi usada.
- **Livro:** conferir se `tools/documentos-mundo/compendio.mjs` imprime a fisiologia das raças e, se sim, imprimir o `povo` junto.
- **Depois:**
  - `npm run generate:rules` e `npm run generate:editorial-rules`;
  - teste novo (toda raça jogável com 3 ou 4 linhas de `povo`, e o Guia com as seis tabelas), registrado no `test:frontend`;
  - `tomSemAntitese` precisa continuar verde;
  - mural, `npm run docs:livro` e `docs:livro:mestre` com o Vite desligado;
  - conferir no navegador.

## Fora de escopo agora

Dizer a língua de cada povo na página da raça é a pergunta 9 da revisão das raças, que fica para o questionário final.
