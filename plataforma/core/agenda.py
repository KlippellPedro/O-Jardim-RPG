"""Agenda da campanha: sessão fixa semanal, cancelamentos e sessões especiais.

Sem banco nem HTTP. O Mestre define um dia e uma hora fixos ("toda sexta, às
18:00") uma vez só; depois só mexe quando algo foge do normal: cancela uma
semana ou marca uma sessão especial. O fuso é o do grupo, e a hora fixa vale
nesse fuso o ano todo, mesmo que o horário de verão mude o deslocamento.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

FUSO_PADRAO = "America/Sao_Paulo"
DIAS_DA_SEMANA = ("segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo")
MAX_ESPECIAIS = 30
MAX_CANCELADOS = 120
#: Sessão que já começou há pouco ainda conta como "a próxima" (mostra "É agora!").
TOLERANCIA_EM_ANDAMENTO = timedelta(hours=3)


class ErroAgenda(Exception):
    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def fuso_valido(nome: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(nome or FUSO_PADRAO)
    except (ZoneInfoNotFoundError, ValueError, KeyError):
        raise ErroAgenda("fuso horario desconhecido") from None


def _hora(valor) -> time:
    texto = str(valor or "").strip()
    try:
        partes = texto.split(":")
        if len(partes) != 2:
            raise ValueError
        hora, minuto = int(partes[0]), int(partes[1])
        return time(hora, minuto)
    except ValueError:
        raise ErroAgenda("a hora precisa estar no formato HH:MM") from None


def _texto(valor, limite: int) -> str:
    return " ".join(str(valor or "").split())[:limite]


def normalizar_recorrencia(dados) -> dict:
    """Valida a sessão fixa. `{}` (ou `ativa` falso) significa "sem sessão fixa"."""
    if not isinstance(dados, dict):
        raise ErroAgenda("dados invalidos")
    if not dados.get("ativa"):
        return {}
    dia = dados.get("dia_semana")
    if isinstance(dia, bool) or not isinstance(dia, int) or not 0 <= dia <= 6:
        raise ErroAgenda("dia da semana vai de 0 (segunda) a 6 (domingo)")
    hora = _hora(dados.get("hora"))
    fuso = dados.get("fuso") or FUSO_PADRAO
    fuso_valido(fuso)
    return {
        "ativa": True,
        "dia_semana": dia,
        "hora": hora.strftime("%H:%M"),
        "fuso": fuso,
        "titulo": _texto(dados.get("titulo"), 120),
        "nota": _texto(dados.get("nota"), 600),
    }


def normalizar_especial(dados, agora: datetime | None = None) -> dict:
    if not isinstance(dados, dict):
        raise ErroAgenda("dados invalidos")
    em = dados.get("em")
    if isinstance(em, str):
        try:
            em = datetime.fromisoformat(em.replace("Z", "+00:00"))
        except ValueError:
            raise ErroAgenda("data e hora invalidas") from None
    if not isinstance(em, datetime):
        raise ErroAgenda("informe a data e a hora da sessao")
    if em.tzinfo is None:
        em = em.replace(tzinfo=timezone.utc)
    return {
        "id": str(dados.get("id") or uuid4().hex[:10]),
        "em": em.astimezone(timezone.utc).isoformat(),
        "titulo": _texto(dados.get("titulo"), 120),
        "nota": _texto(dados.get("nota"), 600),
    }


def normalizar_data(valor) -> str:
    try:
        return date.fromisoformat(str(valor)).isoformat()
    except ValueError:
        raise ErroAgenda("data invalida (use AAAA-MM-DD)") from None


def _instante(dia: date, hora: time, fuso: ZoneInfo) -> datetime:
    return datetime.combine(dia, hora, tzinfo=fuso).astimezone(timezone.utc)


def _iso_para_datetime(valor) -> datetime | None:
    try:
        instante = datetime.fromisoformat(str(valor).replace("Z", "+00:00"))
    except ValueError:
        return None
    return instante if instante.tzinfo else instante.replace(tzinfo=timezone.utc)


def ocorrencias(agenda: dict, inicio: datetime, fim: datetime) -> list[dict]:
    """Todas as sessões entre `inicio` e `fim` (UTC), fixas e especiais, em ordem.

    Uma sessão fixa cancelada continua na lista com `cancelada: True`, para o
    calendário poder mostrar riscada e o Mestre poder restaurar.
    """
    resultado: list[dict] = []
    recorrencia = agenda.get("recorrencia") or {}
    cancelados = set(agenda.get("cancelados") or [])
    if recorrencia.get("ativa"):
        fuso = fuso_valido(recorrencia.get("fuso"))
        hora = _hora(recorrencia["hora"])
        dia = inicio.astimezone(fuso).date() - timedelta(days=1)
        ultimo = fim.astimezone(fuso).date() + timedelta(days=1)
        while dia <= ultimo:
            if dia.weekday() == recorrencia["dia_semana"]:
                instante = _instante(dia, hora, fuso)
                if inicio <= instante <= fim:
                    resultado.append({
                        "em": instante.isoformat(),
                        "data": dia.isoformat(),
                        "tipo": "fixa",
                        "id": None,
                        "titulo": recorrencia.get("titulo", ""),
                        "nota": recorrencia.get("nota", ""),
                        "cancelada": dia.isoformat() in cancelados,
                    })
            dia += timedelta(days=1)
    fuso_do_grupo = fuso_valido((recorrencia or {}).get("fuso"))
    for especial in agenda.get("especiais") or []:
        instante = _iso_para_datetime(especial.get("em"))
        if instante and inicio <= instante <= fim:
            resultado.append({
                "em": instante.isoformat(),
                "data": instante.astimezone(fuso_do_grupo).date().isoformat(),
                "tipo": "especial",
                "id": especial.get("id"),
                "titulo": especial.get("titulo", ""),
                "nota": especial.get("nota", ""),
                "cancelada": False,
            })
    resultado.sort(key=lambda item: item["em"])
    return resultado


def proxima_ocorrencia(agenda: dict, agora: datetime | None = None) -> dict | None:
    """A próxima sessão que vai acontecer (ignora as canceladas)."""
    agora = agora or datetime.now(timezone.utc)
    for item in ocorrencias(agenda, agora - TOLERANCIA_EM_ANDAMENTO, agora + timedelta(days=400)):
        if not item["cancelada"]:
            return item
    return None


def texto_da_recorrencia(recorrencia: dict) -> str:
    """"Toda sexta, às 18:00", ou string vazia sem sessão fixa."""
    if not recorrencia or not recorrencia.get("ativa"):
        return ""
    dia = DIAS_DA_SEMANA[recorrencia["dia_semana"]]
    artigo = "Todo" if dia in ("sábado", "domingo") else "Toda"
    return f"{artigo} {dia}, às {recorrencia['hora']}"


def dia_por_extenso(data_iso: str) -> str:
    dia = date.fromisoformat(data_iso)
    return f"{DIAS_DA_SEMANA[dia.weekday()]} ({dia.strftime('%d/%m')})"
