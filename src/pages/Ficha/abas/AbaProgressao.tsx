import { useMemo, useState } from 'react';
import { BookOpen, Crown, LockKeyhole, Sparkles, Swords, Users, Wrench } from 'lucide-react';
import { LEGADOS_CATALOGO, RACAS_CATALOGO, CLASSES_CATALOGO } from '../../../services/catalogoService';
import { ATRIBUTOS, capacidadeModificacoesRaciais } from '../../../services/calculoService';
import { NOMES_ATRIBUTOS } from '../components/AtributosSection';
import { useAuthStore } from '../../../store/useAuthStore';
import { ProgressaoClasses } from '../components/ProgressaoClasses';
import { FormulaIngredients } from '../../../components/materials/FormulaIngredients';
import { CookingIngredients } from '../../../components/materials/CookingIngredients';
import {
  avaliarLegado,
  caracteristicasRaciaisAutomaticas,
  classesDaFicha,
  descreverPreRequisitos,
  escolhasHabilidadeDisponiveis,
  eventosDesbloqueados,
  habilidadesAutomaticas,
  legadosSelecionados,
  podeEscolherOpcaoHabilidade,
  podeSelecionarPoder,
  poderesSelecionados,
  resumoFichaTecnica,
  selecoesHabilidadeValidas,
  selecoesPoderValidas,
  vagasLegado,
  vagasPoderDaClasse,
  type ILegadoCatalogo,
} from '../../../services/progressaoFichaService';

const Card = ({ titulo, origem, descricao, detalhe }: { titulo: string; origem: string; descricao: string; detalhe?: string }) => (
  <article className="rounded-xl border border-white/10 bg-[#111017] p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <h4 className="font-bold text-white">{titulo}</h4>
      <span className="rounded-full border border-[#c7a44c]/25 bg-[#c7a44c]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c7a44c]">{origem}</span>
    </div>
    {detalhe && <p className="mt-2 text-xs font-bold text-emerald-300">{detalhe}</p>}
    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-400">{descricao}</p>
  </article>
);

