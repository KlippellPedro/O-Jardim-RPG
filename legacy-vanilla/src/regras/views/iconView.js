const BASE_ICONES = new URL('../../../assets/img/icons/regras/', import.meta.url);

export function criarIcone(topico, classe) {
  const icone = document.createElement('span');
  icone.className = classe;
  icone.setAttribute('aria-hidden', 'true');

  const imagem = document.createElement('img');
  imagem.className = 'regras-icon-image';
  imagem.src = new URL(topico.icone, BASE_ICONES).href;
  imagem.alt = '';

  const fallback = document.createElement('span');
  fallback.className = 'regras-icon-fallback';
  fallback.textContent = topico.simbolo;

  const mostrarImagem = () => icone.classList.add('tem-imagem');
  imagem.addEventListener('load', mostrarImagem, { once: true });
  imagem.addEventListener('error', () => imagem.remove(), { once: true });

  icone.append(imagem, fallback);
  if (imagem.complete && imagem.naturalWidth > 0) mostrarImagem();
  return icone;
}
