/**
 * Props avulsos: peças soltas, sem ligação entre si, pra soltar quando a cena
 * pedir. Todas de emissores canônicos, e todas de uma página só.
 *
 * Onde a peça toca lore existente (a Chuva Roxa, Întuneric, a Biblioteca de
 * Arkarin), o texto do mundo entra literal do data/mundo. O que este arquivo
 * escreve é a papelada em volta.
 */
import { MUNDO, esc, paragrafos } from './dados.mjs';
import { ANO } from './dossie.mjs';

const prop = (classe, conteudo) => `<section class="prop ${classe}">${conteudo}</section>`;
const mancha = (t, l, tam, tipo = '') =>
  `<div class="mancha ${tipo}" style="top:${t};left:${l};width:${tam};height:${tam}"></div>`;
const vinco = (p) => `<div class="vinco" style="top:${p}"></div>`;
const margem = (t, lado, txt, v = 1, azul = false) =>
  `<div class="margem torta-${v}${azul ? ' azul' : ''}" style="top:${t};${lado}">${txt}</div>`;

const evento = (busca) => MUNDO.find((e) => e.tipo === 'evento' && new RegExp(busca, 'i').test(e.titulo));

/* ------------------------------------------------------------------ */

function cartazProcurado() {
  return prop('oficial', `
    ${mancha('72%', '8%', '46mm')}
    ${vinco('120mm')}
    <div class="furo" style="top:10mm;left:20mm"></div>
    <div class="furo" style="top:10mm;right:20mm"></div>

    <div style="text-align:center">
      <div class="olho">Guilda dos Caçadores · quadro de procurados</div>
      <h1 class="titulo" style="font-size:44pt;letter-spacing:.06em;margin:6mm 0 2mm">PROCURADO</h1>
      <div style="border-top:0.8mm solid var(--tinta);border-bottom:0.3mm solid var(--tinta);
                  padding:2mm 0;margin-bottom:8mm;font-size:10pt;letter-spacing:.24em;
                  text-transform:uppercase">Vivo. Morto não conta neste contrato.</div>
    </div>

    <div style="display:grid;grid-template-columns:58mm 1fr;gap:8mm;align-items:start">
      <div style="border:0.6mm solid var(--tinta);height:70mm;display:flex;align-items:center;
                  justify-content:center;text-align:center;font-size:9pt;color:var(--tinta-apagada);
                  background:rgba(255,252,240,0.4);padding:4mm">
        Sem retrato.<br>Três testemunhas,<br>três rostos diferentes.
      </div>
      <div>
        <dl class="formulario" style="margin-top:0">
          <div class="campo"><dt>Chamado de</dt><dd class="preenchido">O Hóspede</dd></div>
          <div class="campo"><dt>Última aparição</dt><dd>Dimensão Padrão, estrada baixa entre reinos</dd></div>
          <div class="campo"><dt>Acusação</dt><dd>Entrar em casa alheia sem ser visto entrar</dd></div>
          <div class="campo"><dt>Recompensa</dt><dd class="preenchido">18.000 Lunaris</dd></div>
          <div class="campo"><dt>Contrato</dt><dd>Aberto a quem quiser tentar</dd></div>
        </dl>
      </div>
    </div>

    <h2 class="titulo">O que a Guilda sabe</h2>
    <div class="recuo">
      <p>Onze casas em sete meses, todas com a porta trancada por dentro e ninguém dentro pela
      manhã. Nada foi levado nas onze. Em nove delas a família jantou com um hóspede na véspera
      e nenhuma das nove soube dizer depois quem era o hóspede, nem quem o tinha convidado.</p>
      <p>A Guilda registra o que foi relatado e não avaliza teoria. Registra também que três
      caçadores aceitaram este contrato e que os três devolveram o contrato sem cobrar a taxa de
      desistência, o que nenhum caçador faz.</p>
    </div>

    <div class="nota-campo">
      <div class="olho">Instrução ao caçador</div>
      <p>Não jante. Não durma sob teto onde ele tenha jantado. Se em algum momento você não
      conseguir lembrar quem convidou você para estar onde está, saia pela porta que estiver
      mais perto e não volte para conferir.</p>
    </div>

    ${margem('252mm', 'left:20mm', 'devolvi este contrato.<br>não vou dizer por quê.', 2)}
  `);
}

/* ------------------------------------------------------------------ */

