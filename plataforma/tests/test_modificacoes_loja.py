"""Modificações de equipamento: instalação (loja) e desinstalação (ficha).

Cobre os hard blocks de compatibilidade/slots/exclusividade na compra,
a instância com id próprio gravada em `modificacoes`, o bloqueio de venda
do último exemplar modificado, o fluxo de desinstalação em
`routers.characters.uninstall_modification`, e a regressão do
try/except que engolia o HTTPException de permissão ao instalar em
veículos compartilhados.
"""

from __future__ import annotations

import json
import os
import unittest
import uuid
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from fastapi import HTTPException

from core.database import Database
from core.dependencies import AuthenticatedUser
from routers.characters import uninstall_modification
from routers.shop import purchase_batch, sell_batch
from schemas import ShopBatchCommandInput, ShopCommandItemInput


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()

_CATALOGO_REAL = {
    e["id"]: e
    for e in json.loads(
        (Path(__file__).resolve().parents[2] / "data" / "loja" / "catalogo.json").read_text(encoding="utf-8")
    )["entradas"]
}


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class ModificacoesLojaTests(unittest.TestCase):
    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema))
            )
        isolated_dsn = make_conninfo(
            TEST_DSN,
            options=f"-c search_path={self.schema}",
        )
        self.database = Database(isolated_dsn)
        self.database.open()

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(
                    sql.Identifier(self.schema)
                )
            )

    # -- helpers ---------------------------------------------------------

    def _personagem(self, *, email: str, saldo: int = 1000) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID, AuthenticatedUser]:
        usuario_id = uuid.uuid4()
        campanha_id = uuid.uuid4()
        personagem_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, %s, 'Jogador', 'hash', 'player')
                """,
                (usuario_id, email),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                """
                INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, criado_por)
                VALUES (%s, %s, %s, 'Heroi', %s)
                """,
                (personagem_id, campanha_id, usuario_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO saldos_personagem (campanha_id, personagem_id, moeda, saldo) VALUES (%s, %s, 'Solares', %s)",
                (campanha_id, personagem_id, saldo),
            )
        actor = AuthenticatedUser(
            id=usuario_id,
            email=email,
            nome_exibicao="Jogador",
            admin_plataforma=False,
            papel_plataforma="player",
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )
        return usuario_id, campanha_id, personagem_id, actor

    def _dar_saldo(self, campanha_id: uuid.UUID, personagem_id: uuid.UUID, moeda: str, saldo: int) -> None:
        """As modificações reais custam Lunaris (não Solares, que é o que
        _personagem já dá de saída) — usado pelos testes com catálogo real."""
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO saldos_personagem (campanha_id, personagem_id, moeda, saldo)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (campanha_id, personagem_id, moeda) DO UPDATE SET saldo=EXCLUDED.saldo
                """,
                (campanha_id, personagem_id, moeda, saldo),
            )

    def _catalogo_item(self, item_id: str, tipo: str, conteudo: dict) -> None:
        conteudo = {"raridade": "comum", **conteudo}
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO catalogo_itens (id, tipo, titulo, conteudo, ativo)
                VALUES (%s, %s, %s, %s, TRUE)
                """,
                (item_id, tipo, conteudo.get("titulo", item_id), Jsonb(conteudo)),
            )

    def _catalogo_item_real(self, item_id: str) -> dict:
        """Copia uma entrada de verdade de data/loja/catalogo.json pro catálogo
        de teste — pra testar a compatibilidade de aplicacao contra dados reais,
        não contra um `conteudo` inventado à mão."""
        entrada = _CATALOGO_REAL[item_id]
        self._catalogo_item(item_id, entrada["tipo"], dict(entrada["conteudo"]))
        return entrada["conteudo"]

    def _inventario_direto(
        self,
        campanha_id: uuid.UUID,
        personagem_id: uuid.UUID,
        item_id: str,
        *,
        categoria: str,
        quantidade: int = 1,
        modificacoes: list | None = None,
        extra: dict | None = None,
    ) -> None:
        dados = {
            "categoria": categoria,
            "origem": "loja",
            "catalogo_item_id": item_id,
            "modificacoes": modificacoes or [],
            **(extra or {}),
        }
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO inventario_personagem (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (campanha_id, personagem_id, item_id, item_id, quantidade, Jsonb(dados)),
            )

    def _comprar_modificacao(
        self,
        *,
        campanha_id: uuid.UUID,
        personagem_id: uuid.UUID,
        actor: AuthenticatedUser,
        mod_item_id: str,
        alvo_item_id: str,
        idempotencia: str,
        economia_versao_esperada: int = 1,
    ):
        payload = ShopBatchCommandInput(
            campanha_id=campanha_id,
            personagem_id=personagem_id,
            economia_versao_esperada=economia_versao_esperada,
            idempotencia=idempotencia,
            itens=[ShopCommandItemInput(item_id=mod_item_id, quantidade=1, alvo_item_id=alvo_item_id)],
        )
        return purchase_batch(payload=payload, user=actor, database=self.database)

    # -- hard blocks na instalacao ---------------------------------------

    def test_instalar_modificacao_bloqueia_categoria_incompativel(self):
        _, campanha_id, personagem_id, actor = self._personagem(email="cat-incompativel@example.com")
        self._catalogo_item(
            "mira-laser",
            "modificacao",
            {"preco": 20, "categorias_alvo": ["arma"], "slots_ocupados": 1},
        )
        self._inventario_direto(campanha_id, personagem_id, "peitoral-teste", categoria="armadura")

        with self.assertRaises(HTTPException) as ctx:
            self._comprar_modificacao(
                campanha_id=campanha_id,
                personagem_id=personagem_id,
                actor=actor,
                mod_item_id="mira-laser",
                alvo_item_id="peitoral-teste",
                idempotencia="teste-categoria-incompativel",
            )
        self.assertEqual(ctx.exception.status_code, 422)

    # -- matriz de compatibilidade real (aplicacao x categoria do alvo) --
    # Descoberta na validação pós-correção: categorias_alvo (testado acima)
    # nunca é populado por nenhuma das 461 entradas reais do catálogo — os
    # dados usam `aplicacao`. Estes testes usam entradas de verdade de
    # data/loja/catalogo.json, não conteúdo inventado.

    def test_mod_de_arma_real_instala_em_arma(self):
        _, campanha_id, personagem_id, actor = self._personagem(email="mod-arma-em-arma@example.com")
        self._dar_saldo(campanha_id, personagem_id, "Lunaris", 1000)
        conteudo = self._catalogo_item_real("mod-afiada")
        self.assertEqual(conteudo["aplicacao"], "Armas")
        self._inventario_direto(campanha_id, personagem_id, "espada-teste", categoria="arma")

        resultado = self._comprar_modificacao(
            campanha_id=campanha_id,
            personagem_id=personagem_id,
            actor=actor,
            mod_item_id="mod-afiada",
            alvo_item_id="espada-teste",
            idempotencia="teste-mod-arma-em-arma",
        )
        self.assertEqual(resultado["repetida"], False)

    def test_mod_de_arma_real_bloqueia_em_armadura(self):
        _, campanha_id, personagem_id, actor = self._personagem(email="mod-arma-em-armadura@example.com")
        self._dar_saldo(campanha_id, personagem_id, "Lunaris", 1000)
        self._catalogo_item_real("mod-afiada")
        self._inventario_direto(campanha_id, personagem_id, "peitoral-teste", categoria="armadura")

        with self.assertRaises(HTTPException) as ctx:
            self._comprar_modificacao(
                campanha_id=campanha_id,
                personagem_id=personagem_id,
                actor=actor,
                mod_item_id="mod-afiada",
                alvo_item_id="peitoral-teste",
                idempotencia="teste-mod-arma-em-armadura",
            )
        self.assertEqual(ctx.exception.status_code, 422)

    def test_mod_de_armadura_real_instala_em_armadura(self):
        _, campanha_id, personagem_id, actor = self._personagem(email="mod-armadura-em-armadura@example.com")
        self._dar_saldo(campanha_id, personagem_id, "Lunaris", 1000)
        conteudo = self._catalogo_item_real("mod-reforcada")
        self.assertEqual(conteudo["aplicacao"], "Armaduras")
        self._inventario_direto(campanha_id, personagem_id, "peitoral-teste", categoria="armadura")

        resultado = self._comprar_modificacao(
            campanha_id=campanha_id,
            personagem_id=personagem_id,
            actor=actor,
            mod_item_id="mod-reforcada",
            alvo_item_id="peitoral-teste",
            idempotencia="teste-mod-armadura-em-armadura",
        )
        self.assertEqual(resultado["repetida"], False)

    def test_mod_de_armadura_real_bloqueia_em_arma(self):
        _, campanha_id, personagem_id, actor = self._personagem(email="mod-armadura-em-arma@example.com")
        self._dar_saldo(campanha_id, personagem_id, "Lunaris", 1000)
        self._catalogo_item_real("mod-reforcada")
        self._inventario_direto(campanha_id, personagem_id, "espada-teste", categoria="arma")

        with self.assertRaises(HTTPException) as ctx:
            self._comprar_modificacao(
                campanha_id=campanha_id,
                personagem_id=personagem_id,
                actor=actor,
                mod_item_id="mod-reforcada",
                alvo_item_id="espada-teste",
                idempotencia="teste-mod-armadura-em-arma",
            )
        self.assertEqual(ctx.exception.status_code, 422)

    def test_mod_de_escudo_real_instala_em_item_categoria_armadura(self):
        # _inventory_category() não distingue escudo de armadura comum (os dois
        # viram categoria "armadura"); a tela de compra também nunca fez essa
        # distinção — então "Escudos" aceita qualquer alvo "armadura" hoje.
        # Registrado como possível refinamento futuro, não como bug.
        _, campanha_id, personagem_id, actor = self._personagem(email="mod-escudo-em-armadura@example.com")
        self._dar_saldo(campanha_id, personagem_id, "Lunaris", 1000)
        conteudo = self._catalogo_item_real("mod-reforcado-escudo")
        self.assertEqual(conteudo["aplicacao"], "Escudos")
        self._inventario_direto(campanha_id, personagem_id, "peitoral-teste", categoria="armadura")

        resultado = self._comprar_modificacao(
            campanha_id=campanha_id,
            personagem_id=personagem_id,
            actor=actor,
            mod_item_id="mod-reforcado-escudo",
            alvo_item_id="peitoral-teste",
            idempotencia="teste-mod-escudo-em-armadura",
        )
        self.assertEqual(resultado["repetida"], False)

    def test_mod_de_escudo_real_bloqueia_em_arma(self):
        _, campanha_id, personagem_id, actor = self._personagem(email="mod-escudo-em-arma@example.com")
        self._dar_saldo(campanha_id, personagem_id, "Lunaris", 1000)
        self._catalogo_item_real("mod-reforcado-escudo")
        self._inventario_direto(campanha_id, personagem_id, "espada-teste", categoria="arma")

        with self.assertRaises(HTTPException) as ctx:
            self._comprar_modificacao(
                campanha_id=campanha_id,
                personagem_id=personagem_id,
                actor=actor,
                mod_item_id="mod-reforcado-escudo",
                alvo_item_id="espada-teste",
                idempotencia="teste-mod-escudo-em-arma",
            )
        self.assertEqual(ctx.exception.status_code, 422)

    def test_mod_geral_real_instala_em_qualquer_categoria_sem_restricao(self):
        # "Itens gerais e mágicos" não tem alvo restrito (ver comentário em
        # shop.py) — testa em arma E em armadura, as duas devem passar.
        _, campanha_id, personagem_id, actor = self._personagem(email="mod-geral-sem-restricao@example.com")
        self._dar_saldo(campanha_id, personagem_id, "Lunaris", 1000)
        conteudo = self._catalogo_item_real("mod-portatil")
        self.assertEqual(conteudo["aplicacao"], "Itens gerais e mágicos")
        self._inventario_direto(campanha_id, personagem_id, "espada-teste", categoria="arma")
        self._inventario_direto(campanha_id, personagem_id, "peitoral-teste", categoria="armadura")

        resultado_arma = self._comprar_modificacao(
            campanha_id=campanha_id,
            personagem_id=personagem_id,
            actor=actor,
            mod_item_id="mod-portatil",
            alvo_item_id="espada-teste",
            idempotencia="teste-mod-geral-arma",
        )
        self.assertEqual(resultado_arma["repetida"], False)

        resultado_armadura = self._comprar_modificacao(
            campanha_id=campanha_id,
            personagem_id=personagem_id,
            actor=actor,
            mod_item_id="mod-portatil",
            alvo_item_id="peitoral-teste",
            idempotencia="teste-mod-geral-armadura",
            economia_versao_esperada=2,
        )
        self.assertEqual(resultado_armadura["repetida"], False)

    def test_instalar_modificacao_bloqueia_slots_excedidos(self):
        _, campanha_id, personagem_id, actor = self._personagem(email="slots-excedidos@example.com")
        self._catalogo_item(
            "mira-laser",
            "modificacao",
            {"preco": 20, "categorias_alvo": ["arma"], "slots_ocupados": 1},
        )
        self._inventario_direto(
            campanha_id,
            personagem_id,
            "espada-teste",
            categoria="arma",
            extra={
                "slots_modificacao": 1,
                "modificacoes": [
                    {"id": str(uuid.uuid4()), "catalogo_item_id": "outra-mod", "slots_ocupados": 1}
                ],
            },
        )

        with self.assertRaises(HTTPException) as ctx:
            self._comprar_modificacao(
                campanha_id=campanha_id,
                personagem_id=personagem_id,
                actor=actor,
                mod_item_id="mira-laser",
                alvo_item_id="espada-teste",
                idempotencia="teste-slots-excedidos",
            )
        self.assertEqual(ctx.exception.status_code, 422)

    def test_instalar_modificacao_bloqueia_pre_requisito_nao_atendido(self):
        # Achado 11 (auditoria 2026-08), fechado na etapa de implementação
        # final: pre_requisitos tipado existia no catálogo desde a correção
        # anterior, mas nada validava contra a ficha do personagem até agora.
        _, campanha_id, personagem_id, actor = self._personagem(email="pre-requisito-mod@example.com")
        self._catalogo_item(
            "mod-nivel-alto",
            "modificacao",
            {"preco": 20, "aplicacao": "Armas", "pre_requisitos": [{"nivel_personagem": 10}]},
        )
        self._inventario_direto(campanha_id, personagem_id, "espada-teste", categoria="arma")
        # Personagem novo (ficha vazia, nível efetivo 0) não atende nível 10.

        with self.assertRaises(HTTPException) as ctx:
            self._comprar_modificacao(
                campanha_id=campanha_id,
                personagem_id=personagem_id,
                actor=actor,
                mod_item_id="mod-nivel-alto",
                alvo_item_id="espada-teste",
                idempotencia="teste-pre-requisito-bloqueado",
            )
        self.assertEqual(ctx.exception.status_code, 422)

    def test_instalar_modificacao_permite_quando_pre_requisito_e_atendido(self):
        _, campanha_id, personagem_id, actor = self._personagem(email="pre-requisito-mod-ok@example.com")
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE personagens SET ficha=%s WHERE id=%s",
                (Jsonb({"nivel": 10, "classes": [{"id": "guerreiro", "nivel": 10}]}), personagem_id),
            )
        self._catalogo_item(
            "mod-nivel-alto",
            "modificacao",
            {"preco": 20, "aplicacao": "Armas", "pre_requisitos": [{"nivel_personagem": 10}]},
        )
        self._inventario_direto(campanha_id, personagem_id, "espada-teste", categoria="arma")

        resultado = self._comprar_modificacao(
            campanha_id=campanha_id,
            personagem_id=personagem_id,
            actor=actor,
            mod_item_id="mod-nivel-alto",
            alvo_item_id="espada-teste",
            idempotencia="teste-pre-requisito-ok",
        )
        self.assertEqual(resultado["repetida"], False)

    def test_mestre_ignora_pre_requisito_de_modificacao_no_proprio_personagem(self):
        # purchase_batch só age sobre o personagem do próprio ator (ver
        # _owned_character: dono_usuario_id=user_id, sem exceção pra mestre
        # agir no personagem alheio) — então o único cenário real de "mestre
        # isento" aqui é o mestre com um personagem próprio na campanha.
        # Mesmo padrão de requer_autorizacao_mestre nesta rota e da validação
        # de Legados em character_summary.py.
        _, campanha_id, personagem_id, mestre = self._personagem(email="mestre-proprio-personagem@example.com")
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE membros_campanha SET papel='mestre' WHERE campanha_id=%s AND usuario_id=%s",
                (campanha_id, mestre.id),
            )
        self._catalogo_item(
            "mod-nivel-alto",
            "modificacao",
            {"preco": 20, "aplicacao": "Armas", "pre_requisitos": [{"nivel_personagem": 10}]},
        )
        self._inventario_direto(campanha_id, personagem_id, "espada-teste", categoria="arma")
        # Ficha continua vazia (nível efetivo 0) — um jogador comum seria
        # bloqueado; o mestre não.

        resultado = self._comprar_modificacao(
            campanha_id=campanha_id,
            personagem_id=personagem_id,
            actor=mestre,
            mod_item_id="mod-nivel-alto",
            alvo_item_id="espada-teste",
            idempotencia="teste-pre-requisito-mestre-isento",
        )
        self.assertEqual(resultado["repetida"], False)

    def test_pre_requisito_atendido_nao_ignora_aplicacao_incompativel(self):
        # pre_requisitos (achado 11) e aplicacao/categoria (correção 2026-08
        # desta etapa) são duas camadas independentes — atender uma não deve
        # dispensar a outra. Nível atendido, mas o alvo é uma armadura para
        # uma modificação "Armas": tem que bloquear pela aplicação mesmo
        # assim.
        _, campanha_id, personagem_id, actor = self._personagem(email="pre-requisito-e-aplicacao@example.com")
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE personagens SET ficha=%s WHERE id=%s",
                (Jsonb({"nivel": 10, "classes": [{"id": "guerreiro", "nivel": 10}]}), personagem_id),
            )
        self._catalogo_item(
            "mod-nivel-alto",
            "modificacao",
            {"preco": 20, "aplicacao": "Armas", "pre_requisitos": [{"nivel_personagem": 10}]},
        )
        self._inventario_direto(campanha_id, personagem_id, "peitoral-teste", categoria="armadura")

        with self.assertRaises(HTTPException) as ctx:
            self._comprar_modificacao(
                campanha_id=campanha_id,
                personagem_id=personagem_id,
                actor=actor,
                mod_item_id="mod-nivel-alto",
                alvo_item_id="peitoral-teste",
                idempotencia="teste-pre-requisito-ok-mas-aplicacao-incompativel",
            )
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("aplicacao", str(ctx.exception.detail))

    def test_instalar_modificacao_bloqueia_exclusividade(self):
        _, campanha_id, personagem_id, actor = self._personagem(email="exclusividade@example.com")
        self._catalogo_item(
            "mira-laser",
            "modificacao",
            {
                "preco": 20,
                "categorias_alvo": ["arma"],
                "slots_ocupados": 1,
                "grupo_exclusividade": "mira",
            },
        )
        self._inventario_direto(
            campanha_id,
            personagem_id,
            "espada-teste",
            categoria="arma",
            extra={
                "slots_modificacao": 5,
                "modificacoes": [
                    {
                        "id": str(uuid.uuid4()),
                        "catalogo_item_id": "outra-mira",
                        "slots_ocupados": 1,
                        "grupo_exclusividade": "mira",
                    }
                ],
            },
        )

        with self.assertRaises(HTTPException) as ctx:
            self._comprar_modificacao(
                campanha_id=campanha_id,
                personagem_id=personagem_id,
                actor=actor,
                mod_item_id="mira-laser",
                alvo_item_id="espada-teste",
                idempotencia="teste-exclusividade",
            )
        self.assertEqual(ctx.exception.status_code, 422)

    def test_instalar_modificacao_sucesso_grava_instancia_com_id_proprio(self):
        _, campanha_id, personagem_id, actor = self._personagem(email="instalacao-ok@example.com")
        self._catalogo_item(
            "mira-laser",
            "modificacao",
            {
                "preco": 20,
                "categorias_alvo": ["arma"],
                "slots_ocupados": 1,
                "grupo_exclusividade": "mira",
                "removivel": True,
                "destruida_ao_remover": False,
            },
        )
        self._inventario_direto(
            campanha_id, personagem_id, "espada-teste", categoria="arma", extra={"slots_modificacao": 5}
        )

        self._comprar_modificacao(
            campanha_id=campanha_id,
            personagem_id=personagem_id,
            actor=actor,
            mod_item_id="mira-laser",
            alvo_item_id="espada-teste",
            idempotencia="teste-instalacao-ok",
        )

        with self.database.connection() as connection:
            row = connection.execute(
                "SELECT dados FROM inventario_personagem WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s",
                (campanha_id, personagem_id, "espada-teste"),
            ).fetchone()
            auditoria = connection.execute(
                "SELECT acao FROM eventos_auditoria WHERE campanha_id=%s AND acao=%s",
                (campanha_id, "loja.instalar_modificacao"),
            ).fetchone()

        modificacoes = row["dados"]["modificacoes"]
        self.assertEqual(len(modificacoes), 1)
        instalada = modificacoes[0]
        self.assertTrue(instalada.get("id"))
        self.assertEqual(instalada["catalogo_item_id"], "mira-laser")
        self.assertEqual(instalada["slots_ocupados"], 1)
        self.assertTrue(instalada["removivel"])
        self.assertFalse(instalada["destruida_ao_remover"])
        self.assertIsNotNone(auditoria)

    # -- venda bloqueada com modificacao instalada ------------------------

    def test_venda_bloqueia_ultimo_exemplar_com_modificacao(self):
        _, campanha_id, personagem_id, actor = self._personagem(email="venda-bloqueada@example.com")
        self._catalogo_item("espada-teste", "arma", {"preco": 50})
        self._inventario_direto(
            campanha_id,
            personagem_id,
            "espada-teste",
            categoria="arma",
            quantidade=1,
            modificacoes=[{"id": str(uuid.uuid4()), "nome": "Mira Laser", "catalogo_item_id": "mira-laser"}],
        )

        payload = ShopBatchCommandInput(
            campanha_id=campanha_id,
            personagem_id=personagem_id,
            economia_versao_esperada=1,
            idempotencia="teste-venda-bloqueada",
            itens=[ShopCommandItemInput(item_id="espada-teste", quantidade=1)],
        )
        with self.assertRaises(HTTPException) as ctx:
            sell_batch(payload=payload, user=actor, database=self.database)
        self.assertEqual(ctx.exception.status_code, 422)

    # -- desinstalacao (characters.py) ------------------------------------

    def test_desinstalar_modificacao_bloqueia_nao_removivel(self):
        _, campanha_id, personagem_id, actor = self._personagem(email="desinstalar-bloqueada@example.com")
        modificacao_id = str(uuid.uuid4())
        self._inventario_direto(
            campanha_id,
            personagem_id,
            "espada-teste",
            categoria="arma",
            modificacoes=[{"id": modificacao_id, "nome": "Runa Selada", "removivel": False}],
        )

        with self.assertRaises(HTTPException) as ctx:
            uninstall_modification(
                character_id=personagem_id,
                item_id="espada-teste",
                modificacao_id=modificacao_id,
                user=actor,
                database=self.database,
            )
        self.assertEqual(ctx.exception.status_code, 422)

    def test_desinstalar_modificacao_devolve_ao_inventario(self):
        _, campanha_id, personagem_id, actor = self._personagem(email="desinstalar-devolve@example.com")
        modificacao_id = str(uuid.uuid4())
        self._inventario_direto(
            campanha_id,
            personagem_id,
            "espada-teste",
            categoria="arma",
            modificacoes=[
                {
                    "id": modificacao_id,
                    "nome": "Mira Laser",
                    "catalogo_item_id": "mira-laser",
                    "removivel": True,
                    "destruida_ao_remover": False,
                }
            ],
        )

        resultado = uninstall_modification(
            character_id=personagem_id,
            item_id="espada-teste",
            modificacao_id=modificacao_id,
            user=actor,
            database=self.database,
        )
        self.assertTrue(resultado["retornou_ao_inventario"])

        with self.database.connection() as connection:
            arma = connection.execute(
                "SELECT dados FROM inventario_personagem WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s",
                (campanha_id, personagem_id, "espada-teste"),
            ).fetchone()
            avulso = connection.execute(
                "SELECT quantidade FROM inventario_personagem WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s",
                (campanha_id, personagem_id, "mira-laser"),
            ).fetchone()
        self.assertEqual(arma["dados"]["modificacoes"], [])
        self.assertIsNotNone(avulso)
        self.assertEqual(avulso["quantidade"], 1)

    def test_desinstalar_modificacao_destruida_nao_devolve(self):
        _, campanha_id, personagem_id, actor = self._personagem(email="desinstalar-destruida@example.com")
        modificacao_id = str(uuid.uuid4())
        self._inventario_direto(
            campanha_id,
            personagem_id,
            "espada-teste",
            categoria="arma",
            modificacoes=[
                {
                    "id": modificacao_id,
                    "nome": "Núcleo Instável",
                    "catalogo_item_id": "nucleo-instavel",
                    "removivel": True,
                    "destruida_ao_remover": True,
                }
            ],
        )

        resultado = uninstall_modification(
            character_id=personagem_id,
            item_id="espada-teste",
            modificacao_id=modificacao_id,
            user=actor,
            database=self.database,
        )
        self.assertFalse(resultado["retornou_ao_inventario"])

        with self.database.connection() as connection:
            avulso = connection.execute(
                "SELECT 1 FROM inventario_personagem WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s",
                (campanha_id, personagem_id, "nucleo-instavel"),
            ).fetchone()
        self.assertIsNone(avulso)

    # -- regressao: HTTPException de permissao nao pode ser engolido ------

    def test_instalar_modificacao_em_veiculo_sem_permissao_retorna_403(self):
        """Antes da correção, um `except Exception: pass` em volta do lookup
        de veículo engolia o HTTPException 403 de permissão e a requisição
        seguia como se o veículo simplesmente não existisse (422 genérico).
        Aqui garantimos que quem não tem permissão de gerenciar recebe 403."""
        _, campanha_id, dono_id, _ = self._personagem(email="dono-veiculo@example.com")
        _, _, outro_personagem_id, actor_sem_permissao = self._personagem(
            email="sem-permissao-veiculo@example.com"
        )
        # Precisa ser a mesma campanha para os dois personagens.
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE membros_campanha SET campanha_id=%s WHERE usuario_id=%s",
                (campanha_id, actor_sem_permissao.id),
            )
            connection.execute(
                "UPDATE personagens SET campanha_id=%s WHERE id=%s",
                (campanha_id, outro_personagem_id),
            )
            connection.execute(
                "INSERT INTO saldos_personagem (campanha_id, personagem_id, moeda, saldo) VALUES (%s, %s, 'Solares', 1000)",
                (campanha_id, outro_personagem_id),
            )

        veiculo_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO campanha_veiculos
                    (id, campanha_id, proprietario_personagem_id, nome, espacos_modulos_maximos)
                VALUES (%s, %s, %s, 'Buggy de teste', 5)
                """,
                (veiculo_id, campanha_id, dono_id),
            )

        self._catalogo_item(
            "modulo-blindagem",
            "modificacao",
            {"preco": 30, "categorias_alvo": ["veiculo"], "slots_ocupados": 1},
        )

        with self.assertRaises(HTTPException) as ctx:
            self._comprar_modificacao(
                campanha_id=campanha_id,
                personagem_id=outro_personagem_id,
                actor=actor_sem_permissao,
                mod_item_id="modulo-blindagem",
                alvo_item_id=str(veiculo_id),
                idempotencia="teste-veiculo-sem-permissao",
            )
        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