const Secao = ({ titulo, icone, children }: { titulo: string; icone: React.ReactNode; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-white/5 bg-[#0f0e15] p-5 md:p-6">
    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">{icone}{titulo}</h3>
    {children}
  </section>
);

export const AbaProgressao = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const [buscaLegado, setBuscaLegado] = useState('');
  const ficha = character.ficha || {};
  const usuario = useAuthStore((state) => state.usuario);
  const campanha = useAuthStore((state) => state.campanhaAtiva);
  const isMestre = usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador' || campanha?.papel === 'mestre' || campanha?.papel === 'assistente';
  const classes = classesDaFicha(ficha);
  // ProgressaoClasses quer os slots crus ({classeId, nivel}), não os já
  // resolvidos de classesDaFicha - mesmo fallback de AbaFicha.tsx pra ficha
  // legada sem `classes` (só o `classeId` antigo).
  const classeSlots: { classeId: string; nivel: number }[] = ficha.classes?.length
    ? ficha.classes
    : (ficha.classeId ? [{ classeId: ficha.classeId, nivel: ficha.nivel || 1 }] : []);
  const selecoesPoder = selecoesPoderValidas(ficha);
  const idsLegados: string[] = Array.isArray(ficha.legadosSelecionados) ? ficha.legadosSelecionados : [];
  const tracos = caracteristicasRaciaisAutomaticas(ficha);
  const raca = RACAS_CATALOGO.find((item) => item.id === ficha.racaId);
  const escolhaRacial = ficha.escolhaRacial || {};
  // As opções escolhidas aparecem como cartões próprios na aba Habilidades;
  // aqui já existe a grade interativa delas logo abaixo, então evitamos repetir.
  const habilidades = habilidadesAutomaticas(ficha).filter((item) => item.subtipo !== 'escolha');
  const escolhasHabilidade = escolhasHabilidadeDisponiveis(ficha);
  const eventos = eventosDesbloqueados(ficha);
  const poderes = poderesSelecionados(ficha);
  const legados = legadosSelecionados(ficha);
  const vagasLegados = vagasLegado(ficha);

  const catalogoLegados = useMemo(() => {
    const termo = buscaLegado.trim().toLocaleLowerCase('pt-BR');
    return (LEGADOS_CATALOGO as ILegadoCatalogo[]).filter((item) => !termo
      || item.titulo.toLocaleLowerCase('pt-BR').includes(termo)
      || item.descricao.toLocaleLowerCase('pt-BR').includes(termo));
  }, [buscaLegado]);

  const adicionarPoder = (classeId: string, poderId: string) => {
    if (!window.confirm('A escolha de um poder de classe é permanente para jogadores. Confirmar?')) return;
    onUpdate(['ficha', 'poderesClasseSelecionados'], [...selecoesPoder, { classeId, poderId }]);
  };
  const removerPoder = (classeId: string, poderId: string) => {
    const indice = selecoesPoder.findIndex((item) => item.classeId === classeId && item.poderId === poderId);
    onUpdate(['ficha', 'poderesClasseSelecionados'], selecoesPoder.filter((_, atual) => atual !== indice));
  };
  const escolherOpcaoHabilidade = (chave: string, opcaoId: string) => {
    const atuais = selecoesHabilidadeValidas(ficha);
    onUpdate(['ficha', 'escolhasHabilidade'], { ...atuais, [chave]: [...(atuais[chave] || []), opcaoId] });
  };
  const removerOpcaoHabilidade = (chave: string, opcaoId: string) => {
    const atuais = selecoesHabilidadeValidas(ficha);
    const lista = [...(atuais[chave] || [])];
    const indice = lista.indexOf(opcaoId);
    if (indice >= 0) lista.splice(indice, 1);
    onUpdate(['ficha', 'escolhasHabilidade'], { ...atuais, [chave]: lista });
  };
  const adicionarLegado = (id: string) => {
    if (!window.confirm('A escolha de um Legado é permanente para jogadores. Confirmar?')) return;
    onUpdate(['ficha', 'legadosSelecionados'], [...idsLegados, id]);
  };
  const removerLegado = (id: string) => {
    const indice = idsLegados.indexOf(id);
    onUpdate(['ficha', 'legadosSelecionados'], idsLegados.filter((_, atual) => atual !== indice));
  };
  const atualizarEscolhaRacial = (campo: string, ids: string[]) => onUpdate(['ficha', 'escolhaRacial'], { ...escolhaRacial, [campo]: ids });
  const alternarFragmentoConhecido = (id: string) => {
    const atuais: string[] = escolhaRacial.fragmentosConhecidosIds || [];
    const maximo = Math.max(0, Number(raca?.fragmentos_config?.conhecidos_maximo) || 0);
    if (atuais.includes(id)) {
      onUpdate(['ficha', 'escolhaRacial'], {
        ...escolhaRacial,
        fragmentosConhecidosIds: atuais.filter((item) => item !== id),
        fragmentosExpressosIds: (escolhaRacial.fragmentosExpressosIds || []).filter((item: string) => item !== id),
      });
    } else if (atuais.length < maximo) atualizarEscolhaRacial('fragmentosConhecidosIds', [...atuais, id]);
  };
  const alternarFragmentoExpresso = (id: string) => {
    const conhecidos: string[] = escolhaRacial.fragmentosConhecidosIds || [];
    const atuais: string[] = escolhaRacial.fragmentosExpressosIds || [];
    const maximo = Math.max(0, Number(raca?.fragmentos_config?.expressos) || 0);
    if (atuais.includes(id)) atualizarEscolhaRacial('fragmentosExpressosIds', atuais.filter((item) => item !== id));
    else if (conhecidos.includes(id) && atuais.length < maximo) atualizarEscolhaRacial('fragmentosExpressosIds', [...atuais, id]);
  };
  const configuracaoAtributos = raca?.escolha_atributos;
  const campoAtributos = String(configuracaoAtributos?.campo || 'atributosRaciais');
  const totalAtributos = Math.max(0, Math.trunc(Number(configuracaoAtributos?.total) || 0));
  const atributosEscolhidos: string[] = Array.isArray(escolhaRacial[campoAtributos]) ? escolhaRacial[campoAtributos] : [];
  const alternarAtributoRacial = (atributo: string) => {
    if (atributosEscolhidos.includes(atributo)) {
      atualizarEscolhaRacial(campoAtributos, atributosEscolhidos.filter((item) => item !== atributo));
    } else if (atributosEscolhidos.length < totalAtributos) {
      atualizarEscolhaRacial(campoAtributos, [...atributosEscolhidos, atributo]);
    }
  };
  const alternarModificacao = (id: string) => {
    const atuais: string[] = escolhaRacial.modificacoesIds || [];
    const maximo = capacidadeModificacoesRaciais(raca || null, Number(ficha.nivel) || 1);
    if (atuais.includes(id)) atualizarEscolhaRacial('modificacoesIds', atuais.filter((item) => item !== id));
    else if (atuais.length < maximo) atualizarEscolhaRacial('modificacoesIds', [...atuais, id]);
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/5 bg-[#0f0e15] p-6">
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Progressão</h2>
        <p className="mt-1 text-sm text-gray-400">Características raciais e habilidades de classe aparecem automaticamente. Você escolhe os poderes, os Legados liberados e as opções das habilidades que têm catálogo próprio.</p>
      </header>

      <ProgressaoClasses classes={classeSlots} catalogoClasses={CLASSES_CATALOGO} />

      <Secao titulo="Características raciais" icone={<Users size={18} className="text-emerald-400" />}>
        <div className="grid gap-3 lg:grid-cols-2">
          {tracos.map((item) => <Card key={item.id} titulo={item.titulo} origem={item.origem} descricao={item.descricao} />)}
          {!tracos.length && <p className="text-sm text-gray-500">A raça atual não possui características estruturadas no catálogo.</p>}
        </div>
        {configuracaoAtributos && totalAtributos > 0 && (
          <div className="mt-5 rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
            <h4 className="font-bold text-white">{(configuracaoAtributos as any).titulo || 'Atributos Raciais'}</h4>
            <p className="mt-1 text-xs text-gray-500">
              Escolha {totalAtributos} atributo{totalAtributos === 1 ? '' : 's'} distinto{totalAtributos === 1 ? '' : 's'} para receber +{configuracaoAtributos.bonus_por_escolha || 0}. Selecionados: {atributosEscolhidos.length}/{totalAtributos}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ATRIBUTOS.map((atributo) => {
                const selecionado = atributosEscolhidos.includes(atributo);
                const cheio = !selecionado && atributosEscolhidos.length >= totalAtributos;
                return (
                  <button
                    key={atributo}
                    type="button"
                    disabled={cheio}
                    onClick={() => alternarAtributoRacial(atributo)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                      selecionado ? 'border-amber-400/50 bg-amber-400/10 text-amber-200' : 'border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    {NOMES_ATRIBUTOS[atributo]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {Array.isArray(raca?.fragmentos) && raca.fragmentos.length > 0 && (
          <div className="mt-5 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
            <h4 className="font-bold text-white">Fragmentos do Amálgamo</h4>
            <p className="mt-1 text-xs text-gray-500">Conhecidos: {(escolhaRacial.fragmentosConhecidosIds || []).length}/{raca.fragmentos_config?.conhecidos_maximo || 0}. Expressos: {(escolhaRacial.fragmentosExpressosIds || []).length}/{raca.fragmentos_config?.expressos || 0}.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {raca.fragmentos.map((item: any) => {
                const conhecido = (escolhaRacial.fragmentosConhecidosIds || []).includes(item.id);
                const expresso = (escolhaRacial.fragmentosExpressosIds || []).includes(item.id);
                return <div key={item.id} className="rounded-lg border border-white/5 bg-black/20 p-3"><strong className="text-sm text-white">{item.titulo}</strong><p className="mt-1 text-xs text-gray-400">{item.descricao}</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => alternarFragmentoConhecido(item.id)} className={`rounded border px-2 py-1 text-xs font-bold ${conhecido ? 'border-emerald-500/40 text-emerald-300' : 'border-white/10 text-gray-400'}`}>{conhecido ? 'Conhecido' : 'Conhecer'}</button><button type="button" disabled={!conhecido} onClick={() => alternarFragmentoExpresso(item.id)} className={`rounded border px-2 py-1 text-xs font-bold disabled:opacity-30 ${expresso ? 'border-[#c7a44c]/40 text-[#c7a44c]' : 'border-white/10 text-gray-400'}`}>{expresso ? 'Expresso' : 'Expressar'}</button></div></div>;
              })}
            </div>
          </div>
        )}
        {Array.isArray(raca?.modificacoes) && raca.modificacoes.length > 0 && (
          <div className="mt-5 rounded-xl border border-sky-500/15 bg-sky-500/5 p-4">
            <h4 className="font-bold text-white">Modificações do Autômato</h4>
            <p className="mt-1 text-xs text-gray-500">Instaladas: {(escolhaRacial.modificacoesIds || []).length}/{capacidadeModificacoesRaciais(raca, Number(ficha.nivel) || 1)}. Modificações ativas só funcionam com as passivas e pré-requisitos descritos.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {raca.modificacoes.map((item: any) => { const instalada = (escolhaRacial.modificacoesIds || []).includes(item.id); return <div key={item.id} className="rounded-lg border border-white/5 bg-black/20 p-3"><div className="flex items-start justify-between gap-2"><strong className="text-sm text-white">{item.titulo}</strong><button type="button" onClick={() => alternarModificacao(item.id)} className={`rounded border px-2 py-1 text-xs font-bold ${instalada ? 'border-red-500/30 text-red-300' : 'border-sky-500/30 text-sky-300'}`}>{instalada ? 'Remover' : 'Instalar'}</button></div><p className="mt-1 text-xs text-gray-400">{item.descricao}</p></div>; })}
            </div>
          </div>
        )}
      </Secao>

      <Secao titulo="Habilidades de classe" icone={<BookOpen size={18} className="text-sky-400" />}>
        <div className="grid gap-3 lg:grid-cols-2">
          {habilidades.map((item) => <Card key={item.id} titulo={item.titulo} origem={item.origem} detalhe={`Estágio liberado no nível ${item.nivel}`} descricao={item.descricao} />)}
          {!habilidades.length && <p className="text-sm text-gray-500">Nenhuma habilidade de classe foi liberada.</p>}
        </div>
      </Secao>

      {escolhasHabilidade.length > 0 && (
        <Secao titulo="Escolhas de habilidade" icone={<Wrench size={18} className="text-amber-400" />}>
          <div className="space-y-4">
            {escolhasHabilidade.map((escolha) => (
              <div key={escolha.chave} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-white">{escolha.rotulo}</strong>
                  <span className="text-xs font-bold text-[#c7a44c]">{escolha.selecionadas.length}/{escolha.vagas} vagas · {escolha.classeTitulo}</span>
                </div>
                {escolha.escalonamento?.nivel ? (
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-[11px] font-bold text-sky-200">
                    {escolha.escalonamento.rotulo}: {escolha.escalonamento.nivel} de {escolha.escalonamento.teto}
                  </div>
                ) : null}
                {escolha.descricao && <p className="mb-3 text-xs leading-relaxed text-gray-500">{escolha.descricao}</p>}
                <div className="grid gap-2 md:grid-cols-2">
                  {escolha.opcoes.map((opcao) => {
                    const quantidade = escolha.selecionadas.filter((item) => item.id === opcao.id).length;
                    const avaliacao = podeEscolherOpcaoHabilidade(escolha, opcao.id);
                    return (
                      <div key={opcao.id} className={`rounded-lg border p-3 ${quantidade ? 'border-[#c7a44c]/40 bg-[#c7a44c]/5' : 'border-white/5 bg-[#121118]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <strong className="text-sm text-white">{opcao.titulo}</strong>
                            {opcao.acao && <p className="mt-1 text-xs text-gray-500">{opcao.acao}</p>}
                          </div>
                          <div className="flex gap-1">
                            {quantidade > 0 && <button type="button" onClick={() => removerOpcaoHabilidade(escolha.chave, opcao.id)} className="rounded-lg border border-red-500/30 px-2 py-1 text-xs font-bold text-red-300">Tirar</button>}
                            <button type="button" disabled={!avaliacao.permitido} title={avaliacao.motivo} onClick={() => escolherOpcaoHabilidade(escolha.chave, opcao.id)} className="rounded-lg border border-[#c7a44c]/30 px-2 py-1 text-xs font-bold text-[#c7a44c] disabled:cursor-not-allowed disabled:opacity-30">Escolher{quantidade ? ` (${quantidade})` : ''}</button>
                          </div>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-gray-400">{opcao.descricao}</p>
                        {escolha.classeId === 'alquimista' && escolha.habilidadeId === 'formulas' && (
                          <FormulaIngredients formulaId={opcao.id} compact nivelFormula={escolha.escalonamento?.nivel} />
                        )}
                        {escolha.classeId === 'cozinheiro' && escolha.habilidadeId === 'cardapio' && (
                          <CookingIngredients recipeId={opcao.id} compact recipeLevel={escolha.escalonamento?.nivel} />
                        )}
                        {opcao.escalonamento && (
                          <p className="mt-2 text-xs leading-relaxed text-sky-200/70">{opcao.escalonamento}</p>
                        )}
                        {resumoFichaTecnica({ ...opcao, acao: undefined }) && (
                          <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                            {resumoFichaTecnica({ ...opcao, acao: undefined })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Secao>
      )}

      <Secao titulo="Poderes de classe" icone={<Swords size={18} className="text-orange-400" />}>
        <div className="mb-5 grid gap-3 lg:grid-cols-2">
          {poderes.map((item) => <Card key={item.id} titulo={item.titulo} origem={item.origem} detalhe={item.custoMana ? `${item.custoMana} Mana` : 'Sem custo de Mana'} descricao={item.descricao} />)}
          {!poderes.length && <p className="text-sm text-gray-500">Use as vagas abaixo para escolher seus poderes.</p>}
        </div>
        <div className="space-y-4">
          {classes.map(({ classe, nivel }) => {
            const selecionados = selecoesPoder.filter((item) => item.classeId === classe.id);
            const vagas = vagasPoderDaClasse(classe, nivel);
            return (
              <div key={classe.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <strong className="text-white">{classe.titulo}</strong>
                  <span className="text-xs font-bold text-[#c7a44c]">{selecionados.length}/{vagas} vagas</span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {(classe.poderes || []).map((poder) => {
                    const quantidade = selecionados.filter((item) => item.poderId === poder.id).length;
                    const avaliacao = podeSelecionarPoder(poder, classe, nivel, selecoesPoder, ficha);
                    return (
                      <div key={poder.id} className="rounded-lg border border-white/5 bg-[#121118] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div><strong className="text-sm text-white">{poder.titulo}</strong><p className="mt-1 text-xs text-gray-500">{poder.custo_mana || 0} Mana</p></div>
                          <div className="flex gap-1">
                            {quantidade > 0 && isMestre && <button type="button" onClick={() => removerPoder(classe.id, poder.id)} className="rounded-lg border border-red-500/30 px-2 py-1 text-xs font-bold text-red-300">Remover</button>}
                            <button type="button" disabled={!avaliacao.permitido} title={avaliacao.motivo} onClick={() => adicionarPoder(classe.id, poder.id)} className="rounded-lg border border-[#c7a44c]/30 px-2 py-1 text-xs font-bold text-[#c7a44c] disabled:cursor-not-allowed disabled:opacity-30">Escolher{quantidade ? ` (${quantidade})` : ''}</button>
                          </div>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-gray-400">{poder.descricao}</p>
                        {resumoFichaTecnica(poder) && (
                          <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">{resumoFichaTecnica(poder)}</p>
                        )}
                        {(poder.pre_requisitos || []).length > 0 && <p className="mt-2 text-[11px] text-amber-300">Requisito: {poder.pre_requisitos?.join('; ')}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Secao>

      <Secao titulo="Eventos de classe" icone={<Sparkles size={18} className="text-fuchsia-400" />}>
        <div className="grid gap-3 lg:grid-cols-2">
          {eventos.map((item) => <Card key={item.id} titulo={item.titulo} origem={item.origem} detalhe={`Disponível desde o nível ${item.nivel}`} descricao={item.descricao} />)}
          {!eventos.length && <p className="text-sm text-gray-500">Nenhum evento foi liberado.</p>}
        </div>
      </Secao>

      <Secao titulo={`Legados de Ascensão (${idsLegados.length}/${vagasLegados})`} icone={<Crown size={18} className="text-[#c7a44c]" />}>
        <div className="mb-5 grid gap-3 lg:grid-cols-2">
          {legados.map((item, indice) => (
            <div key={`${item.id}-${indice}`} className="relative">
              <Card titulo={item.titulo} origem="Legado" descricao={item.descricao} />
              {isMestre && <button type="button" onClick={() => removerLegado(item.id)} className="absolute bottom-3 right-3 text-xs font-bold text-red-300">Remover</button>}
            </div>
          ))}
          {!legados.length && <p className="text-sm text-gray-500">O primeiro Legado é liberado no nível total 5.</p>}
        </div>
        <input value={buscaLegado} onChange={(event) => setBuscaLegado(event.target.value)} placeholder="Buscar entre os 42 Legados..." className="mb-3 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#c7a44c]/50" />
        <div className="grid max-h-[32rem] gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
          {catalogoLegados.map((legado) => {
            const avaliacao = avaliarLegado(legado, ficha, idsLegados);
            const preRequisitos = descreverPreRequisitos(legado.pre_requisitos);
            return (
              <div key={legado.id} className="rounded-lg border border-white/5 bg-[#121118] p-3">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm text-white">{legado.titulo}</strong>
                  <button type="button" disabled={!avaliacao.permitido} title={avaliacao.motivo} onClick={() => adicionarLegado(legado.id)} className="flex items-center gap-1 rounded-lg border border-[#c7a44c]/30 px-2 py-1 text-xs font-bold text-[#c7a44c] disabled:cursor-not-allowed disabled:opacity-30">
                    {!avaliacao.permitido && <LockKeyhole size={11} />} Escolher
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">{legado.descricao}</p>
                {!!preRequisitos.length && (
                  <p className="mt-2 text-[11px] text-gray-500">
                    <span className="font-bold uppercase tracking-wider">Pré-requisitos:</span> {preRequisitos.join(', ')}
                  </p>
                )}
                {!avaliacao.permitido && avaliacao.motivo !== 'Todas as vagas de Legado já foram preenchidas.' && <p className="mt-2 text-[11px] text-amber-300">{avaliacao.motivo}</p>}
              </div>
            );
          })}
        </div>
      </Secao>
    </div>
  );
};
