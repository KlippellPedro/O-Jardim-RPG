# Plano: Campanhas e Materiais

Proposta para você aprovar, cortar ou mudar. Nada aqui foi implementado.

## Como está hoje

**Campanhas** (`/campanhas`): uma grade de cartões com nome, descrição e seu papel. Dá para criar uma mesa, entrar com código de convite e escolher qual campanha usar. Depois de escolher, a campanha some da vista: não existe uma "página da campanha".

**Materiais** (`/materiais`): três abas só de leitura (Recursos, Receitas, Guia) com o catálogo de matéria-prima, componentes, sucata e mantimentos. Pelas regras, o jogador "anota apenas o lote", ou seja, ninguém controla estoque no site. O catálogo e a ficha não conversam.

---

## Parte 1: Campanhas

### 1.1 Página da campanha (o que mais faz sentido)
Ao abrir uma campanha, uma página-base que reúne o que já existe espalhado:
- **Hoje no mundo:** data e estação do calendário, e o próximo acontecimento (rasurado para o jogador).
- **Próxima sessão:** o calendário semanal que já criamos.
- **"Anteriormente...":** um resumo das últimas sessões, aproveitando o Resumo estilo Wrapped que já existe.
- **A mesa:** quem são os jogadores, com o personagem ativo de cada um e se estão online.
- **Atalhos:** Ficha, Sessão, Quadro, Frota.

Esforço: médio. Quase tudo já tem API. É a peça que dá cara de "minha campanha".

### 1.2 Identidade da campanha
- Capa (imagem), cor de destaque e uma frase de abertura, editáveis pelo Mestre.
- A cor aparece nos cartões, na Home e no calendário.
- Esforço: baixo.

### 1.3 Convites melhores
- Hoje é só um código. Proposta: convite com **validade**, **limite de usos** e escolha do papel de entrada (jogador ou observador). O Mestre vê e revoga os convites ativos.
- Esforço: baixo a médio (precisa de tabela e regras no servidor).

### 1.4 Troca rápida de campanha
- Um seletor discreto no topo, para quem joga em mais de uma mesa, sem voltar à grade.
- Esforço: baixo.

### 1.5 Ciclo de vida
- **Duplicar** uma campanha como modelo (só o conteúdo editorial, sem fichas nem economia), útil para uma segunda mesa.
- **Arquivar** com uma tela de "encerramento": estatísticas finais, MVP da campanha, títulos do rank.
- Esforço: médio.

**O que eu NÃO proporia:** campanha pública/aberta a estranhos, chat próprio e agenda por fuso de cada jogador. Fogem do jeito privado do Jardim.

---

## Parte 2: Materiais

### 2.1 Meus lotes (o coração da ideia)
Uma seção na Ficha com os **lotes que o personagem tem**, por recurso e raridade (ex.: "Matéria-prima rara: 2 lotes"). Simples: um contador por linha, com + e −. Respeita a regra "anota apenas o lote" e não vira contabilidade pesada.
- O Mestre pode conceder lotes como recompensa; entra no Diário do personagem.
- Esforço: médio (novo campo na ficha, sem mudar o que existe).

### 2.2 Comprar e conseguir lotes
- Comprar lotes na Loja, usando a tabela de custo por raridade que já existe, e receber como recompensa de loot.
- Esforço: médio, porque toca a economia; precisa de cuidado com a escala de preços.

### 2.3 Fabricar a partir da receita
- Na receita, um botão **"Fabricar"**: confere se o personagem tem os lotes, gasta, entrega o item no Inventário e registra no Diário. Respeita o que o Livro diz sobre tempo e Cansaço (o dia de fabricação).
- Esforço: médio a alto. É a parte que faz o catálogo virar jogo.

### 2.4 Receitas que se descobrem
- Reaproveitar a **rasura** do Mundo: a receita existe no catálogo, mas aparece borrada até o Mestre liberar ou o personagem aprender. Dá para aprender com instrutor ou achando o livro de receitas.
- Esforço: baixo, porque o mecanismo já está pronto.

### 2.5 "O que posso fazer agora?"
- Filtro que mostra só as receitas que os lotes do personagem cobrem.
- Esforço: baixo, depois do 2.1.

---

## Ordem sugerida

1. **Página da campanha (1.1)**, com Identidade (1.2) junto, pelo ganho visual imediato.
2. **Meus lotes (2.1)** e **Receitas que se descobrem (2.4)**, que são baratos e já mudam a experiência.
3. **Fabricar (2.3)**, quando os lotes estiverem estáveis.
4. Convites (1.3), troca rápida (1.4), comprar lotes (2.2) e ciclo de vida (1.5) como extras.

## Decisões suas antes de começar

1. Materiais devem virar **estoque contado** (2.1), ou você prefere manter "só anota o lote" fora do site?
2. Fabricar deve **gastar** os lotes automaticamente (2.3) ou só avisar o que falta?
3. A página da campanha (1.1) deve ser a **tela inicial** ao entrar, ou um botão dentro do Início?
4. Itens da Parte 1 ou 2 que você quer **cortar**.

---

## Atualização: o que aconteceu com a Parte 2 (Materiais)

- **2.1 Meus lotes** já existia (Inventário, "Estoques de materiais"); o plano estava enganado.
- **2.3 "Fabricar"** foi trocado por algo mais fiel às regras: as classes que gastam lote (Alquimia, Engenharia e Cozinha) pagam **1 lote a cada descanso**, e rituais pagam os componentes pela complexidade. Isso virou o cartão "Lotes do descanso" na aba Descanso da Ficha. Um botão que entregasse o item no Inventário contrariaria a regra de que preparos de classe "nunca cobram baixa de inventário".
- **2.5** virou o filtro "Só o que meus lotes cobrem" nas Receitas de Materiais.
- **2.4 (receitas rasuradas)** foi descartada: as receitas são regra pública do Livro, e escondê-las aqui seria incoerente.
- **2.2 (comprar lotes na Loja)** não foi feita: mexe na escala de preços e precisa de uma decisão sua sobre quanto custa cada lote.
