# Como completar o catálogo do Banqueiro

Este guia explica o formato do catálogo e o que ainda falta converter (veículos e
bestiário), pra você ou uma IA continuarem depois.

## Formato de um item (schema da Loja)

Cada item é um objeto assim (o mesmo schema do site, em `data/loja`):

```json
{
  "tipo": "arma",
  "id": "espada-longa",
  "titulo": "Espada Longa",
  "conteudo": {
    "descricao": "texto de abertura obrigatório",
    "preco": 10,
    "raridade": "comum",
    "atributos": ["1d8 de dano", "Crítico 18-20/x2"],
    "dano": "1d8",
    "margem_ameaca": 18,
    "multiplicador_critico": 2,
    "critico": "18-20/x2"
  }
}
```

- **tipo:** um de `arma`, `armadura`, `equipamento`, `modificacao`, `consumivel`,
  `artefato`, `fruto-eden`, `implante`, `veiculo`, `veiculo-completo`, `monstro`
  ou `drop`.
- **id:** slug único (minúsculas, com hífens). IDs repetidos são rejeitados na publicação.
- **preco:** número (preço nativo em **Solares**) **ou** objeto com exatamente
  uma moeda, como `{"Lunaris": 40}`. Nunca declare duas moedas no mesmo preço.
- **preco_original + promocao:** para uma oferta real, `preco` guarda o valor
  atual validado pelo servidor, `preco_original` usa a mesma moeda e
  `promocao` recebe `{ "ativa": true, "rotulo": "Nome da oferta" }`. O site
  calcula a porcentagem; não confie em desconto informado pelo navegador.
- **raridade:** `comum | incomum | raro | epico | lendario | mitico |
  reliquia da criacao` (acentos e maiúsculas também são aceitos; `reliquia`
  permanece como chave legada de `mitico`). Valor ausente ou desconhecido é
  rejeitado pela auditoria e aparece como `Desconhecida` na interface.
- **margem_ameaca:** menor resultado natural que gera crítico (`18`, `19` ou `20`).
- **multiplicador_critico:** quantas vezes os dados da arma são rolados (`2`, `3` ou `4`).
- Margens `18` e `19` usam `x2`; multiplicadores `x3` e `x4` exigem margem `20`.
- Qualquer outro campo em `conteudo` (dano, material, bonus…) aparece como detalhe no card.

O PostgreSQL guarda o mesmo objeto no campo `conteudo` (JSONB), mas o item
completo vive na tabela `catalogo_itens`.

## Como adicionar itens

Adicione ou edite entradas em `data/loja/catalogo.json` e valide os IDs, tipos
e raridades nos testes. A plataforma sincroniza essa fonte com o PostgreSQL ao
iniciar, publicando adições/edições e desativando entradas removidas sem apagar
o histórico de inventários. Use `/catalogo_republicar` no Banqueiro quando
quiser publicar imediatamente sem reiniciar a plataforma.

`/catalogo_recarregar` apenas recarrega na memória o que já está no PostgreSQL;
ele não publica mudanças feitas no JSON.

## O que já está feito

- **Armas:** 87, todas com descrição, dano rolável, crítico e modo
  (`subtipo` `simples`/`marcial` e `modo`
  `Corpo a corpo`/`À distância`, margem de ameaça e multiplicador crítico;
  inclui Obstinadas e Relíquias da Criação).
- **Equipamentos:** 56 (descrição e `espacos` explícitos; material e efeitos
  revisados quando havia fonte ou comparação segura).
- **Armaduras e escudos:** 52 (com `bonus`, `penalidade`, `espacos` e material
  quando aplicável).
- **Modificações:** 51 (`tipo: "modificacao"`). São as mesmas de
  `data/regras/raridadesEquipamentos.ts`, uma entrada por modificação, com
  `modificacao_id` apontando para a fonte. O preço sai de
  `PRECO_MODIFICACAO_POR_VALOR` — 25, 60, 180 e 450 Lunaris para técnica, valor
  1, 2 e 3 — e as marciais só aparecem da Metrópole para cima
  (`nivelMinimoLoja: 2`). Ao acrescentar uma modificação nas regras, replique a
  entrada aqui com o mesmo preço da faixa.
- **Veículos:** 65, sendo 49 sistemas/peças e 16 veículos completos, todos com
  ficha estruturada e efeitos veiculares completos.
