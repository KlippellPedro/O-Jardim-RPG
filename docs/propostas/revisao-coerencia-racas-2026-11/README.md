# Coerência das raças com as regras atuais (novembro de 2026)

Pedido do Pedro em 2026-11-23, logo depois da revisão das classes: conferir se os traços, estágios, variantes, Naturezas, animais e legados das 25 raças seguem as regras simplificadas de novembro e as regras gerais decididas em 2026-11-20.

- **Como foi feito:**
  - cinco agentes, cada um com um grupo de raças;
  - cada um leu o núcleo do Livro inteiro e os tópicos que a raça toca (Implantes no Autômato, Perigos na Sereia, Legados no Desperto);
  - os achados graves foram conferidos de novo na sessão principal, no `racas.json`, no Livro e no código da ficha.
- **Base:** `data/ficha/racas.json`, `data/ficha/pecados-e-virtudes.json` e `data/regras/regras-publicas-v1.md` como estão no commit `893f532`.
- **Não reabre:** a revisão de outubro (`docs/propostas/revisao-racas-2026-10`) e o questionário de 28/10. Tamanho, escadas, `dt_efeitos`, pacote do Autômato, Semideus, Noite Eterna e línguas ficaram como decididos.
- **Aplicado em 2026-11-24** (sem commit): tudo. Ver a seção "Aplicado" logo abaixo. Os relatórios completos estão em [`grupos/`](grupos/).

## Aplicado

O Pedro mandou aplicar tudo e delegou as decisões ("aplica e decide o resto"). A sessão principal respondeu as sete perguntas gerais e passou os critérios das classes para as raças ([`aplicado/CRITERIOS.md`](aplicado/CRITERIOS.md)). Cada agente transformou todos os achados do seu grupo em trocas exatas, e um script conferiu cada trecho contra o arquivo antes de gravar.

- **Janela de uso:** o campo `recuperacao` virou `"descanso"` nos 119 traços cuja descrição diz "por descanso". As telas do Espírito (`src/redesign/raca/espirito/dados.ts`) e da Animália (`src/redesign/raca/animalia/AnimaliaForma.tsx`) aprenderam a mostrar "por descanso".
- **500 trocas** em `data/ficha/racas.json` e `data/ficha/pecados-e-virtudes.json`, listadas em [`aplicado/`](aplicado/), uma lista por grupo. Cada uma tem as trocas (`correcoes`), o que já estava resolvido (`resolvidos`, 20) e o que ficou como está (`mantidos`, 20).
- **As sete perguntas gerais:**
  1. Voltar da morte por traço cobra o preço do Livro. No Clone, as memórias perdidas valem como o que Arkarin leva.
  2. A "metade do dano" fica, depois da vulnerabilidade e antes da Resistência.
  3. Cada arma natural diz o tipo: garra corta, mordida e chifre perfuram, punho e cauda batem.
  4. O Espírito sem corpo não fica Incorpóreo e atravessa material só pela Passagem Etérea.
  5. Sombra Viva e Véu sem Aurora escrevem a exceção a Ver e ser visto.
  6. Animália jogável nunca é Minúscula nem Colossal.
  7. Sonho Aberto só tira a Mana do Passo, A Noite que Se Repete vale contra o golpe que mataria, e o Juramento de Sangue ganhou teste de Vontade.
- **Conferência da sessão principal** (o que mudou nas trocas dos agentes):
  - Desfazer o Instante manteve a força: o golpe não causa dano, porque o traço dispara antes dele.
  - Máquina Viva não ganhou custo novo de Sanidade: o Autômato continua pagando metade.
  - Os estágios do Anão ficaram "de Forja".
  - Duas Cabeças e Truque Feérico ganharam o tipo `acao_livre`, e a ficha aprendeu a mostrar "Ação Livre".
  - A Possessão voltou a dizer "no fim de cada turno seu", como no questionário.
  - Duas frases saíram do formato "não é X: Y".
  - O Simbionte ganhou DT de raça (Fortitude), porque passou a mandar testar.
- **Auditoria do Espírito** (`tools/audit-espirito.mjs`): a janela longa de combate passou a ser o descanso (ou a sessão), e o custo que o próprio Espírito paga ("Quando termina, você fica Atordoado") não conta como controle sobre outra criatura.
- **Mural:** entrada `2026-11-24-racas-de-acordo-com-o-livro`, e `src/data/novidades.json` regerado.
- **Testes:**
  - `npm run test:frontend`: 1.882 passam;
  - `npx tsc -b` e `npm run check:balance`: passam;
  - testes do servidor: 1.818 passam, 504 pulados por não haver banco;
  - auditorias do Espírito e da Animália: zero violações.
