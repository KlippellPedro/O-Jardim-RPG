"""O site abre o fundo de acordo com o calendário do mundo, então quem mexe no calendário avisa
o canal ao vivo (evento "calendario"). Sem banco: a conexão e as regras de acesso são falsas."""

from __future__ import annotations

import unittest
from contextlib import contextmanager
from types import SimpleNamespace
from unittest import mock
from uuid import uuid4

from fastapi import HTTPException

from core import calendario as regras
from core.calendario import ErroCalendario
from core.dependencies import AuthenticatedUser
from routers import calendario as roteador


class BancoFalso:
    def __init__(self):
        self.conexao = mock.MagicMock()

    @contextmanager
    def connection(self):
        yield self.conexao


def usuario() -> AuthenticatedUser:
    return AuthenticatedUser(uuid4(), "mestre@example.com", "Mestre", False, "player", uuid4(), "hash")


class CalendarioPublicaNoCanalAoVivoTests(unittest.TestCase):
    def setUp(self):
        self.campanha = uuid4()
        self.banco = BancoFalso()
        patches = [
            mock.patch.object(roteador, "require_campaign_master"),
            mock.patch.object(roteador, "_ler", return_value=regras.estado_inicial()),
            mock.patch.object(roteador, "_gravar"),
            mock.patch.object(roteador, "_sincronizar_discord"),
            mock.patch.object(roteador, "_avisar_a_mesa"),
        ]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)
        publicar = mock.patch.object(roteador.live_session, "publicar")
        self.publicar = publicar.start()
        self.addCleanup(publicar.stop)

    def test_mudou_o_calendario_avisa_o_canal_depois_de_gravar(self):
        ordem: list[str] = []
        roteador._gravar.side_effect = lambda *args, **kwargs: ordem.append("gravou")
        self.publicar.side_effect = lambda *args, **kwargs: ordem.append("avisou")
        roteador._alterar(self.campanha, usuario(), self.banco, lambda estado: None)
        self.publicar.assert_called_once_with(self.campanha, "calendario", 0)
        self.assertEqual(ordem, ["gravou", "avisou"], "o aviso só sai depois que o calendário foi gravado")

    def test_avancar_o_dia_avisa(self):
        roteador.avancar(self.campanha, SimpleNamespace(dias=1), usuario(), self.banco)
        self.publicar.assert_called_once_with(self.campanha, "calendario", 0)

    def test_estacao_especial_avisa(self):
        roteador.estacao_especial(self.campanha, SimpleNamespace(estacao="eclipse"), usuario(), self.banco)
        self.publicar.assert_called_once_with(self.campanha, "calendario", 0)

    def test_mudanca_recusada_nao_avisa_ninguem(self):
        def recusar(estado):
            raise ErroCalendario("data invalida", 400)

        with self.assertRaises(HTTPException) as erro:
            roteador._alterar(self.campanha, usuario(), self.banco, recusar)
        self.assertEqual(erro.exception.status_code, 400)
        self.publicar.assert_not_called()
        roteador._gravar.assert_not_called()

    def test_o_evento_nao_carrega_dado_nenhum(self):
        roteador._alterar(self.campanha, usuario(), self.banco, lambda estado: None)
        _, kwargs = self.publicar.call_args
        self.assertEqual(self.publicar.call_args.args[2], 0)
        self.assertNotIn("detalhes", kwargs)


if __name__ == "__main__":
    unittest.main()
