// Fase 0 do mapa ao vivo: dois palcos lado a lado dentro de React 18 com
// StrictMode (o mesmo do site). À esquerda o Mestre arrasta; à direita o
// Jogador recebe as posições por uma rede simulada e desenha com interpolação.

import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { gerarMapa, gerarRetratos } from './gerarMapa';
import { criarPalco, encaixar, QUADRADO, type Palco, type TokenDef } from './palco';
import { Interpolador, RedeSimulada, type ConfigRede } from './rede';
import { esperarQuadro, resumirQuadros, variacaoDoPasso } from './medicao';

const LADO = 8000;
// ?motor=webgl força o caminho dos PCs sem WebGPU.
const MOTOR = new URLSearchParams(location.search).get('motor') === 'webgl' ? 'webgl' : 'webgpu';
const NOMES = [
  'Aria', 'Bram', 'Cael', 'Dara', 'Eiko', 'Finn', 'Gael', 'Hana', 'Ivo', 'Jade',
  'Kai', 'Lia', 'Milo', 'Nora', 'Otto', 'Pia', 'Quim', 'Rui', 'Sol', 'Tiago',
  'Uma', 'Vera', 'Wen', 'Xica', 'Yara', 'Zeca', 'Lobo 1', 'Lobo 2', 'Lobo 3', 'Dama',
];

function montarTokens(retratos: ImageBitmap[]): TokenDef[] {
  return NOMES.map((nome, i) => {
    const porte: 1 | 2 = i % 7 === 3 ? 2 : 1;
    const coluna = i % 6;
    const linha = Math.floor(i / 6);
    const lado = i < 10 ? 'jogador' : i < 20 ? 'aliado' : 'inimigo';
    return {
      id: `t${i}`,
      nome,
      porte,
      x: encaixar(LADO / 2 - 750 + coluna * 300, porte),
      y: encaixar(LADO / 2 - 600 + linha * 300, porte),
      retrato: retratos[i % retratos.length],
      cor: lado === 'jogador' ? 0x4fd1c5 : lado === 'aliado' ? 0x34d399 : 0xef4444,
    };
  });
}

interface Pecas {
  mestre: Palco;
  jogador: Palco;
  rede: RedeSimulada;
  interpolador: Interpolador;
}

declare global {
  interface Window {
    __fase0?: Record<string, unknown>;
  }
}

function fpsAtual(quadros: number[]): number {
  const ultimos = quadros.slice(-30);
  if (!ultimos.length) return 0;
  return Math.round(1000 / (ultimos.reduce((s, v) => s + v, 0) / ultimos.length));
}

