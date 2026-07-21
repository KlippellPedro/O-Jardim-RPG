# Roteiro de testes manuais

O que conferir no site depois das mudanças de julho de 2026. Marque conforme
for testando; o que falhar, anote o passo e o que apareceu na tela.

Legenda: **[M]** precisa de conta mestre · **[A]** precisa de admin/criador ·
**[J]** precisa de uma segunda conta, de jogador.

---

## 0. Antes de tudo

- [ ] No painel da Discloud, adicionar a variável `CREATOR_EMAIL=dono@exemplo.com`
      e reiniciar a plataforma.
- [ ] Publicar a versão nova do site (front + `plataforma/`).
- [ ] Abrir o site e conferir no log de inicialização que **não** aparece
      "CREATOR_USER_ID/CREATOR_EMAIL nao configurados".
- [ ] Ter uma segunda conta de teste à mão (pode ser um e-mail alternativo) para
      os passos marcados com **[J]**.

> A migração do banco roda sozinha no primeiro start. Se algo falhar aqui, o log
> da plataforma diz qual passo quebrou.

---

## 1. Rotas — o bug da tela preta

- [ ] Abrir `/` → o menu aparece normalmente.
- [ ] Entrar em **Ficha** e clicar em **‹ O Jardim RPG** → volta ao menu.
      *(Antes: tela preta com `{"detail":"Not Found"}`.)*
- [ ] Repetir o voltar em **Mundo**, **Regras** e **Itens**.
- [ ] Digitar `/ficha`, `/mundo`, `/regras`, `/loja` na barra de endereço → cada
      um abre a página certa.
- [ ] Digitar `/index.html` → abre o menu.
- [ ] Digitar um endereço inventado (`/qualquercoisa`) → aparece a página
      "Este caminho não existe no Jardim" com botão de voltar, **não** um erro cru.
- [ ] Abrir `/templates/ficha.html` (link antigo) → ainda funciona.
- [ ] Dentro da Ficha, abrir um personagem e clicar em **‹ Seus personagens** →
      volta para a lista sem recarregar a página.

## 2. Velocidade

- [ ] Abrir cada módulo e reparar se ainda "trava" ao entrar. Deve ir direto,
      com o painel mostrando "Conferindo sua conta e campanha…" se demorar.
- [ ] Abrir o menu no celular ou com internet lenta — os ícones agora somam
      ~54 KB (antes eram ~6,7 MB).
- [ ] Página de Regras: os 13 ícones aparecem rápido (~173 KB no total).
- [ ] Conferir que todos os ícones carregaram (nenhum caiu no símbolo de texto).
- [ ] Na Ficha, arrastar o contador de vida várias vezes seguidas: a ficha salva
      **uma vez**, quando você para — não a cada passo.
- [ ] Editar algo, trocar de aba do navegador na hora e voltar: a alteração foi
      salva (o site força o envio ao esconder a aba).

## 3. Conta criador **[A]**

- [ ] Entrar com `dono@exemplo.com` → em **Minha conta**, o cargo aparece
      como **Criador**.
- [ ] O menu de configurações mostra **Usuários e cargos** e o atalho
      **Administração**.
- [ ] Em Administração › Contas, sua própria linha está travada: não dá para
      mudar cargo, desativar nem redefinir a senha.

## 4. Painel do mestre **[M]**

Abrir **Painel do mestre**. Deve ter cinco seções no topo.

### Mesa e jogadores
- [ ] A lista mostra todos os membros, com **Dono** marcado no seu nome.
- [ ] O seletor de papel do dono está travado (o servidor não permitiria mudar).
- [ ] Mudar o papel de um jogador para Observador e salvar → aparece confirmação.
- [ ] **[J]** O jogador afetado recebe um aviso sobre a mudança de papel.
- [ ] Gerar um convite escolhendo papel, número de usos e validade → o código
      aparece em destaque.
- [ ] O convite aparece na lista abaixo, com contagem de usos.
- [ ] Revogar o convite → some da lista.
- [ ] **[J]** Tentar entrar com o código revogado → recusado.
- [ ] Remover um membro → confirma que as fichas dele continuam salvas.

### Personagens
- [ ] Aparecem os personagens de **todos** os jogadores, não só os seus.
- [ ] Cada um mostra raça, classe com nível e nível total corretos.
- [ ] A vida aparece como `atual/máximo`; quem está abaixo de um terço fica com
      o selo **vermelho**.
- [ ] Buscar por nome de personagem e por nome de jogador funciona.
- [ ] Filtrar por jogador funciona.
- [ ] **Abrir ficha** leva à ficha daquele personagem.

