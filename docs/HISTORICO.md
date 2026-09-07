# Histórico da consolidação documental

Consolidação realizada em **7 de setembro de 2026**. Os **17 documentos** abaixo
foram substituídos por quatro referências temáticas. O conteúdo repetido deixou
de ocupar arquivos separados na pasta; os originais integrais permanecem no Git.

## Como o estado foi escolhido

1. Na mesma sequência, o fechamento posterior prevalece sobre a descoberta.
2. Relatórios de assuntos diferentes se complementam; não se anulam pela data.
3. Código e dados atuais conferidos podem superar a descrição de implementação
   antiga. Divergências sem decisão documentada ficam explícitas, não presumidas.
4. Datas de auditoria vêm dos textos; datas de entrada no Git não são tomadas
   automaticamente como data de execução. Contagens de testes e benchmarks
   antigos continuam históricos.

As versões integrais estão fixadas no commit `e7a2b12d79be072ddd5a8094f736719973d52809`.
Esses links não seguem a branch: continuam apontando para os documentos antes
da consolidação, mesmo depois de sua remoção dos caminhos antigos.

<a id="balanceamento"></a>

## Balanceamento

Referência de trabalho: [Balanceamento](sistema/BALANCEAMENTO.md).

| Documento original | Relação com a consolidação |
| --- | --- |
| [auditoria-design-balanceamento-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/auditoria-design-balanceamento-2026-08.md) | Descoberta dos desequilíbrios; anterior às decisões. |
| [propostas-design-balanceamento-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/propostas-design-balanceamento-2026-08.md) | Alternativas e simulações; não são escolhas finais. |
| [decisao-design-balanceamento-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/decisao-design-balanceamento-2026-08.md) | Análise pré-implementação; perguntas foram respondidas na fase seguinte. |
| [implementacao-design-balanceamento-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/implementacao-design-balanceamento-2026-08.md) | Fechamento aprovado de agosto; câmbio e preços tiveram mudanças posteriores. |

<a id="integracao"></a>

## Integração

Referência de trabalho: [Integração](sistema/INTEGRACAO.md).

| Documento original | Relação com a consolidação |
| --- | --- |
| [auditoria-integracao-sistema-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/auditoria-integracao-sistema-2026-08.md) | Descoberta de 19 achados; parte dos diagnósticos foi refinada depois. |
| [implementacao-correcoes-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/implementacao-correcoes-2026-08.md) | Primeira implementação; ainda não era o fechamento da cadeia. |
| [validacao-pos-correcao-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/validacao-pos-correcao-2026-08.md) | Revalidação intermediária; apontou as próximas correções. |
| [implementacao-final-pos-validacao-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/implementacao-final-pos-validacao-2026-08.md) | Corrigiu sincronização e fonte do Cofre; ainda deixou compatibilidade e E2E em aberto. |
| [correcao-integracao-modificacoes-e2e-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/correcao-integracao-modificacoes-e2e-2026-08.md) | Fechou compatibilidade e testes E2E; recebeu a decisão posterior de criação fora da Árvore. |

<a id="frontend"></a>

## Frontend

Referência de trabalho: [Frontend](sistema/FRONTEND.md).

| Documento original | Relação com a consolidação |
| --- | --- |
| [auditoria-player-journey-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/auditoria-player-journey-2026-08.md) | Descoberta e primeiras correções da jornada; PJ-003 foi fechado depois. |
| [auditoria-jornada-player-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/auditoria-jornada-player-2026-08.md) | Fechamento da jornada de 13/08; consolida PJ-001 a PJ-004 e limites de cobertura. |
| [auditoria-final-responsividade-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/auditoria-final-responsividade-2026-08.md) | Fechamento de responsividade; complementar à jornada, não seu substituto. |
| [auditoria-performance-frontend-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/auditoria-performance-frontend-2026-08.md) | Duas passagens de performance no mesmo arquivo; métricas restritas ao ambiente medido. |

<a id="bots"></a>

## Bots

Referência de trabalho: [Bots](sistema/BOTS_DISCORD.md).

| Documento original | Relação com a consolidação |
| --- | --- |
| [auditoria-bots-discord-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/auditoria-bots-discord-2026-08.md) | Descoberta com correções de diagnóstico e anotações B1/B2. |
| [plano-evolucao-bots-discord-2026-08.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/plano-evolucao-bots-discord-2026-08.md) | Decisões B3 e execução B1/B2 misturadas ao plano; contém status contraditórios e bloqueio de enigmas já superado. |
| [Plano_Cofre_Roubo_Escalavel.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/Plano_Cofre_Roubo_Escalavel.md) | Plano antigo: parâmetros existentes, fluxo privado proposto e expansões implementadas posteriormente em parte. |
| [CASSINO_DISCORD.md](https://github.com/KlippellPedro/O-Jardim-RPG/blob/e7a2b12d79be072ddd5a8094f736719973d52809/docs/CASSINO_DISCORD.md) | Guia de operação mais recente (agosto); incorporado à seção do Salão com referências atualizadas. |

## Diferenças que exigiam mais que uma mudança de pasta

- Balanceamento: as quatro perguntas de design do documento de decisão já
  foram aprovadas na implementação seguinte; não continuam “aguardando resposta”.
- Economia: conversão das quatro moedas e novos preços existem nas fontes
  atuais. Parte das premissas e exemplos de agosto não descreve mais o código.
- Integração: a falha de `aplicacao` e a falta de E2E foram fechadas depois
  do relatório chamado “implementação final”.
- Jornada: o relatório de descoberta e o de fechamento repetiam os mesmos IDs;
  PJ-003 passou a ter uma única situação no documento consolidado.
- Bots: o plano dizia B1/B2 “não iniciadas” em um parágrafo e detalhava suas
  entregas em outro. Enigmas temáticos e partes do plano de roubo já existem.
- Resultados de agosto e da correção de setembro foram identificados como
  evidência datada; não viraram promessa de teste atual ou de produção.

## Documentos mantidos e materiais gerados

[GUIA_MANUTENCAO.md](GUIA_MANUTENCAO.md) continua sendo a porta de entrada técnica.
[EDITOR_CONTEUDO_CAMPANHA.md](EDITOR_CONTEUDO_CAMPANHA.md) permanece no caminho
referenciado por `AGENTS.md` e concentra o contrato do editor.

Os PDFs de `livro/`, `players/` e `props/` foram mantidos: são livros, guias e
materiais de mesa com finalidades próprias. Não são versões sucessivas de
um relatório de balanceamento. Esta tarefa não os regenerou nem alterou seu conteúdo.

## Recuperar um original

Além dos links acima, a versão integral pode ser lida localmente, por exemplo:

```powershell
git show e7a2b12d79be072ddd5a8094f736719973d52809:docs/decisao-design-balanceamento-2026-08.md
```

Não é necessário recolocar os 17 arquivos na pasta para consultar uma análise.
Ao retomar uma proposta antiga, registrar seu novo encaminhamento no documento
temático correspondente.