- **Bestiário:** 60 seres (`tipo: "monstro"`, preço por fórmula).
- **Drops:** 22 partes de seres (`tipo: "drop"`).
- **Especiais:** 5 Frutos do Éden, 10 Implantes, 8 Artefatos Mágicos e 11 Selos
  consumíveis sincronizados com o catálogo mágico.

Total: **427 entradas**.

## Política econômica

O câmbio oficial é de **100 Lunaris para 1 Solar**. Lunaris são a moeda de uso
cotidiano; Solares representam compras de alto valor. Para evitar que um preço
como `15` transforme por engano uma algema em um item de 1.500 Lunaris, siga
estas faixas:

- **Equipamentos cotidianos:** 1–60 Lunaris. Algemas custam 5 Lunaris.
- **Armas convencionais até Raro:** 5–70 Lunaris.
- **Armaduras e escudos convencionais até Raro:** 5–95 Lunaris.
- **Modificações:** 25–450 Lunaris, conforme o valor do efeito.
- **Peças e veículos completos:** Lunaris; os valores altos representam bens,
  máquinas e naves, mas não devem ser interpretados como Solares.
- **Solares:** equipamentos mágicos, armamentos militares ou tecnológicos de
  alto nível, criaturas, drops e outros bens realmente valiosos.
- **Fragmentos de Estrela:** Relíquias da Criação e transações celestiais.
- **Créditos Sombrios:** implantes e mercado negro.

Ao usar Lunaris, sempre escreva `{"Lunaris": valor}`. Um número sem objeto é
interpretado pelo servidor como Solares.

Arkania foi **removido** (conceito descontinuado) e substituído por itens
equivalentes usando conceitos vivos: `anel-do-fluxo`, `couraca-primordial`,
`egide-primordial`.

## Veículos — FEITO (modelo complexo / Opção B)

Convertido de `data/loja/veiculos_sistema.json`. Cada tier de cada sistema é um item
`tipo: "veiculo"` comprável, com campos `sistema`, `subtipo` e `tier`:

- **Chassi** base (`veiculo-chassi`): 10 de Vida, 5 de deslocamento, sem armas/mods.
- **Núcleo:** Estável e Sobrecarga, T1–T3.
- **Estrutura:** Leve e Pesada, T1–T3.
- **Armas de veículo:** Leve e Pesada, T1–T3.
- **Utilidades:** Geladeira, Filtro, Dormitórios, Jardim, Academia, Área Médica,
  Armazém, Escudo, Cápsula de Fuga, Hangar — cada uma T1–T3.

O **Tier 4** de cada sistema tinha custo `-/-` nas tabelas (tier do mestre), então
não entrou na loja; fica citado na descrição do chassi como liberação do mestre.

## Bestiário e Drops — FEITO

Convertidos de `data/loja/bestiario_precos.json`.

**Bestiário (`tipo: "monstro"`, 60 seres):** preço calculado pela fórmula

```text
preço = (PreçoPorLevel[faixa] × nível) + Espécie[faixa] + Classe[faixa] + Σ(extras)
```

onde `faixa` é 0–10, 11–20, 21–30, 31–40, 41–50, 50+ e os extras são Arma/Perícia/Pet/
Poder Ass/Legado/Variável. Há seres dos seis sub-tipos (Criatura, Familiar, Servo,
Invocação, Ajudante, Ser Lendário), guardados em `conteudo` com `nivel` e `classe`
(o sub-tipo). Pra adicionar mais criaturas, use a mesma fórmula por sub-tipo.

**Drops (`tipo: "drop"`, 22 itens):** uma entrada por par espécie×parte com preço
(Carne/Órgãos/Essência); pares com ❌ na tabela foram ignorados. A descrição já cita os
modificadores (conservação, qualidade do abate, ser lendário, falta de material).

**Obstinadas:** as armas-artefato (Excalibur, Mjölnir, Gungnir…) viraram armas lendárias
(`tipo: "arma"`, `material: "Obstinada"`), com a habilidade na descrição.

## Dica de balanceamento

O catálogo combina valores convertidos dos PDFs com a escala econômica atual.
Armas lendárias usam Solares altos; Relíquias da Criação usam Fragmentos de
Estrela e recebem preço individual conforme o impacto mecânico. Depois de uma
mudança no arquivo, use `/catalogo_republicar`; `/catalogo_recarregar` sozinho
não envia os novos preços ao PostgreSQL.
