// Pinta de dourado a parte já percorrida das barras de deslizar (o CSS global em index.css lê --pct). O valor de
// uma barra controlada pelo React muda sem evento, então além do evento `input` um observador acompanha o
// atributo `value`, que o React mantém em dia, e as barras que aparecem depois.

function preencher(barra: HTMLInputElement) {
  if (barra.classList.contains('mesa-range')) return; // essa já tem o preenchimento dela
  const minimo = Number(barra.min || 0);
  const maximo = Number(barra.max || 100);
  const valor = Number(barra.value);
  const fracao = maximo > minimo ? (valor - minimo) / (maximo - minimo) : 0;
  const pct = `${Math.max(0, Math.min(1, fracao)) * 100}%`;
  if (barra.style.getPropertyValue('--pct') !== pct) barra.style.setProperty('--pct', pct);
}

function preencherTodas(raiz: ParentNode) {
  raiz.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(preencher);
}

export function preencherBarrasDeDeslizar() {
  if (typeof document === 'undefined') return;
  document.addEventListener('input', (evento) => {
    const alvo = evento.target;
    if (alvo instanceof HTMLInputElement && alvo.type === 'range') preencher(alvo);
  }, true);
  let agendado = false;
  const varrer = () => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => {
      agendado = false;
      preencherTodas(document);
    });
  };
  new MutationObserver(varrer).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['value', 'min', 'max'],
  });
  varrer();
}
