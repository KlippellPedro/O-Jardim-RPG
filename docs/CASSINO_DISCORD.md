# Salão do Banco Lunar no Discord

## Escopo e princípios

O Salão é operado pelo bot Banqueiro e usa exclusivamente bens fictícios da
campanha. Não há compra ou resgate por dinheiro real. O objetivo é dar
variedade à economia e conectar sistemas pouco usados, sem esconder
probabilidades ou pressionar o jogador a continuar.

Garantias:

- apenas Lunaris existentes na carteira podem ser apostados;
- cartão, fatura, dívida, empréstimo e saldo do cofre não financiam apostas;
- toda aposta mostra regra, chance, pagamento e bem arriscado antes da
  confirmação; o resultado só é gerado depois do clique;
- há limites diários de volume e perda líquida;
- `/cassino pausa` bloqueia novas apostas por 1, 7 ou 30 dias e uma pausa
  longa não pode ser encurtada por outra chamada;
- rodadas e liquidações são idempotentes;
- falha ou reinício não duplica pagamento; mesas não resolvidas são
  liquidadas pelo estado persistido ou reembolsadas;
- mandatos semanais contam categorias diferentes, nunca volume gasto ou
  número de perdas;
- conquistas são cosméticas, aparecem imediatamente ao serem desbloqueadas e
  não alteram chance nem pagamento;
- `/cassino auditoria` mostra contagens agregadas sem revelar jogadores ou
  valores apostados.

## Identidade no cenário

O salão usa referências da base oficial em `data/`. Amadheus Colona preside o
Banco Lunar; os Dados representam a Inconstância de Ignis; a Sucessão usa
Chronus e o Passo; a Queda atravessa o Interstício e os Vãos de Aperion; a
Roda reúne as nove Árvores e o Vazio de Erebus. A Corrida usa estandartes de
Gênese, Éon, Matriz e Vórtice, sem inventar criaturas canônicas.

Não existe snapshot editorial em `data/editorial/campanhas/` neste checkout.
Por isso, esta versão não presume nomes ou fatos de uma publicação de campanha
que talvez exista apenas no PostgreSQL.

## Comandos e regras

- `/cassino abrir`: apresenta o Salão do Banco Lunar e seus jogos.
- `/cassino dados`: baixo/alto têm 3/6 e pagam 2×; número exato tem 1/6 e
  paga 6×. Retorno teórico de 100%.
- `/cassino roda_fluxos`: dez símbolos uniformes; acertar o escolhido paga
  10×. Retorno teórico de 100%.
- `/cassino sucessao`: marco uniforme de 1 a 13. Há 6/13 de vitória a 2×,
  1/13 de empate no Passo a 1× e 6/13 de derrota. Retorno teórico de 100%.
- `/cassino vaos`: quatro desvios binários independentes. As bordas somam
  2/16 e pagam 4×; os Vãos somam 8/16 e devolvem a aposta; o centro ocupa
  6/16 e paga zero. Retorno teórico de 100%.
- `/cassino vinte_um`: vitória paga 2×, empate 1× e 21 natural 2,5×. O
  Banqueiro compra até 17. Não existe chance única: cartas reveladas e
  decisões do jogador mudam a probabilidade.
- `/cassino corrida` e `/cassino corrida_apostar`: evento de seis horas. Os
  quatro estandartes têm 25% cada. O bolo inteiro vai proporcionalmente às
  apostas vencedoras, inclusive os restos inteiros do rateio. Se ninguém
  escolheu o vencedor, todo o bolo retorna aos participantes.
- `/cassino torneio` e `/cassino torneio_entrar`: Pote das Dez Árvores. Cada
  participante confirmado possui uma chance igual e deposita uma unidade
  duplicada comum ou incomum. Itens únicos, de missão, vinculados ou
  dependentes do mestre são recusados.
- `/cassino contratos`, `/cassino contrato_resgatar` e `/cassino conquistas`:
  mandatos semanais e 21 conquistas por jogos, sequências, retorno após
  derrotas, corrida, torneio e uso da pausa voluntária.
