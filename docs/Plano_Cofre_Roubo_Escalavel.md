# Plano de evolução: Cofre, carteira e roubo

## Estado implementado

- Um roubo bem-sucedido da carteira transfere 100% dos Lunaris expostos.
- O cofre continua sendo a escolha defensiva: um arrombamento bem-sucedido
  leva 50% do saldo guardado, não o saldo inteiro.
- Capacidade e segurança possuem 15 níveis independentes.
- Os IDs antigos (`comum`, `prata`, `dourado`, `arcano`, `eterno` e os cinco
  níveis antigos de segurança) foram mantidos. Jogadores existentes continuam
  no mesmo nível e podem avançar pelos novos níveis seguintes.
- O Cofre Sem-Fim tem capacidade sem limite prático. O armazenamento usa um
  teto técnico alto porque PostgreSQL e Discord trabalham com inteiros, não
  com infinito literal.
- Proteção Absoluta frustra 99% dos arrombamentos; a chance mínima do ladrão é
  1%.

Os custos e capacidades são uma proposta inicial de balanceamento. Eles devem
ser revistos com dados reais de geração de Lunaris, compras e roubos.

## Princípio econômico

A carteira deve ser líquida e perigosa; o cofre deve ser seguro, progressivo e
conveniente. Isso cria uma decisão real:

- deixar dinheiro na carteira facilita compras, pagamentos e apostas, mas põe
  todo o saldo em risco;
- guardar dinheiro reduz drasticamente o risco, mas o saque tem taxa e o cofre
  exige investimento;
- arrombar um cofre oferece prêmio relevante, porém chance menor, multa e
  desafios maiores.

Não é recomendável fazer o roubo de cofre também retirar 100%. Isso eliminaria
o valor psicológico das melhorias mais caras e tornaria um resultado de 1%
desproporcionalmente destrutivo.

## Próxima fase: tentativa privada

O comando atual depende de `guild_id` e de um `discord.Member`; esses dados não
existem automaticamente em uma DM. O fluxo privado deve ser próprio:

1. O jogador abre uma tentativa privada com o Banqueiro.
2. Seleciona um servidor em comum onde o bot esteja presente.
3. Seleciona um alvo que pertença àquele servidor.
4. O servidor valida saldo, proteção, cooldown, conta protegida e tentativas
   simultâneas antes de reservar a tentativa.
5. Toda a interação e o minigame acontecem na DM.
6. Em sucesso, o canal de economia recebe apenas um alerta anônimo de roubo.
7. Em falha, o alerta revela quem tentou roubar e aplica a multa.
8. Mestres conservam um registro privado completo para auditoria e combate a
   abuso, mesmo quando o anúncio público é anônimo.

Antes da implementação, é necessário confirmar na versão de `discord.py` usada
pelo bot como comandos de aplicação e seletores de usuário são disponibilizados
em DM. Se o seletor não puder limitar membros por servidor, o alvo deverá ser
escolhido em uma lista gerada pelo próprio bot e validado novamente no servidor.

## Próxima fase: minigames de arrombamento

O minigame deve substituir o sorteio opaco, e não simplesmente adicionar uma
segunda punição depois dele. A chance final precisa continuar calibrada pela
segurança do alvo.

| Segurança | Experiência sugerida |
| --- | --- |
| Níveis 1–3 | Resolução rápida, sem minigame ou com uma única escolha |
| Níveis 4–6 | Um desafio curto de sequência ou timing |
| Níveis 7–10 | Duas etapas e uma ferramenta opcional |
| Níveis 11–13 | Três etapas, alarmes falsos e tempo menor |
| Níveis 14–15 | Operação rara com várias etapas; sucesso final de 3% e 1% |

Minigames adequados aos componentes do Discord:

- memorizar e repetir uma sequência curta de runas;
- escolher a combinação correta a partir de pistas;
- alinhar pinos de uma fechadura em um número limitado de ações;
- identificar o selo diferente entre opções embaralhadas.

Requisitos técnicos e antiabuso:

- desafio gerado no servidor com token único, expiração e uso único;
- resultado validado no servidor; nunca confiar em valor enviado pelo cliente;
- cooldown consumido ao iniciar, evitando fechar a DM para tentar novamente;
- tentativa e alvo reservados durante o minigame;
- estado persistido para sobreviver a reinício do bot;
- limite de tempo tolerante a latência e alternativa acessível sem depender
  apenas de cor ou velocidade motora;
- transferência, multa, recompensa e extratos mantidos em uma única transação;
- proteção contra contas alternativas por idade mínima configurável da conta,
  vínculo com campanha e auditoria de transferências repetidas.

## Expansões posteriores

- Ferramentas de ladrão consumíveis: gazua, decodificador rúnico e máscara.
- Calor/procura: roubos sucessivos aumentam multas e tornam o ladrão visível.
- Seguro do cofre: recupera parte do valor roubado após uma franquia.
- Iscas: pequena quantia falsa que identifica ou penaliza o ladrão.
- Cofres compartilhados de grupo com permissões e histórico próprio.
- Eventos do Jornalista relacionados a grandes roubos, sempre sem revelar o
  autor quando a tentativa privada for bem-sucedida.

