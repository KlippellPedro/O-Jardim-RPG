const TIPOS_SECAO = new Set(['texto', 'lista', 'tabela']);

function objetoSimples(valor) {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
}

function textoValido(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function valorDeCelulaValido(valor) {
  return typeof valor === 'string' || typeof valor === 'number';
}

function validarSecao(secao, indice) {
  if (!objetoSimples(secao)) return `seção ${indice + 1} inválida`;
  if (!textoValido(secao.titulo)) return `seção ${indice + 1} sem título`;
  if (!TIPOS_SECAO.has(secao.tipo)) return `tipo desconhecido na seção ${indice + 1}`;

  if (secao.tipo === 'texto') {
    if (!Array.isArray(secao.paragrafos) || !secao.paragrafos.every(textoValido)) {
      return `parágrafos inválidos na seção ${indice + 1}`;
    }
  }

  if (secao.tipo === 'lista') {
    if (!Array.isArray(secao.itens) || !secao.itens.every(textoValido)) {
      return `itens inválidos na seção ${indice + 1}`;
    }
  }

  if (secao.tipo === 'tabela') {
    const colunasValidas = Array.isArray(secao.colunas)
      && secao.colunas.length > 0
      && secao.colunas.every(textoValido);
    const linhasValidas = Array.isArray(secao.linhas)
      && secao.linhas.every(linha => (
        Array.isArray(linha)
        && linha.length === secao.colunas.length
        && linha.every(valorDeCelulaValido)
      ));

    if (!colunasValidas || !linhasValidas) {
      return `tabela inválida na seção ${indice + 1}`;
    }
  }

  return null;
}

export function validarPacoteMestre(pacote) {
  if (!objetoSimples(pacote)) return 'arquivo mestre inválido';
  if (pacote.tipo !== 'regras-mestre') return 'o campo "tipo" deve ser "regras-mestre"';
  if (!textoValido(pacote.versao)) return 'faltando "versao"';
  if (!textoValido(pacote.titulo)) return 'faltando "titulo"';
  if (!textoValido(pacote.resumo)) return 'faltando "resumo"';

  if (!Array.isArray(pacote.secoes) || pacote.secoes.length === 0 || pacote.secoes.length > 50) {
    return 'o arquivo precisa conter entre 1 e 50 seções';
  }

  if (pacote.destaques !== undefined) {
    const validos = Array.isArray(pacote.destaques)
      && pacote.destaques.every(item => (
        Array.isArray(item)
        && item.length === 2
        && textoValido(item[0])
        && valorDeCelulaValido(item[1])
      ));
    if (!validos) return 'destaques inválidos';
  }

  for (let indice = 0; indice < pacote.secoes.length; indice += 1) {
    const erro = validarSecao(pacote.secoes[indice], indice);
    if (erro) return erro;
  }

  return null;
}
