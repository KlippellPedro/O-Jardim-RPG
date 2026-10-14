# Artes das capas do Livro de Regras

Esta pasta guarda as imagens de capa que o PDF do livro usa no lugar do emblema em vetor (a árvore dourada).
Uma capa sem arquivo aqui continua com o emblema, então dá para trocar só as que você quiser.

Os pedidos para gerar cada imagem estão em [PROMPTS-DAS-CAPAS.md](PROMPTS-DAS-CAPAS.md).

## Nomes dos arquivos

A extensão pode ser `jpg`, `jpeg`, `png` ou `webp`.

| Arquivo | Onde aparece |
| --- | --- |
| `capa` | capa do livro |
| `contracapa` | contracapa |
| `abertura-primeiros-passos`, `abertura-personagem`, `abertura-combate`, `abertura-cenas`, `abertura-magia`, `abertura-itens`, `abertura-veiculos`, `abertura-mundo` | abertura dos capítulos 1 a 8 |
| `abertura-mestre` | abertura do Guia do Mestre (só na edição do Mestre) |
| `abertura-compendio-classes`, `abertura-compendio-racas`, `abertura-compendio-legados`, `abertura-compendio-magias` | abertura das quatro partes do Compêndio |

## Como o livro usa a imagem

- A imagem vira a página inteira (210 × 297 mm, formato A4), cortada para caber com `object-fit: cover`. O formato
  ideal é vertical, de preferência 1024 × 1536 ou maior, e nada importante deve ficar colado nas bordas.
- Na capa e nas aberturas um véu escuro cobre a parte de baixo, onde ficam o título, o resumo e a lista de tópicos.
  Na contracapa o véu cobre a página inteira, porque o texto fica no meio.
- Na hora de imprimir, o gerador reduz a imagem a no máximo 2200 pixels no lado maior e a regrava como JPEG
  (qualidade 86) quando ela não é JPEG ou passa de 700 KB. Isso mantém o PDF leve: o pacote da plataforma tem teto
  de 100 MB na hospedagem. Prefira salvar em JPG já de início.
- O conteúdo das imagens entra no hash do livro. Trocar uma imagem faz `npm run docs:livro -- --conferir` avisar
  que o PDF precisa ser regerado.

Depois de mexer nas imagens, rode:

```bash
npm run docs:livro
```
