# Segunda fase: transformar todos os achados em trocas aplicáveis

O Pedro mandou aplicar tudo e delegou as decisões à sessão principal ("aplica e decide o resto"). As decisões abaixo valem para todos os grupos. **Siga-as. Não reabra nada aqui.** Você não edita o repositório: escreve um arquivo de correções, e a sessão principal aplica com um script que confere cada trecho.

## O que entra

**Todo achado do seu relatório**, marcado "sim" ou "não". Cada um termina em uma de três listas:
- `correcoes`: as trocas;
- `resolvidos`: o que já se resolveu sem troca sua (a janela de uso, abaixo, ou uma regra do Livro), com o que resolveu;
- `mantidos`: o que fica como está, com o motivo em uma frase.

## Atenção: o arquivo já mudou

A sessão principal já trocou `recuperacao: "sessao"` por `"descanso"` em **119 traços** cuja descrição diz "por descanso". Os achados de `recuperacao` desse tipo vão para `resolvidos`. Os recortes `racas/<id>.json` desta pasta foram **atualizados**: copie o `de` deles, nunca do relatório.

Ainda são seus: informação que está "por descanso" e deve voltar por sessão (troque texto e campo), "por combate", "por arco" e janelas que não existem, e traços com `usos` e sem `recuperacao`.

## As sete perguntas gerais (decididas)

1. **Voltar da morte por traço de raça:** todo traço que traz alguém de volta da morte cobra o preço de Ferimentos › Voltar da morte. Frase padrão: "Quem volta paga o preço de Voltar da morte: Ferido 2, 2 de Cansaço, e Arkarin fica com alguma coisa." O traço diz até quando ainda dá (pouco tempo). **Clone:** no Corpo Reserva, as memórias perdidas desde a última sincronização valem como o que Arkarin leva, e o corpo novo acorda com Ferido 2 e 2 de Cansaço. Traço que evita a morte (não deixa cair) segue Ficar com 1 de Vida: não vale contra a morte na hora, a não ser que diga.
2. **"Metade do dano" como defesa** (Corações do Elfo, Slime Magmático, Gigantes do Gelo e do Fogo): a metade fica. Acrescente "a metade entra depois da vulnerabilidade e antes da Resistência". Diga o tipo com o nome do Livro (Gelo, Fogo, Raio; Frio e Calor só para o ambiente).
3. **Armas naturais:** cada uma diz o tipo. Garra e lâmina cortam (corte); mordida, presa, chifre e ferrão perfuram (perfuração); punho, casco, cauda, cabeçada e pancada batem (impacto). Onde o jogador escolhe a arma: "corte, perfuração ou impacto, conforme a arma natural". Arma natural com elemento diz o elemento. Crítico: o da arma natural é x2, salvo se o traço já diz outro.
4. **Espírito sem corpo:** não é Incorpóreo por natureza. Só atravessa material pela Passagem Etérea. O `povo` e a `descricao` deixam de prometer "atravessa parede" sem dizer que é pela Passagem Etérea. Traço que fala em "criatura incorpórea" escreve a condição: "Incorpórea". Traço de topo que deixa o Espírito Incorpóreo usa a condição do Livro e não repete o que ela já dá.
5. **Escuridão mágica:** Sombra Viva e Véu sem Aurora (Elfo) mantêm a força e escrevem a exceção: "Exceção a Ver e ser visto: a escuridão criada por magia ou Fluxo também cede para você." Outros traços de raça que enxergam no escuro valem só para a escuridão natural, como o Livro.
6. **Tamanho na Animália:** opção 1 do relatório. "Animália jogável nunca é Minúsculo nem Colossal: bicho miúdo fica Pequeno e bicho gigante fica Enorme."
7. **Efeitos sem teto:**
   - Sonho Aberto: "Passo Entre-Sonhos não gasta Mana" (continua gastando o Movimento, então é um por turno).
   - A Noite que Se Repete: escreve "Vale até contra o golpe que mataria, porque ele não aconteceu." Fica com o resto.
   - Juramento de Sangue: a criatura testa Vontade contra a DT do Vampiro a cada ordem e, se passar, ignora aquela ordem. Uso por descanso.
   - Outros "sem teto" do seu grupo: ponha um limite simples (uma vez por turno, ou o custo que já existe) sem baixar a força do uso normal.

## Critérios gerais

Use os critérios das classes: `C:\D.E.V\T.D.S\Diversos\RPG\Pessoais\O-Jardim-RPG\docs\propostas\revisao-coerencia-classes-2026-11\aplicado\decisoes\CRITERIOS.md` (leia a parte "Regras gerais" e "Critérios para decidir"; troque "classe" por "raça"). Os mais usados aqui:

