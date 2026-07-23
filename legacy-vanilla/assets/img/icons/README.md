# Icones personalizados

Esta pasta vai guardar os icones 2D usados no menu, regras, loja, ficha e mundo.

## Estrutura sugerida

```text
assets/img/icons/
  menu/
  regras/
  loja/
  ficha/
  mundo/
```

## Padrao visual recomendado

- Formato final: `webp` ou `png`, com fundo transparente.
- Tamanho base: 512 x 512 px.
- Composicao: icone centralizado, legivel em tamanho pequeno.
- Estilo: dark fantasy elegante, magico, lapidado, com luz suave.
- Evitar: texto dentro da imagem, bordas quadradas, emoji literal, excesso de detalhes pequenos.
- Paleta: usar o acento de cada secao como luz principal, mantendo metal escuro, dourado antigo e brilho sutil.

## Como usar depois

Os icones atuais usam PNG. Para novos arquivos, mantenha nomes curtos e sem espacos, por exemplo:

```js
icone: 'assets/img/icons/regras/sistema-base.png'
```

Depois o JavaScript renderiza `<img>` no lugar do texto. Isso mantem o HTML acessivel e deixa os icones reaproveitaveis em cards, detalhes e menus.
