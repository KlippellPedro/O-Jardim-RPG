/** Frutos do Éden que têm modelo 3D (public/models/frutos/<id>.glb).
 * Os ids são os do catálogo da Loja (data/loja/catalogo.json). Fica fora do
 * componente 3D para quem só precisa saber se existe modelo não puxar o three.js. */
const FRUTOS_COM_MODELO = new Set([
  'fruto-chamas', 'fruto-dragao', 'fruto-tremor', 'fruto-gravidade', 'fruto-trovao',
  'fruto-gelo', 'fruto-luz', 'fruto-sombra', 'fruto-fenix', 'fruto-colosso',
  'fruto-quimera', 'fruto-portais', 'fruto-fios', 'fruto-instante', 'fruto-espelho',
  'fruto-origem', 'fruto-essencia', 'fruto-comunicacao', 'fruto-vitalidade',
  'fruto-inconstancia', 'fruto-fisico', 'fruto-espaco', 'fruto-tempo', 'fruto-vazio',
  'fruto-fim', 'fruto-tecnologia',
]);

export const temModeloFruto = (id: string | null | undefined): boolean => !!id && FRUTOS_COM_MODELO.has(id);
