"""Paredes vivas na mesa: portas que abrem, paredes que seguram o jogador e portais entre
cenas (core/paredes.py, core/mapa.py, core/tempo_real.py, routers/mapa.py)."""

from __future__ import annotations

import asyncio
import json
import os
import unittest
import uuid

import psycopg
import pytest
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core import construtor, mapa, paredes, tempo_real
from core.mapa import ErroMapa

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


def _sala_publicada(porta="fechada", secreta=True):
    """Sala de 3x2 casas no canto (casa de 100 px): porta embaixo (h,1,2), janela à direita
    (v,3,0) e, se pedir, uma porta secreta à esquerda (v,0,1)."""
    conteudo = construtor.conteudo_vazio(6, 4)
    conteudo["chao"] = ["LLL...", "LLL...", "......", "......"]
    paredes_sala = {}
    for x in range(3):
        paredes_sala[f"h,{x},0"] = "pedra"
        paredes_sala[f"h,{x},2"] = "pedra"
    for y in range(2):
        paredes_sala[f"v,0,{y}"] = "pedra"
        paredes_sala[f"v,3,{y}"] = "pedra"
    conteudo["paredes"] = paredes_sala
    conteudo["aberturas"] = {"h,1,2": {"tipo": "porta", "estado": porta}, "v,3,0": {"tipo": "janela", "estado": "fechada"}}
    if secreta:
        conteudo["aberturas"]["v,0,1"] = {"tipo": "secreta", "estado": "fechada"}
    return construtor.estrutura_publicada(conteudo, 100)


# ------------------------------------------------------------- bloqueio

def test_parede_e_porta_fechada_seguram_e_a_porta_aberta_deixa_passar():
    barram, vaos = paredes.barreiras(_sala_publicada("fechada"))
    # Para baixo, pela porta fechada: para um pouco antes do batente (y 200).
    x, y, barrou = paredes.caminho(150, 150, 150, 350, barram, vaos, 100)
    assert barrou and x == 150 and y == pytest.approx(170)
    # Para a direita, pela parede (x 300).
    x, y, barrou = paredes.caminho(150, 150, 450, 150, barram, vaos, 100)
    assert barrou and x == pytest.approx(270)
    # Pela janela também não passa.
    assert paredes.caminho(250, 50, 450, 50, barram, vaos, 100)[2]
    # Dentro da sala anda livre.
    assert paredes.caminho(50, 50, 250, 150, barram, vaos, 100) == (250, 150, False)
    # Porta aberta: passa pelo vão, mas não pela parede ao lado.
    barram, vaos = paredes.barreiras(_sala_publicada("aberta"))
    assert paredes.caminho(150, 150, 150, 350, barram, vaos, 100) == (150, 350, False)
    assert paredes.caminho(50, 150, 50, 350, barram, vaos, 100)[2]


def test_quina_nao_deixa_escorregar_e_sem_paredes_nada_barra():
    barram, vaos = paredes.barreiras(_sala_publicada())
    # Na diagonal, exatamente pelo canto de cima e da direita da sala.
    assert paredes.caminho(250, 50, 350, -50, barram, vaos, 100)[2]
    assert paredes.barreiras({}) == ([], [])
    assert paredes.barreiras(None) == ([], [])
    assert paredes.caminho(0, 0, 500, 500, [], [], 100) == (500, 500, False)


def test_porta_secreta_e_parede_ate_o_mestre_revelar_e_abrir():
    estrutura = _sala_publicada()
    barram, vaos = paredes.barreiras(estrutura)
    assert paredes.caminho(50, 150, -50, 150, barram, vaos, 100)[2]
    aberturas = paredes.mudar_porta(estrutura["aberturas"], "v,0,1", estado="aberta", revelar=True, gestor=True)
    revelada = next(a for a in aberturas if a["id"] == "v,0,1")
    assert (revelada["tipo"], revelada["estado"], revelada["era_secreta"]) == ("porta", "aberta", True)
    barram, vaos = paredes.barreiras({**estrutura, "aberturas": aberturas})
    assert paredes.caminho(50, 150, -50, 150, barram, vaos, 100)[2] is False
    # Escondida de novo, volta a ser secreta (e parede).
    de_volta = paredes.mudar_porta(aberturas, "v,0,1", estado="fechada", revelar=False, gestor=True)
    assert next(a for a in de_volta if a["id"] == "v,0,1")["tipo"] == "secreta"