- **O Livro manda.** Exceção só com "exceção à regra X" escrito.
- **Janelas:** combate por descanso; informação, dinheiro e sorte por sessão; "combate" vira "cena".
- **Iniciativa não se rola:** "vantagem em Iniciativa" vira "+2 de Iniciativa" (desvantagem: "−2"); "rolar dois d20 na Iniciativa" vira "+5 de Iniciativa naquela cena". Adiantar-se vira passivo ou reação que dá "+5 de Iniciativa", mantendo custo e uso.
- **Todo dano tem tipo e rolagem.** Dano automático sem rolagem ganha teste (Reflexos, Fortitude ou Vontade, o que combinar) contra a DT da raça, com metade no sucesso. Dano mental diz se tira Sanidade ou Mana.
- **DT de raça vem de `dt_efeitos`.** Raça que manda testar e não tem `dt_efeitos` ganha um, copiado do modelo de outra raça (mesmas chaves: `rotulo`, `pericia`, `descricao`), com a perícia que o próprio traço já cita ou a que mais combina (Autômato: Tecnologia; Mímico: Enganação; Anomalia: Misticismo). Use `no: "__raca__"`, `campo: "dt_efeitos"`, `de: null`, `para: {objeto}`. O traço diz "contra a DT do/da <raça>". "DT 15 + metade do nível" vira "DT Padrão do seu nível".
- **Ações:** "gaste uma ação" vira "gaste uma Ação Padrão" (ou a ação que o campo `tipo` indica). Nome oficial com maiúscula.
- **Condições com nome oficial e maiúscula:** medo → Amedrontado; cegueira → Cego; agarrado → Agarrado; "aprisionado" → Imobilizado (ou o efeito escrito). "Aflição de nível N" vira "aflição no estágio 1" (toda aflição começa no 1).
- **"Dano físico comum" / "armas comuns"** → "dano físico que não venha de magia" / "armas não mágicas".
- **Vantagem para resistir a manobra** → "quem tenta empurrar, derrubar ou agarrar você tem desvantagem".
- **Área e zona:** teste com metade no sucesso; zona testa ao entrar ou no começo do turno; controle repete o teste no fim do turno de quem sofre.
- **Ajudar** não rola: "auxílio" vira "Ajudar", sem teste.
- **Movimento forçado:** respeita Combate › Tamanho (um tamanho acima, desvantagem; dois acima, não funciona sem regra que autorize).
- **Escalar** é Atletismo.
- **Números que faltam:** o mais simples que combine (duração "até o começo do seu próximo turno" ou "uma cena"; alcance em faixa oficial). Prefira o que você já sugeriu no relatório.
- **Desenho:** entre "deixar mais fraco" e "deixar o texto coerente sem mudar a força", escolha a segunda.
- **Grafia dos elementos** (Fogo, Gelo, Raio com maiúscula): só corrija quando já estiver trocando aquele trecho por outro motivo. Não gere troca só de grafia.

## Formato

Grave `patches/<seu-grupo>.json` (mesmo nome do seu relatório, por exemplo `patches/B-animalia-divino-elfo.json`):

```json
{
  "correcoes": [
    { "achado": "[ERRO] instinto-agil · perícia", "raca": "animalia", "no": "instinto-agil", "campo": "descricao",
      "de": "testes de Acrobacia para escalar ou se equilibrar", "para": "testes de Atletismo para escalar e de Acrobacia para se equilibrar" }
  ],
  "resolvidos": [ { "achado": "...", "por": "janela trocada pela sessão principal" } ],
  "mantidos":   [ { "achado": "...", "motivo": "..." } ]
}
```

- `raca`: id da raça; o catálogo de Pecados e Virtudes usa `"_pecados-e-virtudes"`.
- `no`: `id` (ou `titulo`, se não houver id) do objeto que tem o campo. `"__raca__"` para a raiz.
- `de`: **trecho copiado exato** do recorte atualizado (abra de novo e copie; o sinal de menos −, as aspas e os acentos contam). O menor trecho que seja único no campo. Para campo que não é texto (`usos`, `recuperacao`, `tipo`, números), `de` é o valor inteiro atual. Para criar campo, `de: null`.
- `para`: o novo. `null` apaga o campo (só quando `de` é o valor inteiro).
- Várias trocas no mesmo campo podem ser várias correções, desde que cada `de` ainda exista depois das anteriores (aplicadas na ordem do arquivo).
- Quando mudar a janela no texto, mude o campo `recuperacao` junto (`"cena"`, `"descanso"` ou `"sessao"`).
- **Nunca mude `id`.** Sem travessão (—), sem a palavra "eco", sem "não é X, é Y". Português simples, frases curtas, no tom da raça.

## Conferir antes de terminar

```
python -I aplicar.py "C:\D.E.V\T.D.S\Diversos\RPG\Pessoais\O-Jardim-RPG"
```

Só lê e grava `revisao-patches.md`. Corrija todo erro que vier do **seu** arquivo até sobrar zero. Erros de outros arquivos não são seus. Não rode com `--write`.

Ao terminar, responda com: quantas correções, resolvidos e mantidos, e as 5 decisões mais importantes que você tomou, uma linha cada.
