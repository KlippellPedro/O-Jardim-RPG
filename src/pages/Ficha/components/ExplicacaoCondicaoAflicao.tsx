import { FlaskConical, HelpCircle, ShieldAlert } from 'lucide-react';

/** Resposta curta para quem fica na dúvida entre condição e aflição, sem precisar chamar o Mestre. */
export const ExplicacaoCondicaoAflicao = () => (
  <details className="group rounded-2xl border border-white/[0.07] bg-[#0f0e15] px-4 py-3 sm:px-5" data-tour="condicoes-explicacao">
    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-gray-300 transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
      <HelpCircle size={16} className="text-[#c7a44c]" aria-hidden="true" />
      Qual a diferença entre condição e aflição?
      <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-gray-600 group-open:hidden">abrir</span>
    </summary>
    <div className="mt-4 grid gap-3 text-xs leading-relaxed text-gray-400 md:grid-cols-2">
      <section className="rounded-xl border border-red-400/15 bg-red-400/[0.04] p-4">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-red-200"><ShieldAlert size={15} aria-hidden="true" />Condição</h4>
        <p>
          Um estado que pesa no personagem agora: Amedrontado, Caído, um braço quebrado, uma crise de Sanidade.
          Tem um efeito fixo, escrito no cartão, e termina pela duração, por uma ação ou pelo tratamento indicado.
          A ficha já aplica sozinha os números que dá para calcular, como bônus, penalidades, vantagens e Movimento.
        </p>
      </section>
      <section className="rounded-xl border border-lime-300/15 bg-lime-300/[0.04] p-4">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-lime-200"><FlaskConical size={15} aria-hidden="true" />Aflição</h4>
        <p>
          Veneno, doença ou vício. Ela evolui por estágios: a cada intervalo você testa Fortitude, e o resultado
          faz o estágio subir, ficar ou descer. Quem tem Cura pode tratar, e o Antídoto encerra um veneno.
          Acaba quando chega ao estágio 0.
        </p>
      </section>
    </div>
    <p className="mt-3 text-xs leading-relaxed text-gray-500">
      Na dúvida, pergunte se o problema muda com o tempo e pede teste para melhorar. Se sim, é aflição.
      Se tem um efeito fixo até acabar, é condição. Elas podem aparecer juntas: Envenenado, na cena, é uma condição,
      mas quando o veneno é do catálogo vale o estágio da aflição no lugar dele.
    </p>
  </details>
);
