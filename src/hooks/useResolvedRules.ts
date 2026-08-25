import { useEffect, useMemo, useState } from 'react';
import { REGRAS_OFICIAIS, type RegrasCatalog, type RegraTopic } from '../../data/regras/regras';
import { CONDICOES_OFICIAIS, CRISES_SANIDADE, type ICondicaoRegra } from '../../data/regras/condicoes';
import { CLASSES_CATALOGO, LEGADOS_CATALOGO, PERICIAS_CATALOGO, RACAS_CATALOGO } from '../services/catalogoService';
import { conteudoEditorialApi } from '../services/conteudoEditorialApi';
import {
  ENCANTAMENTOS_CATALOGO,
  FLUXOS_CATALOGO,
  MAGIAS_CATALOGO,
  RITUAIS_CATALOGO,
  SELOS_CATALOGO,
  type IEncantamentoCatalogo,
  type IFluxoMagico,
  type IMagiaCatalogo,
  type IRitualCatalogo,
  type ISeloCatalogo,
} from '../services/magiaService';
import type { IClasse, IPericiaCatalogo, IRaca } from '../types/catalogo';

export type LegadoCatalogo = Record<string, unknown> & { id: string; titulo: string; descricao: string };

export interface ResolvedRulesCatalog {
  regras: RegrasCatalog;
  titulos: Record<string, string>;
  classes: IClasse[];
  racas: IRaca[];
  fluxos: IFluxoMagico[];
  magias: IMagiaCatalogo[];
  rituais: IRitualCatalogo[];
  selos: ISeloCatalogo[];
  encantamentos: IEncantamentoCatalogo[];
  pericias: IPericiaCatalogo[];
  legados: LegadoCatalogo[];
  condicoes: ICondicaoRegra[];
  crises: ICondicaoRegra[];
  carregando: boolean;
}

function aplicarDocumento<T extends { id: string; titulo: string }>(
  catalogo: Map<string, T>,
  document: { id: string; titulo: string; conteudo: Record<string, unknown> },
) {
  const base = catalogo.get(document.id);
  if (base) catalogo.set(document.id, { ...base, ...document.conteudo, id: document.id, titulo: document.titulo } as T);
}

export function useResolvedRules(campanhaId?: string): ResolvedRulesCatalog {
  const [documents, setDocuments] = useState<Array<{
    tipo: string;
    id: string;
    titulo: string;
    conteudo: Record<string, unknown>;
  }> | null>(null);
  const [loading, setLoading] = useState(Boolean(campanhaId));

  useEffect(() => {
    if (!campanhaId) {
      setDocuments(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    conteudoEditorialApi.carregarRegrasResolvidas(campanhaId, controller.signal)
      .then((response) => setDocuments(response.entradas || []))
      .catch((error: any) => {
        if (error?.name !== 'AbortError') setDocuments(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [campanhaId]);

  return useMemo(() => {
    const regras: RegrasCatalog = { ...REGRAS_OFICIAIS };
    const titulos: Record<string, string> = {};
    const classes = new Map(CLASSES_CATALOGO.map((item) => [item.id, item]));
    const racas = new Map(RACAS_CATALOGO.map((item) => [item.id, item]));
    const fluxos = new Map(FLUXOS_CATALOGO.map((item) => [item.id, item]));
    const magias = new Map(MAGIAS_CATALOGO.map((item) => [item.id, item]));
    const rituais = new Map(RITUAIS_CATALOGO.map((item) => [item.id, item]));
    const selos = new Map(SELOS_CATALOGO.map((item) => [item.id, item]));
    const encantamentos = new Map(ENCANTAMENTOS_CATALOGO.map((item) => [item.id, item]));
    const pericias = new Map(PERICIAS_CATALOGO.map((item) => [item.id, item]));
    const legados = new Map((LEGADOS_CATALOGO as LegadoCatalogo[]).map((item) => [item.id, item]));
    const condicoes = new Map(CONDICOES_OFICIAIS.map((item) => [item.id, item]));
    const crises = new Map(CRISES_SANIDADE.map((item) => [item.id, item]));
    (documents || []).forEach((document) => {
      if (!document?.id || !document.conteudo || typeof document.conteudo !== 'object') return;
      if (document.tipo === 'regra') {
        regras[document.id] = document.conteudo as unknown as RegraTopic;
        titulos[document.id] = document.titulo;
      } else if (document.tipo === 'classe') {
        aplicarDocumento(classes, document);
      } else if (document.tipo === 'raca') {
        aplicarDocumento(racas, document);
      } else if (document.tipo === 'fluxo') {
        aplicarDocumento(fluxos, document);
      } else if (document.tipo === 'magia') {
        aplicarDocumento(magias, document);
      } else if (document.tipo === 'ritual') {
        aplicarDocumento(rituais, document);
      } else if (document.tipo === 'selo') {
        aplicarDocumento(selos, document);
      } else if (document.tipo === 'encantamento') {
        aplicarDocumento(encantamentos, document);
      } else if (document.tipo === 'pericia') {
        aplicarDocumento(pericias, document);
      } else if (document.tipo === 'legado') {
        aplicarDocumento(legados, document);
      } else if (document.tipo === 'condicao') {
        aplicarDocumento(condicoes, document);
      } else if (document.tipo === 'crise') {
        aplicarDocumento(crises, document);
      }
    });
    return {
      regras,
      titulos,
      classes: Array.from(classes.values()),
      racas: Array.from(racas.values()),
      fluxos: Array.from(fluxos.values()),
      magias: Array.from(magias.values()),
      rituais: Array.from(rituais.values()),
      selos: Array.from(selos.values()),
      encantamentos: Array.from(encantamentos.values()),
      pericias: Array.from(pericias.values()),
      legados: Array.from(legados.values()),
      condicoes: Array.from(condicoes.values()),
      crises: Array.from(crises.values()),
      carregando: loading,
    };
  }, [documents, loading]);
}
