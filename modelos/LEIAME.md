# Modelos da Oficina de imagem

Arquivos que o navegador baixa para melhorar imagens do Acervo. Ficam fora de
`public/` de propósito: o ZIP do site na Discloud já está perto do limite de
100 MB. Em produção o site baixa daqui pelo jsDelivr
(`https://cdn.jsdelivr.net/gh/KlippellPedro/O-Jardim-RPG@master/modelos/...`);
em desenvolvimento o Vite serve direto desta pasta.

## realesr-general-x4v3.onnx

- **O que é:** Real-ESRGAN "general x4v3" (SRVGGNetCompact, 64 canais, 32
  camadas), amplia 4x. Entrada `entrada` [1, 3, A, L] em RGB 0..1; saída
  `saida` [1, 3, 4A, 4L].
- **De onde veio:** exportado por nós a partir dos pesos oficiais
  `realesr-general-x4v3.pth` do release v0.2.5.0 de
  https://github.com/xinntao/Real-ESRGAN (sha256
  `8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292`), lidos com
  `torch.load(weights_only=True)`. Exportado com opset 17 e altura e largura
  livres; a saída bate com a do PyTorch (diferença máxima 4e-6).
- **Licença:** BSD 3-Clause, Copyright (c) 2021 Xintao Wang. Texto completo em
  `LICENSE-Real-ESRGAN.txt`.