### Publicar conteúdo
- [ ] Trocar entre Mundo / Itens / Área do mestre recarrega a lista.
- [ ] O conteúdo vem agrupado por tipo, com contador ("2 de 4 na campanha").
- [ ] **Selecionar grupo** marca e desmarca o grupo inteiro.
- [ ] O contador no topo mostra quantos você marcou.
- [ ] Publicar com "Todos da mesa já veem" → **[J]** o jogador vê o conteúdo em
      Mundo/Itens.
- [ ] Publicar com "Guardado; libero depois" → **[J]** o jogador **não** vê.
- [ ] "Tirar da campanha" remove e revoga os acessos.

### Quem vê o quê
- [ ] Cada informação mostra quem tem acesso com **nome de pessoa**
      (ex.: "Marina Alves · Parcial"), não códigos.
- [ ] Trocar o acesso padrão de uma informação no seletor salva na hora.
- [ ] Marcar várias informações e liberar de uma vez para um alvo.
- [ ] Liberar para um personagem específico → **[J]** só o dono daquele
      personagem vê.
- [ ] Liberar para "Todos os jogadores" → **[J]** todos veem, observadores não.
- [ ] Clicar no × de um acesso o revoga.
- [ ] **[J]** O jogador recebe aviso quando algo é revelado para ele.