def test_regras_da_porta_para_o_jogador():
    aberturas = _sala_publicada()["aberturas"]
    aberta = paredes.mudar_porta(aberturas, "h,1,2", estado="aberta", revelar=None, gestor=False, perto=True)
    assert next(a for a in aberta if a["id"] == "h,1,2")["estado"] == "aberta"

    def recusa(codigo, **extra):
        argumentos = {"estado": "aberta", "revelar": None, "gestor": False, "perto": True, **extra}
        porta = argumentos.pop("porta", "h,1,2")
        lista = argumentos.pop("lista", aberturas)
        with pytest.raises(paredes.ErroPorta) as erro:
            paredes.mudar_porta(lista, porta, **argumentos)
        assert erro.value.codigo == codigo

    recusa(403, perto=False)
    recusa(404, porta="v,0,1")
    recusa(404, a_vista=False)
    recusa(404, porta="h,9,9")
    recusa(409, estado="trancada")
    recusa(403, revelar=True)
    recusa(422, porta="v,3,0")
    trancada = paredes.mudar_porta(aberturas, "h,1,2", estado="trancada", revelar=None, gestor=True)
    recusa(409, lista=trancada)
    # O jogador não fica sabendo que a porta já foi secreta.
    revelada = paredes.mudar_porta(aberturas, "v,0,1", estado=None, revelar=True, gestor=True)
    vistas = construtor.aberturas_de(revelada, gestor=False, revelado=lambda _x, _y: True)
    assert all("era_secreta" not in a for a in vistas)
    assert sorted(a["id"] for a in vistas) == ["h,1,2", "v,0,1", "v,3,0"]


# ------------------------------------------------------------- portais entre cenas

def test_portal_entre_cenas_so_vai_e_a_saida_fica_na_outra_cena():
    destino = str(uuid.uuid4())
    portal = mapa.normalizar_portais(
        [{"a": {"x": 100, "y": 100}, "b": {"x": 2500, "y": 1800}, "cena": destino, "mao": "dupla"}],
        1000, 1000, {destino: (3000, 2000, "Floresta")},
    )[0]
    assert (portal["cena"], portal["cena_nome"], portal["mao"]) == (destino, "Floresta", "unica")
    assert portal["b"] == {"x": 2500.0, "y": 1800.0}
    with pytest.raises(ErroMapa):
        mapa.normalizar_portais([{"a": {"x": 1, "y": 1}, "b": {"x": 1, "y": 1}, "cena": str(uuid.uuid4())}], 1000, 1000, {})
    # Lido do que ficou gravado (sem a lista das cenas), continua igual.
    assert mapa.normalizar_portais([portal], 1000, 1000) == [portal]
    # O jogador vê a entrada, mas não a saída nem o nome da outra cena.
    visto = mapa.portais_de([portal], gestor=False, revelado=lambda _x, _y: True)[0]
    assert visto["b"] is None and "cena" not in visto and "cena_nome" not in visto
    # Só a entrada leva.
    assert mapa.portal_atingido([portal], 100, 100, 100, gestor=False)[1] == (2500.0, 1800.0)
    assert mapa.portal_atingido([portal], 2500, 1800, 100, gestor=False) is None


# ------------------------------------------------------------- tempo real

def _conexao(usuario, gestor=False):
    return tempo_real.Conexao(usuario_id=usuario, nome=usuario.title(), gestor=gestor)


def _mensagens(conexao):
    return [m for m in (json.loads(t) for t in conexao.tirar_agora()) if m["t"] != "presenca"]


def test_no_tempo_real_a_parede_segura_o_jogador_e_o_mestre_atravessa():
    async def cenario():
        tempo_real._limpar_para_testes()
        mestre, ana = _conexao("m", gestor=True), _conexao("ana")
        for c in (mestre, ana):
            tempo_real.entrar("camp", c)
        for c in (mestre, ana):
            _mensagens(c)
        barram, vaos = paredes.barreiras(_sala_publicada())
        regra = tempo_real.RegraToken(quem_ve="todos", donos=frozenset({"ana"}), movivel_livre=False, x=150, y=150)
        regras = tempo_real.Regras(
            cena_id="c1", livre=False, largura=600, altura=400, tokens={"t1": regra}, casa=100.0, barram=barram, vaos=vaos,
        )
        gravadas = []

        async def carregar():
            return regras

        async def gravar(token_id, x, y, cena=None):
            gravadas.append((token_id, round(x), round(y)))
            return True

        # Arrastando para fora pela porta fechada: a mesa vê o token parado no batente.
        await tempo_real.processar("camp", ana, {"t": "arrastar", "token": "t1", "x": 150, "y": 350}, carregar, gravar)
        assert [(m["t"], m["y"]) for m in _mensagens(mestre)] == [("arrastando", 170.0)]
        resposta = await tempo_real.processar("camp", ana, {"t": "soltar", "token": "t1", "x": 150, "y": 350}, carregar, gravar)
        assert resposta["barrado"] and (resposta["x"], resposta["y"]) == (150.0, 170.0)
        assert gravadas == [("t1", 150, 170)]
        assert (regra.x, regra.y) == (150.0, 170.0)
        # O Mestre leva o token para onde quiser.
        assert await tempo_real.processar("camp", mestre, {"t": "soltar", "token": "t1", "x": 150, "y": 350}, carregar, gravar) is None
        assert gravadas[-1] == ("t1", 150, 350)

    asyncio.run(cenario())


