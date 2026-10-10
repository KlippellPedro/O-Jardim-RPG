"""Contrato com a API do Discord: limites que só estouram em produção.

Nenhum destes testes fala com o Discord. Eles serializam a árvore de comandos
exatamente como o `tree.sync()` enviaria e conferem os limites documentados
(100 comandos, 25 subcomandos por grupo, 100 caracteres em descrições e custom_id,
25 opções/escolhas, 8000 caracteres por comando), além de montar os modais e
conferir que cada botão persistente é reconhecido por UM template só."""

from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path

import discord

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
            return [c.to_dict(bot.tree) for c in bot.tree.get_commands()], list(bot.tree.get_commands())
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
    comandos, _ = _arvore()
    assert len(comandos) <= 100
    nomes = [c["name"] for c in comandos]
    assert len(nomes) == len(set(nomes)), "comando duplicado no nível raiz"

    def conferir(cmd, caminho):
        assert NOME_VALIDO.match(cmd["name"]) and cmd["name"] == cmd["name"].lower(), f"{caminho}: nome inválido"
        assert 1 <= len(cmd["description"]) <= 100, f"{caminho}: descrição com {len(cmd['description'])} caracteres"
        opcoes = cmd.get("options", [])
        assert len(opcoes) <= 25, f"{caminho}: {len(opcoes)} opções"
        obrigatorias_depois = False
        for op in opcoes:
            if op["type"] in (1, 2):  # subcomando / grupo
                conferir(op, f"{caminho} {op['name']}")
                continue
            assert NOME_VALIDO.match(op["name"]), f"{caminho}: opção '{op['name']}' inválida"
            assert 1 <= len(op["description"]) <= 100, f"{caminho} {op['name']}: descrição com {len(op['description'])}"
            assert len(op.get("choices", [])) <= 25, f"{caminho} {op['name']}: escolhas demais"
            for escolha in op.get("choices", []):
                assert len(str(escolha["name"])) <= 100, f"{caminho} {op['name']}: rótulo de escolha longo"
            if op.get("required"):
                assert not obrigatorias_depois, f"{caminho}: opção obrigatória depois de opcional"
            else:
                obrigatorias_depois = True

    for cmd in comandos:
        conferir(cmd, cmd["name"])
        assert _tamanho(cmd) <= 8000, f"/{cmd['name']} passa de 8000 caracteres"


def test_cada_grupo_tem_no_maximo_25_subcomandos_e_sobra_vaga_no_jornal():
    comandos, _ = _arvore()
    jornal = next(c for c in comandos if c["name"] == "jornal")
    assert len(jornal["options"]) <= 25
    # O /jornal está quase cheio: este aviso força uma decisão antes de passar do limite.
    assert len(jornal["options"]) < 25, "o grupo /jornal chegou ao limite de 25: o próximo subcomando precisa de outro grupo"


# ── botões persistentes ─────────────────────────────────────────────────────
def _templates():
    from cogs.classificados import RESPONDER_TEMPLATE
    from cogs.entrevista import PUBLICAR_TEMPLATE, REFAZER_TEMPLATE
    from cogs.furos import DESMENTIR_TEMPLATE, SUBORNAR_TEMPLATE

    return {
        "classificado": RESPONDER_TEMPLATE, "furo_subornar": SUBORNAR_TEMPLATE, "furo_desmentir": DESMENTIR_TEMPLATE,
        "entrevista_ok": PUBLICAR_TEMPLATE, "entrevista_refazer": REFAZER_TEMPLATE,
    }


def test_templates_de_botao_persistente_nao_se_sobrepoem_nem_com_os_dos_baus():
    from cogs.baus import BAU_ABRIR_TEMPLATE, BAU_ENIGMA_TEMPLATE

    todos = {**_templates(), "bau_abrir": BAU_ABRIR_TEMPLATE, "bau_enigma": BAU_ENIGMA_TEMPLATE}
    amostras = {
        "classificado": "classificado_resp:123",
        "furo_subornar": "furo_subornar:9",
        "furo_desmentir": "furo_desmentir:9",
        "bau_abrir": "bau_abrir:" + "a" * 32,
        "bau_enigma": "bau_enigma:" + "b" * 32,
        "entrevista_ok": "entrevista_ok:15",
        "entrevista_refazer": "entrevista_refazer:15",
    }
    for nome, amostra in amostras.items():
        casam = [outro for outro, modelo in todos.items() if re.fullmatch(modelo, amostra)]
        assert casam == [nome], f"{amostra} casa com {casam}"
        assert len(amostra) <= 100
    # ids enormes ainda cabem em 100 caracteres
    assert len("classificado_resp:" + "9" * 19) <= 100


