import { inicializarImportacao } from './controllers/importController.js';
import { inicializarRotas } from './controllers/routesController.js';
import { iniciarAtmosfera } from './views/atmosferaView.js';

document.addEventListener('DOMContentLoaded', () => {
  iniciarAtmosfera();
  inicializarImportacao();
  inicializarRotas();
});
