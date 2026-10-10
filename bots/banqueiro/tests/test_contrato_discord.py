"""Banqueiro: contrato com a API do Discord.

Nenhum destes testes fala com o Discord. Eles serializam a árvore de comandos
como o `tree.sync()` enviaria e conferem os limites documentados (100 comandos,
100 caracteres em descrições e custom_id, 25 opções/escolhas, 8000 caracteres por
comando), além de conferir o botão persistente do leilão e os embeds novos."""

from __future__ import annotations

import asyncio
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from tests.db_utils import novo_db
from tests.test_painel import _bot_carregado

NOME_VALIDO = re.compile(r"^[-_\w]{1,32}$", re.UNICODE)


def _rodar(coro):
    return asyncio.run(coro)


def _arvore():
    async def montar():
        bot = await _bot_carregado(novo_db())
        try:
            return [c.to_dict(bot.tree) for c in bot.tree.get_commands()]
        finally:
            await bot.close()

    return _rodar(montar())


def _tamanho(cmd: dict) -> int:
    total = len(cmd.get("name", "")) + len(cmd.get("description", ""))
    for op in cmd.get("options", []):
        total += _tamanho(op)
        for escolha in op.get("choices", []):
            total += len(str(escolha["name"])) + len(str(escolha["value"]))
    return total


def test_arvore_de_comandos_respeita_os_limites_do_discord():
    comandos = _arvore()
    assert len(comandos) <= 100
    nomes = [c["name"] for c in comandos]
    assert len(nomes) == len(set(nomes)), "comando duplicado no nível raiz"

    def conferir(cmd, caminho):
        assert NOME_VALIDO.match(cmd["name"]) and cmd["name"] == cmd["name"].lower(), f"{caminho}: nome inválido"
        assert 1 <= len(cmd["description"]) <= 100, f"{caminho}: descrição com {len(cmd['description'])} caracteres"
        opcoes = cmd.get("options", [])
        assert len(opcoes) <= 25, f"{caminho}: {len(opcoes)} opções"
        opcional_visto = False
        for op in opcoes:
            if op["type"] in (1, 2):
                conferir(op, f"{caminho} {op['name']}")
                continue
            assert NOME_VALIDO.match(op["name"]), f"{caminho}: opção '{op['name']}' inválida"
            assert 1 <= len(op["description"]) <= 100, f"{caminho} {op['name']}: descrição com {len(op['description'])}"
            assert len(op.get("choices", [])) <= 25, f"{caminho} {op['name']}: escolhas demais"
            if op.get("required"):
                assert not opcional_visto, f"{caminho}: opção obrigatória depois de opcional"
            else:
                opcional_visto = True

    for cmd in comandos:
        conferir(cmd, cmd["name"])
        assert _tamanho(cmd) <= 8000, f"/{cmd['name']} passa de 8000 caracteres"


def test_banqueiro_ainda_tem_vagas_de_comando():
    assert len(_arvore()) <= 97, "o Banqueiro passou de 97 comandos: aposente comandos de consulta antes de criar outro"


def test_painel_do_banco_cabe_no_select_de_25_e_com_textos_curtos():
    from cogs.painel import SECOES

    assert len(SECOES) <= 25
    assert all(len(chave) <= 100 and len(rotulo) <= 100 and len(desc) <= 100 for chave, rotulo, _e, desc, _c in SECOES)


def test_botao_de_lance_e_unico_e_registrado():
    from cogs.mercado import LEILAO_LANCE_TEMPLATE

    amostra = "leilao_lance:" + "9" * 19
    assert re.fullmatch(LEILAO_LANCE_TEMPLATE, amostra) and len(amostra) <= 100

    async def verificar():
        bot = await _bot_carregado(novo_db())
        try:
            registrados = {padrao.pattern for padrao in bot._connection._view_store._dynamic_items}
            assert LEILAO_LANCE_TEMPLATE in registrados
            assert [p for p in registrados if re.fullmatch(p, amostra)] == [LEILAO_LANCE_TEMPLATE]
        finally:
            await bot.close()

    _rodar(verificar())


def test_embed_do_leilao_da_casa_cabe_nos_limites():
    async def verificar():
        bot = await _bot_carregado(novo_db())
        try:
            mercado = bot.get_cog("Mercado")
            leilao = {
                "id": 9**9, "guild_id": "1", "vendedor_id": "jardim", "modo_posse": "casa", "kind": "item",
                "titulo": "T" * 200, "moeda": "Lunaris", "lance_atual": 2_000_000_000, "lance_minimo": 50,
                "vencedor_id": "9" * 19, "status": "ativo", "expira_em": datetime.now(timezone.utc),
            }
            emb = mercado._embed_leilao(leilao)
            assert len(emb) <= 6000 and "Casa do Jardim" in emb.description
        finally:
            await bot.close()

    _rodar(verificar())
