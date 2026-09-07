# Documentação de O Jardim RPG

Este é o índice da documentação. Os relatórios sucessivos de auditoria,
proposta, correção e validação foram consolidados por assunto em 7 de setembro
de 2026. Para acompanhar um tema, use a referência abaixo, sem precisar
reconstruir sua história em vários arquivos.

## Referências de trabalho

| Documento | O que consultar |
| --- | --- |
| [Balanceamento e economia](sistema/BALANCEAMENTO.md) | Decisões de Legados, moedas, preços, Cofre e Investimentos; mudanças posteriores e questões ainda abertas. |
| [Integração e segurança](sistema/INTEGRACAO.md) | Ficha, sessão, loja, modificações, permissões e fechamento das correções técnicas. |
| [Frontend e experiência do jogador](sistema/FRONTEND.md) | Jornada, navegação, carrinho, responsividade, acessibilidade e performance. |
| [Bots e sistemas do Discord](sistema/BOTS_DISCORD.md) | Arquitetura aprovada, evolução dos bots, Cofre/roubo e operação do Salão do Banco Lunar. |
| [Guia de manutenção](GUIA_MANUTENCAO.md) | Onde alterar código/dados, como regenerar arquivos e quais verificações executar. |
| [Editor de conteúdo](EDITOR_CONTEUDO_CAMPANHA.md) | Conteúdo oficial, publicações globais, campanha, rascunhos e visibilidade. |

## Material para consulta e mesa

Esses PDFs são produtos diferentes, não relatórios de etapas repetidas. Foram
mantidos nos caminhos usados pelos geradores. São exportações estáticas; não
recebem automaticamente publicações nem filtros de visibilidade da campanha.

| Pasta | Conteúdo |
| --- | --- |
| [livro/](livro/) | [Livro de Regras](livro/O-Jardim-Livro-de-Regras.pdf) e [edição do Mestre](livro/O-Jardim-Livro-de-Regras-MESTRE.pdf), que inclui conteúdo reservado. |
| [players/](players/) | Guias de [O Jardim](players/O-Jardim.pdf), [Árvores](players/As-Dez-Arvores.pdf) e [Seres](players/Os-Seres-do-Jardim.pdf). |
| [props/](props/) | [Cadernos de Campo](props/Dossie-Cadernos-de-Campo.pdf), [folha reservada do Mestre](props/Dossie-FOLHA-DO-MESTRE.pdf) e cinco documentos avulsos para a mesa. |

A reprodução dos PDFs está documentada em
[tools/documentos-mundo/README.md](../tools/documentos-mundo/README.md).
O projeto Godot possui documentação própria em [game/README.md](../game/README.md).

## Como distinguir atual, pendente e histórico

- **Referência atual:** os documentos temáticos acima. Cada um distingue a
  implementação conferida no checkout dos resultados de auditorias antigas.
- **Pendente:** questão com justificativa e próximo passo, sem tratar uma
  proposta como regra aprovada ou uma inspeção de código como teste em produção.
- **Histórico:** relatórios originais, alternativas descartadas, simulações e
  medições datadas. O [mapa da consolidação](HISTORICO.md) liga cada arquivo
  antigo ao substituto e à sua versão integral no Git.

Regras executáveis e conteúdo oficial continuam em `data/`, no código e nas
publicações descritas no guia do editor. Documentação de auditoria não muda
essas fontes por conta própria.

## Manutenção desta organização

Atualize o documento do assunto quando concluir uma correção ou decisão.
Registre data, evidência e pendência resolvida no mesmo lugar. Evite criar outro
arquivo chamado “final”, “pós-validação” ou “nova auditoria” para repetir o
estado anterior. Uma investigação extensa pode ficar registrada no Git, com
seu fechamento e link incorporados ao tema correspondente.
