"""Loot das criaturas na Sessão ao Vivo e troca de itens entre jogadores.

Loot: o Mestre vê a tabela da criatura, rola no servidor e escolhe quem leva
cada linha; item entra no inventário pelo mesmo caminho da concessão da Loja
e moeda entra na carteira com lançamento no extrato. Jogador não vê a tabela
nem o loot rolado.

Troca: o dono manda um item do próprio inventário para outro personagem da
campanha; o item chega desequipado e as duas pontas ficam no extrato.

Só roda com TEST_DATABASE_URL configurada, nunca contra o banco de produção.
"""

from __future__ import annotations

import functools
import os
import unittest
import uuid
from unittest.mock import patch

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core import loot_criaturas
from core.database import Database
from core.dependencies import AuthenticatedUser
from routers.characters import list_send_targets, send_currency, send_inventory_item
from routers.trades import aceitar_troca, cancelar_troca, itens_para_pedir, listar_trocas, propor_troca, recusar_troca
from routers.sessions import (
    _montar_estado,
    _sessao_ativa,
    abrir_sessao,
    adicionar_participante,
    atualizar_participante,
    listar_bestiario,
    ajustar_tabela_de_loot,
    mexer_na_aflicao,
    restaurar_tabela_de_loot,
    entregar_loot_do_participante,
    rolar_loot_do_participante,
    tabela_de_loot,
)
from schemas import (
    ParticipantAfflictionInput,
    CurrencySendInput,
    LootTableInput,
    TradeProposalInput,
    InventorySendInput,
    ParticipantCreateInput,
    ParticipantUpdateInput,
    ParticipantLootDeliverInput,
    ParticipantLootDeliveryLine,
    ParticipantLootRollInput,
    SessionOpenInput,
)

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()

