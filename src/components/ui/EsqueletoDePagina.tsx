import './esqueletoDePagina.css';

/** O que aparece enquanto o código de uma tela chega: o desenho vazio da página (título e cartões) no lugar de
 * um spinner. Só aparece depois de uma pausa curta, porque quase toda tela já está em cache e o esqueleto
 * piscaria para nada. */
export function EsqueletoDePagina() {
  return (
    <div className="app-page" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Carregando página...</span>
      <div className="esqueleto" aria-hidden="true">
        <div className="esqueleto__bloco esqueleto__titulo" />
        <div className="esqueleto__bloco esqueleto__subtitulo" />
        <div className="esqueleto__grade">
          {Array.from({ length: 6 }, (_, indice) => (
            <div key={indice} className="esqueleto__bloco esqueleto__cartao" />
          ))}
        </div>
      </div>
    </div>
  );
}
