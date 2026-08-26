import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Crown, Feather } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { encontrarEntidade } from '../../../data/mundo/entidades';
import { EntityThemeMusic } from './EntityThemeMusic';
import { EntityWanderingFigure } from './EntityWanderingFigure';
import './entidades.css';

type EntityThemeStyle = CSSProperties & Record<`--entity-${string}`, string>;

export function EntidadeContoPage() {
  const { entidadeId } = useParams<{ entidadeId: string }>();
  const entidade = encontrarEntidade(entidadeId);

  if (!entidade) {
    return (
      <main className="entity-story entity-story--missing">
        <BookOpen size={48} strokeWidth={1.2} />
        <span>Registro inexistente</span>
        <h1>Este conto não está no livro.</h1>
        <p>A Entidade pode não existir ainda ou o endereço pode estar incorreto.</p>
        <Link to="/entidades"><ArrowLeft size={16} /> Voltar ao Livro das Entidades</Link>
      </main>
    );
  }

  const estilo = {
    '--entity-accent': entidade.tema.destaque,
    '--entity-accent-soft': entidade.tema.destaqueSuave,
    '--entity-accent-2': entidade.tema.destaqueSecundario ?? entidade.tema.destaque,
    '--entity-background': entidade.tema.fundo,
    '--entity-surface': entidade.tema.superficie,
    '--entity-text': entidade.tema.texto,
    '--entity-muted': entidade.tema.textoSuave,
    '--entity-image': entidade.tema.imagemFundo ? `url("${entidade.tema.imagemFundo}")` : 'none',
  } as EntityThemeStyle;

  const imagemErrante = entidade.tema.modoImagem === 'errante' && entidade.tema.imagemFundo;
  const ehRealeza = entidade.tema.moldura === 'realeza';

  return (
    <main className={`entity-story${ehRealeza ? ' entity-story--realeza' : ''}`} style={estilo}>
      {imagemErrante ? (
        <EntityWanderingFigure src={entidade.tema.imagemFundo!} />
      ) : (
        <div className="entity-story__image" aria-hidden="true" />
      )}
      {ehRealeza ? <div className="entity-story__embers" aria-hidden="true" /> : null}
      <div className="entity-story__wash" aria-hidden="true" />

      <div className="entity-story__shell">
        <nav className="entity-story__nav" aria-label="Navegação do conto">
          <Link to="/entidades"><ArrowLeft size={16} /> Livro das Entidades</Link>
          <span>Um conto, uma existência</span>
        </nav>

        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
          className="entity-story__header"
        >
          <span className="entity-story__kicker">
            {ehRealeza ? <Crown size={13} aria-hidden="true" /> : null}
            Entidade
          </span>
          <h1>{entidade.nome}</h1>
          {ehRealeza ? <div className="entity-story__ornamento" aria-hidden="true"><span /></div> : null}
          {entidade.epiteto ? <p className="entity-story__epithet">{entidade.epiteto}</p> : null}
          {entidade.epigrafe ? (
            <blockquote><Feather size={17} aria-hidden="true" />{entidade.epigrafe}</blockquote>
          ) : null}
          {entidade.musicaTema ? <EntityThemeMusic musica={entidade.musicaTema} /> : null}
        </motion.header>

        <article className="entity-story__prose">
          {entidade.conto.map((secao, index) => (
            <motion.section
              key={`${entidade.id}-${index}`}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45 }}
            >
              {secao.titulo ? <h2>{secao.titulo}</h2> : null}
              {secao.paragrafos.map((paragrafo, paragrafoIndex) => (
                <p key={`${entidade.id}-${index}-${paragrafoIndex}`}>{paragrafo}</p>
              ))}
            </motion.section>
          ))}
        </article>

        <footer className="entity-story__footer">
          <Link to="/entidades">Retornar ao índice</Link>
        </footer>
      </div>
    </main>
  );
}

export default EntidadeContoPage;
