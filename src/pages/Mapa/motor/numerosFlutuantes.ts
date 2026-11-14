// Os números que sobem sobre o token e somem: o resultado do dado de quem rolou. Só desenha.

import { Container, Text } from 'pixi.js';
import { COR_DO_RESULTADO, type IResultadoFlutuante } from './resultadoFlutuante';

const DURACAO_MS = 2200;
/** Quantos números ao mesmo tempo (o mais antigo sai quando passa disso). */
const MAXIMO = 12;

interface Numero {
  texto: Text;
  selo: Text | null;
  x: number;
  y: number;
  inicio: number;
  casa: number;
}

const suaveSaida = (t: number) => 1 - (1 - t) ** 3;

export class NumerosFlutuantes {
  readonly raiz = new Container();
  private numeros: Numero[] = [];

  constructor() {
    this.raiz.eventMode = 'none';
  }

  /** Um resultado sobe da cabeça do token (`x`, `y` é o centro do token; `casa` é o tamanho de um quadrado do mapa). */
  adicionar(resultado: IResultadoFlutuante, x: number, y: number, casa: number, agora: number) {
    const cor = COR_DO_RESULTADO[resultado.tom];
    const tamanho = Math.max(18, casa * (resultado.tom === 'critico' ? 0.62 : 0.5));
    const texto = new Text({ text: resultado.texto, style: { fontFamily: 'system-ui, sans-serif', fontWeight: '900', fontSize: tamanho, fill: cor, stroke: { color: '#000000', width: Math.max(3, tamanho * 0.18) } } });
    texto.anchor.set(0.5, 1);
    this.raiz.addChild(texto);
    let selo: Text | null = null;
    if (resultado.selo) {
      selo = new Text({ text: resultado.selo, style: { fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: Math.max(10, tamanho * 0.42), fill: cor, stroke: { color: '#000000', width: 3 } } });
      selo.anchor.set(0.5, 0);
      this.raiz.addChild(selo);
    }
    this.numeros.push({ texto, selo, x, y, inicio: agora, casa });
    while (this.numeros.length > MAXIMO) this.remover(this.numeros[0]);
  }

  private remover(numero: Numero) {
    numero.texto.destroy();
    numero.selo?.destroy();
    this.numeros = this.numeros.filter((outro) => outro !== numero);
  }

  quadro(agora: number) {
    for (const numero of [...this.numeros]) {
      const t = (agora - numero.inicio) / DURACAO_MS;
      if (t >= 1) {
        this.remover(numero);
        continue;
      }
      const sobe = suaveSaida(Math.min(1, t / 0.7)) * numero.casa * 0.9;
      // Entra com um quique pequeno e some no fim.
      const quique = t < 0.12 ? 0.6 + (t / 0.12) * 0.55 : t < 0.2 ? 1.15 - ((t - 0.12) / 0.08) * 0.15 : 1;
      const alfa = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
      const topo = numero.y - numero.casa * 0.55 - sobe;
      numero.texto.position.set(numero.x, topo);
      numero.texto.scale.set(quique);
      numero.texto.alpha = alfa;
      if (numero.selo) {
        numero.selo.position.set(numero.x, topo + 2);
        numero.selo.alpha = alfa;
      }
    }
  }

  destruir() {
    this.raiz.destroy({ children: true });
    this.numeros = [];
  }
}
