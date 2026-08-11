# Melhorias aplicadas ao Banqueiro

Este documento registra o resultado da revisão. As ideias abaixo deixaram de
ser apenas propostas e agora fazem parte do bot.

## Roubo privado e planejamento

- `/roubo_planejar <membro>` envia uma análise privada com faixas de recursos,
  risco do cofre, Calor atual e as abordagens disponíveis. Saldos exatos nunca
  são revelados.
- `/roubar` e `/roubar_cofre` continuam privados: o ladrão recebe resposta
  efêmera e a vítima se defende por DM. DM fechada cancela a tentativa e
  devolve cooldown, Alarme Mágico e preparo consumido.
- As abordagens `Cuidadosa`, `Rápida` e `Disfarçada` têm contrapartidas reais
  de tempo, Calor, multa, saque e preparo. Nenhuma remove a defesa da vítima.
- O Kit de Disfarce pode ser comprado e consultado com
  `/preparo_roubo_comprar` e `/preparos_roubo`.

## Calor

Cada tentativa efetivamente iniciada gera Calor privado. Ele decai em cinco
pontos por hora, aumenta o cooldown em até 50% e reduz a chance de arrombar um
cofre em até 20 pontos percentuais. O valor fica limitado entre 0 e 100.

## Alertas e seguro

- `/alertas_banco` liga ou desliga DMs de segurança, pagamentos, mercado,
  empréstimos e rendimentos. A DM interativa usada para defender um roubo é
  obrigatória porque desligá-la tornaria o roubo indefensável.
- `/seguro_cofre` oferece cobertura de 30% do valor roubado, limitada a 200
  Lunaris por sinistro e a um pagamento a cada sete dias. A assinatura custa
  25 Lunaris por 30 dias e pode ser renovada automaticamente.
- O pagamento do seguro, a mensalidade e a renovação ficam registrados no
  extrato.

## Ferramentas do mestre

`/economia_diagnostico` mostra em privado patrimônio em carteiras e cofres,
dívida, concentração no top 5, entradas e saídas em sete dias, roubos,
leilões, empréstimos, investimentos e dinheiro reservado em custódia.

## Consistência transacional

As operações abaixo passaram a ser concluídas numa transação do PostgreSQL:

1. câmbio;
2. depósito e saque do cofre;
3. compra de proteção, preparo, bilhete e baú;
4. criação e liquidação de investimentos;
5. criação, aceite, recusa, expiração e pagamento de empréstimos;
6. reserva e liquidação de lances;
7. dinheiro envolvido em ofertas entre jogadores.

Empréstimos reservam o valor ao criar a proposta. Lances devolvem a reserva
do jogador superado. Ofertas pagas reservam o dinheiro antes de mover o item.
As reservas sobrevivem a reinícios na tabela `custodia_moeda`.

Entregas de itens no cofre do site atravessam uma API externa e não podem fazer
parte da transação PostgreSQL. Nesses casos o bot usa chaves idempotentes,
reservas e avisos de recuperação para não cobrar duas vezes.

## Verificação

As regras puras, comandos, privacidade e compatibilidade dos fluxos possuem
testes locais. Os testes de integração do banco exigem uma
`TEST_DATABASE_URL` apontando para um PostgreSQL descartável; nunca devem ser
executados no banco de produção.
