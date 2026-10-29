# Revisão do Espírito

A maior raça do jogo: três Naturezas, 26 marcas (11 Fluxos, 7 Pecados, 7 Virtudes e o Universal, só do Mestre) e seis degraus (1, 8, 15, 28, 40, 60), o último com a Provação Primordial. Ela tem auditoria própria (`node tools/audit-espirito.mjs`), que lê 200 habilidades e passa sem violação: dados dentro do acerto de NPC do nível, nada de 1 minuto no 60, Provação no último degrau. Pacote 1 → 7 → 22 → 49 (o Primordial é forte de propósito). Esta revisão olhou o que a auditoria não pega.

## Achados (do mais grave ao menos grave)

- [ERRO] sete textos com "mMestre" colado na palavra seguinte ("só o mMestremarca", "o mMestredecide", "Só o mMestreconcede"...), em `maturacao-espiritual`, `possessao`, `descricao_variantes`, Universal (descrição e Provação) e `condicoes_estagio`. *(Aplicado.)*
- [ERRO] `marrom / ectoplasma-firme` (8): "O bônus de Defesa do Ectoplasma Denso sobe para +3", mas o +1 a mais só estava no texto. Do Menor ao Superior, a raça promete ajustes passivos que a ficha aplica sozinha. *(Aplicado: campo `defesa: 1` no traço, que soma com os +2 do Ectoplasma Denso.)*
- [ERRO] `anjo-paciencia / respirar-fundo` (8): "+1 de Defesa" só no texto. *(Aplicado: campo `defesa: 1`.)*
- [INCOERÊNCIA] Fluxo da marca × Fluxo nativo: pela Decisão 1 da revisão das magias, o Fluxo nativo vem da Árvore. Um Espírito do Tempo nascido em Gênese tem Origem como Fluxo nativo e não conjura Tempo, embora a marca dele seja o Tempo. → Ver Decisão 9.
- [INCOERÊNCIA] `demonio-luxuria / coro-de-desejos` (60): "ficam Encantadas" não é condição (o texto descreve o efeito logo depois). `preto / engolir-o-som` (28): "fica cega e surda", e Surdo também não é condição. → Ver Decisão 4.
- [MELHORIA] `anjo-castidade / voto-inquebravel` (40): "por 1 minuto" num efeito de combate. A auditoria só barra 1 minuto no nível 60. → "por três rodadas", como o resto.
- [MELHORIA] `possessao` (5): "criatura Média ou menor". As raças usam Normal, e o Bestiário usa médio. Ver o item de tamanho no README.
- [MELHORIA] Pendente desde 2026-10-12: o equilíbrio dos 14 Pecados e Virtudes, da Possessão e da Encarnação aguarda a sua leitura. → Pergunta para o questionário final.
