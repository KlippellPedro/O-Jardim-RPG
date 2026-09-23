import type { EfeitoAtmosfericoFicha } from '../fichaTheme';
import { formatarModificador, type IResumoFicha } from '../utils/exportarFicha';
import { custoDePoder, ROTULO_RECURSO } from '../../../services/statusService';
import { RetratoPersonagem } from './RetratoPersonagem';
import './fichaImpressao.css';

interface IFichaImprimivelProps {
  resumo: IResumoFicha;
  destaque: string;
  segunda: string;
  efeito: EfeitoAtmosfericoFicha;
}

const valorRecurso = (atual: number | null, maximo: number) => (atual === null ? String(maximo) : `${atual}/${maximo}`);

const custoImpresso = (poder: { custoMana: number; custoEstamina: number }) => {
  const custo = custoDePoder(poder);
  return custo.recurso === 'nenhum' ? '' : ` (${custo.valor} de ${ROTULO_RECURSO[custo.recurso].toLocaleLowerCase('pt-BR')})`;
};

/** A ficha em página A4. Fica escondida na tela e só aparece na impressão
 * (ver fichaImpressao.css). Mostra o essencial para jogar na mesa: recursos,
 * atributos, perícias treinadas, poderes, habilidades e o que carrega. */
export const FichaImprimivel = ({ resumo, destaque, segunda, efeito }: IFichaImprimivelProps) => (
  <div id="ficha-impressao" aria-hidden="true">
    <header className="fi-cabecalho">
      <RetratoPersonagem
        nome={resumo.nome}
        foto={resumo.foto}
        nivel={resumo.nivel}
        destaque={destaque}
        segunda={segunda}
        efeito={efeito}
        tamanho={92}
        mostrarNivel={false}
      />
      <div>
        <h1 className="fi-nome">{resumo.nome}</h1>
        <p className="fi-sub">{resumo.raca} · {resumo.classes}</p>
        {resumo.titulo ? <p className="fi-titulo">“{resumo.titulo}”</p> : null}
      </div>
      <div className="fi-meta">
        Nível
        <strong>{resumo.nivel}</strong>
        Fama {'★'.repeat(resumo.fama)}{'☆'.repeat(5 - resumo.fama)}
        <br />
        {resumo.xp.toLocaleString('pt-BR')} XP
      </div>
    </header>

    <h2>Recursos</h2>
    <div className="fi-grade fi-grade--7">
      <div className="fi-caixa"><span>Vida</span><strong>{valorRecurso(resumo.recursos.vida.atual, resumo.recursos.vida.maximo)}</strong></div>
      <div className="fi-caixa"><span>Mana</span><strong>{valorRecurso(resumo.recursos.mana.atual, resumo.recursos.mana.maximo)}</strong></div>
      <div className="fi-caixa"><span>Estamina</span><strong>{valorRecurso(resumo.recursos.estamina.atual, resumo.recursos.estamina.maximo)}</strong></div>
      <div className="fi-caixa"><span>Sanidade</span><strong>{resumo.recursos.sanidade ?? 'N/D'}</strong></div>
      <div className="fi-caixa"><span>Defesa</span><strong>{resumo.recursos.defesa}</strong></div>
      <div className="fi-caixa"><span>Iniciativa</span><strong>{resumo.recursos.iniciativa}</strong></div>
      <div className="fi-caixa"><span>Movimento</span><strong>{String(resumo.recursos.movimento).replace('.', ',')}</strong></div>
    </div>

    <h2>Atributos</h2>
    <div className="fi-grade fi-grade--7">
      {resumo.atributos.map((atributo) => (
        <div key={atributo.chave} className="fi-caixa">
          <span>{atributo.rotulo.slice(0, 3)}</span>
          <strong>{atributo.valor}</strong>
          <em>{formatarModificador(atributo.mod)}</em>
        </div>
      ))}
    </div>

    <div className="fi-colunas">
      <div>
        <h2>Perícias treinadas</h2>
        {resumo.pericias.length ? resumo.pericias.map((pericia) => (
          <div key={pericia.titulo} className="fi-linha"><span>{pericia.titulo}</span><span>{pericia.grau}</span></div>
        )) : <p className="fi-vazio">Nenhuma além do grau inicial.</p>}
      </div>
      <div>
        <h2>Habilidades</h2>
        {resumo.habilidades.length ? resumo.habilidades.map((habilidade) => (
          <div key={`${habilidade.origem}-${habilidade.titulo}`} className="fi-linha"><span>{habilidade.titulo}</span><span>{habilidade.origem}</span></div>
        )) : <p className="fi-vazio">Nenhuma registrada.</p>}
      </div>
    </div>

    <h2>Poderes</h2>
    {resumo.poderes.length ? resumo.poderes.map((poder, indice) => (
      <div key={`${poder.titulo}-${indice}`} className="fi-item">
        <strong>{poder.titulo}</strong>{custoImpresso(poder)}
        <p>{poder.descricao.split('\n')[0]}</p>
      </div>
    )) : <p className="fi-vazio">Nenhum poder de classe escolhido.</p>}

    <div className="fi-colunas">
      <div>
        <h2>Inventário</h2>
        {resumo.inventario.length ? resumo.inventario.map((item, indice) => (
          <div key={`${item.titulo}-${indice}`} className="fi-linha">
            <span>{item.equipado ? '● ' : ''}{item.titulo}</span>
            <span>{item.quantidade > 1 ? `×${item.quantidade}` : ''}</span>
          </div>
        )) : <p className="fi-vazio">Vazio.</p>}
      </div>
      <div>
        <h2>Carteira</h2>
        {resumo.carteira.length ? resumo.carteira.map((moeda) => (
          <div key={moeda.moeda} className="fi-linha"><span>{moeda.moeda}</span><span>{moeda.saldo.toLocaleString('pt-BR')}</span></div>
        )) : <p className="fi-vazio">Sem saldo.</p>}
        <h2>Aliados</h2>
        {resumo.aliados.length ? resumo.aliados.map((nome, indice) => (
          <div key={`${nome}-${indice}`} className="fi-linha"><span>{nome}</span><span /></div>
        )) : <p className="fi-vazio">Nenhum.</p>}
      </div>
    </div>

    <footer className="fi-rodape">
      <span>● equipado</span>
      <span>O Jardim RPG · impresso em {resumo.geradoEm}</span>
    </footer>
  </div>
);
