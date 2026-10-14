import { motion } from 'framer-motion';
import { Gem, Link2, Package, Send } from 'lucide-react';
import type { ICofreItem, ICofreMoeda } from '../../services/cofreApi';
import { visualDaMoeda } from './cofreVisual';

interface ICofreRecompensasProps {
  itens: ICofreItem[];
  moedas: ICofreMoeda[];
  discordVinculado: boolean;
  /** Nome do personagem que recebe; vazio enquanto não há destino. */
  personagemNome: string;
  onEnviarMoeda: (moeda: ICofreMoeda) => void;
  onEnviarItem: (item: ICofreItem) => void;
  onVincular: () => void;
}

const botaoDeEnvio = 'inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-bold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40';

/** O que o bot do Discord guardou no site para a pessoa (itens e moedas de recompensa), esperando ir para uma ficha. */
export function CofreRecompensas({ itens, moedas, discordVinculado, personagemNome, onEnviarMoeda, onEnviarItem, onVincular }: ICofreRecompensasProps) {
  const vazio = itens.length === 0 && moedas.length === 0;
  const dica = personagemNome ? '' : 'Escolha um personagem acima para enviar';

  return (
    <section className="rounded-2xl border border-white/5 bg-[#0f0e15] p-6" aria-label="Recompensas guardadas">
      <div className="mb-5 flex items-center gap-2">
        <Gem size={18} className="text-primary" />
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">Recompensas guardadas</h2>
          <p className="mt-1 text-xs text-gray-500">Itens e moedas recebidos no Discord, guardados até você enviá-los para uma ficha.</p>
        </div>
      </div>

      {moedas.length > 0 && (
        <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3">
          {moedas.map((moeda) => {
            const visual = visualDaMoeda(moeda.moeda);
            return (
              <div key={moeda.moeda} className={`flex flex-col gap-3 rounded-xl border p-4 ${visual.classe}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wider opacity-80">{moeda.moeda}</p>
                  <span aria-hidden className="text-lg opacity-80">{visual.simbolo}</span>
                </div>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Cinzel, serif' }}>{moeda.saldo.toLocaleString('pt-BR')}</p>
                <button
                  type="button"
                  onClick={() => onEnviarMoeda(moeda)}
                  disabled={!personagemNome}
                  title={dica || `Enviar ${moeda.moeda} para ${personagemNome}`}
                  aria-label={`Enviar ${moeda.moeda}${personagemNome ? ` para ${personagemNome}` : ''}`}
                  className={`${botaoDeEnvio} justify-center`}
                >
                  <Send size={13} /> Enviar
                </button>
              </div>
            );
          })}
        </div>
      )}

      {vazio ? (
        <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-14 text-center">
          <Package size={40} className="mx-auto mb-3 text-gray-700 opacity-60" />
          <p className="text-sm text-gray-400">Nenhuma recompensa esperando por você.</p>
          {discordVinculado ? (
            <p className="mx-auto mt-1 max-w-sm text-xs text-gray-600">Quando o bot do Discord guardar algo para você, aparece aqui.</p>
          ) : (
            <>
              <p className="mx-auto mt-1 max-w-sm text-xs text-gray-600">As recompensas do bot só chegam aqui depois que o seu Discord estiver vinculado.</p>
              <button
                type="button"
                onClick={onVincular}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/50 bg-primary/20 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white"
              >
                <Link2 size={15} /> Vincular o Discord
              </button>
            </>
          )}
        </div>
      ) : itens.length > 0 && (
        <ul className="space-y-2">
          {itens.map((item) => (
            <motion.li
              key={item.item_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{item.titulo}</p>
                <p className="text-xs capitalize text-gray-500">{item.origem}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-bold text-green-400">x{item.quantidade}</span>
                <button
                  type="button"
                  onClick={() => onEnviarItem(item)}
                  disabled={!personagemNome}
                  title={dica || `Enviar ${item.titulo} para ${personagemNome}`}
                  aria-label={`Enviar ${item.titulo}${personagemNome ? ` para ${personagemNome}` : ''}`}
                  className={botaoDeEnvio}
                >
                  <Send size={13} /> Enviar
                </button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