def test_no_tempo_real_o_portal_entre_cenas_leva_o_token_e_avisa_o_mestre():
    async def cenario():
        tempo_real._limpar_para_testes()
        mestre, ana = _conexao("m", gestor=True), _conexao("ana")
        for c in (mestre, ana):
            tempo_real.entrar("camp", c)
        for c in (mestre, ana):
            _mensagens(c)
        destino = str(uuid.uuid4())
        portal = mapa.normalizar_portais(
            [{"nome": "Arco", "a": {"x": 100, "y": 100}, "b": {"x": 400, "y": 300}, "cena": destino}], 1000, 1000,
            {destino: (1000, 1000, "Floresta")},
        )[0]
        regra = tempo_real.RegraToken(quem_ve="todos", donos=frozenset({"ana"}), movivel_livre=False, x=500, y=500)
        regras = tempo_real.Regras(cena_id="c1", livre=False, largura=1000, altura=1000, tokens={"t1": regra}, portais=[portal])
        levados = []

        async def carregar():
            return regras

        async def gravar(token_id, x, y, cena=None):
            levados.append((token_id, x, y, cena))
            return {"nome": "Mira", "cena_nome": "Floresta"} if cena else True

        resposta = await tempo_real.processar("camp", ana, {"t": "soltar", "token": "t1", "x": 100, "y": 100}, carregar, gravar)
        assert resposta == {"t": "portal_cena", "token": "t1", "fluxo": "espaco"}
        assert levados == [("t1", 400.0, 300.0, destino)]
        avisos = [m for m in _mensagens(mestre) if m["t"] == "aviso"]
        assert avisos and "Mira" in avisos[0]["texto"] and "Floresta" in avisos[0]["texto"]
        assert not [m for m in _mensagens(ana) if m["t"] == "aviso"]

    asyncio.run(cenario())


# ------------------------------------------------------------- banco

