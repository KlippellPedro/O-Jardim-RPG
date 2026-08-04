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
    "atributos": ["1d8 de dano", "Crítico 18-20/x2"],
    "dano": "1d8",
    "margem_ameaca": 18,
    "multiplicador_critico": 2,
    "critico": "18-20/x2"
  }
}
```

- **tipo:** um de `arma`, `armadura`, `equipamento`, `consumivel`, `artefato`,
  `fruto-eden`, `implante`, `veiculo`, `veiculo-completo`, `monstro` ou `drop`.
- **id:** slug único (minúsculas, com hífens). IDs repetidos são rejeitados na publicação.
- **preco:** número (preço nativo em **Solares**) **ou** objeto `{"Lunaris": 40, "Solares": 5}` para definir preços em moedas específicas.
- **preco_original + promocao:** para uma oferta real, `preco` guarda o valor
  atual validado pelo servidor, `preco_original` usa a mesma moeda e
  `promocao` recebe `{ "ativa": true, "rotulo": "Nome da oferta" }`. O site
  calcula a porcentagem; não confie em desconto informado pelo navegador.
- **raridade:** `comum | incomum | raro | epico | lendario | reliquia |
  reliquia da criacao` (acentos e maiúsculas também são aceitos).
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

- **Armas:** 87 (com `subtipo` `simples`/`marcial` e `modo`
  `Corpo a corpo`/`À distância`, margem de ameaça e multiplicador crítico;
  inclui Obstinadas e Relíquias da Criação).
- **Equipamentos:** 56 (o material que vazava pro fim do `descricao` foi movido
  pro campo `material`; descrições e typos revisados).
- **Armaduras e escudos:** 52 (com `bonus`, `penalidade`, `material`).
- **Veículos:** 55 — 49 sistemas e 6 veículos completos.
- **Bestiário:** 28 seres (`tipo: "monstro"`, preço por fórmula).
- **Drops:** 22 partes de seres (`tipo: "drop"`).
- **Especiais:** 5 Frutos do Éden, 10 Implantes, 8 Artefatos Mágicos e 11 Selos
  consumíveis sincronizados com o catálogo mágico.

Total: **334 entradas**.

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

O catálogo combina valores convertidos dos PDFs com a escala econômica atual.
Armas lendárias usam Solares altos; Relíquias da Criação usam Fragmentos de
Estrela e recebem preço individual conforme o impacto mecânico. Depois de uma
mudança no arquivo, use `/catalogo_republicar`; `/catalogo_recarregar` sozinho
não envia os novos preços ao PostgreSQL.
