import { useEffect, useState, type CSSProperties } from 'react';
import { Eye, Lock, Sparkles, Users } from 'lucide-react';
import { descobertasApi, type IDescobertasDaCampanha } from '../../services/descobertasApi';
import { porcentagem } from './quadro';

/** As coisas escondidas do site: mostra quem achou cada uma, nunca onde ela está. */
export const AbaDescobertas = ({ campanhaId }: { campanhaId: string }) => {
  const [dados, setDados] = useState<IDescobertasDaCampanha | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    descobertasApi.daCampanha(campanhaId)
      .then((resposta) => { if (ativo) setDados(resposta); })
      .catch((falha) => { if (ativo) setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir as descobertas.'); });
    return () => { ativo = false; };
  }, [campanhaId]);

  if (erro) return <p role="alert" className="qd-erro">{erro}</p>;
  if (!dados) return <p className="qd-carregando" aria-busy="true">Procurando...</p>;

  const achadasPelaMesa = dados.itens.filter((item) => item.descobridores.length > 0).length;
  const maiorTotal = dados.ranking[0]?.total || 1;

  return (
    <div className="flex flex-col gap-5">
      <section className="qd-painel qd-progresso" aria-label="Seu progresso">
        <div className="qd-anel" style={{ '--p': porcentagem(dados.achadas_por_mim, dados.total) } as CSSProperties}>
          <span className="qd-anel__valor"><strong>{dados.achadas_por_mim}</strong><small>de {dados.total}</small></span>
        </div>
        <div className="min-w-0">
          <h2>Coisas escondidas no Jardim</h2>
          <p>
            O site guarda segredos espalhados pelas páginas. Aqui aparece quem já achou cada um, mas nunca onde ele está.
            A mesa toda já achou <strong className="text-[#f1e8d4]">{achadasPelaMesa}</strong>.
          </p>
          <div className="qd-trilha" aria-hidden="true">
            {dados.itens.map((item) => (
              <i key={item.chave} className={item.achei ? 'is-meu' : item.descobridores.length ? 'is-achado' : ''} />
            ))}
          </div>
          <p className="qd-legenda" aria-hidden="true">
            <span><i className="is-meu" /> Achado por você</span>
            <span><i className="is-achado" /> Achado pela mesa</span>
            <span><i /> Ninguém achou</span>
          </p>
        </div>
      </section>

      <ul className="qd-segredos">
        {dados.itens.map((item) => {
          const conhecida = item.nome !== '???';
          const rara = item.raridade === 'rara';
          const estado = item.achei ? 'is-meu' : conhecida ? 'is-revelado' : 'is-selado';
          return (
            <li key={item.chave} className={`qd-segredo ${estado} ${rara ? 'is-rara' : ''}`}>
              {rara ? <span className="qd-segredo__rara">Rara</span> : null}
              <div className="qd-segredo__cabeca">
                <span className="qd-segredo__selo" aria-hidden="true">
                  {item.achei ? <Sparkles size={17} /> : conhecida ? <Eye size={17} /> : <Lock size={15} />}
                </span>
                <h3>
                  {conhecida ? item.nome : <><span aria-hidden="true">???</span><span className="sr-only">Segredo que ninguém achou</span></>}
                </h3>
              </div>
              {item.dica ? <p className="qd-segredo__dica">{item.dica}</p> : null}
              <p className="qd-segredo__quem">
                {item.descobridores.length
                  ? <>Achado por <b>{item.descobridores.join(', ')}</b></>
                  : 'Ninguém achou ainda.'}
              </p>
            </li>
          );
        })}
      </ul>

      {dados.ranking.length ? (
        <section aria-label="Quem mais achou" className="qd-painel">
          <h3 className="qd-painel__titulo"><Users size={16} aria-hidden="true" /> Quem mais achou</h3>
          <ol className="qd-ranking">
            {dados.ranking.map((linha, indice) => (
              <li key={linha.nome}>
                <span className="qd-ranking__pos" aria-hidden="true">{indice + 1}</span>
                <span className="qd-ranking__nome">{linha.nome}</span>
                <span className="qd-ranking__barra" aria-hidden="true"><i style={{ width: `${porcentagem(linha.total, maiorTotal)}%` }} /></span>
                <span className="qd-ranking__total">{linha.total}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
};
