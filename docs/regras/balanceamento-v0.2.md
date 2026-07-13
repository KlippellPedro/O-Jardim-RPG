# O Jardim RPG — histórico de balanceamento v0.2

> Documento histórico e substituído. As regras oficiais estão em
> `fundamentos-v1.md` e na página de Regras; estes números permanecem apenas
> para registrar a evolução das decisões.

Este documento registra hipóteses, cálculos e decisões propostas. Nada aqui deve ser tratado como definitivo antes de playtest.

## Referências de base

- [Tormenta20 — Resumo de Regras](https://jamboeditora.com.br/wp-content/uploads/2023/06/Tormenta20-Resumo-de-Regras.pdf): teste de perícia com d20, metade do nível, atributo, treinamento, escala de CDs, ações e ferimentos.
- [D&D 2024 — Creating a Character](https://www.dndbeyond.com/sources/dnd/br-2024/creating-a-character): conjunto padrão 15, 14, 13, 12, 10, 8 e compra por pontos.
- [D&D Basic Rules — Using Ability Scores](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/using-ability-scores): CDs estáticas e vantagem/desvantagem.
- [Pathfinder 2e — Rules Overview](https://2e.aonprd.com/Rules.aspx?ID=2266): quatro graus de sucesso.
- [Pathfinder 2e — Level-Based DCs](https://2e.aonprd.com/Rules.aspx?ID=2629): CDs que acompanham o nível.
- [Pathfinder 2e — Proficiency Without Level](https://2e.aonprd.com/Rules.aspx?ID=2762): bônus fixos por grau como referência de progressão controlada.

As referências servem como régua matemática. O texto e as decisões de O Jardim são próprios.

## Diagnóstico do sistema atual

### Atributos em 6d20

Os personagens podem começar separando 40 pontos de atributo, usar a proposta padrão 15, 14, 13, 12, 10 e 8 ou rodar 6d20 caso o mestre deixr, mas por padrão fica a distribuição de 40 pontos.

na criação da ficha o maximo que pode ter em um atributo é 20

### Valores derivados

- `Movimento = Mod.Destreza × 2` tendo como movmento minimo 1
- `Vida = Mod.Constituição + Mod.Força × 3` tendo como vida minima 3
- `Força Vital = Mod.Sabedoria + Mod.Inteligência × 2` tendo como força vital minima 2
não tem numeros negativos nessa parte pq se não vai fiar uma bosta de jogar

### Perícias


d20 + Mod.Atributo + piso(Nível/2) + Grau

Graus fornecem +0, +2, +4, +6, +8, +10 e +12. Obstáculos com nível usam CD base + metade do nível, preservando a chance relativa.

### Vantagem

Vantagem não equivale sempre a +5. Seu valor depende da chance original:

| Resultado mínimo no d20 | Normal | Vantagem | Desvantagem |
| ---: | ---: | ---: | ---: |
| 5 | 80% | 96% | 64% |
| 10 | 55% | 79,75% | 30,25% |
| 11 | 50% | 75% | 25% |
| 15 | 30% | 51% | 9% |
| 20 | 5% | 9,75% | 0,25% |

Fontes de vantagem e desvantagem são registradas e canceladas uma a uma. Depois
desse cancelamento, qualquer saldo positivo concede uma única vantagem e qualquer
saldo negativo impõe uma única desvantagem. O tamanho do saldo não acrescenta
mais d20; ele apenas preserva a condição contra novas fontes opostas. Vantagem
continua rara quando também existe bônus numérico.

### XP

A tabela segue a fórmula triangular até o nível 23:

```text
XP(N) = 500 × N × (N − 1)
```

O nível 24 deveria exigir 276.000 XP, mas a tabela antiga mostra 277.000 e mantém diferença de 1.000 até o nível 40. Pela fórmula, N40 exige 780.000 XP.

### Ferimentos

O d20 atual dá peso igual a resultados narrativamente muito diferentes. Uma tabela em 2d6 concentra 55,6% dos resultados entre 6 e 8 e torna os extremos 2 e 12 raros, com 2,78% cada. Isso produz trauma comum previsível e momentos extremos memoráveis.

## Metas numéricas de playtest

| Situação | Faixa desejada |
| --- | ---: |
| Especialista contra desafio padrão do próprio nível | 65–80% de sucesso |
| Generalista contra desafio padrão | 40–60% |
| Desafio difícil para especialista | 40–60% |
| Combate comum | 3–5 rodadas |
| Uso da melhor reação | nenhuma opção acima de 70% das escolhas |
| Coreografia | todos os riscos escolhidos ao menos uma vez em 3 sessões |

## O que ainda não pode ser balanceado com precisão

- Dano por rodada e duração de combate: faltam no site os dados completos de armas, armaduras e habilidades de classe.
- Economia de Força Vital: a maior parte dos poderes no JSON está marcada como pendente.
- Raças: bônus antigos variam de +1 a +4, rerrolagens, itens e vantagens narrativas sem uma mesma unidade de custo.
- Multiclasse: é necessário confirmar como níveis de duas classes somam Vida, FV e progressão de habilidades.

Até esses dados serem migrados do livro, os números de combate devem ser tratados como playtest, não como versão final.

## Protocolo de teste

1. Monte quatro personagens nos níveis totais 1, 10, 20 e 30.
2. Para cada nível, registre 20 testes padrão e 10 difíceis, divididos entre especialista e generalista.
3. Em combate, registre rodadas, dano sofrido, FV gasto, reação escolhida e quedas a 0 PV.
4. Ajuste primeiro CDs e bônus globais; só depois altere habilidades individuais.
5. Mude uma variável por rodada de teste para saber qual alteração causou o resultado.

## Catálogos de personagem — Playtest 0.4

O ZIP `O Último Eclipse.zip` confirma os seguintes materiais publicados:

| Categoria | Com ficha/PDF | Citada ou em desenvolvimento |
| --- | ---: | ---: |
| Classes comuns | 11 | 2 |
| Classes especiais | 3 | 8 |
| Raças comuns | 9 | 0 |
| Raças especiais | 5 | 4 |
| Legados catalogados | 36 | PDF 1 é a abertura da seção |

“Comum” descreve disponibilidade em todas as Árvores. “Especial” descreve uma classe ou raça restrita a determinadas Árvores ou extinta; não concede um orçamento de poder maior.

### Orçamento racial

Para o primeiro playtest comparável, cada raça deve oferecer aproximadamente:

1. Um ajuste de atributo de `+1`.
2. Uma perícia em Aprendiz ou um recurso menor equivalente.
3. Uma habilidade característica com ação, frequência e limite definidos.
4. Uma limitação apenas quando ela realmente compensa um benefício adicional.

Os dados antigos variam de `+1` a `+4`, chegam a cinco rerrolagens e misturam bônus de combate, itens e vantagens narrativas. As propostas normalizadas ficam separadas dos textos do livro na interface.

### Chassi de classe

Todas as classes usam 20 níveis. Habilidades de identidade ficam nos níveis 1, 5, 10, 15 e 20; poderes, perícias e melhorias ocupam os níveis intermediários. Ações e reações extras precisam de custo, recarga ou gatilho raro.

Somente Guerreiro possui progressão parcialmente migrada. As outras classes não podem receber uma auditoria de dano, cura ou FV confiável até que seus três PDFs sejam transcritos com ação, alcance, custo, duração e texto das habilidades.

### Legados de maior risco

Todos os 36 Legados catalogados receberam texto fechado de playtest. Os principais problemas eram:

- Remover desastres e falhas críticas de forma permanente.
- Conceder reação extra todo turno sem custo.
- Dobrar modificadores ou recuperação sem limite.
- Somar dano igual ao nível e garantir iniciativa automaticamente.
- Aplicar redução de Defesa acumulativa até o fim do combate.

As revisões transformam esses efeitos em usos por turno, cena, descanso ou sessão e evitam acumular bônus equivalentes.

Seis Legados novos foram adicionados apenas ao Playtest 0.4: Âncora de Árvore, Eco do Fluxo, Passo Entre Galhos, Memória do Eclipse, Vínculo Lunar e Segunda Primavera. Eles não fazem parte dos PDFs e aparecem separados na interface.
