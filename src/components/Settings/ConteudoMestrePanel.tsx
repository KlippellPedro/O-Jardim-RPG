import { useCallback, useEffect, useState } from 'react';
import { BookOpenText, Clock3, Download, Library, Loader2, Store } from 'lucide-react';
import { ConteudoLorePanel } from './ConteudoLorePanel';
import { CronologiaPanel } from './CronologiaPanel';
import { CatalogoLojaPanel } from './CatalogoLojaPanel';
import { RegrasEditorPanel } from './RegrasEditorPanel';
import { conteudoEditorialApi } from '../../services/conteudoEditorialApi';

type AbaConteudo = 'lore' | 'cronologia' | 'loja' | 'regras';

interface ConteudoMestrePanelProps {
  campanhaId: string;
  initialAba?: AbaConteudo;
  initialItem?: string;
  onDirtyChange?: (dirty: boolean) => void;
}

export function ConteudoMestrePanel({ campanhaId, initialAba = 'lore', initialItem, onDirtyChange }: ConteudoMestrePanelProps) {
  const [aba, setAba] = useState<AbaConteudo>(initialAba);
  const [dirtyAtual, setDirtyAtual] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => setAba(initialAba), [initialAba]);
  useEffect(() => {
    onDirtyChange?.(dirtyAtual);
    return () => onDirtyChange?.(false);
  }, [dirtyAtual, onDirtyChange]);

  const registrarDirty = useCallback((dirty: boolean) => setDirtyAtual(dirty), []);

  const trocarAba = (next: AbaConteudo) => {
    if (next === aba) return;
    if (dirtyAtual && !window.confirm('Existem alterações não salvas nesta seção. Deseja descartá-las e trocar de aba?')) return;
    setDirtyAtual(false);
    setAba(next);
  };

  const exportar = async () => {
    setExporting(true);
    setExportMessage(null);
    try {
      const isWorld = aba === 'lore' || aba === 'cronologia';
      const snapshot = isWorld
        ? await conteudoEditorialApi.exportarPublicadosGlobais()
        : await conteudoEditorialApi.exportarPublicados(campanhaId);
      const blob = new Blob([`${JSON.stringify(snapshot, null, 2)}\n`], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      if (snapshot.formato === 'o-jardim-conteudo-global') {
        anchor.download = 'conteudo-global-publicado.json';
      } else {
        const safeName = snapshot.campanha.nome.toLocaleLowerCase('pt-BR')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'campanha';
        anchor.download = `conteudo-publicado-${safeName}-${snapshot.campanha.id}.json`;
      }
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExportMessage(`Snapshot ${isWorld ? 'global' : 'da campanha'} baixado. Antes do commit, sincronize esse arquivo com o repositório pelo comando editorial:sync.`);
    } catch (error: any) {
      setExportMessage(error?.message || 'Não foi possível exportar o conteúdo publicado.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 border-b border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div className="horizontal-scroll custom-scrollbar flex gap-3 overflow-x-auto">
          <button type="button" onClick={() => trocarAba('lore')} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-2 pb-3 text-xs font-bold uppercase tracking-widest ${aba === 'lore' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}><BookOpenText size={15} /> Lore</button>
          <button type="button" onClick={() => trocarAba('cronologia')} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-2 pb-3 text-xs font-bold uppercase tracking-widest ${aba === 'cronologia' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}><Clock3 size={15} /> Árvores e Crônicas</button>
          <button type="button" onClick={() => trocarAba('loja')} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-2 pb-3 text-xs font-bold uppercase tracking-widest ${aba === 'loja' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}><Store size={15} /> Loja</button>
          <button type="button" onClick={() => trocarAba('regras')} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-2 pb-3 text-xs font-bold uppercase tracking-widest ${aba === 'regras' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}><Library size={15} /> Regras</button>
        </div>
        <button type="button" onClick={() => void exportar()} disabled={exporting} className="mb-2 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-gray-300 hover:border-primary/30 hover:text-primary disabled:opacity-50">
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Exportar publicados
        </button>
      </div>
      {exportMessage && <div role="status" className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-gray-300">{exportMessage}</div>}
      {(aba === 'lore' || aba === 'cronologia') && <div className="mb-4 rounded-xl border border-primary/20 bg-primary/[0.05] px-4 py-3 text-xs leading-5 text-gray-300">Esta seção é global. Tudo que for publicado ou excluído aqui vale para todas as campanhas.</div>}
      {aba === 'lore' && <ConteudoLorePanel onDirtyChange={registrarDirty} />}
      {aba === 'cronologia' && <CronologiaPanel onDirtyChange={registrarDirty} />}
      {aba === 'loja' && <CatalogoLojaPanel campanhaId={campanhaId} onDirtyChange={registrarDirty} />}
      {aba === 'regras' && <RegrasEditorPanel campanhaId={campanhaId} initialItem={initialItem} onDirtyChange={registrarDirty} />}
    </div>
  );
}