- **Não regerado:** os PDFs e o HTML do Livro (`docs/livro/_html`), que imprimem as raças. Ficam para quando for commitar (`npm run docs:livro` e `npm run docs:livro:mestre`).
- **Não visto no navegador:** as etiquetas "por descanso" nas páginas do Espírito e da Animália.

## Números

| Grupo | Raças | Achados | Erro | Incoerência | Lacuna | Melhoria | Pede decisão |
|---|---|---|---|---|---|---|---|
| [A](grupos/espirito.md) | Espírito e o catálogo de Pecados e Virtudes | 56 | 4 | 17 | 26 | 9 | 26 |
| [B](grupos/animalia-divino-elfo.md) | Animália, Divino, Elfo | 45 | 4 | 23 | 13 | 5 | 23 |
| [C](grupos/automato-vampiro-auleth-onirico.md) | Autômato, Vampiro, Auleth, Onírico | 54 | 1 | 22 | 21 | 10 | 29 |
| [D](grupos/slime-golem-desperto-mimico-anao-gigante.md) | Slime, Golem, Desperto, Mímico, Anão, Gigante | 75 | 9 | 13 | 37 | 16 | 30 |
| [E](grupos/sereia-e-menores.md) | Sereia, Simbionte, Anomalia, Bruxa, Clone, Amálgamo, Feérico, Humano, Goblim, Entidade, Outra coisa | 49 | 10 | 10 | 14 | 15 | 14 |
| **Total** | **25 raças** | **279** | **28** | **85** | **111** | **55** | **122** |

Entidade e Outra coisa não têm mecânica e ficaram sem achados. Os números de Vida, Mana, Estamina e Movimento de todas as raças batem com a tabela do Livro.

## O erro que mais pesa: a janela de uso

Quando "por sessão" virou "por descanso" nos efeitos de combate (2026-11-12), o texto das raças mudou, mas o campo `recuperacao` ficou em `"sessao"`.

- **119 traços em 18 raças** dizem "por descanso" na descrição e guardam `recuperacao: "sessao"`. Espírito 60, Divino 9, Auleth 7, Sereia 5, Onírico 5, Vampiro 4, Golem 4, Slime 4, Elfo 4, Anão 3, Simbionte 3, Gigante 2, Mímico 2, Anomalia 2, Amálgamo 2, Feérico 1, Desperto 1, Bruxa 1.
- **Por que importa:** a ficha monta o texto de uso a partir do campo (`usoDoTracoRacial` em `src/services/progressaoFichaService.ts`), então o jogador lê "Uma vez por sessão" na ficha e "por descanso" na descrição. A marcação de usos também zera na janela do campo.
- **As telas do Espírito e da Animália** só conhecem sessão e cena (`src/redesign/raca/espirito/dados.ts:77` e `src/redesign/raca/animalia/AnimaliaForma.tsx:36`). Um traço com `"descanso"` apareceria ali como "por cena". Elas precisam aprender o descanso junto com a troca do campo.
- **O caminho inverso:** Leitura de Sonhos e Visita Noturna, do Onírico, dão informação e estão "por descanso". Informação volta por sessão.
- **Janelas que não existem:** a Fúria Sagrada do Divino diz "em cada combate" (vira "em cada cena") e a Obra de Mestre do Anão diz "por arco da campanha".

A troca do campo é mecânica e não pede decisão: um script lê a descrição e grava `"descanso"` onde ela diz "por descanso".

## Outros graves, conferidos na sessão principal

- **Iniciativa rolada:** Adiantar-se manda "rolar Iniciativa" com dois d20, e Voz do Jardim, Mundo em Pressa, Mundo em Câmera Lenta e o Pecado da Preguiça mexem em rolagem de Iniciativa. O Livro diz que a Iniciativa é um número fixo da ficha, que não se rola. O certo é "+X de Iniciativa".
- **Voltar da morte sem o preço:** a Criação de Tudo (Espírito da Origem, 60) traz de volta "quem morreu há menos de 1 minuto" com 1 de Vida. O Corpo Reserva do Clone faz o personagem acordar num corpo novo. Âncora, Raiz, Voto, Eterno e Primeira Alma, do Espírito, fazem coisa parecida. Nenhum cobra o que o Livro pede em Ferimentos › Voltar da morte: "quem volta ganha Ferido 2 e 2 de Cansaço, e Arkarin fica com alguma coisa".
- **Escalar com a perícia errada:** Instinto Ágil (Animália) dá vantagem em Acrobacia "para escalar". No Livro, escalar é Atletismo.
- **Onírico sem teto:** Nunca Mais Pousar tira o limite do Passo Entre-Sonhos, e o Sonho Aberto o deixa sem custo. Junto, viram teleporte de 9 m sem limite. A Noite que Se Repete anula "por completo" qualquer ataque ou efeito, inclusive o que mataria.
- **Vampiro:** o Juramento de Sangue dá uma ordem por reação, sem teste, a uma criatura vinculada.
- **Autômato:** o Raio Inferno diz "faça Pontaria contra Reflexos" e, no mesmo texto, "em falha, ela sofre", misturando ataque com teste de quem se defende. Laser, Eletrificar e Pulso Estridente pedem teste e a raça não tem `dt_efeitos` para eles. O Reparo Mecânico usa "DT 15 + metade do nível" (a fórmula antiga) e cura 5 fixos.
- **Elfo:** os Corações (Invernal, Incandescente, da Tormenta) "reduzem pela metade o dano". O Livro trabalha com Resistência por valor e uma ordem de aplicação. A metade precisa dizer onde entra nessa ordem.

