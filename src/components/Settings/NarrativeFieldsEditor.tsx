import { useMemo } from 'react';

export const EDITABLE_FIELDS_BY_TYPE: Record<string, Set<string>> = {
  classe: new Set(['titulo', 'descricao']),
  raca: new Set(['titulo', 'descricao', 'fisiologia']),
  fluxo: new Set(['essencia', 'possibilidades', 'limites']),
  magia: new Set(['descricao', 'efeito', 'efeitos_por_fluxo', 'aviso_mestre']),
  ritual: new Set(['descricao', 'efeito', 'falha', 'aviso_mestre']),
  selo: new Set(['descricao', 'efeito', 'ativacao', 'aviso_mestre']),
  encantamento: new Set(['descricao', 'efeito', 'aplicacao', 'aviso_mestre']),
  pericia: new Set(['descricao']),
  legado: new Set(['descricao']),
  condicao: new Set(['duracao', 'efeitos', 'remocao']),
  crise: new Set(['duracao', 'efeitos', 'remocao']),
};

type PathPart = string | number;

interface NarrativeField {
  path: PathPart[];
  key: string;
  value: unknown;
  context: string;
}

const LABELS: Record<string, string> = {
  titulo: 'Título',
  descricao: 'Descrição',
  fisiologia: 'Fisiologia',
  essencia: 'Essência',
  possibilidades: 'Possibilidades',
  limites: 'Limites',
  efeito: 'Efeito',
  efeitos: 'Efeitos',
  efeitos_por_fluxo: 'Efeitos por Fluxo',
  aviso_mestre: 'Aviso do mestre',
  falha: 'Falha',
  requisito: 'Requisito',
  ativacao: 'Ativação',
  aplicacao: 'Aplicação',
  duracao: 'Duração',
  remocao: 'Remoção',
};

const pathLabel = (path: PathPart[]): string => path
  .slice(0, -1)
  .map((part) => typeof part === 'number' ? `#${part + 1}` : LABELS[part] || part.replace(/_/g, ' '))
  .join(' · ');

function collectFields(
  value: unknown,
  editable: Set<string>,
  path: PathPart[] = [],
  inheritedContext = '',
): NarrativeField[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectFields(item, editable, [...path, index], inheritedContext));
  }
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const ownTitle = typeof record.titulo === 'string' ? record.titulo : '';
  const context = ownTitle || inheritedContext || pathLabel([...path, '']);
  return Object.entries(record).flatMap(([key, item]) => {
    if (editable.has(key)) return [{ path: [...path, key], key, value: item, context }];
    return collectFields(item, editable, [...path, key], context);
  });
}

function updatePath(value: unknown, path: PathPart[], replacement: unknown): unknown {
  if (!path.length) return replacement;
  const [head, ...tail] = path;
  if (Array.isArray(value)) {
    const copy = [...value];
    copy[Number(head)] = updatePath(copy[Number(head)], tail, replacement);
    return copy;
  }
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { ...record, [String(head)]: updatePath(record[String(head)], tail, replacement) };
}

interface NarrativeFieldsEditorProps {
  tipo: string;
  conteudo: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

export function NarrativeFieldsEditor({ tipo, conteudo, onChange }: NarrativeFieldsEditorProps) {
  const editable = EDITABLE_FIELDS_BY_TYPE[tipo] || new Set<string>();
  const fields = useMemo(() => {
    const collected = collectFields(conteudo, editable);
    if (editable.has('descricao') && !Object.prototype.hasOwnProperty.call(conteudo, 'descricao')) {
      collected.unshift({ path: ['descricao'], key: 'descricao', value: '', context: '' });
    }
    return collected;
  }, [conteudo, editable]);

  const change = (path: PathPart[], value: unknown) => {
    onChange(updatePath(conteudo, path, value) as Record<string, unknown>);
  };

  if (!fields.length) {
    return <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-gray-600">Este documento não possui campos narrativos editáveis.</p>;
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const id = field.path.join('-');
        const label = LABELS[field.key] || field.key.replace(/_/g, ' ');
        const context = field.context && field.context !== field.value ? field.context : pathLabel(field.path);
        if (Array.isArray(field.value) && field.value.every((item) => typeof item === 'string')) {
          return (
            <div key={id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</label>
              {context ? <p className="mb-2 text-xs text-gray-600">{context}</p> : null}
              <textarea rows={Math.min(10, Math.max(4, field.value.length + 1))} value={field.value.join('\n')} onChange={(event) => change(field.path, event.target.value.split('\n').filter((line) => line.trim()))} className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-gray-200 outline-none focus:border-primary/50" />
              <p className="mt-1 text-[10px] text-gray-700">Uma entrada por linha.</p>
            </div>
          );
        }
        if (field.value && typeof field.value === 'object' && !Array.isArray(field.value)) {
          const variants = field.value as Record<string, unknown>;
          return (
            <div key={id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
              <div className="space-y-3">{Object.entries(variants).map(([variant, text]) => <div key={variant}><label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-600">{variant}</label><textarea rows={3} value={String(text || '')} onChange={(event) => change(field.path, { ...variants, [variant]: event.target.value })} className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-gray-200 outline-none focus:border-primary/50" /></div>)}</div>
            </div>
          );
        }
        return (
          <div key={id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</label>
            {context ? <p className="mb-2 text-xs text-gray-600">{context}</p> : null}
            <textarea rows={field.key === 'titulo' || field.key === 'duracao' ? 2 : 5} value={String(field.value || '')} onChange={(event) => change(field.path, event.target.value)} maxLength={10000} className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-gray-200 outline-none focus:border-primary/50" />
          </div>
        );
      })}
    </div>
  );
}