function recorteJornal() {
  const chuva = evento('Chuva Roxa');
  return prop('jornal', `
    ${mancha('58%', '62%', '54mm')}
    ${vinco('186mm')}

    <div class="cabeca-jornal">
      <span>Folha da Dimensão Padrão</span>
      <span>Ano ${ANO} da Realidade 0</span>
      <span>Edição da estação</span>
    </div>

    <div class="credito">Do corpo de repórteres, com apuração em três reinos</div>
    <h1 class="manchete">A chuva voltou, e desta vez ninguém fingiu que era normal</h1>
    <p class="linha-fina">Fenômeno recorrente tornou a cair sobre a Dimensão Padrão. Autoridades
    pedem calma e não explicam nada, que é o que costumam fazer.</p>

    <div class="colunas">
      ${paragrafos(chuva?.conteudo?.descricao)}
      <p>Procurada, a administração de um dos reinos afetados respondeu que o episódio está sendo
      acompanhado e que não há motivo para alarme. Questionada sobre quantas vezes o episódio já
      foi acompanhado sem que se chegasse a uma causa, a mesma administração encerrou o
      atendimento.</p>
      <p>Nesta redação existe um arquivo com registros do mesmo fenômeno recuando várias
      gerações. Os registros mais antigos usam quase as mesmas palavras dos mais novos, o que
      pode ser sinal de que o fenômeno não muda, ou de que quem escreve sobre ele nunca teve
      informação nova para acrescentar.</p>
      <p>Recolhemos relato de moradores que dizem ter guardado água da chuva em vidro fechado.
      Não recomendamos a prática e não publicamos o nome de quem contou.</p>
      ${chuva?.conteudo?.era ? `<p><strong>Registro.</strong> ${esc(chuva.conteudo.era)}.</p>` : ''}
    </div>

    ${margem('244mm', 'left:18mm', 'guardei um vidro.<br>ainda tenho.', 3)}
  `);
}

/* ------------------------------------------------------------------ */

function paginaBiblioteca() {
  return prop('pautado', `
    ${mancha('40%', '54%', '58mm', 'sangue')}
    ${vinco('96mm')}

    <div class="timbre">
      <div>
        <div class="casa">Biblioteca de Arkarin</div>
        <div class="linha2">Limiar · um livro por vida encerrada</div>
      </div>
      <div class="ref">Folha avulsa<br>Retirada indevida</div>
    </div>

    <div class="olho">Página final de um volume</div>
    <h1 class="titulo">O que ficou registrado</h1>

    <dl class="formulario">
      <div class="campo"><dt>Volume</dt><dd>Um, como todos</dd></div>
      <div class="campo"><dt>Nome</dt><dd><span class="tarja">████████████████</span></dd></div>
      <div class="campo"><dt>Encerrado em</dt><dd>Inverno</dd></div>
      <div class="campo"><dt>Causa registrada</dt><dd>Registrada. Não transcrita nesta folha.</dd></div>
    </dl>

    <div class="recuo">
      <p>Aqui termina. A Biblioteca guarda o que a vida foi, e não o que ela pretendia ser, e por
      isso as últimas páginas costumam ser mais curtas do que quem viveu esperaria.</p>
      <p>Não há julgamento nesta folha. O julgamento acontece no Tribunal e não é atribuição de
      quem escreve os volumes. O que se registra aqui é somente que houve, que durou e que
      terminou, nesta ordem, que é a única ordem que Limiar reconhece.</p>
      <p>Terminar não é sumir. Enquanto este volume existir na estante, a pessoa terminou e
      continua tendo existido. É a diferença inteira entre o que Limiar guarda e o que o Vazio
      leva, e é por isso que a Biblioteca não empresta volume, não vende cópia e não devolve
      folha arrancada.</p>
    </div>

    <div class="nota-campo">
      <div class="olho">Advertência ao portador</div>
      <p>Esta folha foi arrancada de um volume da estante. Quem a retirou levou embora um pedaço
      do que aquela vida foi. A Biblioteca aceita devolução sem pergunta e sem multa, e prefere a
      devolução a qualquer explicação.</p>
    </div>

    ${margem('228mm', 'right:14mm', 'o nome tava aqui<br>quando eu peguei.', 1)}
  `);
}

/* ------------------------------------------------------------------ */

function manifestoCarga() {
  return prop('oficial', `
    ${mancha('20%', '66%', '40mm', 'sangue')}
    ${vinco('128mm')}
    <div class="carimbo" style="top:200mm;left:26mm;transform:rotate(-4deg)">Conferido</div>

    <div class="timbre">
      <div>
        <div class="casa">Colônias de Întuneric</div>
        <div class="linha2">Manifesto de carga · via da colônia</div>
      </div>
      <div class="ref">
        Remessa 219<br>
        Lua alta<br>
        Destino: Transilvânia
      </div>
    </div>

    <h1 class="titulo">Remessa da estação</h1>
    <p class="subtitulo">Documento de acompanhamento. Deve seguir com a carga até a conferência final.</p>

    <table class="livro">
      <thead><tr><th style="width:20mm">Volume</th><th>Conteúdo declarado</th><th style="width:26mm" class="valor">Quantidade</th></tr></thead>
      <tbody>
        <tr><td>1 a 40</td><td>Recipiente vedado, padrão de colônia. Conteúdo conforme contrato.</td><td class="valor">40</td></tr>
        <tr><td>41 a 46</td><td>Recipiente vedado, lote separado por qualidade superior.</td><td class="valor">6</td></tr>
        <tr><td>47</td><td>Recipiente devolvido pela casa recebedora. Lacre rompido na origem.</td><td class="valor">1</td></tr>
        <tr class="somatorio"><td></td><td>Total de volumes</td><td class="valor">47</td></tr>
      </tbody>
    </table>

    <div class="nota-campo">
      <div class="olho">Condições de transporte</div>
      <p>A carga não pega sol, e nesta Dimensão isso não é problema. Segue sob fuligem e sob a
      lua que não se põe, como toda remessa daqui. O transportador não abre volume, não confere
      conteúdo e não responde por perda de qualidade decorrente de demora na estrada.</p>
      <p>Perda acima de dois volumes em uma mesma remessa obriga o transportador a apresentar
      justificativa por escrito antes do próximo carregamento.</p>
    </div>

    <div class="nota-campo">
      <div class="olho">Ocorrência anotada na saída</div>
      <p>O volume 47 voltou da casa recebedora com o lacre rompido e foi reintegrado à remessa
      por ordem verbal. Anoto que pedi a ordem por escrito e que a ordem por escrito não veio.
      Anoto também que o volume 47 pesa menos do que pesava na ida.</p>
    </div>

    <div class="assinatura">
      <div class="risco">conferente da colônia</div><br>
      <span class="cargo">Assinatura ilegível</span>
    </div>
  `);
}

