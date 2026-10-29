# Revisão do Desperto

Raça especial de quem morreu, chegou a Arkarin e voltou. Seis Condições Ancestrais, cada uma com dádiva e cicatriz, e uma escrita cuidadosa: Recusar o Fim diz exatamente o que nega e quando não funciona. Os erros eram de vocabulário que envelheceu (uma perícia que saiu do jogo e um "Fluxo de Arkarin" que não existe). Não tem escada: pacote 8 do 1 ao 60.

## Achados (do mais grave ao menos grave)

- [ERRO] `retorno-profano / folego-roubado` (`descricao`, `teste`) e `corpo-reconstruido / biologia-impossivel`: usam "Ritos de Arkarin", que saiu da lista de perícias ("removida por não existir mais na campanha", diz `pericias.json`). *(Aplicado: Religião, de Sabedoria, que combina com o Mod. Sabedoria do dano; o campo `teste` virou `religiao_vs_fortitude`.)*
- [INCOERÊNCIA] `fragmento-de-arkarin`: "efeito ligado à morte ou ao Fluxo de Arkarin". Arkarin é o Galho de Limiar, e o Fluxo de lá é o Fim. *(Aplicado: "Fluxo do Fim".)*
- [ERRO] página `Desperto.tsx`: o título da caixa ainda dizia "Ecos de Séculos", nome antigo do traço, com "eco". *(Aplicado: "Lembrança dos Séculos Mortos". A trava de tom agora lê também as páginas de raça.)*
- [INCOERÊNCIA] raça inteira (`estagios`): sem escada. As rerrolagens dependem só da história (um século morto por rerrolagem) e nada cresce com o nível. → Ver Decisão 3. Sugestão leve: um degrau no ~25 que dê +3 Vida, +2 Mana e um segundo uso de Recusar o Fim por sessão.
