import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, Library, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CLASSIFICACOES_ENTIDADE, ENTIDADES, RANKS_PERIGO } from '../../../data/mundo/entidades';
import { useAuthStore } from '../../store/useAuthStore';
import { loreBloqueado } from '../Mundo/loreVisibility';
import './entidades.css';

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export function EntidadesPage() {
  const [busca, setBusca] = useState('');
  const termo = normalizar(busca.trim());
  const { usuario, campanhaAtiva } = useAuthStore();
  const isMestre = usuario?.papel_plataforma === 'admin'
    || usuario?.papel_plataforma === 'criador'
    || campanhaAtiva?.papel === 'mestre'
    || campanhaAtiva?.papel === 'assistente';
  const config = campanhaAtiva?.configuracoes || {};
  const entidadesRevelado = config.entidades_revelado || [];
  const entidadesOculto = config.entidades_oculto || [];

  const entidadesVisiveis = useMemo(() => ENTIDADES.filter((entidade) => (
    !loreBloqueado(entidade, { isMestre, loreRevelado: entidadesRevelado, loreOculto: entidadesOculto })
  )), [isMestre, entidadesRevelado, entidadesOculto]);

  const entidades = useMemo(() => {
    if (!termo) return entidadesVisiveis;
    return entidadesVisiveis.filter((entidade) => normalizar([
      entidade.nome,
      entidade.epiteto,
      entidade.resumo,
      RANKS_PERIGO.find((rank) => rank.id === entidade.rankPerigo)?.titulo,
      ...entidade.classificacao.map((id) => CLASSIFICACOES_ENTIDADE.find((classificacao) => classificacao.id === id)?.titulo),
    ].filter(Boolean).join(' ')).includes(termo));
  }, [termo, entidadesVisiveis]);

  return (
    <main className="entity-book">
      <div className="entity-book__backdrop" aria-hidden="true" />
      <div className="entity-book__veil" aria-hidden="true" />

      <div className="entity-book__shell">
        <Link to="/regras?topico=racas" className="entity-book__back">
          <ArrowLeft size={16} /> Voltar ao catálogo de raças
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="entity-book__hero"
        >
          <div className="entity-book__sigil" aria-hidden="true">
            <BookOpen size={40} strokeWidth={1.25} />
          </div>
          <p className="entity-book__eyebrow">Página I · Índice</p>
          <h1>Livro das Entidades</h1>
          <p className="entity-book__lede">
            Consulte os nomes registrados no livro e atravesse cada entrada para conhecer seu conto.
          </p>
          <Link to="/entidades/sobre" className="entity-book__guide-link">
            <span><BookOpen size={18} aria-hidden="true" /> Página II</span>
            <strong>O que são Entidades?</strong>
            <small>Conheça os ranks de perigo e as classificações <ArrowRight size={14} /></small>
          </Link>
        </motion.header>

        <section className="entity-book__archive" aria-labelledby="arquivo-entidades">
          <div className="entity-book__archive-heading">
            <div>
              <span>Índice do livro</span>
              <h2 id="arquivo-entidades">Contos registrados</h2>
            </div>
            <strong>{entidadesVisiveis.length.toString().padStart(2, '0')}</strong>
          </div>

          {entidadesVisiveis.length > 0 ? (
            <label className="entity-book__search">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Buscar entidade</span>
              <input
                type="search"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por nome, conceito ou epíteto..."
              />
              {busca ? (
                <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca">
                  <X size={15} />
                </button>
              ) : null}
            </label>
          ) : null}

          {entidadesVisiveis.length === 0 ? (
            <div className="entity-book__empty">
              <div className="entity-book__empty-icon" aria-hidden="true"><Library size={34} strokeWidth={1.3} /></div>
              <span>Volume I · página em branco</span>
              <h3>O primeiro conto ainda não foi registrado.</h3>
              <p>Quando a primeira Entidade chegar, seu nome abrirá este arquivo e seu conto ocupará uma página com identidade visual e música próprias.</p>
            </div>
          ) : entidades.length === 0 ? (
            <p className="entity-book__no-results">Nenhuma Entidade corresponde a “{busca.trim()}”.</p>
          ) : (
            <div className="entity-book__grid">
              {entidades.map((entidade, index) => (
                <motion.article
                  key={entidade.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.3) }}
                  className="entity-book__entry"
                  style={{ '--entry-accent': entidade.tema.destaque } as React.CSSProperties}
                >
                  <Link to={`/entidades/${entidade.id}`}>
                    <span className="entity-book__entry-number">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      {entidade.epiteto ? <small>{entidade.epiteto}</small> : null}
                      <h3>{entidade.nome}</h3>
                      <p>{entidade.resumo}</p>
                      <div className="entity-book__entry-tags">
                        <span>{RANKS_PERIGO.find((rank) => rank.id === entidade.rankPerigo)?.titulo}</span>
                        {entidade.classificacao.map((id) => (
                          <span key={id}>{CLASSIFICACOES_ENTIDADE.find((classificacao) => classificacao.id === id)?.titulo}</span>
                        ))}
                      </div>
                    </div>
                    <span className="entity-book__entry-link">Ler o conto <ArrowRight size={15} /></span>
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default EntidadesPage;
