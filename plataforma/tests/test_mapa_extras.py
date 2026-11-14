"""Extras da mesa: aura do token, nota secreta, pausa, relógios, cronômetro, fala de NPC e
vista inicial (core/mesa_extras.py, routers/mapa_extras.py, routers/mapa.py)."""

from __future__ import annotations

import json
import os
import unittest
import uuid

import psycopg
import pytest
from psycopg import sql
from psycopg.conninfo import make_conninfo

from core import mapa, mesa_extras, tempo_real
from core.mesa_extras import ErroMesa

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


def test_aura_confere_raio_e_cor_e_a_escondida_e_so_de_quem_comanda():
    aura = mesa_extras.normalizar_aura({"raio": 99, "cor": "#ABCDEF"})
    assert aura == {"raio": 30.0, "cor": "#abcdef", "visivel": True, "estilo": "campo"}
    assert mesa_extras.normalizar_aura(None) is None
    with pytest.raises(ErroMesa):
        mesa_extras.normalizar_aura({"cor": "vermelho"})
    escondida = {"raio": 3, "cor": "#ff0000", "visivel": False}
    assert mesa_extras.aura_vista(escondida, gestor=False, dono=False) is None
    assert mesa_extras.aura_vista(escondida, gestor=False, dono=True)["raio"] == 3
    assert mesa_extras.aura_vista(escondida, gestor=True, dono=False)["raio"] == 3
    assert mesa_extras.aura_vista({"raio": "x"}, gestor=True, dono=True) is None


def test_aura_tem_estilo_e_sem_estilo_e_o_campo_de_sempre():
    for estilo in mesa_extras.ESTILOS_DE_AURA:
        assert mesa_extras.normalizar_aura({"raio": 2, "cor": "#7dd3fc", "estilo": estilo})["estilo"] == estilo
    assert mesa_extras.normalizar_aura({"raio": 2})["estilo"] == "campo"
    # Uma aura guardada antes dos estilos aparece como campo, sem erro.
    antiga = {"raio": 3, "cor": "#ff0000", "visivel": True}
    assert mesa_extras.aura_vista(antiga, gestor=False, dono=False)["estilo"] == "campo"
    for ruim in ("fogo", 3, ["campo"]):
        with pytest.raises(ErroMesa):
            mesa_extras.normalizar_aura({"estilo": ruim})
    assert len(mesa_extras.ESTILOS_DE_AURA) == 7


def test_mesa_junta_o_que_mudou_e_o_jogador_so_ve_o_que_esta_a_vista():
    mesa = mesa_extras.normalizar_mesa({"pausa": {"ligada": True, "texto": "  Volto   já  "}})
    assert mesa["pausa"] == {"ligada": True, "texto": "Volto já"}
    mesa = mesa_extras.normalizar_mesa({"relogios": [
        {"nome": "Ritual", "partes": 6, "cheias": 9},
        {"nome": "Alarme", "partes": 50, "cheias": -2, "visivel": False},
    ]}, mesa)
    assert mesa["pausa"]["ligada"], "o que não veio no pedido fica"
    assert [(r["nome"], r["partes"], r["cheias"]) for r in mesa["relogios"]] == [("Ritual", 6, 6), ("Alarme", 12, 0)]
    assert all(r["id"].startswith("r") for r in mesa["relogios"])
    agora = mesa_extras.agora_ms()
    mesa = mesa_extras.normalizar_mesa({"cronometro": {"nome": "Desabamento", "fim": agora + 60000, "visivel": False}}, mesa)
    assert mesa["cronometro"]["fim"] >= agora + 59000 and mesa["cronometro"]["restante"] is None
    parado = mesa_extras.normalizar_mesa({"cronometro": {"restante": 10**12}}, mesa)["cronometro"]
    assert (parado["fim"], parado["restante"]) == (None, mesa_extras.CRONOMETRO_MAX_MS)
    jogador = mesa_extras.mesa_de(mesa, gestor=False)
    assert [r["nome"] for r in jogador["relogios"]] == ["Ritual"] and jogador["cronometro"] is None
    assert len(mesa_extras.mesa_de(mesa, gestor=True)["relogios"]) == 2
    with pytest.raises(ErroMesa):
        mesa_extras.normalizar_mesa({"relogios": [{}] * 13})
    # Registro quebrado não deixa a mesa presa em pausa.
    assert mesa_extras.ler_mesa("lixo") == mesa_extras.mesa_vazia()


