import React, { useState, useSyncExternalStore } from 'react';
import { Download, Share, Smartphone } from 'lucide-react';
import { avisar } from '../avisos/avisos';
import {
  inscreverInstalacao,
  pedirInstalacao,
  situacaoDeInstalacao,
  type SituacaoDeInstalacao,
} from '../../pwa/instalacao';

const TEXTO_DA_SITUACAO: Record<SituacaoDeInstalacao, string> = {
  instalado: 'O Jardim já está instalado neste aparelho.',
  disponivel: 'Este aparelho pode instalar o Jardim agora.',
  ios: 'No iPhone e no iPad, toque em Compartilhar e depois em Adicionar à Tela de Início.',
  indisponivel: 'O navegador não ofereceu a instalação agora. No Chrome e no Edge, procure o ícone de instalar na barra de endereço. No Android, abra o menu do navegador e escolha Instalar app.',
};

/** Cartão das Preferências: o Jardim vira um ícone próprio, abre em tela cheia e carrega mais rápido. */
export const InstalarComoApp: React.FC = () => {
  const situacao = useSyncExternalStore(inscreverInstalacao, situacaoDeInstalacao, () => 'indisponivel' as SituacaoDeInstalacao);
  const [pedindo, setPedindo] = useState(false);

  const instalar = async () => {
    if (pedindo) return;
    setPedindo(true);
    try {
      if ((await pedirInstalacao()) === 'aceitou') avisar.sucesso('Instalado! Procure o ícone do Jardim na tela inicial.');
    } catch {
      avisar.erro('Não foi possível abrir a instalação agora. Tente pelo menu do navegador.');
    } finally {
      setPedindo(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6" aria-labelledby="instalar-como-app">
      <div className="mb-1 flex items-center gap-2">
        {situacao === 'ios' ? <Share className="text-primary" size={20} /> : <Smartphone className="text-primary" size={20} />}
        <h3 id="instalar-como-app" className="text-lg font-bold text-white">Instalar como app</h3>
      </div>
      <p className="mt-1 text-sm leading-6 text-gray-400">
        O Jardim ganha um ícone próprio, abre em tela cheia e carrega mais rápido. Sem internet o app abre, mas fichas e sessão precisam de conexão.
      </p>
      <p className="mt-3 text-sm leading-6 text-gray-300" role="status">{TEXTO_DA_SITUACAO[situacao]}</p>
      {situacao === 'disponivel' ? (
        <button
          type="button"
          onClick={() => void instalar()}
          disabled={pedindo}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/20 disabled:cursor-wait disabled:opacity-60"
        >
          <Download size={16} aria-hidden="true" />
          {pedindo ? 'Abrindo...' : 'Instalar o Jardim'}
        </button>
      ) : null}
    </section>
  );
};
