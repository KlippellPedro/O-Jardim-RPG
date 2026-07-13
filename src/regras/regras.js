import { inicializarRegras } from './controllers/regrasController.js';
import { inicializarImportacaoMestre } from './controllers/masterImportController.js';

document.addEventListener('DOMContentLoaded', () => {
  inicializarImportacaoMestre();
  inicializarRegras();
});