function App() {
  const mestreRef = useRef<HTMLDivElement>(null);
  const jogadorRef = useRef<HTMLDivElement>(null);
  const pecasRef = useRef<Pecas | null>(null);
  const [estado, setEstado] = useState('Gerando o mapa de 8000 px...');
  const [fps, setFps] = useState({ mestre: 0, jogador: 0 });
  const [rede, setRede] = useState<ConfigRede>({ latencia: 80, variacao: 30, porSegundo: 20 });
  const [interpolar, setInterpolar] = useState(true);
  const [resultados, setResultados] = useState<string[]>([]);
  const redeRef = useRef(rede);
  redeRef.current = rede;

  useEffect(() => {
    let vivo = true;
    const criados: Palco[] = [];
    (async () => {
      const [mapa, retratos] = await Promise.all([gerarMapa(LADO), gerarRetratos()]);
      if (!vivo || !mestreRef.current || !jogadorRef.current) return;
      const tokens = montarTokens(retratos);
      const interpolador = new Interpolador(true);
      const redeSimulada = new RedeSimulada({ ...redeRef.current }, (amostra) => interpolador.receber(amostra));
      const inicio = performance.now();
      const mestre = await criarPalco(mestreRef.current, {
        lado: LADO,
        ladrilhos: mapa.ladrilhos,
        tokens,
        motor: MOTOR,
        podeArrastar: true,
        aoArrastar: (id, x, y) => redeSimulada.arrastando(id, x, y),
        aoSoltar: (id, x, y) => redeSimulada.soltou(id, x, y),
      });
      criados.push(mestre);
      if (!vivo || !jogadorRef.current) return;
      const jogador = await criarPalco(jogadorRef.current, { lado: LADO, ladrilhos: mapa.ladrilhos, tokens, motor: MOTOR, podeArrastar: false });
      criados.push(jogador);
      if (!vivo) return;
      jogador.app.ticker.add(() => {
        const agora = performance.now();
        for (const id of interpolador.ids()) {
          const posicao = interpolador.posicao(id, agora);
          const token = jogador.tokens.get(id);
          if (posicao && token) token.position.set(posicao.x, posicao.y);
        }
      });
      await esperarQuadro();
      await esperarQuadro();
      const prontoEm = performance.now() - inicio;
      pecasRef.current = { mestre, jogador, rede: redeSimulada, interpolador };
      const resumo = {
        lado: LADO,
        ladrilhos: mapa.ladrilhos.length,
        geradoEmMs: Math.round(mapa.ms),
        palcosProntosEmMs: Math.round(prontoEm),
        motor: mestre.renderizador,
        memoriaDeTexturaPorPalcoMB: Math.round(mapa.ladrilhos.reduce((s, l) => s + l.largura * l.altura * 4, 0) / 1e6),
      };
      window.__fase0 = { info: () => resumo, medirZoom, medirArrasto, configurar };
      setEstado(
        `Mapa ${LADO} x ${LADO} em ${resumo.ladrilhos} ladrilhos (gerado em ${resumo.geradoEmMs} ms). ` +
          `Dois palcos prontos em ${resumo.palcosProntosEmMs} ms. Motor: ${resumo.motor}. ` +
          `Texturas: ${resumo.memoriaDeTexturaPorPalcoMB} MB por palco.`,
      );
    })().catch((erro) => setEstado(`Erro: ${erro instanceof Error ? erro.message : String(erro)}`));

    const relogio = window.setInterval(() => {
      const pecas = pecasRef.current;
      if (pecas) setFps({ mestre: fpsAtual(pecas.mestre.quadros), jogador: fpsAtual(pecas.jogador.quadros) });
    }, 500);

    return () => {
      vivo = false;
      window.clearInterval(relogio);
      criados.forEach((palco) => palco.destruir());
      pecasRef.current = null;
      delete window.__fase0;
    };
  }, []);

  useEffect(() => {
    if (pecasRef.current) Object.assign(pecasRef.current.rede.config, rede);
  }, [rede]);

  useEffect(() => {
    if (pecasRef.current) pecasRef.current.interpolador.ligado = interpolar;
  }, [interpolar]);

  function configurar(novo: Partial<ConfigRede> & { interpolar?: boolean }) {
    const { interpolar: ligado, ...config } = novo;
    setRede((atual) => ({ ...atual, ...config }));
    if (pecasRef.current) Object.assign(pecasRef.current.rede.config, config);
    if (ligado !== undefined) {
      setInterpolar(ligado);
      if (pecasRef.current) pecasRef.current.interpolador.ligado = ligado;
    }
  }

  function anotar(linha: string) {
    setResultados((atual) => [linha, ...atual].slice(0, 12));
  }

  async function medirZoom(ms = 6000) {
    const pecas = pecasRef.current;
    if (!pecas) return null;
    const palcos = [pecas.mestre, pecas.jogador];
    palcos.forEach((p) => (p.quadros.length = 0));
    const inicio = performance.now();
    while (performance.now() - inicio < ms) {
      const t = (performance.now() - inicio) / 1000;
      const escala = 0.07 + (Math.sin(t * 1.3) * 0.5 + 0.5) * 1.5;
      const cx = LADO / 2 + Math.sin(t * 0.7) * LADO * 0.35;
      const cy = LADO / 2 + Math.cos(t * 0.5) * LADO * 0.35;
      for (const palco of palcos) {
        palco.viewport.setZoom(escala, true);
        palco.viewport.moveCenter(cx, cy);
      }
      await esperarQuadro();
    }
    const resultado = { mestre: resumirQuadros(pecas.mestre.quadros), jogador: resumirQuadros(pecas.jogador.quadros) };
    anotar(
      `Zoom e passeio (${ms / 1000}s): ${resultado.mestre.fpsMediana} quadros/s na mediana, ` +
        `p99 ${resultado.mestre.msP99} ms, ${resultado.mestre.travadas}% de quadros lentos.`,
    );
    return resultado;
  }

  async function medirArrasto(ms = 5000) {
    const pecas = pecasRef.current;
    if (!pecas) return null;
    const { mestre, jogador, rede: redeSimulada, interpolador } = pecas;
    const id = 't0';
    const token = mestre.tokens.get(id)!;
    const origem = { x: token.x, y: token.y };
    for (const palco of [mestre, jogador]) {
      palco.viewport.setZoom(0.6, true);
      palco.viewport.moveCenter(origem.x - 300, origem.y);
    }
    await esperarQuadro();
    const enviadosAntes = redeSimulada.enviados;
    const caminho: Array<{ t: number; x: number; y: number }> = [];
    const visto: Array<{ t: number; x: number; y: number }> = [];
    const raio = 3 * QUADRADO;
    mestre.quadros.length = 0;
    jogador.quadros.length = 0;
    const inicio = performance.now();
    while (performance.now() - inicio < ms) {
      const agora = performance.now();
      const angulo = ((agora - inicio) / 1000) * Math.PI;
      const x = origem.x - raio + Math.cos(angulo) * raio;
      const y = origem.y + Math.sin(angulo) * raio;
      mestre.arrastar(id, x, y);
      caminho.push({ t: agora, x, y });
      await esperarQuadro();
      const observado = jogador.tokens.get(id)!;
      visto.push({ t: performance.now(), x: observado.x, y: observado.y });
    }
    mestre.soltar(id);
    const final = { x: mestre.tokens.get(id)!.x, y: mestre.tokens.get(id)!.y };
    await new Promise((resolver) => setTimeout(resolver, redeSimulada.config.latencia + redeSimulada.config.variacao + interpolador.atrasoDeExibicao + 300));

    const meio = visto.filter((v) => v.t - inicio > 700 && v.t - inicio < ms - 100);
    // O caminho é um círculo que se repete a cada 2 s: procura só no último
    // segundo, senão casa com a volta anterior e o atraso sai inflado.
    const atrasos = meio.map((v) => {
      let melhor = caminho[0];
      let menor = Infinity;
      for (const c of caminho) {
        if (c.t < v.t - 1000) continue;
        if (c.t > v.t) break;
        const d = Math.hypot(c.x - v.x, c.y - v.y);
        if (d < menor) {
          menor = d;
          melhor = c;
        }
      }
      return v.t - melhor.t;
    });
    const observadoFinal = jogador.tokens.get(id)!;
    const resultado = {
      interpolacao: interpolador.ligado,
      rede: { ...redeSimulada.config },
      enviados: redeSimulada.enviados - enviadosAntes,
      variacaoDoPassoJogador: variacaoDoPasso(meio),
      variacaoDoPassoMestre: variacaoDoPasso(caminho.slice(40)),
      atrasoMedioMs: Math.round(atrasos.reduce((s, v) => s + v, 0) / Math.max(1, atrasos.length)),
      atrasoDeExibicaoMs: Math.round(interpolador.atrasoDeExibicao),
      chegouNoLugarCerto: Math.abs(observadoFinal.x - final.x) < 0.5 && Math.abs(observadoFinal.y - final.y) < 0.5,
      quadrosMestre: resumirQuadros(mestre.quadros),
      quadrosJogador: resumirQuadros(jogador.quadros),
    };
    anotar(
      `Arrasto ${resultado.interpolacao ? 'com' : 'sem'} interpolação: variação do passo ${resultado.variacaoDoPassoJogador} ` +
        `(0 = liso), atraso de ${resultado.atrasoMedioMs} ms, ${resultado.enviados} envios, ` +
        `${resultado.chegouNoLugarCerto ? 'parou no lugar certo' : 'PAROU NO LUGAR ERRADO'}.`,
    );
    return resultado;
  }

  return (
    <div className="pagina">
      <header>
        <strong>Fase 0: mapa ao vivo</strong>
        <label>
          Atraso da rede
          <input type="range" min={0} max={400} value={rede.latencia} onChange={(e) => setRede({ ...rede, latencia: +e.target.value })} />
          {rede.latencia} ms
        </label>
        <label>
          Variação
          <input type="range" min={0} max={150} value={rede.variacao} onChange={(e) => setRede({ ...rede, variacao: +e.target.value })} />
          {rede.variacao} ms
        </label>
        <label>
          Envios por segundo
          <input type="range" min={5} max={60} value={rede.porSegundo} onChange={(e) => setRede({ ...rede, porSegundo: +e.target.value })} />
          {rede.porSegundo}
        </label>
        <label>
          <input type="checkbox" checked={interpolar} onChange={(e) => setInterpolar(e.target.checked)} /> Interpolação
        </label>
        <button type="button" onClick={() => void medirZoom()}>Medir zoom</button>
        <button type="button" onClick={() => void medirArrasto()}>Medir arrasto</button>
      </header>
      <p className="estado">{estado}</p>
      <main>
        <section>
          <h2>Mestre (arraste os tokens) <span>{fps.mestre} quadros/s</span></h2>
          <div ref={mestreRef} className="palco" />
        </section>
        <section>
          <h2>Jogador (recebe pela rede) <span>{fps.jogador} quadros/s</span></h2>
          <div ref={jogadorRef} className="palco" />
        </section>
      </main>
      <ol className="resultados">
        {resultados.map((linha, i) => <li key={`${i}-${linha}`}>{linha}</li>)}
      </ol>
    </div>
  );
}

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
