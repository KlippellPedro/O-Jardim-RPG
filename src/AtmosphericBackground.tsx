/**
 * Fundo global sem WebGL. O visual anterior mantinha Three.js e um render loop
 * ativos em todas as páginas apenas para 700 pontos e quatro brilhos.
 */
export default function AtmosphericBackground() {
  return (
    <div className="atmospheric-background fixed inset-0 z-0 overflow-hidden bg-background pointer-events-none" aria-hidden="true">
      <div className="atmospheric-stars atmospheric-stars-near performance-ambient-motion" />
      <div className="atmospheric-stars atmospheric-stars-far performance-decorative" />
      <div className="atmospheric-glows performance-decorative" />
    </div>
  );
}