TABELAS = {
    "bandido-teste": {
        "moedas": {"dados": "40", "moeda": "Lunaris", "chance": 100},
        "itens": [
            {"item": "loot-dente-teste", "chance": 100, "quantidade": "3"},
            {"item": "loot-joia-teste", "chance": 100, "quantidade": "1"},
            # d100 fixo em 50: esta linha nunca cai nos testes.
            {"item": "loot-raro-teste", "chance": 10, "quantidade": "1"},
        ],
    },
}
# A rolagem fica previsível: d100 sempre 50.
_ROLAR_FIXO = functools.partial(loot_criaturas.rolar_loot, d100=lambda: 50)


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class LootETrocaTests(unittest.TestCase):
    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        patches = [
            patch("core.loot_criaturas.tabelas", return_value=TABELAS),
            patch("routers.sessions.rolar_loot", _ROLAR_FIXO),
        ]
        for item in patches:
            item.start()
            self.addCleanup(item.stop)
        self._montar()

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    # -- montagem ----------------------------------------------------------

    def _ator(self, usuario_id, email):
        return AuthenticatedUser(
            id=usuario_id, email=email, nome_exibicao=email.split("@")[0], admin_plataforma=False,
            papel_plataforma="player", session_id=uuid.uuid4(), csrf_hash="hash",
        )

    def _montar(self):
        self.mestre_id, self.ana_id, self.bia_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        self.campanha_id, self.outra_campanha_id = uuid.uuid4(), uuid.uuid4()
        self.heroi_ana, self.heroi_bia, self.estranho = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        with self.database.connection() as connection:
            for usuario_id, email in (
                (self.mestre_id, "mestre@example.com"),
                (self.ana_id, "ana@example.com"),
                (self.bia_id, "bia@example.com"),
            ):
                connection.execute(
                    "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', 'player')",
                    (usuario_id, email, email.split("@")[0]),
                )
            for campanha_id in (self.campanha_id, self.outra_campanha_id):
                connection.execute(
                    "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (campanha_id, self.mestre_id),
                )
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')",
                    (campanha_id, self.mestre_id),
                )
            for usuario_id in (self.ana_id, self.bia_id):
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                    (self.campanha_id, usuario_id),
                )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (self.outra_campanha_id, self.ana_id),
            )
            for personagem_id, campanha_id, dono, nome in (
                (self.heroi_ana, self.campanha_id, self.ana_id, "Ana"),
                (self.heroi_bia, self.campanha_id, self.bia_id, "Bia"),
                (self.estranho, self.outra_campanha_id, self.ana_id, "Estranho"),
            ):
                connection.execute(
                    "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, criado_por) VALUES (%s, %s, %s, %s, %s)",
                    (personagem_id, campanha_id, dono, nome, dono),
                )
            for item_id, titulo, conteudo in (
                ("loot-dente-teste", "Dente de Teste", {"raridade": "Comum", "preco": {"Lunaris": 30}}),
                (
                    "loot-joia-teste", "Joia Exclusiva",
                    {"raridade": "Raro", "exclusivo": True, "disponivelNaLoja": False, "preco": {"Solares": 30}},
                ),
                ("loot-raro-teste", "Coisa Rara", {"raridade": "Raro", "preco": {"Solares": 1}}),
                ("bandido-teste", "Bandido de Teste", {"categoria": "Humanoide", "vd": 3, "pv": 20}),
            ):
                connection.execute(
                    """
                    INSERT INTO catalogo_itens (id, tipo, titulo, conteudo) VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET tipo=EXCLUDED.tipo, titulo=EXCLUDED.titulo, conteudo=EXCLUDED.conteudo
                    """,
                    (item_id, "monstro" if item_id == "bandido-teste" else "drop", titulo, Jsonb(conteudo)),
                )
        self.mestre = self._ator(self.mestre_id, "mestre@example.com")
        self.ana = self._ator(self.ana_id, "ana@example.com")
        self.bia = self._ator(self.bia_id, "bia@example.com")

    def _cena_com_bandido(self):
        sessao = abrir_sessao(
            SessionOpenInput(campanha_id=self.campanha_id, titulo="Emboscada", incluir_personagens=True),
            user=self.mestre, database=self.database,
        )
        sessao_id = sessao["sessao"]["id"]
        criado = adicionar_participante(
            sessao_id,
            ParticipantCreateInput(nome="Bandido", vida_maxima=20, monstro_id="bandido-teste"),
            user=self.mestre, database=self.database,
        )
        return sessao_id, criado["id"]

    def _estado(self, papel, usuario_id):
        with self.database.connection() as connection:
            sessao = _sessao_ativa(connection, self.campanha_id)
            return _montar_estado(connection, sessao, papel, usuario_id)

    def _inventario(self, personagem_id):
        with self.database.connection() as connection:
            return {
                row["item_id"]: row
                for row in connection.execute(
                    "SELECT item_id, quantidade, dados FROM inventario_personagem WHERE personagem_id=%s",
                    (personagem_id,),
                ).fetchall()
            }

    def _saldo(self, personagem_id, moeda="Lunaris"):
        with self.database.connection() as connection:
            row = connection.execute(
                "SELECT saldo FROM saldos_personagem WHERE personagem_id=%s AND moeda=%s", (personagem_id, moeda),
            ).fetchone()
        return int(row["saldo"]) if row else 0

    # -- loot --------------------------------------------------------------

    def test_deidades_so_chegam_ao_mestre_e_entram_na_cena(self):
        lista = listar_bestiario(self.campanha_id, user=self.mestre, database=self.database)["monstros"]
        deidades = [item for item in lista if item["categoria"] == "Deidade"]
        self.assertEqual(len(deidades), 11)
        self.assertTrue(all(item["id"].startswith("deidade-") and item["vd"] in (400, 500) for item in deidades))
        with self.assertRaises(HTTPException) as erro:
            listar_bestiario(self.campanha_id, user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        # A deidade entra na cena como qualquer criatura, sem tabela de loot.
        sessao = abrir_sessao(
            SessionOpenInput(campanha_id=self.campanha_id, titulo="Audiência", incluir_personagens=False),
            user=self.mestre, database=self.database,
        )
        criado = adicionar_participante(
            sessao["sessao"]["id"],
            ParticipantCreateInput(nome="Chronus", vida_maxima=18125, monstro_id="deidade-chronus"),
            user=self.mestre, database=self.database,
        )
        participante = next(p for p in self._estado("mestre", self.mestre_id)["participantes"] if p["id"] == criado["id"])
        self.assertEqual(participante["monstro_id"], "deidade-chronus")
        self.assertFalse(participante["tem_loot"])

    def _chefe_com_fases(self, visibilidade="total"):
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO catalogo_itens (id, tipo, titulo, conteudo) VALUES ('chefe-teste', 'monstro', 'Chefe de Teste', %s)
                ON CONFLICT (id) DO UPDATE SET conteudo=EXCLUDED.conteudo
                """,
                (Jsonb({"vd": 20, "pv": 100, "fases": [
                    {"quando": 0.5, "nome": "Segunda Forma", "anuncio": "O chefe muda de cor.", "mudancas": ["Ganha uma ação extra."]},
                    {"quando": 0.2, "nome": "Última Forma", "anuncio": "O chefe ruge.", "mudancas": ["Perde a Defesa."]},
                ]}),),
            )
        sessao = abrir_sessao(
            SessionOpenInput(campanha_id=self.campanha_id, titulo="Chefe", incluir_personagens=False),
            user=self.mestre, database=self.database,
        )
        sessao_id = sessao["sessao"]["id"]
        criado = adicionar_participante(
            sessao_id,
            ParticipantCreateInput(nome="Chefe", vida_maxima=100, visibilidade=visibilidade, monstro_id="chefe-teste"),
            user=self.mestre, database=self.database,
        )
        return sessao_id, criado["id"]

    def _bater(self, sessao_id, participante_id, **campos):
        return atualizar_participante(
            sessao_id, participante_id, ParticipantUpdateInput(**campos), user=self.mestre, database=self.database,
        )["participante"]

    def test_fase_de_chefe_sobe_com_a_vida_e_nunca_desce_por_cura(self):
        sessao_id, pid = self._chefe_com_fases()
        self.assertEqual(self._bater(sessao_id, pid, dano=30)["fase"], 1)
        self.assertEqual(self._bater(sessao_id, pid, dano=25)["fase"], 2)
        self.assertEqual(self._bater(sessao_id, pid, cura=50)["fase"], 2)
        self.assertEqual(self._bater(sessao_id, pid, dano=80)["fase"], 3)
        # Chefe caído não avança além da fase em que estava, e ajuste manual funciona.
        self.assertEqual(self._bater(sessao_id, pid, fase=2)["fase"], 2)
        with self.assertRaises(HTTPException) as erro:
            self._bater(sessao_id, pid, fase=4)
        self.assertEqual(erro.exception.status_code, 422)

    def test_criatura_sem_fases_nao_aceita_fase(self):
        sessao_id, pid = self._cena_com_bandido()
        with self.assertRaises(HTTPException) as erro:
            self._bater(sessao_id, pid, fase=2)
        self.assertEqual(erro.exception.status_code, 422)
        self.assertEqual(self._bater(sessao_id, pid, dano=15)["fase"], 1)

    def test_fase_so_revela_para_a_mesa_a_frase_de_cena(self):
        sessao_id, pid = self._chefe_com_fases()
        mestre = next(p for p in self._estado("mestre", self.mestre_id)["participantes"] if p["id"] == pid)
        self.assertEqual((mestre["fase"], mestre["fases_total"]), (1, 3))
        self.assertNotIn("fase_nome", mestre)
        self._bater(sessao_id, pid, dano=55)
        mestre = next(p for p in self._estado("mestre", self.mestre_id)["participantes"] if p["id"] == pid)
        self.assertEqual(mestre["fase_nome"], "Segunda Forma")
        self.assertEqual(mestre["fase_mudancas"], ["Ganha uma ação extra."])
        self.assertEqual([f["nome"] for f in mestre["fases_resumo"]], ["Começo", "Segunda Forma", "Última Forma"])
        jogador = next(p for p in self._estado("jogador", self.ana_id)["participantes"] if p["id"] == pid)
        self.assertEqual(jogador["fase"], 2)
        self.assertEqual(jogador["fase_anuncio"], "O chefe muda de cor.")
        for campo in ("fase_nome", "fase_mudancas", "fases_total", "fases_resumo", "monstro_id"):
            self.assertNotIn(campo, jogador)
        # Escondido da mesa: nem a frase de cena vaza.
        self._bater(sessao_id, pid, visibilidade="desconhecido")
        jogador = next(p for p in self._estado("jogador", self.ana_id)["participantes"] if p["id"] == pid)
        self.assertNotIn("fase", jogador)
        self.assertNotIn("fase_anuncio", jogador)

    def test_jogador_nao_ve_a_tabela_nem_o_loot(self):
        self._cena_com_bandido()
        with self.assertRaises(HTTPException) as erro:
            tabela_de_loot("bandido-teste", self.campanha_id, user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        bandido_jogador = next(p for p in self._estado("jogador", self.ana_id)["participantes"] if p["nome"] == "Bandido")
        self.assertNotIn("loot", bandido_jogador)
        self.assertNotIn("monstro_id", bandido_jogador)
        bandido_mestre = next(p for p in self._estado("mestre", self.mestre_id)["participantes"] if p["nome"] == "Bandido")
        self.assertEqual(bandido_mestre["monstro_id"], "bandido-teste")
        self.assertTrue(bandido_mestre["tem_loot"])
        self.assertIsNone(bandido_mestre["loot"])

    def test_mestre_ve_a_tabela_com_chance(self):
        tabela = tabela_de_loot("bandido-teste", self.campanha_id, user=self.mestre, database=self.database)
        chances = {item["item_id"]: item["chance"] for item in tabela["itens"]}
        self.assertEqual(chances, {"loot-dente-teste": 100, "loot-joia-teste": 100, "loot-raro-teste": 10})
        self.assertTrue(next(i for i in tabela["itens"] if i["item_id"] == "loot-joia-teste")["exclusivo"])
        self.assertEqual(tabela["moedas"]["moeda"], "Lunaris")

    def test_rolar_respeita_a_chance_e_nao_rola_duas_vezes(self):
        sessao_id, bandido = self._cena_com_bandido()
        loot = rolar_loot_do_participante(
            sessao_id, bandido, ParticipantLootRollInput(), user=self.mestre, database=self.database,
        )["loot"]
        caiu = {linha.get("item_id") or linha["moeda"]: linha["quantidade"] for linha in loot["linhas"]}
        self.assertEqual(caiu, {"loot-dente-teste": 3, "loot-joia-teste": 1, "Lunaris": 40})
        with self.assertRaises(HTTPException) as erro:
            rolar_loot_do_participante(sessao_id, bandido, ParticipantLootRollInput(), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 409)
        refeito = rolar_loot_do_participante(
            sessao_id, bandido, ParticipantLootRollInput(refazer=True), user=self.mestre, database=self.database,
        )["loot"]
        self.assertEqual(len(refeito["linhas"]), 3)

    def test_participante_sem_criatura_nao_tem_loot(self):
        sessao_id, _ = self._cena_com_bandido()
        solto = adicionar_participante(
            sessao_id, ParticipantCreateInput(nome="Capanga", vida_maxima=5), user=self.mestre, database=self.database,
        )
        with self.assertRaises(HTTPException) as erro:
            rolar_loot_do_participante(sessao_id, solto["id"], ParticipantLootRollInput(), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 422)

    def test_entregar_item_e_moeda_para_jogadores_diferentes(self):
        sessao_id, bandido = self._cena_com_bandido()
        loot = rolar_loot_do_participante(
            sessao_id, bandido, ParticipantLootRollInput(), user=self.mestre, database=self.database,
        )["loot"]
        linha = {l.get("item_id") or l["moeda"]: l["linha"] for l in loot["linhas"]}
        resposta = entregar_loot_do_participante(
            sessao_id, bandido,
            ParticipantLootDeliverInput(entregas=[
                ParticipantLootDeliveryLine(linha=linha["loot-dente-teste"], personagem_id=self.heroi_ana),
                ParticipantLootDeliveryLine(linha=linha["loot-joia-teste"], personagem_id=self.heroi_ana),
                ParticipantLootDeliveryLine(linha=linha["Lunaris"], personagem_id=self.heroi_bia),
            ]),
            user=self.mestre, database=self.database,
        )
        self.assertEqual(len(resposta["entregues"]), 3)
        inventario = self._inventario(self.heroi_ana)
        self.assertEqual(inventario["loot-dente-teste"]["quantidade"], 3)
        # Item exclusivo (fora do balcão) também chega: quem entrega é o Mestre.
        self.assertEqual(inventario["loot-joia-teste"]["quantidade"], 1)
        self.assertEqual(inventario["loot-joia-teste"]["dados"]["origem"], "loja")
        self.assertEqual(self._saldo(self.heroi_bia), 40)
        self.assertEqual(self._saldo(self.heroi_ana), 0)
        with self.database.connection() as connection:
            extrato = connection.execute(
                "SELECT delta, origem, motivo FROM lancamentos_economia WHERE personagem_id=%s", (self.heroi_bia,),
            ).fetchall()
        self.assertEqual([(e["delta"], e["origem"]) for e in extrato], [(40, "sessao.loot")])
        self.assertIn("Bandido", extrato[0]["motivo"])

        # A mesma linha não sai duas vezes, e depois de entregar não se rola de novo.
        with self.assertRaises(HTTPException) as erro:
            entregar_loot_do_participante(
                sessao_id, bandido,
                ParticipantLootDeliverInput(entregas=[
                    ParticipantLootDeliveryLine(linha=linha["Lunaris"], personagem_id=self.heroi_ana),
                ]),
                user=self.mestre, database=self.database,
            )
        self.assertEqual(erro.exception.status_code, 409)
        with self.assertRaises(HTTPException) as erro:
            rolar_loot_do_participante(
                sessao_id, bandido, ParticipantLootRollInput(refazer=True), user=self.mestre, database=self.database,
            )
        self.assertEqual(erro.exception.status_code, 409)
        self.assertEqual(self._saldo(self.heroi_bia), 40)

    def test_entrega_parcial_deixa_o_resto_para_depois(self):
        sessao_id, bandido = self._cena_com_bandido()
        loot = rolar_loot_do_participante(
            sessao_id, bandido, ParticipantLootRollInput(), user=self.mestre, database=self.database,
        )["loot"]
        dente = next(l for l in loot["linhas"] if l.get("item_id") == "loot-dente-teste")
        resposta = entregar_loot_do_participante(
            sessao_id, bandido,
            ParticipantLootDeliverInput(entregas=[ParticipantLootDeliveryLine(linha=dente["linha"], personagem_id=self.heroi_bia)]),
            user=self.mestre, database=self.database,
        )
        pendentes = [l for l in resposta["loot"]["linhas"] if not l["entregue_para"]]
        self.assertEqual(len(pendentes), 2)
        self.assertEqual(
            next(l for l in resposta["loot"]["linhas"] if l["linha"] == dente["linha"])["entregue_para"]["nome"], "Bia",
        )

    def test_nao_entrega_para_personagem_de_outra_campanha(self):
        sessao_id, bandido = self._cena_com_bandido()
        loot = rolar_loot_do_participante(
            sessao_id, bandido, ParticipantLootRollInput(), user=self.mestre, database=self.database,
        )["loot"]
        with self.assertRaises(HTTPException) as erro:
            entregar_loot_do_participante(
                sessao_id, bandido,
                ParticipantLootDeliverInput(entregas=[
                    ParticipantLootDeliveryLine(linha=loot["linhas"][0]["linha"], personagem_id=self.estranho),
                ]),
                user=self.mestre, database=self.database,
            )
        self.assertEqual(erro.exception.status_code, 422)

    def test_sessao_mostra_as_aflicoes_da_ficha(self):
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE personagens SET ficha=%s WHERE id=%s",
                (Jsonb({"aflicoesAtivas": [
                    {"id": "x", "aflicaoId": "febre-dos-esporos", "estagio": 2, "incubando": False},
                    "lixo",
                ]}), self.heroi_ana),
            )
        self._cena_com_bandido()
        ana = next(p for p in self._estado("jogador", self.bia_id)["participantes"] if p["nome"] == "Ana")
        self.assertEqual(ana["aflicoes"], [{"aflicao_id": "febre-dos-esporos", "estagio": 2, "incubando": False}])
        bandido = next(p for p in self._estado("mestre", self.mestre_id)["participantes"] if p["nome"] == "Bandido")
        self.assertEqual(bandido["aflicoes"], [])

    # -- troca entre jogadores ----------------------------------------------

    def _dar(self, personagem_id, item_id, quantidade, **dados):
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO inventario_personagem (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    self.campanha_id, personagem_id, item_id, item_id.title(), quantidade,
                    Jsonb({"origem": "loja", "catalogo_item_id": item_id, "tipo": "drop", **dados}),
                ),
            )

    def _enviar(self, ator, de, item_id, para, quantidade=1, chave=None):
        return send_inventory_item(
            de, item_id,
            InventorySendInput(destino_personagem_id=para, quantidade=quantidade, idempotencia=chave or uuid.uuid4().hex),
            user=ator, database=self.database,
        )

    def test_mandar_item_move_a_quantidade_e_chega_desequipado(self):
        self._dar(self.heroi_ana, "loot-dente-teste", 5, equipado=True)
        resultado = self._enviar(self.ana, self.heroi_ana, "loot-dente-teste", self.heroi_bia, quantidade=2)
        self.assertEqual(resultado["restante"], 3)
        self.assertEqual(self._inventario(self.heroi_ana)["loot-dente-teste"]["quantidade"], 3)
        chegou = self._inventario(self.heroi_bia)["loot-dente-teste"]
        self.assertEqual(chegou["quantidade"], 2)
        self.assertFalse(chegou["dados"]["equipado"])
        with self.database.connection() as connection:
            extrato = connection.execute(
                "SELECT personagem_id, delta FROM lancamentos_economia WHERE origem='inventario.enviar' ORDER BY delta",
            ).fetchall()
        self.assertEqual([(e["personagem_id"], e["delta"]) for e in extrato], [(self.heroi_ana, -2), (self.heroi_bia, 2)])

    def test_mandar_tudo_tira_da_origem_e_empilha_no_destino(self):
        self._dar(self.heroi_ana, "loot-dente-teste", 2)
        self._dar(self.heroi_bia, "loot-dente-teste", 1)
        self._enviar(self.ana, self.heroi_ana, "loot-dente-teste", self.heroi_bia, quantidade=2)
        self.assertNotIn("loot-dente-teste", self._inventario(self.heroi_ana))
        self.assertEqual(self._inventario(self.heroi_bia)["loot-dente-teste"]["quantidade"], 3)

    def test_repetir_a_mesma_chave_nao_manda_duas_vezes(self):
        self._dar(self.heroi_ana, "loot-dente-teste", 5)
        self._enviar(self.ana, self.heroi_ana, "loot-dente-teste", self.heroi_bia, chave="troca-unica-1")
        self._enviar(self.ana, self.heroi_ana, "loot-dente-teste", self.heroi_bia, chave="troca-unica-1")
        self.assertEqual(self._inventario(self.heroi_bia)["loot-dente-teste"]["quantidade"], 1)

    def test_jogador_nao_manda_item_da_ficha_dos_outros(self):
        self._dar(self.heroi_ana, "loot-dente-teste", 5)
        with self.assertRaises(HTTPException) as erro:
            self._enviar(self.bia, self.heroi_ana, "loot-dente-teste", self.heroi_bia)
        self.assertEqual(erro.exception.status_code, 404)

    def test_nao_manda_para_outra_campanha_nem_mais_do_que_tem(self):
        self._dar(self.heroi_ana, "loot-dente-teste", 1)
        with self.assertRaises(HTTPException) as erro:
            self._enviar(self.ana, self.heroi_ana, "loot-dente-teste", self.estranho)
        self.assertEqual(erro.exception.status_code, 422)
        with self.assertRaises(HTTPException) as erro:
            self._enviar(self.ana, self.heroi_ana, "loot-dente-teste", self.heroi_bia, quantidade=2)
        self.assertEqual(erro.exception.status_code, 409)

    def test_aliado_e_item_modificado_pela_metade_nao_viajam(self):
        self._dar(self.heroi_ana, "lobo", 1, tipo="monstro")
        self._dar(self.heroi_ana, "espada", 2, modificacoes=[{"id": "fio"}])
        with self.assertRaises(HTTPException) as erro:
            self._enviar(self.ana, self.heroi_ana, "lobo", self.heroi_bia)
        self.assertEqual(erro.exception.status_code, 422)
        with self.assertRaises(HTTPException) as erro:
            self._enviar(self.ana, self.heroi_ana, "espada", self.heroi_bia, quantidade=1)
        self.assertEqual(erro.exception.status_code, 422)
        self._enviar(self.ana, self.heroi_ana, "espada", self.heroi_bia, quantidade=2)
        self.assertEqual(self._inventario(self.heroi_bia)["espada"]["dados"]["modificacoes"], [{"id": "fio"}])

    def test_destinos_sao_os_outros_personagens_da_mesma_campanha(self):
        destinos = list_send_targets(self.heroi_ana, user=self.ana, database=self.database)["personagens"]
        self.assertEqual([d["nome"] for d in destinos], ["Bia"])
        with self.assertRaises(HTTPException):
            list_send_targets(self.heroi_ana, user=self.bia, database=self.database)

    def test_nao_junta_itens_diferentes_com_o_mesmo_id(self):
        self._dar(self.heroi_ana, "espada", 1, raridade="Raro")
        self._dar(self.heroi_bia, "espada", 1, raridade="Comum")
        with self.assertRaises(HTTPException) as erro:
            self._enviar(self.ana, self.heroi_ana, "espada", self.heroi_bia)
        self.assertEqual(erro.exception.status_code, 409)


    # -- moedas ---------------------------------------------------------------

    def _carteira(self, personagem_id, valor, moeda="Lunaris"):
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO saldos_personagem (campanha_id, personagem_id, moeda, saldo) VALUES (%s, %s, %s, %s)
                ON CONFLICT (campanha_id, personagem_id, moeda) DO UPDATE SET saldo=EXCLUDED.saldo
                """,
                (self.campanha_id, personagem_id, moeda, valor),
            )

    def test_mandar_moedas_tira_de_um_e_poe_no_outro(self):
        self._carteira(self.heroi_ana, 100)
        send_currency(
            self.heroi_ana,
            CurrencySendInput(destino_personagem_id=self.heroi_bia, moeda="Lunaris", valor=30, idempotencia="moeda-teste-1"),
            user=self.ana, database=self.database,
        )
        self.assertEqual((self._saldo(self.heroi_ana), self._saldo(self.heroi_bia)), (70, 30))
        with self.assertRaises(HTTPException) as erro:
            send_currency(
                self.heroi_ana,
                CurrencySendInput(destino_personagem_id=self.heroi_bia, moeda="Lunaris", valor=500, idempotencia="moeda-teste-2"),
                user=self.ana, database=self.database,
            )
        self.assertEqual(erro.exception.status_code, 409)
        self.assertEqual(self._saldo(self.heroi_ana), 70)

    # -- troca com aceite -----------------------------------------------------

    def _propor(self, ator, de, para, oferta=None, pedido=None):
        return propor_troca(
            TradeProposalInput(de_personagem_id=de, para_personagem_id=para, oferta=oferta or {}, pedido=pedido or {}),
            user=ator, database=self.database,
        )["proposta"]

    def test_troca_aceita_move_os_dois_lados_de_uma_vez(self):
        self._dar(self.heroi_ana, "loot-dente-teste", 3)
        self._carteira(self.heroi_ana, 50)
        self._dar(self.heroi_bia, "espada", 1)
        proposta = self._propor(
            self.ana, self.heroi_ana, self.heroi_bia,
            oferta={"itens": [{"item_id": "loot-dente-teste", "quantidade": 2}], "moedas": [{"moeda": "Lunaris", "valor": 20}]},
            pedido={"itens": [{"item_id": "espada", "quantidade": 1}]},
        )
        self.assertEqual(proposta["oferta"]["itens"][0]["titulo"], "Loot-Dente-Teste")
        # Nada muda até aceitar.
        self.assertEqual(self._inventario(self.heroi_ana)["loot-dente-teste"]["quantidade"], 3)
        recebidas = listar_trocas(self.heroi_bia, user=self.bia, database=self.database)["propostas"]
        self.assertTrue(recebidas[0]["recebida"])

        aceitar_troca(proposta["id"], user=self.bia, database=self.database)
        ana, bia = self._inventario(self.heroi_ana), self._inventario(self.heroi_bia)
        self.assertEqual(ana["loot-dente-teste"]["quantidade"], 1)
        self.assertEqual(ana["espada"]["quantidade"], 1)
        self.assertNotIn("espada", bia)
        self.assertEqual(bia["loot-dente-teste"]["quantidade"], 2)
        self.assertEqual((self._saldo(self.heroi_ana), self._saldo(self.heroi_bia)), (30, 20))
        with self.assertRaises(HTTPException) as erro:
            aceitar_troca(proposta["id"], user=self.bia, database=self.database)
        self.assertEqual(erro.exception.status_code, 409)

    def test_quem_propoe_nao_aceita_a_propria_troca(self):
        self._dar(self.heroi_ana, "loot-dente-teste", 1)
        proposta = self._propor(self.ana, self.heroi_ana, self.heroi_bia, oferta={"itens": [{"item_id": "loot-dente-teste", "quantidade": 1}]})
        with self.assertRaises(HTTPException) as erro:
            aceitar_troca(proposta["id"], user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)

    def test_se_um_lado_nao_tem_o_que_prometeu_nada_muda_de_mao(self):
        self._dar(self.heroi_bia, "espada", 1)
        self._carteira(self.heroi_ana, 10)
        proposta = self._propor(
            self.bia, self.heroi_bia, self.heroi_ana,
            oferta={"itens": [{"item_id": "espada", "quantidade": 1}]},
            pedido={"moedas": [{"moeda": "Lunaris", "valor": 999}]},
        )
        with self.assertRaises(HTTPException) as erro:
            aceitar_troca(proposta["id"], user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 409)
        self.assertIn("espada", self._inventario(self.heroi_bia))
        self.assertNotIn("espada", self._inventario(self.heroi_ana))
        self.assertEqual(self._saldo(self.heroi_ana), 10)
        aberta = listar_trocas(self.heroi_ana, user=self.ana, database=self.database)["propostas"][0]
        self.assertEqual(aberta["status"], "aberta")

    def test_recusar_e_cancelar(self):
        self._dar(self.heroi_ana, "loot-dente-teste", 2)
        uma = self._propor(self.ana, self.heroi_ana, self.heroi_bia, oferta={"itens": [{"item_id": "loot-dente-teste", "quantidade": 1}]})
        outra = self._propor(self.ana, self.heroi_ana, self.heroi_bia, oferta={"itens": [{"item_id": "loot-dente-teste", "quantidade": 1}]})
        with self.assertRaises(HTTPException):
            cancelar_troca(uma["id"], user=self.bia, database=self.database)
        recusar_troca(uma["id"], user=self.bia, database=self.database)
        cancelar_troca(outra["id"], user=self.ana, database=self.database)
        status_ = {p["id"]: p["status"] for p in listar_trocas(self.heroi_ana, user=self.ana, database=self.database)["propostas"]}
        self.assertEqual(status_, {uma["id"]: "recusada", outra["id"]: "cancelada"})
        self.assertEqual(self._inventario(self.heroi_ana)["loot-dente-teste"]["quantidade"], 2)

    def test_proposta_confere_o_que_se_oferece_e_o_que_se_pede(self):
        with self.assertRaises(HTTPException):
            self._propor(self.ana, self.heroi_ana, self.heroi_bia, oferta={"itens": [{"item_id": "nao-tenho", "quantidade": 1}]})
        with self.assertRaises(HTTPException):
            self._propor(self.ana, self.heroi_ana, self.heroi_bia, oferta={"moedas": [{"moeda": "Lunaris", "valor": 5}]})
        with self.assertRaises(HTTPException):
            self._propor(self.ana, self.heroi_ana, self.estranho, pedido={"moedas": [{"moeda": "Lunaris", "valor": 5}]})

    def test_itens_para_pedir_mostram_so_o_que_viaja(self):
        self._dar(self.heroi_bia, "espada", 1)
        self._dar(self.heroi_bia, "lobo", 1, tipo="monstro")
        itens = itens_para_pedir(self.heroi_bia, self.heroi_ana, user=self.ana, database=self.database)["itens"]
        self.assertEqual([item["item_id"] for item in itens], ["espada"])
        with self.assertRaises(HTTPException):
            itens_para_pedir(self.heroi_bia, self.heroi_ana, user=self.bia, database=self.database)

    # -- loot ajustado na campanha -------------------------------------------

    def test_mestre_ajusta_o_loot_so_na_campanha_dele(self):
        sessao_id, bandido = self._cena_com_bandido()
        ajustar_tabela_de_loot(
            "bandido-teste", self.campanha_id,
            LootTableInput(itens=[{"item_id": "loot-raro-teste", "chance": 100, "quantidade": "2"}]),
            user=self.mestre, database=self.database,
        )
        tabela = tabela_de_loot("bandido-teste", self.campanha_id, user=self.mestre, database=self.database)
        self.assertTrue(tabela["ajustada"])
        self.assertEqual([item["item_id"] for item in tabela["itens"]], ["loot-raro-teste"])
        self.assertEqual(len(tabela["oficial"]["itens"]), 3)
        loot = rolar_loot_do_participante(sessao_id, bandido, ParticipantLootRollInput(), user=self.mestre, database=self.database)["loot"]
        self.assertEqual([(linha["item_id"], linha["quantidade"]) for linha in loot["linhas"]], [("loot-raro-teste", 2)])

        # A outra campanha continua com a tabela oficial.
        outra = tabela_de_loot("bandido-teste", self.outra_campanha_id, user=self.mestre, database=self.database)
        self.assertFalse(outra["ajustada"])
        self.assertEqual(len(outra["itens"]), 3)

        restaurar_tabela_de_loot("bandido-teste", self.campanha_id, user=self.mestre, database=self.database)
        self.assertFalse(tabela_de_loot("bandido-teste", self.campanha_id, user=self.mestre, database=self.database)["ajustada"])

    def test_ajuste_de_loot_valida_itens_e_permissao(self):
        with self.assertRaises(HTTPException) as erro:
            ajustar_tabela_de_loot(
                "bandido-teste", self.campanha_id,
                LootTableInput(itens=[{"item_id": "nao-existe", "chance": 50}]),
                user=self.mestre, database=self.database,
            )
        self.assertEqual(erro.exception.status_code, 422)
        with self.assertRaises(HTTPException) as erro:
            ajustar_tabela_de_loot(
                "bandido-teste", self.campanha_id,
                LootTableInput(itens=[{"item_id": "bandido-teste", "chance": 50}]),
                user=self.mestre, database=self.database,
            )
        self.assertEqual(erro.exception.status_code, 422)
        with self.assertRaises(HTTPException) as erro:
            ajustar_tabela_de_loot(
                "bandido-teste", self.campanha_id, LootTableInput(itens=[]),
                user=self.ana, database=self.database,
            )
        self.assertEqual(erro.exception.status_code, 403)


    # -- criatura sob medida ---------------------------------------------------

    def test_criatura_sob_medida_ganha_loot_pelo_vd_e_papel(self):
        with self.database.connection() as connection:
            for indice in range(4):
                connection.execute(
                    "INSERT INTO catalogo_itens (id, tipo, titulo, conteudo) VALUES (%s, 'drop', %s, %s)",
                    (f"mat-teste-{indice}", f"Material {indice}", Jsonb({"raridade": "comum", "usos": ["forja"]})),
                )
        sessao_id = abrir_sessao(
            SessionOpenInput(campanha_id=self.campanha_id, titulo="Sob medida"), user=self.mestre, database=self.database,
        )["sessao"]["id"]
        criada = adicionar_participante(
            sessao_id,
            ParticipantCreateInput(nome="Criatura de VD 3", vida_maxima=20, monstro_id="sob-medida-3-elite-bruto"),
            user=self.mestre, database=self.database,
        )
        participante = next(p for p in self._estado("mestre", self.mestre_id)["participantes"] if p["id"] == criada["id"])
        self.assertTrue(participante["tem_loot"])
        tabela = tabela_de_loot("sob-medida-3-elite-bruto", self.campanha_id, user=self.mestre, database=self.database)
        # Elite leva três linhas (100, 50, 15) e moedas da faixa de VD baixo.
        self.assertEqual([item["chance"] for item in tabela["itens"]], [100, 50, 15])
        self.assertTrue(all(item["item_id"].startswith("mat-teste-") for item in tabela["itens"]))
        self.assertEqual(tabela["moedas"]["dados"], "2d6")
        # A mesma criatura mostra sempre a mesma tabela.
        de_novo = tabela_de_loot("sob-medida-3-elite-bruto", self.campanha_id, user=self.mestre, database=self.database)
        self.assertEqual(tabela["itens"], de_novo["itens"])
        loot = rolar_loot_do_participante(sessao_id, criada["id"], ParticipantLootRollInput(), user=self.mestre, database=self.database)["loot"]
        # d100 fixo em 50: caem a linha de 100%, a de 50% e as moedas.
        self.assertEqual(len(loot["linhas"]), 3)

    # -- aflição pela Sessão ---------------------------------------------------

    def _ficha(self, personagem_id):
        with self.database.connection() as connection:
            return connection.execute("SELECT ficha FROM personagens WHERE id=%s", (personagem_id,)).fetchone()["ficha"]

    def test_mestre_aplica_e_ajusta_aflicao_pela_sessao(self):
        sessao = abrir_sessao(
            SessionOpenInput(campanha_id=self.campanha_id, titulo="Pântano", incluir_personagens=True),
            user=self.mestre, database=self.database,
        )
        ana = next(p for p in sessao["participantes"] if p["nome"] == "Ana")
        mexer_na_aflicao(
            sessao["sessao"]["id"], ana["id"],
            ParticipantAfflictionInput(acao="aplicar", aflicao_id="febre-dos-esporos", estagio=2, incubando=True, cansaco=1),
            user=self.mestre, database=self.database,
        )
        ficha = self._ficha(self.heroi_ana)
        self.assertEqual([(a["aflicaoId"], a["estagio"], a["incubando"]) for a in ficha["aflicoesAtivas"]], [("febre-dos-esporos", 2, True)])
        self.assertEqual(ficha["status"]["cansacoAtual"], 1)
        estado = self._estado("mestre", self.mestre_id)
        self.assertEqual(next(p for p in estado["participantes"] if p["nome"] == "Ana")["aflicoes"][0]["estagio"], 2)

        mexer_na_aflicao(
            sessao["sessao"]["id"], ana["id"],
            ParticipantAfflictionInput(acao="estagio", aflicao_id="febre-dos-esporos", estagio=3, cansaco=6),
            user=self.mestre, database=self.database,
        )
        ficha = self._ficha(self.heroi_ana)
        self.assertEqual(ficha["aflicoesAtivas"][0]["estagio"], 3)
        self.assertFalse(ficha["aflicoesAtivas"][0]["incubando"])
        self.assertEqual(ficha["status"]["cansacoAtual"], 6, "Cansaço para no teto de 6")

        mexer_na_aflicao(
            sessao["sessao"]["id"], ana["id"],
            ParticipantAfflictionInput(acao="remover", aflicao_id="febre-dos-esporos"),
            user=self.mestre, database=self.database,
        )
        self.assertEqual(self._ficha(self.heroi_ana)["aflicoesAtivas"], [])

    def test_aflicao_pela_sessao_so_para_o_mestre_e_so_em_quem_tem_ficha(self):
        sessao = abrir_sessao(
            SessionOpenInput(campanha_id=self.campanha_id, titulo="Pântano", incluir_personagens=True),
            user=self.mestre, database=self.database,
        )
        ana = next(p for p in sessao["participantes"] if p["nome"] == "Ana")
        with self.assertRaises(HTTPException) as erro:
            mexer_na_aflicao(
                sessao["sessao"]["id"], ana["id"],
                ParticipantAfflictionInput(acao="aplicar", aflicao_id="febre-dos-esporos"),
                user=self.ana, database=self.database,
            )
        self.assertEqual(erro.exception.status_code, 403)
        npc = adicionar_participante(
            sessao["sessao"]["id"], ParticipantCreateInput(nome="Capanga", vida_maxima=5),
            user=self.mestre, database=self.database,
        )
        with self.assertRaises(HTTPException) as erro:
            mexer_na_aflicao(
                sessao["sessao"]["id"], npc["id"],
                ParticipantAfflictionInput(acao="aplicar", aflicao_id="febre-dos-esporos"),
                user=self.mestre, database=self.database,
            )
        self.assertEqual(erro.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