### Registro
- [ ] Mostra o que aconteceu na mesa em português ("publicou conteúdo", "salvou
      uma ficha"), do mais recente ao mais antigo.
- [ ] Ações do bot aparecem com o nome do serviço.

## 5. Avisos

- [ ] O sino no canto inferior mostra a contagem de não lidos.
- [ ] O menu de configurações mostra o mesmo número no item **Avisos**.
- [ ] Clicar no sino com avisos pendentes abre direto na aba Avisos.
- [ ] Cada aviso mostra de onde veio, quem fez e há quanto tempo.
- [ ] **Marcar lido** tira o destaque e diminui o contador.
- [ ] **Marcar tudo como lido** zera o contador.
- [ ] **Limpar os lidos** só apaga o que já foi lido.
- [ ] Quem faz a ação **não** recebe aviso da própria ação.
- [ ] **[J]** Recompensa entregue pelo bot do Discord gera aviso de cofre.

## 6. Administração **[A]**

### Contas
- [ ] O resumo mostra a contagem por cargo e o total de campanhas.
- [ ] Buscar por nome e por e-mail funciona.
- [ ] Filtrar por cargo e por situação funciona.
- [ ] Mudar o cargo de alguém para Mestre → **[J]** a pessoa recebe aviso e passa
      a poder criar campanha.
- [ ] Desativar uma conta → a pessoa é desconectada e não consegue entrar.
- [ ] Reativar → a pessoa recebe aviso e volta a entrar.
- [ ] Tentar desativar a própria conta → bloqueado.

### Campanhas
- [ ] Lista todas as mesas com dono, número de membros, personagens e publicações.
- [ ] **Mostrar arquivadas** inclui as arquivadas com o selo certo.
- [ ] Campanha com Discord vinculado mostra o selo **Discord**.

### Registro da plataforma
- [ ] Mostra eventos de todas as campanhas e contas.

## 7. Redefinir senha **[A]** + **[J]**

- [ ] Em Administração › Contas, clicar em **Redefinir senha** de uma conta de teste.
- [ ] A senha provisória aparece **uma vez**, com botão **Copiar**.
- [ ] Recarregar a página → a senha não aparece mais.
- [ ] **[J]** A sessão daquela pessoa cai na hora (ela é desconectada).
- [ ] **[J]** Entrar com a senha provisória → o site abre travado na tela
      "Sua senha foi redefinida".
- [ ] **[J]** Tentar fechar no ×, apertar Esc e clicar fora → **não fecha**.
- [ ] **[J]** Digitar senhas novas diferentes entre si → erro claro.
- [ ] **[J]** Digitar senha com menos de 12 caracteres → recusada.
- [ ] **[J]** Concluir a troca → o portal fecha sozinho e o site libera.
- [ ] **[J]** Entrar de novo com a senha nova funciona; com a provisória, não.
- [ ] **[J]** O aviso "Sua senha foi redefinida" está na caixa de avisos.
- [ ] Em **Minha conta**, trocar a própria senha voluntariamente funciona.
- [ ] Tentar redefinir a senha da conta criador → bloqueado.

## 8. Backup **[A]**

- [ ] Administração › Backup › **Gerar e baixar backup** → o arquivo baixa.
- [ ] O nome tem data e hora; a tela mostra tamanho e número de registros.
- [ ] Conferir o arquivo sem restaurar:
      `python tools/backup-jardim.py verificar CAMINHO_DO_ARQUIVO`
      → lista as tabelas e a contagem por tabela.
- [ ] Conferir que **não** aparecem `sessoes_auth` nem `limites_login` na lista.
- [ ] Backup pelo script (precisa da `SERVICE_API_KEY` no `.env`):
      `python tools/backup-jardim.py --destino backups/`
- [ ] Rodar o script duas vezes → dois arquivos, sem apagar o anterior.

### Restauração — testar num banco descartável, nunca no de produção

- [ ] Subir um Postgres de teste (Docker):
      `docker run -d --name jardim-teste -e POSTGRES_PASSWORD=teste -p 55432:5432 postgres:16-alpine`
- [ ] Apontar `TEST_DATABASE_URL` para ele e rodar:
      `cd plataforma && python -m unittest tests.test_database_integration -v`
      → os 4 testes devem passar, incluindo o ciclo backup → apagar → restaurar.
- [ ] Derrubar o container: `docker rm -f jardim-teste`

> Este é o teste mais importante da lista: é o que prova que o backup serve
> para alguma coisa. Enquanto ele não rodar, o backup é uma promessa.

## 9. Aparência geral

- [ ] Abrir o painel no celular (ou reduzir a janela para ~375 px): nada estoura
      a lateral, nenhum texto sai da tela.
- [ ] Conferir os selos coloridos (Ativo/Desativado, Publicado, Dono, Discord).
- [ ] Passar por todas as abas do portal olhando se algo ficou desalinhado.

---

## 10. Sessão ao vivo

Precisa de **duas telas ao mesmo tempo**: uma logada como mestre, outra como
jogador (outro navegador ou uma janela anônima). É assim que se vê o tempo real
funcionando.

### Abrir a mesa **[M]**
- [ ] No menu, o card **Sessão ao vivo** aparece.
- [ ] Abrir `/sessao` → mostra "Nenhuma sessão acontecendo".
- [ ] No canto superior direito, o indicador fica verde com **ao vivo**.
- [ ] Dar um nome à cena, deixar marcado "Já trazer os personagens" e abrir.
- [ ] Os personagens da campanha entram na lista com a vida da ficha.
- [ ] **[J]** Na tela do jogador, a sessão aparece **sozinha**, sem recarregar.
- [ ] **[J]** O jogador recebe o aviso "A sessão começou".
- [ ] Voltar ao menu → o card mostra o selo **acontecendo agora** piscando.

### Iniciativa e turnos **[M]**
- [ ] Adicionar um inimigo (nome, vida, iniciativa) → entra na lista.
- [ ] Mudar a iniciativa de alguns participantes no campo **Inic.**
- [ ] **Ordenar por iniciativa** → a lista se reorganiza do maior para o menor.
- [ ] **Iniciar combate** → aparece "Rodada 1" e o primeiro da ordem fica
      destacado com borda dourada.
- [ ] **Próximo turno** avança; ao passar do último, a rodada vira 2.
- [ ] **‹ Anterior** volta um turno.
- [ ] **[J]** O jogador vê a rodada e de quem é a vez, acompanhando em tempo real.
- [ ] **[J]** Quando chega a vez do personagem do jogador, aparece **"Sua vez"**
      com destaque.

### Vida e condições **[M]**
- [ ] Digitar um valor e clicar **− Dano** → a barra diminui e muda de cor.
- [ ] **+ Cura** aumenta, sem passar do máximo.
- [ ] Levar alguém a 0 → a barra fica vermelha.
- [ ] Aplicar uma condição pelo seletor **+ condição** → aparece a etiqueta.
- [ ] Clicar no × da condição → some.
- [ ] **[J]** Todas essas mudanças aparecem na tela do jogador sozinhas.

### O que o jogador não pode ver **[J]** — o teste mais importante
- [ ] Na tela do jogador, o inimigo mostra o estado em palavras
      ("Ferido", "Quase morto") e **nenhum número** de vida.
- [ ] O personagem do próprio jogador mostra os números normalmente.
- [ ] **[M]** Clicar em **Mostrar vida** no inimigo → **[J]** aí sim o jogador
      passa a ver os números daquele inimigo.
- [ ] **[M]** Clicar em **Esconder** num participante → **[J]** ele **some** da
      tela do jogador.
- [ ] **[M]** No cartão escondido aparece o selo "escondido dos jogadores".
- [ ] **[J]** Se for a vez de alguém escondido, o jogador vê "Alguém que você
      não vê" — sem revelar o nome.
- [ ] **[J]** O jogador não tem nenhum botão de dano, cura ou remoção.

### Conexão
- [ ] Deixar a tela do jogador aberta e minimizada por alguns minutos; ao voltar,
      o estado está atualizado.
- [ ] Desligar o wi-fi por instantes → o indicador vira **reconectando…** e
      volta para **ao vivo** quando a rede retorna.
- [ ] Recarregar a página no meio do combate → volta exatamente no mesmo estado.

### Encerrar
- [ ] **Encerrar sessão** (pede confirmação) → volta para "Nenhuma sessão".
- [ ] **[J]** A tela do jogador volta sozinha para o aviso de espera.
- [ ] Abrir uma sessão nova funciona normalmente.
- [ ] Tentar abrir duas sessões na mesma campanha → recusado.

## 11. Rolagem de dados e log da mesa

### Rolar na ficha
- [ ] Abrir uma ficha › **Perícias** › clicar no **?** de qualquer perícia.
- [ ] No fim do modal aparece **DT (opcional)** e o botão **Rolar dado**.
- [ ] Rolar sem DT → mostra o total e os dados sorteados.
- [ ] Rolar com DT 15 → aparece **Sucesso**, **Falha**, ou os críticos, com cor.
- [ ] Numa perícia com **vantagem**, rolar → aparecem **dois dados** e o
      descartado fica riscado e apagado.
- [ ] Idem com desvantagem (o menor é o que vale).
- [ ] Tirar 20 natural → o resultado ganha destaque dourado.
- [ ] Aba **Ataques** › **?** de um ataque › **Rolar dado**.
- [ ] Depois de rolar o acerto, aparece **sozinho** um segundo botão para rolar
      o dano do ataque (ex.: `Rolar 2d6+4`).
- [ ] Rolar o dano → soma os dados certinho.

### O log prova o que aconteceu **[M]**
- [ ] Rolar algumas coisas na ficha e abrir `/sessao` → o bloco **Log da mesa**
      mostra todas, da mais recente para a mais antiga.
- [ ] Cada linha traz: quem rolou, o quê, o total, **os dados individuais**,
      a fórmula, a DT e o grau.
- [ ] O log diz que os dados são rolados no servidor.
- [ ] Alternar o filtro entre **Só desta sessão** e **Toda a campanha**.

### Uso de poderes vira registro **[M]**
- [ ] Na ficha, aba **Poderes** › usar um poder que tenha custo.
- [ ] No log da sessão aparece o poder com **"Custou X de Mana"** e o horário.
- [ ] Repetir com uma **habilidade** e com uma **magia** → cada um com seu ícone.
- [ ] Conferir que o custo cobrado na ficha bate com o que o log registrou.

### O que o jogador vê do log **[J]**
- [ ] Na tela do jogador, o bloco se chama **Suas rolagens**.
- [ ] O jogador vê as **próprias** rolagens e usos.
- [ ] O jogador **não** vê as rolagens dos outros jogadores nem as do mestre.
- [ ] **[M]** O mestre vê as de todo mundo.

### Não dá para trapacear
- [ ] Abrir o console do navegador durante uma rolagem: o resultado vem pronto
      do servidor, não há número escolhido no cliente.
- [ ] Observador tentando rolar → recusado pela API.

### Dado à mão (sintaxe do Rollem)
- [ ] Na sessão, o mestre tem o bloco **Rolar dado** com atalhos
      (d20, d100, 2#d20, 1d6…).
- [ ] `2d6+3` → soma os dois dados mais 3.
- [ ] `1d20+1d4-2` → aceita vários termos.
- [ ] `2#d20` → **duas rolagens separadas** (ex.: "7, 15"), não um 2d20 somado.
- [ ] `3#2d6+3` → três rolagens completas, cada uma com seu total.
- [ ] Expressão inválida (`2#`, `99#d20`, `abacaxi`) → mensagem clara, sem quebrar.
- [ ] Todas as rolagens do mestre aparecem no log junto com as dos jogadores.
- [ ] No Discord, `/rolar 2#d20` no **Barista** devolve o mesmo formato.

### Rolar sem procurar
- [ ] Aba **Perícias**: cada linha tem o dado 🎲 ao lado do "?" — clicar abre o
      modal curto e rola direto.
- [ ] Aba **Ataques**: cada card tem o 🎲 no topo; rolar o acerto faz aparecer o
      botão do dano.
- [ ] O "?" continua abrindo o cálculo detalhado, como antes.

### Iniciativa e atalhos da sessão **[M]**
- [ ] **🎲 Iniciativa de todos** → cada participante recebe um d20 e a fila é
      reordenada do maior para o menor.
- [ ] A iniciativa rolada aparece no log da mesa.
- [ ] Cada personagem no combate tem **Abrir ficha ↗**, que abre em nova aba.
- [ ] **[J]** O jogador vê o atalho só do próprio personagem.

## 12. Busca nas Regras

- [ ] A página de Regras tem campo de busca no topo.
- [ ] Buscar `condi` (sem acento) acha **Condições**.
- [ ] Buscar `pericia` acha **Perícias e Resistências**.
- [ ] Buscar em MAIÚSCULAS funciona igual.
- [ ] Um termo sem resultado mostra **Nada encontrado**.
- [ ] Grupo inteiro sem resultado some, junto com o título da seção.
- [ ] **Esc** limpa a busca e todos os tópicos voltam.
