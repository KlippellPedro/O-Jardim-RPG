# Protótipos da fase 0 do mapa ao vivo

Provas técnicas, fora do site: não entram no build nem no `tsconfig`. Os
resultados estão em `docs/propostas/mapa-ao-vivo/FASE0.md`.

Com o Vite rodando (`npm run dev`):

- `http://localhost:5173/prototipos/mapa-fase0/mapa.html`: dois palcos lado a
  lado. Arraste os tokens no do Mestre e veja chegarem no do Jogador por uma rede
  simulada. Os controles mudam atraso, variação, envios por segundo e
  interpolação. `?motor=webgl` força o caminho dos PCs sem WebGPU.
- `http://localhost:5173/prototipos/mapa-fase0/oficina.html`: remover fundo e
  melhorar qualidade no navegador. Aceita uma imagem sua. Na primeira vez baixa
  os modelos (de 5 a 26 MB) do Hugging Face.

Para medir, use um Chrome em foco ou headless com a placa de vídeo. O painel de
navegador do app do Claude desacelera quando a janela não está em foco.
