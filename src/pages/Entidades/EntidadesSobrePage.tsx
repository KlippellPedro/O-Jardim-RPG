import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, CircleAlert, Compass, Feather } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CLASSIFICACOES_ENTIDADE, RANKS_PERIGO } from '../../../data/mundo/entidades';
import './entidades.css';

export function EntidadesSobrePage() {
  return (
    <main className="entity-book entity-guide">
      <div className="entity-book__backdrop" aria-hidden="true" />
      <div className="entity-book__veil" aria-hidden="true" />

      <div className="entity-book__shell entity-guide__shell">
        <Link to="/entidades" className="entity-book__back">
          <ArrowLeft size={16} /> Voltar ao índice
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="entity-guide__header"
        >
          <p className="entity-book__eyebrow">Página II · Guia de identificação</p>
          <h1>Sobre as Entidades</h1>
          <p>Antes de abrir um conto, aprenda a reconhecer o que pode estar olhando de volta para você.</p>
        </motion.header>

        <section className="entity-guide__definition" aria-labelledby="definicao-entidade">
          <div className="entity-guide__definition-icon" aria-hidden="true"><Feather size={30} strokeWidth={1.25} /></div>
          <div>
            <span>O princípio</span>
            <h2 id="definicao-entidade">O que é uma Entidade?</h2>
            <p>
              Uma Entidade não é uma raça comum. Ela é um conceito que recebeu forma por meio de uma narrativa.
              Não existe por atributos, poderes ou fisiologia: para uma Entidade existir, ela precisa ter um conto.
            </p>
            <strong>Sem conto, não há Entidade.</strong>
          </div>
        </section>

        <section className="entity-guide__section" aria-labelledby="rank-perigo">
          <header className="entity-guide__section-heading">
            <div className="entity-guide__section-icon"><CircleAlert size={22} aria-hidden="true" /></div>
            <div>
              <span>Escala de poder e ameaça</span>
              <h2 id="rank-perigo">Rank de Perigo</h2>
              <p>O rank indica o quanto uma Entidade pode ser poderosa e qual é o risco de encontrá-la.</p>
            </div>
          </header>

          <div className="entity-guide__ranks">
            {RANKS_PERIGO.map((rank, index) => (
              <motion.article
                key={rank.id}
                initial={{ opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.04 }}
                className="entity-guide__rank"
                style={{ '--rank-color': rank.cor } as React.CSSProperties}
              >
                <span className="entity-guide__rank-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="entity-guide__rank-swatch" aria-hidden="true" />
                <div>
                  <h3>{rank.titulo}</h3>
                  <p>{rank.descricao}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="entity-guide__section" aria-labelledby="classificacao-entidade">
          <header className="entity-guide__section-heading">
            <div className="entity-guide__section-icon"><Compass size={22} aria-hidden="true" /></div>
            <div>
              <span>Intenção e comportamento</span>
              <h2 id="classificacao-entidade">Classificação</h2>
              <p>A classificação ajuda a estimar o que uma Entidade pretende fazer quando percebe sua presença.</p>
            </div>
          </header>

          <div className="entity-guide__classifications">
            {CLASSIFICACOES_ENTIDADE.map((classificacao, index) => (
              <motion.article
                key={classificacao.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.04 }}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{classificacao.titulo}</h3>
                <p>{classificacao.descricao}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <footer className="entity-guide__footer">
          <BookOpen size={22} aria-hidden="true" />
          <p>Agora que você conhece os sinais, volte ao índice e escolha um conto.</p>
          <Link to="/entidades">Abrir o índice <ArrowRight size={15} /></Link>
        </footer>
      </div>
    </main>
  );
}

export default EntidadesSobrePage;
