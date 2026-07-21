import { inicializarRegras } from './controllers/regrasController.js';
import { carregarRegrasMestre } from './services/masterRulesService.js';
import { inicializarPlataforma } from '../plataforma/portal.js?v=5';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const contexto = await inicializarPlataforma({ exigirCampanha: true });
    await carregarRegrasMestre(contexto.campanha.id);
  } catch (erro) {
    console.error('Falha ao carregar as regras protegidas:', erro);
  }
  inicializarRegras();
});
