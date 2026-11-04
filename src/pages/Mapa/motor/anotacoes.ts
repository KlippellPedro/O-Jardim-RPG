import { Container, Graphics, Text } from 'pixi.js';
import type { IAnotacaoMapa } from '../../../services/mapaApi';

const FONTES: Record<IAnotacaoMapa['fonte'], string> = {
  sans: 'system-ui, sans-serif',
  serif: 'Georgia, serif',
  fantasia: 'Cinzel, serif',
  mono: 'monospace',
};

export class CamadaAnotacoes {
  readonly raiz = new Container();
  private objetos = new Map<string, Container>();

  definir(anotacoes: IAnotacaoMapa[], selecionada: string | null, aoSelecionar: (id: string, global: { x: number; y: number }) => void) {
    this.raiz.removeChildren().forEach((filho) => filho.destroy({ children: true }));
    this.objetos.clear();
    for (const anotacao of anotacoes) {
      const raiz = new Container();
      raiz.position.set(anotacao.x, anotacao.y);
      raiz.eventMode = 'static';
      raiz.cursor = 'pointer';
      raiz.label = `anotacao:${anotacao.id}`;
      // Nota secreta (só o Mestre recebe) fica mais apagada para ele lembrar que ninguém mais vê.
      if (anotacao.secreta) raiz.alpha = 0.6;

      const texto = new Text({
        text: anotacao.texto,
        style: {
          fontFamily: FONTES[anotacao.fonte],
          fontSize: anotacao.tamanho,
          fontWeight: '700',
          fill: anotacao.cor,
          stroke: { color: '#100d14', width: anotacao.placa ? 0 : Math.max(2, anotacao.tamanho * 0.12) },
          wordWrap: true,
          wordWrapWidth: 420,
          lineHeight: anotacao.tamanho * 1.25,
        },
      });
      texto.position.set(anotacao.placa ? 12 : 0, anotacao.placa ? 8 : 0);
      if (anotacao.placa) {
        const fundo = new Graphics()
          .roundRect(0, 0, texto.width + 24, texto.height + 16, 8)
          .fill({ color: anotacao.fundo, alpha: 0.94 })
          .stroke({ width: 2, color: selecionada === anotacao.id ? '#fcd34d' : '#ffffff', alpha: selecionada === anotacao.id ? 0.9 : 0.24 });
        raiz.addChild(fundo);
      }
      raiz.addChild(texto);
      raiz.on('pointerdown', (evento) => {
        evento.stopPropagation();
        aoSelecionar(anotacao.id, { x: evento.global.x, y: evento.global.y });
      });
      this.objetos.set(anotacao.id, raiz);
      this.raiz.addChild(raiz);
    }
  }

  moverTemporariamente(id: string, x: number, y: number) {
    this.objetos.get(id)?.position.set(x, y);
  }

  posicao(id: string): { x: number; y: number } | null {
    const objeto = this.objetos.get(id);
    return objeto ? { x: objeto.x, y: objeto.y } : null;
  }
}