- `/cassino historico`, `/cassino limites`, `/cassino pausa` e
  `/cassino regras`: transparência e controles do jogador.
- `/cassino auditoria`: distribuição observada de faces, símbolos, marcos,
  posições e vencedores. Amostras pequenas naturalmente ficam desiguais.
- `/cassino configurar` e `/cassino diagnostico`: controles privados do
  mestre com permissão Gerenciar Servidor.

## Aleatoriedade e justiça

Produção chama `secrets.SystemRandom`, que consome a fonte criptográfica do
sistema operacional. `randrange`, `randint`, `choice` e `shuffle` dessa classe
usam amostragem sem viés de módulo. Nenhum sorteio recebe saldo, usuário,
histórico, horário, sequência de vitórias ou valor da aposta como entrada.

Os testes enumeram todos os resultados equiprováveis de Dados, Sucessão e
Queda e verificam o valor esperado exato. A Corrida testa pesos iguais,
ausência de corte e distribuição do último Lunar. Isso valida o código e a
matemática, mas não transforma um resultado individual em prova pública
verificável. Para esse nível adicional seria necessário um protocolo futuro
de commit/reveal ou uma fonte pública de aleatoriedade.

Os padrões de variedade e conquistas específicas por jogo foram estudados a
partir da página pública de conquistas de *Gamble With Your Friends*. Nenhum
nome, texto, personagem ou identidade visual foi copiado; as mecânicas foram
adaptadas à lore oficial de O Jardim.

## Persistência e concorrência

As regras puras vivem em `bots/banqueiro/core/cassino.py`; a interface Discord
fica em `bots/banqueiro/cogs/cassino.py`. O schema é criado de forma idempotente
por `core/db.py`.

Tabelas principais:

- `cassino_config` e `cassino_jogadores`: limites e pausa;
- `cassino_rodadas`: aposta, estado, versão otimista, pagamento e resultado;
- `cassino_corridas` e `cassino_corrida_apostas`: evento pari-mutuel;
- `cassino_contrato_atividades` e `cassino_contrato_resgates`: progresso
  semanal com resgate único;
- `cassino_conquistas`: títulos desbloqueados;
- `cassino_torneios` e `cassino_torneio_entradas`: custódia e entrega do pote.

Jogos de mesa e 21 são liquidados pelo Banqueiro. A Corrida é liquidada pelo
Jornalista em uma transação PostgreSQL e publicada pela fila durável do jornal.
O Pote é resolvido pelo Banqueiro porque a entrega usa a fachada de inventário,
que conhece o modo legado e as reservas do cofre da plataforma.

A Loteria Dominical também usa liquidação atômica: seleciona o vencedor,
credita, grava extrato e remove bilhetes na mesma transação.

## Operação e balanceamento

Padrões iniciais:

- aposta por rodada: 5 a 200 Lunaris;
- volume diário: 500 Lunaris;
- perda líquida diária: 200 Lunaris.

São parâmetros iniciais, não uma conclusão de balanceamento. Durante o beta, o
mestre deve consultar `/cassino diagnostico`, `/cassino auditoria` e
`/economia_diagnostico`. Acompanhe jogadores únicos, RTP real, resultado da
casa e concentração de patrimônio.

## Testes

Os testes unitários cobrem regras, valor esperado, pagamentos, elegibilidade,
confirmação, interface e inventário de comandos. Os testes PostgreSQL cobrem
débito/pagamento idempotentes, limites, pausa, auditoria, conquistas, rateio da
corrida, mandatos e custódia legada do pote.

Use somente um PostgreSQL descartável:

```powershell
$env:TEST_DATABASE_URL = "postgresql://usuario:senha@127.0.0.1:5432/banco_descartavel"
Set-Location bots/banqueiro
python -m pytest -q
Set-Location ../jornalista
python -m pytest -q
```

Nunca aponte `TEST_DATABASE_URL` para o banco de produção. Os utilitários de
teste recusam explicitamente uma URL igual a `DATABASE_URL`.
