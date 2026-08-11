"""Fachada única de posse de item: esconde dos cogs se um jogador está em
modo "cofre" (cofre da conta na plataforma, fonte da verdade) ou "legado"
(tabela `inventario` deste bot, pra quem nunca vinculou a conta).

Por que existe: durante a integração inicial, compras e `/abrir_bau` já
depositavam no cofre do site, mas `/inventario`, `/oferecer`, `/trocar` e
`/leilao_iniciar` continuavam lendo só a tabela local. Esta fachada preserva
inventários antigos e oferece uma única leitura de posse. A compra e a revenda
direta de itens hoje pertencem exclusivamente à Loja do site.

Regra de fallback: ENTRADA pode cair pro legado, SAÍDA falha fechada:

    dar()                          -> API, depois PostgreSQL direto
                                      (core/entrega.py), depois legado
    tirar() / mover() / reservar() -> cofre; QUALQUER falha -> CofreIndisponivel

`dar()` está criando valor do nada: cair pro cofre local do Banqueiro nunca
duplica nada. `tirar()`/`mover()`/`reservar()` estão gastando posse que o
cofre da plataforma é quem sabe se existe de verdade; um fallback aqui
afirmaria posse a partir de um estoque que já se sabe desatualizado (por
exemplo, uma troca poderia encontrar uma linha antiga mesmo depois de o item
ter sido movido na ficha do site). Por isso a saída aborta o comando inteiro
em vez de arriscar duplicar ou destruir item.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from . import economia, entrega
from .platform_api import PlatformApiError


@dataclass(frozen=True)
class ItemPossuido:
    item_id: str
    titulo: str
    tipo: str
    quantidade: int
    dados: dict = field(default_factory=dict)


@dataclass(frozen=True)
class Movimento:
    de_user_id: str
    para_user_id: str
    item_id: str
    quantidade: int = 1


class InventarioErro(RuntimeError):
    """Base: qualquer cog pode capturar só esta pra tratar erro genérico."""


class ItemIndisponivel(InventarioErro):
    """O jogador não tem o item (ou não tem o bastante). Erro do usuário,
    mostrar mensagem normal, nunca cair pro legado."""


class CofreCheio(InventarioErro):
    """Destino sem espaço. Erro do usuário."""


class CofreIndisponivel(InventarioErro):
    """A plataforma não respondeu (timeout, 5xx, etc.) numa operação de
    SAÍDA. Nada foi escrito: o chamador deve abortar e pedir pra tentar de
    novo, nunca inventar um fallback."""


def _tipo_do_item(dados: dict) -> str:
    return str((dados or {}).get("tipo") or "item")


def _item_da_plataforma(bruto: dict) -> ItemPossuido:
    dados = bruto.get("dados") or {}
    return ItemPossuido(
        item_id=bruto["item_id"],
        titulo=bruto["titulo"],
        tipo=_tipo_do_item(dados),
        quantidade=int(bruto["quantidade"]),
        dados=dados,
    )


def _item_do_legado(bruto: dict) -> ItemPossuido:
    return ItemPossuido(
        item_id=bruto["item_id"],
        titulo=bruto["titulo"],
        tipo=bruto.get("tipo") or "item",
        quantidade=int(bruto["quantidade"]),
        dados={},
    )


class Inventario:
    """Uma instância por bot: `bot.inventario = Inventario(bot)` no
    `main.py`, igual a `bot.db`/`bot.platform`/`bot.catalogo`."""

    def __init__(self, bot):
        self.bot = bot

    # ── modo e leitura ──────────────────────────────────────────────────

    def modo(self, guild_id: str, user_id: str) -> str:
        """"cofre" ou "legado". Síncrono de propósito: é uma leitura direta
        no Postgres compartilhado (core/db.py::par_cofre_plataforma), não
        HTTP: não precisa ser `async`, mas os métodos que o chamam são,
        pra a interface inteira ficar uniforme."""
        if self.bot.platform is None:
            return "legado"
        par = self.bot.db.par_cofre_plataforma(guild_id, user_id)
        return "cofre" if par is not None else "legado"

    async def listar(self, guild_id: str, user_id: str) -> list[ItemPossuido]:
        if self.modo(guild_id, user_id) == "legado":
            return [_item_do_legado(linha) for linha in self.bot.db.listar_inventario(guild_id, user_id)]
        linhas = self.bot.db.listar_cofre_plataforma(guild_id, user_id) or []
        return [_item_da_plataforma(linha) for linha in linhas]

    async def contar(self, guild_id: str, user_id: str) -> int:
        if self.modo(guild_id, user_id) == "legado":
            return self.bot.db.contar_itens(guild_id, user_id)
        return self.bot.db.contar_cofre_plataforma(guild_id, user_id) or 0

    async def capacidade(self, guild_id: str, user_id: str) -> int:
        tier = self.bot.db.get_cofre_tier(guild_id, user_id)
        return economia.capacidade_do_cofre(tier)

    async def cabe(self, guild_id: str, user_id: str, quantidade: int = 1) -> bool:
        atual = await self.contar(guild_id, user_id)
        capacidade = await self.capacidade(guild_id, user_id)
        return atual + quantidade <= capacidade

    # ── escrita ─────────────────────────────────────────────────────────

    async def dar(
        self,
        guild_id: str,
        user_id: str,
        item_id: str,
        titulo: str,
        tipo: str,
        quantidade: int = 1,
        dados: Optional[dict] = None,
        *,
        motivo: str,
        chave: str,
    ) -> str:
        """Entrega item ao jogador. Devolve "cofre" ou "legado": onde
        acabou caindo, pra a mensagem pro jogador poder dizer certo."""
        if self.modo(guild_id, user_id) == "legado":
            self.bot.db.add_item(guild_id, user_id, item_id, titulo, tipo, quantidade)
            return "legado"
        destino = await entrega.entregar_no_cofre(
            self.bot,
            guild_id=guild_id,
            user_id=user_id,
            idempotencia=chave,
            motivo=motivo,
            itens=[
                {
                    "item_id": item_id,
                    "titulo": titulo,
                    "quantidade": quantidade,
                    "dados": {**(dados or {}), "tipo": tipo},
                }
            ],
        )
        if destino == entrega.COFRE:
            return "cofre"
        # Nem a API nem o banco aceitaram o cofre da conta: uma recompensa
        # nunca fica refém da plataforma, cai pro cofre local.
        self.bot.db.add_item(guild_id, user_id, item_id, titulo, tipo, quantidade)
        return "legado"

    async def tirar(
        self, guild_id: str, user_id: str, item_id: str, quantidade: int = 1, *, motivo: str, chave: str
    ) -> ItemPossuido:
        if self.modo(guild_id, user_id) == "legado":
            titulo, tipo = self._descrever_item_legado(guild_id, user_id, item_id)
            if not self.bot.db.remover_item(guild_id, user_id, item_id, quantidade):
                raise ItemIndisponivel(item_id)
            return ItemPossuido(item_id, titulo, tipo, quantidade)
        try:
            resultado = await self.bot.platform.withdraw_vault(
                discord_user_id=int(user_id),
                discord_guild_id=int(guild_id),
                idempotency_key=chave,
                reason=motivo,
                items=[{"item_id": item_id, "quantidade": quantidade}],
            )
        except PlatformApiError as exc:
            if exc.code == "quantidade_indisponivel":
                raise ItemIndisponivel(item_id) from exc
            raise CofreIndisponivel(str(exc)) from exc
        return _item_da_plataforma(resultado["itens"][0])

    async def mover(
        self,
        guild_id: str,
        movimentos: list[Movimento],
        *,
        motivo: str,
        chave: str,
        respeitar_capacidade: bool = True,
    ) -> None:
        """/oferecer (1 movimento) e /trocar (2 espelhados). Assume que
        TODOS os participantes estão vinculados (modo "cofre"): quem chama
        precisa checar isso antes (ver Fase 2.4: /trocar cruzando baú local
        com item do cofre não é atômico entre os dois estoques)."""
        if self.modo(guild_id, movimentos[0].de_user_id) == "legado":
            raise CofreIndisponivel("mover() exige participantes vinculados ao cofre da plataforma")
        try:
            await self.bot.platform.transfer_vault(
                discord_guild_id=int(guild_id),
                idempotency_key=chave,
                reason=motivo,
                moves=[
                    {
                        "de_discord_user_id": str(movimento.de_user_id),
                        "para_discord_user_id": str(movimento.para_user_id),
                        "itens": [{"item_id": movimento.item_id, "quantidade": movimento.quantidade}],
                    }
                    for movimento in movimentos
                ],
                respect_capacity=respeitar_capacidade,
            )
        except PlatformApiError as exc:
            if exc.code == "quantidade_indisponivel":
                raise ItemIndisponivel(str(exc)) from exc
            if exc.code == "cofre_cheio":
                raise CofreCheio(str(exc)) from exc
            raise CofreIndisponivel(str(exc)) from exc

    async def reservar(
        self,
        guild_id: str,
        user_id: str,
        item_id: str,
        quantidade: int = 1,
        *,
        origem: str,
        referencia: str,
        motivo: str,
        expira_em: str,
    ) -> ItemPossuido:
        """Escrow do leilão. `referencia` (ex.: `leilao:{guild}:{id}`) é a
        própria chave de idempotência: sem campo separado."""
        if self.modo(guild_id, user_id) == "legado":
            raise CofreIndisponivel("reservar() exige o jogador vinculado ao cofre da plataforma")
        try:
            resultado = await self.bot.platform.reserve_vault(
                discord_user_id=int(user_id),
                discord_guild_id=int(guild_id),
                origin=origem,
                reference=referencia,
                item_id=item_id,
                quantity=quantidade,
                reason=motivo,
                expires_at=expira_em,
            )
        except PlatformApiError as exc:
            if exc.code == "quantidade_indisponivel":
                raise ItemIndisponivel(item_id) from exc
            raise CofreIndisponivel(str(exc)) from exc
        return ItemPossuido(
            resultado["item_id"], resultado["titulo"], _tipo_do_item({}), resultado["quantidade"]
        )

    async def resolver_reserva(
        self, guild_id: str, *, origem: str, referencia: str, destino_user_id: Optional[str] = None
    ) -> str:
        """Entrega ao vencedor (`destino_user_id` informado) ou devolve ao
        dono original (omitido). Devolve o status final ("entregue" ou
        "devolvida")."""
        try:
            resultado = await self.bot.platform.resolve_vault_reservation(
                discord_guild_id=int(guild_id),
                origin=origem,
                reference=referencia,
                destination_discord_user_id=int(destino_user_id) if destino_user_id else None,
            )
        except PlatformApiError as exc:
            raise CofreIndisponivel(str(exc)) from exc
        return resultado["status"]

    # ── internos ────────────────────────────────────────────────────────

    def _descrever_item_legado(self, guild_id: str, user_id: str, item_id: str) -> tuple[str, str]:
        for linha in self.bot.db.listar_inventario(guild_id, user_id):
            if linha["item_id"] == item_id:
                return linha["titulo"], linha["tipo"]
        return item_id, "item"
