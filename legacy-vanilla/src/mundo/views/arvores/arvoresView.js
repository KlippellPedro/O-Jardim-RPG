import { router } from '../../../core/router.js';
import { ARVORES } from '../../config/arvores.js';
import { getEntradas } from '../../services/entradasService.js';
import { montarCena3DArvores } from '../components/tree3d.js';
import { registrarCena } from '../components/cenaLifecycle.js';
import { content } from '../dom.js';
import { mostrarToast } from '../feedbackView.js';
import { prepararPagina } from '../pageView.js';

export function renderizarArvores() {
  prepararPagina();

  const mapa = getEntradas();
  const itens = ARVORES.map(arvore => ({
    id: arvore.id,
    titulo: arvore.titulo,
    rgb: arvore.rgb,
    catId: 'deidades',
    bloqueada: !(arvore.id === 'aethel' || mapa[arvore.id]?.tipo === 'deidade'),
    modeloId: arvore.modeloId,
    subjugada: arvore.subjugada,
    tituloSubjugada: arvore.tituloSubjugada,
    rgbSubjugada: arvore.rgbSubjugada,
    isolada: arvore.isolada,
  }));

  const limparCena = montarCena3DArvores(content, itens, {
    resolverDestino: item => `/${item.catId}/${item.id}`,
    aoEntrar: caminho => router.navegar(caminho),
    aoBloqueada: () => mostrarToast('Ainda não descoberta.', 'erro'),
  });

  registrarCena(limparCena);
}