## Padrões que se repetem

- **"Gaste uma ação":** o campo `tipo: "acao"` vale Ação Padrão, mas o texto diz só "uma ação". O Livro tem sete ações com nome.
- **Dano sem tipo:** armas naturais (Animália, Golem, Slime, chassis do Autômato), dano devolvido, a Anomalia, o Definhamento da Bruxa, o Predador do Amálgamo, Presságio do Fim e Ceifa do Espírito. O Livro diz que todo dano aponta para um tipo.
- **"Dano físico comum" e "armas comuns":** termos que o Livro não tem. A condição Incorpóreo já usa "dano físico que não venha de magia".
- **Vantagem para resistir a manobra:** Corpo Robusto (Animália) e Massa Colossal (Amálgamo) dão vantagem para resistir a empurrão e queda, mas a manobra vai contra a defesa passiva e quem se defende não rola. O certo é desvantagem para quem tenta.
- **Área e zona sem teste:** Fotosfera, Gravidade Própria e Pulso (Auleth), O Mundo Não Combina e Delírio Contagioso (Onírico), Presságio do Fim e Ceifa (Espírito). Outras testam só num gatilho, quando a convenção é ao entrar ou no começo do turno.
- **Condições soltas ou em minúscula:** "medo", "cegueira", "agarrado", "aprisionado", "incorpórea", "invisível". O Livro usa Amedrontado, Cego, Agarrado, Imobilizado, Incorpóreo, Invisível.
- **Ajudar com teste e o termo "auxílio":** Ajudar não rola e se chama Ajudar.
- **"Aflição de nível":** o Livro diz estágio, e toda aflição começa no estágio 1.
- **DT sem fonte:** Mímico, Anomalia e Auleth (4 traços) pedem teste sem dizer de qual perícia sai a DT ou sem `dt_efeitos`.
- **Grafia dos tipos:** os elementos (Fogo, Gelo, Raio) com maiúscula, como o Livro escreve. Só grafia, sem efeito na regra.

## Perguntas que cruzam raças

Muitos dos 122 achados que pedem decisão se resolvem com poucas respostas gerais:

1. **Voltar da morte por traço de raça:** cobra o preço do Livro em todos (Ferido 2, 2 de Cansaço, Arkarin leva algo, o Mestre pode negar)? No Clone, as memórias perdidas desde a última sincronização podem valer como o que Arkarin leva.
2. **"Metade do dano" como defesa** (Corações do Elfo, Slime Magmático, Gigantes do Gelo e do Fogo): fica a metade, entrando depois da vulnerabilidade e antes da Resistência, ou vira Resistência por valor?
3. **Tipo das armas naturais:** cada uma diz o seu (garra corte, mordida e chifre perfuração, punho e cauda impacto), e as que têm elemento dizem o elemento?
4. **Espírito sem corpo:** a Natureza sem corpo passa a usar a condição Incorpóreo do Livro?
5. **Escuridão mágica:** a Sombra Viva enxerga "através de escuridão natural ou sobrenatural", e o Véu sem Aurora "através de qualquer escuridão". Vale para a escuridão mágica de qualquer fonte, inclusive a de uma magia de nível alto, ou só para a natural?
6. **Tamanho dos animais da Animália:** os Minúsculos e Colossais seguem a tabela de Tamanho, com a trava de duas categorias?
7. **Efeitos sem teto:** Nunca Mais Pousar, A Noite que Se Repete e o Juramento de Sangue ganham limite, teste ou custo?

O resto é decisão de uma raça só e está marcado "Decisão do Pedro? sim" nos relatórios dos grupos. Tudo foi decidido e aplicado em 2026-11-24 (seção "Aplicado").