@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class ParedesVivasBancoTests(unittest.TestCase):
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

        self.mestre = usuario("paredes-mestre@example.com", "Mestre", "mestre", plataforma="mestre")
        self.ana = usuario("paredes-ana@example.com", "Ana", "jogador")
        self.cena = uuid.uuid4()
        self.fora = uuid.uuid4()
        self.personagem = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, 'aberta', 'Noite 1', %s)",
                (uuid.uuid4(), self.campanha_id, self.mestre.id),
            )
            connection.execute(
                "INSERT INTO mapa_cenas (id, campanha_id, nome, largura, altura, ativa, estrutura) VALUES (%s, %s, 'Cripta', 600, 400, TRUE, %s)",
                (self.cena, self.campanha_id, Jsonb(_sala_publicada())),
            )
            connection.execute(
                "INSERT INTO mapa_cenas (id, campanha_id, nome, largura, altura, ordem) VALUES (%s, %s, 'Floresta', 1000, 800, 1)",
                (self.fora, self.campanha_id),
            )
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, criado_por, nome) VALUES (%s, %s, %s, %s, 'Mira')",
                (self.personagem, self.campanha_id, self.ana.id, self.ana.id),
            )
            self.token = uuid.uuid4()
            connection.execute(
                "INSERT INTO mapa_tokens (id, cena_id, personagem_id, x, y, lado) VALUES (%s, %s, %s, 150, 150, 'jogador')",
                (self.token, self.cena, self.personagem),
            )

    def tearDown(self):
        tempo_real._limpar_para_testes()
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _porta(self, quem, porta, **dados):
        from routers import mapa as rotas

        return rotas.mudar_porta(self.campanha_id, self.cena, rotas.PortaInput(id=porta, **dados), user=quem, database=self.database)

    def _mover(self, quem, x, y):
        from routers import mapa as rotas

        return rotas.mover_token(self.campanha_id, self.token, rotas.PontoInput(x=x, y=y), user=quem, database=self.database)

    def _estado_da_porta(self, quem, porta):
        from routers import mapa as rotas

        cena = rotas.obter_mapa(self.campanha_id, None, user=quem, database=self.database)["cena"]
        return next((a for a in cena["aberturas"] if a["id"] == porta), None)

    def test_jogadora_abre_a_porta_ao_lado_e_passa_e_o_mestre_tranca(self):
        from fastapi import HTTPException

        # Porta fechada segura a jogadora.
        movido = self._mover(self.ana, 150, 350)
        self.assertTrue(movido["barrado"])
        self.assertAlmostEqual(movido["y"], 170)
        self._porta(self.ana, "h,1,2", estado="aberta")
        self.assertEqual(self._estado_da_porta(self.ana, "h,1,2")["estado"], "aberta")
        movido = self._mover(self.ana, 150, 350)
        self.assertFalse(movido["barrado"])
        self.assertEqual((movido["x"], movido["y"]), (150, 350))
        # Longe da porta não alcança.
        self._mover(self.ana, 550, 350)
        with self.assertRaises(HTTPException) as erro:
            self._porta(self.ana, "h,1,2", estado="fechada")
        self.assertEqual(erro.exception.status_code, 403)
        # O Mestre tranca de longe; a jogadora, mesmo ao lado, não abre.
        self._porta(self.mestre, "h,1,2", estado="trancada")
        self._mover(self.mestre, 150, 250)
        with self.assertRaises(HTTPException) as erro:
            self._porta(self.ana, "h,1,2", estado="aberta")
        self.assertEqual(erro.exception.status_code, 409)
        # O Mestre move o token por cima de qualquer parede.
        self.assertFalse(self._mover(self.mestre, 150, 50)["barrado"])

    def test_porta_secreta_nao_existe_para_a_jogadora_ate_o_mestre_revelar(self):
        from fastapi import HTTPException

        self.assertIsNone(self._estado_da_porta(self.ana, "v,0,1"))
        with self.assertRaises(HTTPException) as erro:
            self._porta(self.ana, "v,0,1", estado="aberta")
        self.assertEqual(erro.exception.status_code, 404)
        self._porta(self.mestre, "v,0,1", revelar=True)
        vista = self._estado_da_porta(self.ana, "v,0,1")
        self.assertEqual((vista["tipo"], vista["estado"]), ("porta", "fechada"))
        self.assertNotIn("era_secreta", vista)
        # Revelada mas fechada, ainda segura; aberta pela jogadora, passa.
        self._mover(self.mestre, 50, 150)
        self.assertTrue(self._mover(self.ana, 0, 150)["barrado"])
        self._porta(self.ana, "v,0,1", estado="aberta")
        self.assertFalse(self._mover(self.ana, 0, 150)["barrado"])

    def test_portal_leva_o_token_para_outra_cena_sem_duplicar_o_personagem(self):
        from routers import mapa as rotas

        rotas.mudar_portais(
            self.campanha_id, self.cena,
            rotas.PortaisInput(portais=[{"nome": "Arco", "a": {"x": 250, "y": 150}, "b": {"x": 900, "y": 700}, "cena": str(self.fora)}]),
            user=self.mestre, database=self.database,
        )
        # O personagem já tem um token na Floresta: aquele vai para a saída e este some.
        gemeo = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO mapa_tokens (id, cena_id, personagem_id, x, y) VALUES (%s, %s, %s, 10, 10)",
                (gemeo, self.fora, self.personagem),
            )
        resposta = self._mover(self.ana, 250, 150)
        self.assertEqual(resposta["travessia"]["cena"], str(self.fora))
        self.assertNotIn("cena_nome", resposta["travessia"])
        with self.database.connection() as connection:
            linhas = connection.execute("SELECT id, cena_id, x, y FROM mapa_tokens WHERE personagem_id=%s", (self.personagem,)).fetchall()
        self.assertEqual([(l["id"], l["cena_id"], l["x"], l["y"]) for l in linhas], [(gemeo, self.fora, 900, 700)])
        # Sem gêmeo, o próprio token muda de cena (e volta pelo portal de lá, feito pelo Mestre).
        rotas.mudar_portais(
            self.campanha_id, self.fora,
            rotas.PortaisInput(portais=[{"a": {"x": 900, "y": 700}, "b": {"x": 150, "y": 150}, "cena": str(self.cena)}]),
            user=self.mestre, database=self.database,
        )
        self.token = gemeo
        with self.database.connection() as connection:
            connection.execute("UPDATE mapa_cenas SET ativa = (id = %s) WHERE campanha_id=%s", (self.fora, self.campanha_id))
        volta = rotas.mover_token(self.campanha_id, gemeo, rotas.PontoInput(x=880, y=690), user=self.mestre, database=self.database)
        self.assertEqual(volta["travessia"]["cena_nome"], "Cripta")
        with self.database.connection() as connection:
            linha = connection.execute("SELECT cena_id, x, y FROM mapa_tokens WHERE id=%s", (gemeo,)).fetchone()
        self.assertEqual((linha["cena_id"], linha["x"], linha["y"]), (self.cena, 150, 150))