def test_fala_e_vista_conferidas():
    fala = mesa_extras.normalizar_fala({"nome": "", "texto": "  Quem vem lá?  ", "token": "t1"})
    assert fala == {"nome": "Mestre", "texto": "Quem vem lá?", "token": "t1"}
    with pytest.raises(ErroMesa):
        mesa_extras.normalizar_fala({"texto": "   "})
    assert mesa_extras.normalizar_vista({"x": -5, "y": 9999, "zoom": 9}, 1000, 800) == {"x": 0.0, "y": 800.0, "zoom": 4.0}
    assert mesa_extras.normalizar_vista(None, 10, 10) is None
    assert mesa_extras.ler_vista({"vista": {"x": 1, "y": 2, "zoom": 0.5}}) == {"x": 1.0, "y": 2.0, "zoom": 0.5}
    assert mesa_extras.ler_vista({"vista": {"x": True, "y": 2, "zoom": 1}}) is None


def test_nota_secreta_e_conferida():
    base = {"id": str(uuid.uuid4()), "texto": "Armadilha", "x": 10, "y": 10}
    assert mapa.normalizar_anotacoes([{**base, "secreta": True}], 100, 100)[0]["secreta"] is True
    assert mapa.normalizar_anotacoes([base], 100, 100)[0]["secreta"] is False
    with pytest.raises(mapa.ErroMapa):
        mapa.normalizar_anotacoes([{**base, "secreta": "sim"}], 100, 100)


