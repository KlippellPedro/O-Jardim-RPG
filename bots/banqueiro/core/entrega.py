"""Entrega de recompensa no cofre da conta, com rede de segurança.

Por que existe: toda recompensa (baú comprado, baú do Jornalista, `/dar` do
mestre, item de loja) ia pro cofre da conta por UMA rota — `POST
/interno/discord/cofre/depositar` na plataforma. Quando esse salto HTTP cai,
cada chamador reagia de um jeito: o Jornalista jogava no cofre local (item
some do site), `/dar` jogava na carteira, e `/abrir_bau` simplesmente falhava
— e em 5xx/timeout ainda comia o baú, que o jogador já tinha pagado.

A rede de segurança é o próprio PostgreSQL. Bot e plataforma compartilham o
mesmo banco na VLAN da Discloud (o bot já lê `cofre_itens_usuario` direto em
core/db.py), então a queda do HTTP não é queda do cofre: é só a queda de um
transporte. A ordem fica:

    1. HTTP        — caminho normal, a API arbitra e notifica;
    2. PostgreSQL  — mesma transação, mesma chave de idempotência (o
                     depósito cai no mesmo lugar e o site enxerga);
    3. cofre local — só pra quem não vinculou a conta, ou se o banco também
                     estiver fora.

O passo 2 é seguro justamente por causa da chave: se o HTTP escreveu e só a
RESPOSTA se perdeu, a escrita direta encontra o movimento já registrado e não
credita de novo (`repetido: True`).

Isto vale só pra ENTRADA. Retirar, transferir e reservar continuam exigindo a
API, que é quem arbitra posse entre dois cofres — o contrato está em
core/inventario.py.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from .platform_api import PlatformApiError

log = logging.getLogger("banqueiro")

# Onde a recompensa acabou caindo, pra mensagem ao jogador poder dizer certo.
COFRE = "cofre"
LEGADO = "legado"


async def entregar_no_cofre(
    bot,
    *,
    guild_id: str,
    user_id: str,
    idempotencia: str,
    motivo: str,
    itens: Optional[list[dict[str, Any]]] = None,
    moedas: Optional[list[dict[str, Any]]] = None,
    origem: str = "banqueiro",
) -> str:
    """Entrega no cofre da conta. Devolve COFRE ou LEGADO.

    Nunca levanta por falha de plataforma: uma recompensa já paga não fica
    refém do transporte. Quem chama decide o texto conforme o destino, mas
    não precisa mais tratar erro de rede.
    """
    itens = itens or []
    moedas = moedas or []

    if getattr(bot, "platform", None) is not None:
        try:
            await bot.platform.deposit_vault(
                discord_user_id=int(user_id),
                discord_guild_id=int(guild_id),
                idempotency_key=idempotencia,
                reason=motivo,
                items=itens,
                currencies=moedas,
            )
            return COFRE
        except PlatformApiError as exc:
            # 404 é "conta não vinculada": a escrita direta vai concluir a
            # mesma coisa (par_cofre_plataforma devolve None) e cair pro
            # legado logo abaixo, sem precisar de um ramo próprio aqui.
            log.warning(
                "entrega pela API falhou (guild=%s user=%s status=%s): %s — tentando o banco direto",
                guild_id, user_id, exc.status_code, exc,
            )

    try:
        resultado = bot.db.depositar_cofre_plataforma(
            guild_id,
            user_id,
            idempotencia=idempotencia,
            motivo=motivo,
            itens=itens,
            moedas=moedas,
            origem=origem,
        )
    except Exception:
        # Banco fora também: não sobra rota pro cofre da conta, mas a
        # recompensa ainda tem que existir em algum lugar.
        log.exception(
            "entrega direta no banco falhou (guild=%s user=%s)", guild_id, user_id
        )
        resultado = None

    return COFRE if resultado is not None else LEGADO