def test_registro_de_itens_dinamicos_cobre_todos_os_templates():
    async def verificar():
        bot = await _bot_carregado(novo_db())
        try:
            registrados = {padrao.pattern for padrao in bot._connection._view_store._dynamic_items}
            for nome, modelo in _templates().items():
                assert modelo in registrados, f"template de {nome} não registrado no bot"
        finally:
            await bot.close()

    _rodar(verificar())


# ── modais ──────────────────────────────────────────────────────────────────
def _confere_modal(modal: discord.ui.Modal):
    assert len(modal.title) <= 45
    componentes = modal.to_components()
    assert 1 <= len(componentes) <= 5
    for comp in componentes:
        # Label (tipo 18) guarda o rótulo e o componente filho
        if comp.get("type") == 18:
            assert len(comp["label"]) <= 45, f"rótulo '{comp['label']}' passa de 45"
            filho = comp["component"]
            assert len(filho.get("custom_id", "")) <= 100
            assert len(filho.get("placeholder", "")) <= 150
            if filho["type"] == 3:
                assert len(filho["options"]) <= 25
        else:
            for filho in comp.get("components", []):
                assert len(filho.get("label", "")) <= 45
    return componentes


def test_modais_novos_montam_e_respeitam_limites():
    from cogs.classificados import ModalResponder
    from cogs.painel import ModalClassificado, ModalFuro

    async def noop(*_a, **_k):
        return None

    class _Cog:
        pass

    _confere_modal(ModalClassificado(noop))
    _confere_modal(ModalFuro(noop))
    _confere_modal(ModalResponder(_Cog(), 1))


def test_seletor_de_categoria_do_modal_tem_todas_as_categorias_e_vem_com_padrao():
    from cogs.painel import ModalClassificado
    from core.db import CLASSIFICADO_CATEGORIAS

    async def noop(*_a, **_k):
        return None

    modal = ModalClassificado(noop)
    opcoes = {o.value: o for o in modal.categoria.options}
    assert set(opcoes) == set(CLASSIFICADO_CATEGORIAS)
    assert [v for v, o in opcoes.items() if o.default] == ["outros"]


# ── embeds ──────────────────────────────────────────────────────────────────
def test_pior_caso_da_edicao_semanal_cabe_nos_limites_de_embed():
    from core.edicao import montar_edicao

    longo = "palavra " * 200
    dados = {
        "estacao": "primavera", "clima": "inflacao_loja", "horoscopo": "ignis",
        "cacadores": [{"user_id": "9" * 19, "baus": 999} for _ in range(3)],
        "procurados": [{"alvo_user_id": "9" * 19, "valor": 2_000_000_000, "tem_sistema": True} for _ in range(3)],
        "furos": [{"texto_fofoca": longo, "user_id": "1"} for _ in range(5)],
        "classificados": [{"categoria": "servico", "texto": longo} for _ in range(3)],
        "entrevista": {"user_id": "9" * 19, "pergunta": longo, "resposta": longo},
        "meta": {"titulo": longo, "arrecadado": 10**9, "alvo": 10**9},
        "loteria": {"vencedor_user_id": "9" * 19, "premio": 10**9, "participantes": 999},
        "eventos": [{"titulo": longo, "tipo": "festival"} for _ in range(5)],
        "resumo": {"baus": 10**6, "vencedores_baus": 10**6, "desafios": 10**6, "entrevistas": 10**6,
                   "entradas": 10**12, "saidas": 10**12, "jogadores": 10**6},
    }
    emb = montar_edicao(dados)
    assert len(emb) <= 6000, f"embed com {len(emb)} caracteres"
    assert len(emb.fields) <= 25 and all(len(c.value) <= 1024 and len(c.name) <= 256 for c in emb.fields)


def test_cartaz_do_classificado_e_do_mural_cabem_nos_limites():
    from cogs.classificados import embed_classificado
    from cogs.mural import montar_mural
    from datetime import datetime, timezone

    cartaz = embed_classificado(
        {"texto": "x" * 3000, "user_id": "9" * 19, "valor": 2_000_000_000, "categoria": "procuro_grupo",
         "expira_em": datetime.now(timezone.utc)},
        respostas=999,
    )
    assert len(cartaz) <= 6000 and len(cartaz.description) <= 4096
    mural = montar_mural([{"alvo_user_id": "9" * 19, "valor": 2_000_000_000, "tem_sistema": True}] * 10)
    assert len(mural.description) <= 4096
