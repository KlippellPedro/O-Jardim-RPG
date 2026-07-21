import { inicializarRotas } from './controllers/routesController.js';
import { carregarEntradas } from './services/entradasService.js';
import { iniciarAtmosfera } from './views/atmosferaView.js';
import { inicializarPlataforma } from '../plataforma/portal.js?v=5';

document.addEventListener('DOMContentLoaded', async () => {
  iniciarAtmosfera();
  try {
    const contexto = await inicializarPlataforma({ exigirCampanha: true });
    await carregarEntradas(contexto.campanha.id);
    const status = document.getElementById('mundo-content-status');
    if (status) status.textContent = contexto.campanha.nome;
  } catch (erro) {
    console.error('Falha ao carregar o Mundo central:', erro);
  }
  inicializarRotas();
});
