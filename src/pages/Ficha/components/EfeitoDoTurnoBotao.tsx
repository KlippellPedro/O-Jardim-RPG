import { useEffect, useState } from 'react';
import { Dices } from 'lucide-react';
import { carregarCatalogo } from '../../../services/catalogoService';
import type { ICatalogo } from '../../../types/catalogo';
import { registrosApi } from '../../../services/registrosApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { obterStatusFicha } from '../../../services/statusService';
import { calcularVidaDaFicha } from '../../../services/vidaDaFichaService';
import { aplicarEfeitoNaVida, efeitoDoTurnoDaCondicao, resolverDanoDoTurno } from '../../../services/efeitosDoTurnoService';
import { avisar, avisarErro } from '../../../components/avisos/avisos';

interface IProps {
  condicao: unknown;
  character: any;
  onUpdate: (path: string[], value: unknown) => void;
}

/**
 * Botão das condições que cobram ou dão Vida a cada turno (Sangramento, Queimando, Envenenado, Revigorado).
 * Rola no servidor, desconta a Resistência da ficha e aplica na Vida, com aviso e Desfazer.
 * Não renderiza nada para as condições que não têm efeito por turno.
 */
export const EfeitoDoTurnoBotao = ({ condicao, character, onUpdate }: IProps) => {
  const efeito = efeitoDoTurnoDaCondicao(condicao);
  const campanhaId = useAuthStore((estado) => estado.campanhaAtiva?.id);
  const [catalogo, setCatalogo] = useState<ICatalogo | null>(null);
  const [rolando, setRolando] = useState(false);

  useEffect(() => {
    if (efeito) carregarCatalogo().then(setCatalogo);
  }, [Boolean(efeito)]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!efeito) return null;

  const rolar = async () => {
    if (!campanhaId) {
      avisar.aviso('Nenhuma campanha ativa. Selecione uma campanha para rolar dados.');
      return;
    }
    setRolando(true);
    try {
      const { registro } = await registrosApi.rolar({
        campanhaId,
        personagemId: character.id,
        titulo: `${efeito.rotulo}: ${efeito.tipo === 'dano' ? 'dano' : 'cura'} do turno`,
        formula: efeito.formula,
        origem: { tipo: 'condicao', condicao: efeito.rotulo },
      });
      const rolado = Math.max(0, Math.trunc(Number(registro.resultado) || 0));
      const statusAntes = obterStatusFicha(character.ficha);
      const { maxVida, constituicao } = calcularVidaDaFicha(character, catalogo);
      const resolvido = efeito.tipo === 'dano'
        ? resolverDanoDoTurno(rolado, character.ficha?.resistencias, efeito.resistenciaId)
        : { final: rolado, reduzido: 0, imune: false };

      onUpdate(['ficha', 'status'], aplicarEfeitoNaVida(statusAntes, efeito.tipo, resolvido.final, maxVida, constituicao));

      const base = `${efeito.rotulo}: ${efeito.formula} deu ${rolado}.`;
      const texto = efeito.tipo === 'cura'
        ? `${base} Você recuperou ${resolvido.final} de Vida.`
        : resolvido.imune
          ? `${base} Você é imune a ${efeito.tipoDeDano}, então nenhuma Vida foi perdida.`
          : resolvido.reduzido > 0 && resolvido.final === 0
            ? `${base} A Resistência a ${efeito.tipoDeDano} segurou tudo, nenhuma Vida perdida.`
            : resolvido.reduzido > 0
            ? `${base} A Resistência a ${efeito.tipoDeDano} tirou ${resolvido.reduzido}. Você perdeu ${resolvido.final} de Vida.`
            : `${base} Você perdeu ${resolvido.final} de Vida.`;
      avisar.info(texto, {
        titulo: efeito.tipo === 'dano' ? 'Dano do turno' : 'Cura do turno',
        chave: `efeito-turno:${efeito.rotulo}`,
        acao: { rotulo: 'Desfazer', aoClicar: () => onUpdate(['ficha', 'status'], statusAntes) },
      });
    } catch (erro: any) {
      avisarErro(erro, 'Falha ao rolar o efeito do turno.');
    } finally {
      setRolando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={rolar}
      disabled={rolando}
      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-1.5 text-[11px] font-bold text-red-200 transition-colors hover:bg-red-400/20 disabled:cursor-wait disabled:opacity-50"
    >
      <Dices size={13} aria-hidden="true" />
      {rolando ? 'Rolando...' : efeito.tipo === 'dano' ? `Rolar dano do turno (${efeito.formula})` : `Rolar cura do turno (${efeito.formula})`}
    </button>
  );
};
