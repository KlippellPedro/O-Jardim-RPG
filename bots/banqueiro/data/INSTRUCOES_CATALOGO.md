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
    "descricao": "texto de abertura (opcional)",
    "preco": 10,
    "raridade": "comum",
    "atributos": ["1d8 de dano", "Crítico 18"]
  }
}
```

- **tipo:** um de `arma`, `armadura`, `equipamento` (→ categoria Arsenal), `veiculo`
  (→ Veículos), `monstro` (→ Bestiário, botão "Contratar"), `drop` (→ Drops).
- **id:** slug único (minúsculas, com hífens). Se repetir, o bot adiciona `-2` etc.
- **preco:** número (vale em qualquer moeda) **ou** objeto `{"Lunaris": 40, "Solares": 5}`.
- **raridade:** `comum | incomum | raro | epico | lendario` (só cor/peso de loot, não é regra).
- Qualquer outro campo em `conteudo` (dano, material, bonus…) aparece como detalhe no card.

O PostgreSQL guarda o mesmo objeto no campo `conteudo` (JSONB), mas o item
completo vive na tabela `catalogo_itens`.

## Como adicionar itens

Em produção, adicione/edite registros em `catalogo_itens` pelo futuro dashboard
do mestre. Depois use `/catalogo_recarregar` no Discord. O comando `/importar`
foi removido para que o banco seja a fonte única de verdade.

`data/catalogo.json` é somente a semente de um banco novo. Alterá-lo não
sobrescreve um catálogo que já existe no PostgreSQL.

## O que já está feito

- **Armas:** 75 (com `subtipo` `simples`/`marcial` e `modo`
  `Corpo a corpo`/`À distância`; inclui as 9 Obstinadas).
- **Equipamentos:** 56 (o material que vazava pro fim do `descricao` foi movido
  pro campo `material`; descrições e typos revisados).
- **Armaduras e escudos:** 50 (com `bonus`, `penalidade`, `material`).
- **Veículos:** 49 — modelo **complexo** (Opção B, ver abaixo).
- **Bestiário:** 25 seres (`tipo: "monstro"`, preço por fórmula).
- **Drops:** 22 partes de seres (`tipo: "drop"`).

Total: **277 entradas**.

Arkania foi **removido** (conceito descontinuado) e substituído por itens
equivalentes usando conceitos vivos: `anel-do-fluxo`, `couraca-primordial`,
`egide-primordial`.

## Veículos — FEITO (modelo complexo / Opção B)

Convertido de `data/veiculos_sistema.json`. Cada tier de cada sistema é um item
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

Convertidos de `data/bestiario_precos.json`.

**Bestiário (`tipo: "monstro"`, 25 seres):** preço calculado pela fórmula

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

Todos os preços vieram direto dos PDFs. Para reequilibrar a economia de uma
instância em uso, altere `conteudo.preco` em `catalogo_itens` pelo dashboard e
execute `/catalogo_recarregar`.
