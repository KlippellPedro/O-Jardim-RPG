# Fase 0: resultados (2026-11-02)

Medido no PC do Pedro: RTX 4060 Ti com WebGPU ativo, 16 núcleos, Chrome 152 em
modo headless usando a placa de vídeo de verdade (ANGLE Direct3D 11). Os
protótipos ficam em `prototipos/mapa-fase0/` e rodam com o Vite (`npm run dev`):

- `http://localhost:5173/prototipos/mapa-fase0/mapa.html`
- `http://localhost:5173/prototipos/mapa-fase0/oficina.html`

Eles não entram no build do site (o `tsconfig` cobre só `src/` e o Vite só
empacota o `index.html`).

## Motor do mapa

Mapa de 8000 x 8000 px em 64 ladrilhos de 1024 px, 30 tokens com moldura, 4
barras e nome, dois palcos ao mesmo tempo (Mestre e Jogador), dentro de React 18
com StrictMode. Medição: 6 a 8 segundos de passeio com zoom indo de 0,07x a 1,5x.

| Cenário | Pronto em | Quadros/s (mediana) | Pior 1% | Quadros lentos |
| --- | --- | --- | --- | --- |
| WebGPU | 1,0 s | 60 | 16,9 ms | 0% |
| WebGL (PC sem WebGPU) | 0,26 s | 60 | 17,0 ms | 0% |
| WebGPU, processador 4x mais lento | 0,8 s | 60 | 17,0 ms | 0% |
| WebGL, processador 4x mais lento | 0,16 s | 60 | 16,8 ms | 0% |

- 60 é o teto do modo headless (acompanha a tela), não do motor.
- Pixi 8 + pixi-viewport 7 rodam no React 18 sem o `@pixi/react`. O StrictMode
  monta o componente duas vezes; o protótipo trata isso e não duplica o mapa.
- Memória de vídeo: 256 MB por mapa de 8000 px. Na placa do Pedro sobra; numa
  placa integrada pesa. **Para a fase 1:** guardar também uma versão em 1/4 do
  tamanho e usá-la quando o zoom estiver longe (níveis de detalhe).
- Não dá para simular uma placa de vídeo fraca neste PC, só um processador fraco.

## Arrasto em tempo real

Rede simulada entre os dois palcos, com o protocolo planejado: posições durante
o arrasto e a posição final ao soltar. "Variação do passo" mede o quanto o token
anda aos trancos na tela do jogador (0 = liso; no Mestre dá 0,011).

| Envios/s | Rede | Interpolação | Variação do passo | Atraso visto | Parou no lugar certo |
| --- | --- | --- | --- | --- | --- |
| 20 | 80 ± 30 ms | ajustável | **0,024** | 200 ms | sim |
| 20 | 80 ± 30 ms | nenhuma | 1,62 | 113 ms | sim |
| 20 | 200 ± 80 ms | ajustável | 0,22 | 430 ms | sim |
| 10 | 80 ± 30 ms | ajustável | 0,56 | 312 ms | sim |

- **Decisão:** 20 envios por segundo, com um "colchão" que se ajusta à rede
  (maior atraso dos últimos 3 s + maior intervalo entre envios + 15 ms). O
  jogador vê o token deslizar liso, uns 200 ms atrás do Mestre numa rede comum.
- A primeira versão usava 100 ms fixos e tremia: o colchão era menor que a rede
  e faltava a próxima amostra. Corrigido.
- Sem interpolação o token anda aos pulos, e com 10 envios por segundo fica pior.
- **Não testado aqui:** a passagem pelo servidor. No protótipo os dois lados
  dividem o mesmo relógio; no site o servidor carimba a hora de cada posição.

## Oficina de imagem

### Melhorar qualidade

| Modelo | Onde | Entrada → saída | Tempo | Primeira carga |
| --- | --- | --- | --- | --- |
| Real-ESRGAN geral (5 MB) | placa de vídeo | 1672x941 → 6688x3764 | 2,0 a 2,5 s | ~3 s |
| Real-ESRGAN desenho (18 MB) | placa de vídeo | 1672x941 → 6688x3764 | 6,9 s | ~3 s |

- O geral faz cerca de 1,5 s por megapixel de entrada: um mapa de 2000 x 2000
  leva uns 6 s; um de 4000 x 4000, uns 25 s.
- Conferido a olho no recorte do ferreiro: bordas, martelo e faíscas ficam
  nítidos, e não aparece emenda entre os pedaços.
- Os arquivos ONNX usados aqui são um envio de terceiros no Hugging Face, só para
  medir. No site, o arquivo é exportado por nós a partir dos pesos oficiais.

### Remover fundo

Teste com gabarito: a Dama Solitária (que já tem fundo transparente) colada no
cenário do cassino. "Acerto" é a sobreposição com o recorte original (1 =
perfeito).

| Modelo | Onde | Tempo por imagem | Acerto | Situação |
| --- | --- | --- | --- | --- |
| **MODNet fp32 (26 MB)** | **sem placa de vídeo** | **1,4 s** | **0,94** | **escolhido** |
| MODNet | placa de vídeo (fp16 ou fp32) | 0,12 a 0,15 s | 0,31 | sai em manchas |
| ormbg | sem placa de vídeo | 6,3 s | 0,67 | pior e mais lento |
| ormbg | placa de vídeo | 0,34 s | 0,60 | pior |
| BiRefNet lite | placa de vídeo | não roda | | pede 17 buffers por shader, o limite é 16 |
| BiRefNet lite | sem placa de vídeo | não roda | | falta memória |

- **Decisão:** MODNet sem placa de vídeo. 1,4 s por imagem basta para criar um
  inimigo na hora. O pincel de acerto continua necessário (no teste sobraram as
  cartas do chão e um pedaço de cadeira).
- Na placa de vídeo o MODNet sai em manchas: é defeito do ONNX Runtime WebGPU
  nesta versão (1.31). Quando corrigirem, o mesmo modelo passa a 0,15 s e o
  BiRefNet pode entrar. Vale testar de novo a cada atualização.
- O MODNet foi treinado com retratos de gente. Na Dama, uma criatura, acertou
  94%, mas outros inimigos podem variar. A página da Oficina aceita imagens
  suas para testar.

## O que falta da fase 0

- **WebSocket na Discloud:** a documentação confirma o suporte; o teste de
  verdade precisa subir uma versão, então só com pedido do Pedro. Dá para fazer
  junto com a primeira entrega da fase 1, com o SSE como plano B.

## Aprendido no caminho

- O painel de navegador do app do Claude roda a 2 quadros por segundo quando a
  janela não está em foco. Não serve para medir desempenho; as medições foram
  feitas no Chrome headless com a placa de vídeo.
- O Transformers.js 4 devolve a imagem direto (não uma lista) quando a entrada
  é uma só.