def test_fala_chega_a_toda_a_mesa_conectada():
    tempo_real._limpar_para_testes()
    mestre = tempo_real.Conexao(usuario_id="m", nome="M", gestor=True)
    ana = tempo_real.Conexao(usuario_id="ana", nome="Ana", gestor=False)
    for conexao in (mestre, ana):
        tempo_real.entrar("camp", conexao)
        conexao.tirar_agora()
    tempo_real.anunciar("camp", {"t": "fala", "nome": "Velho", "texto": "Cuidado.", "token": None})
    for conexao in (mestre, ana):
        falas = [m for m in map(json.loads, conexao.tirar_agora()) if m["t"] == "fala"]
        assert falas and falas[0]["texto"] == "Cuidado." and "ts" in falas[0]
    assert "mesa" in tempo_real.CAMPOS_DO_ESTADO


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class MesaExtrasBancoTests(unittest.TestCase):
    def setUp(self):
        from core.database import Database
        from core.dependencies import AuthenticatedUser

        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha_id = uuid.uuid4()

        def usuario(email, nome, papel, plataforma="player"):
            pessoa = AuthenticatedUser(
                id=uuid.uuid4(), email=email, nome_exibicao=nome, admin_plataforma=False,
                papel_plataforma=plataforma, session_id=uuid.uuid4(), csrf_hash="hash",
            )
            with self.database.connection() as connection:
                connection.execute(
                    "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', %s)",
                    (pessoa.id, email, nome, plataforma),
                )
                if papel == "mestre":
                    connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, pessoa.id))
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                    (self.campanha_id, pessoa.id, papel),
                )
            return pessoa

        self.mestre = usuario("extras-mestre@example.com", "Mestre", "mestre", plataforma="mestre")
        self.ana = usuario("extras-ana@example.com", "Ana", "jogador")
        self.cena = uuid.uuid4()
        self.personagem = uuid.uuid4()
        self.token = uuid.uuid4()
        self.monstro = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, 'aberta', 'Noite 1', %s)",
                (uuid.uuid4(), self.campanha_id, self.mestre.id),
            )
            connection.execute(
                "INSERT INTO mapa_cenas (id, campanha_id, nome, largura, altura, ativa) VALUES (%s, %s, 'Clareira', 1000, 800, TRUE)",
                (self.cena, self.campanha_id),
            )
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, criado_por, nome) VALUES (%s, %s, %s, %s, 'Mira')",
                (self.personagem, self.campanha_id, self.ana.id, self.ana.id),
            )
            connection.execute(
                "INSERT INTO mapa_tokens (id, cena_id, personagem_id, x, y, lado) VALUES (%s, %s, %s, 150, 150, 'jogador')",
                (self.token, self.cena, self.personagem),
            )
            connection.execute(
                "INSERT INTO mapa_tokens (id, cena_id, nome, x, y, lado) VALUES (%s, %s, 'Lobo', 400, 400, 'inimigo')",
                (self.monstro, self.cena),
            )

    def tearDown(self):
        tempo_real._limpar_para_testes()
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _ver(self, quem):
        from routers import mapa as rotas

        return rotas.obter_mapa(self.campanha_id, None, user=quem, database=self.database)

    def _token(self, estado, token_id):
        return next(t for t in estado["tokens"] if t["id"] == str(token_id))

    def test_aura_do_dono_e_aura_escondida_do_mestre(self):
        from fastapi import HTTPException
        from routers import mapa as rotas

        rotas.editar_token(self.campanha_id, self.token, rotas.TokenEdicao(aura={"raio": 2, "cor": "#facc15"}), user=self.ana, database=self.database)
        self.assertEqual(self._token(self._ver(self.mestre), self.token)["aura"]["raio"], 2)
        rotas.editar_token(self.campanha_id, self.monstro, rotas.TokenEdicao(aura={"raio": 4, "cor": "#ef4444", "visivel": False}), user=self.mestre, database=self.database)
        self.assertIsNone(self._token(self._ver(self.ana), self.monstro)["aura"])
        self.assertEqual(self._token(self._ver(self.mestre), self.monstro)["aura"]["raio"], 4)
        # A jogadora não mexe na aura do token que não é dela.
        with self.assertRaises(HTTPException):
            rotas.editar_token(self.campanha_id, self.monstro, rotas.TokenEdicao(aura={"raio": 1}), user=self.ana, database=self.database)
        rotas.editar_token(self.campanha_id, self.token, rotas.TokenEdicao(sem_aura=True), user=self.ana, database=self.database)
        self.assertIsNone(self._token(self._ver(self.ana), self.token)["aura"])

    def test_mesa_vista_e_nota_secreta(self):
        from fastapi import HTTPException
        from routers import mapa as rotas
        from routers import mapa_extras as extras

        mesa = extras.mudar_mesa(self.campanha_id, {
            "pausa": {"ligada": True, "texto": "Lanche"},
            "relogios": [{"nome": "Ritual", "partes": 4, "cheias": 1}, {"nome": "Segredo", "visivel": False}],
        }, user=self.mestre, database=self.database)
        self.assertEqual(len(mesa["relogios"]), 2)
        visto = self._ver(self.ana)["mesa"]
        self.assertEqual((visto["pausa"]["texto"], [r["nome"] for r in visto["relogios"]]), ("Lanche", ["Ritual"]))
        with self.assertRaises(HTTPException):
            extras.mudar_mesa(self.campanha_id, {"pausa": {"ligada": False}}, user=self.ana, database=self.database)
        extras.mudar_mesa(self.campanha_id, {"pausa": {"ligada": False}}, user=self.mestre, database=self.database)
        self.assertFalse(self._ver(self.ana)["mesa"]["pausa"]["ligada"])
        self.assertEqual(len(self._ver(self.ana)["mesa"]["relogios"]), 1)

        extras.guardar_vista(self.campanha_id, self.cena, {"vista": {"x": 500, "y": 400, "zoom": 1.5}}, user=self.mestre, database=self.database)
        self.assertEqual(self._ver(self.ana)["cena"]["vista"], {"x": 500.0, "y": 400.0, "zoom": 1.5})
        extras.guardar_vista(self.campanha_id, self.cena, {"vista": None}, user=self.mestre, database=self.database)
        self.assertIsNone(self._ver(self.ana)["cena"]["vista"])

        notas = [
            {"id": str(uuid.uuid4()), "texto": "Bem-vindos", "x": 100, "y": 100},
            {"id": str(uuid.uuid4()), "texto": "Fosso aqui", "x": 300, "y": 300, "secreta": True},
        ]
        rotas.mudar_anotacoes(self.campanha_id, self.cena, rotas.AnotacoesInput(anotacoes=notas), user=self.mestre, database=self.database)
        self.assertEqual([a["texto"] for a in self._ver(self.ana)["cena"]["anotacoes"]], ["Bem-vindos"])
        self.assertEqual(len(self._ver(self.mestre)["cena"]["anotacoes"]), 2)

    def test_so_o_mestre_fala_pelos_npcs(self):
        from fastapi import HTTPException
        from routers import mapa_extras as extras

        self.assertTrue(extras.falar(self.campanha_id, {"nome": "Lobo", "texto": "Grrr"}, user=self.mestre, database=self.database)["ok"])
        with self.assertRaises(HTTPException):
            extras.falar(self.campanha_id, {"texto": "Oi"}, user=self.ana, database=self.database)