/* ------------------------------------------------------------------ */

function avisoCaravana() {
  return prop('oficial', `
    ${vinco('88mm')}
    ${vinco('176mm')}
    <div class="furo" style="top:12mm;left:50%;margin-left:-2.5mm"></div>

    <div class="timbre">
      <div>
        <div class="casa">Caravana do Limiar</div>
        <div class="linha2">Aviso de rota · afixar no posto</div>
      </div>
      <div class="ref">Vigência imediata<br>Ano ${ANO}</div>
    </div>

    <h1 class="titulo">Alterações desta estação</h1>
    <p class="subtitulo">A Caravana atravessa por passagem conhecida. Rota selada não se tenta,
    e passageiro que insistir viaja sozinho.</p>

    <table class="livro">
      <thead><tr><th>Trecho</th><th style="width:30mm">Situação</th><th style="width:34mm" class="valor">Passagem</th></tr></thead>
      <tbody>
        <tr><td>Salém a Emberhold, estrada baixa</td><td>Normal</td><td class="valor">340</td></tr>
        <tr><td>Emberhold a Khazad</td><td>Normal</td><td class="valor">520</td></tr>
        <tr><td>Lionês a Império</td><td>Normal</td><td class="valor">410</td></tr>
        <tr><td>Qualquer trecho ao Interstício</td><td><strong>Suspenso</strong></td><td class="valor">—</td></tr>
        <tr><td>Trecho de Espelhos</td><td><strong>Suspenso</strong></td><td class="valor">—</td></tr>
        <tr><td>Trecho de Sonhar</td><td>Nunca ofertado</td><td class="valor">—</td></tr>
      </tbody>
    </table>

    <div class="nota-campo">
      <div class="olho">Sobre os trechos suspensos</div>
      <p>A suspensão do Interstício segue até nova medição das passagens. Três condutores
      relataram, de forma independente, que a travessia levou mais do que a tabela prevê, e a
      Caravana não vende passagem para trecho cuja duração não sabe informar.</p>
      <p>O trecho de Espelhos está suspenso por motivo distinto. Dois passageiros embarcaram e
      dois passageiros desembarcaram. A Caravana está conferindo se são os mesmos dois.</p>
    </div>

    <div class="nota-campo">
      <div class="olho">Condições que não mudam</div>
      <p>Carga viva paga o dobro. Carga que fala paga como passageiro. A Caravana leva mensagem
      lacrada e não leva mensagem que o remetente peça para ser lida em voz alta na chegada.</p>
      <p>Passageiro que embarcar por um trecho e desembarcar noutro paga a diferença, mesmo que
      não tenha sido escolha dele.</p>
    </div>

    ${margem('218mm', 'left:16mm', 'suspenso desde o inverno.<br>ninguém suspende<br>rota boa por nada.', 3, true)}
  `);
}

/* ------------------------------------------------------------------ */

export function avulsos() {
  return [
    { arquivo: 'Avulso-Cartaz-Procurado', titulo: 'Procurado: O Hóspede', paginas: [cartazProcurado()] },
    { arquivo: 'Avulso-Recorte-Chuva-Roxa', titulo: 'Recorte: a Chuva Roxa', paginas: [recorteJornal()] },
    { arquivo: 'Avulso-Pagina-Biblioteca', titulo: 'Página da Biblioteca de Arkarin', paginas: [paginaBiblioteca()] },
    { arquivo: 'Avulso-Manifesto-Intuneric', titulo: 'Manifesto de carga de Întuneric', paginas: [manifestoCarga()] },
    { arquivo: 'Avulso-Aviso-Caravana', titulo: 'Aviso de rota da Caravana', paginas: [avisoCaravana()] },
  ];
}
