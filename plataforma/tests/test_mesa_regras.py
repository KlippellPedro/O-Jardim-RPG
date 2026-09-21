"""Regras da mesa ao vivo (core/mesa.py). Sem banco: só estado, ação e papel."""

from __future__ import annotations

import unittest
from datetime import datetime, timezone

from core import mesa
from core.mesa import Ator, Contexto, ErroMesa

AGORA = datetime(2026, 9, 21, 20, 0, tzinfo=timezone.utc)
MESTRE, ANA, BRUNO = "u-mestre", "u-ana", "u-bruno"


def contexto(usuario: str, *, gestor: bool = False) -> Contexto:
    return Contexto(
        ator=Ator(usuario_id=usuario, gestor=gestor, nome=usuario),
        agora=AGORA,
        jogadores={ANA: "Ana", BRUNO: "Bruno"},
    )


GESTOR = contexto(MESTRE, gestor=True)


def fazer(estado, acao, dados, ctx=GESTOR):
    return mesa.aplicar(estado, acao, dados, ctx)


class AcoesTests(unittest.TestCase):
    def test_acao_original_nunca_e_alterada(self):
        estado = mesa.estado_inicial()
        novo, _ = fazer(estado, "relogio_criar", {"titulo": "A"})
        self.assertEqual(estado["relogios"], [])
        self.assertEqual(len(novo["relogios"]), 1)

    def test_jogador_nao_usa_acao_de_mestre(self):
        with self.assertRaises(ErroMesa) as erro:
            fazer(mesa.estado_inicial(), "relogio_criar", {"titulo": "A"}, contexto(ANA))
        self.assertEqual(erro.exception.codigo, 403)
        with self.assertRaises(ErroMesa) as erro:
            fazer(mesa.estado_inicial(), "acao_que_nao_existe", {})
        self.assertEqual(erro.exception.codigo, 404)


class VotacaoTests(unittest.TestCase):
    def aberta(self, **extra):
        estado, _ = fazer(mesa.estado_inicial(), "votacao_abrir", {"pergunta": "Entrar na cripta?", "opcoes": ["Sim", "Não", "Sim"], **extra})
        return estado

    def test_opcoes_repetidas_somem_e_o_minimo_e_dois(self):
        estado = self.aberta()
        self.assertEqual([o["texto"] for o in estado["votacao"]["opcoes"]], ["Sim", "Não"])
        with self.assertRaises(ErroMesa):
            fazer(mesa.estado_inicial(), "votacao_abrir", {"pergunta": "?", "opcoes": ["Só uma", "só uma"]})
        with self.assertRaises(ErroMesa):
            fazer(mesa.estado_inicial(), "votacao_abrir", {"pergunta": "?", "opcoes": [str(i) for i in range(7)]})

    def test_so_uma_votacao_aberta_por_vez(self):
        with self.assertRaises(ErroMesa) as erro:
            fazer(self.aberta(), "votacao_abrir", {"pergunta": "Outra", "opcoes": ["a", "b"]})
        self.assertEqual(erro.exception.codigo, 409)

    def test_voto_pode_ser_trocado_e_conta_uma_vez_por_jogador(self):
        estado = self.aberta()
        sim, nao = [o["id"] for o in estado["votacao"]["opcoes"]]
        estado, _ = fazer(estado, "votar", {"opcao_id": sim}, contexto(ANA))
        estado, _ = fazer(estado, "votar", {"opcao_id": nao}, contexto(ANA))
        visao = mesa.visao(estado, contexto(ANA))["votacao"]
        self.assertEqual((visao["total_votos"], visao["meu_voto"]), (1, nao))
        self.assertEqual([o["votos"] for o in visao["opcoes"]], [0, 1])

    def test_mestre_e_estranhos_nao_votam(self):
        estado = self.aberta()
        opcao = estado["votacao"]["opcoes"][0]["id"]
        with self.assertRaises(ErroMesa):
            fazer(estado, "votar", {"opcao_id": opcao}, GESTOR)
        with self.assertRaises(ErroMesa):
            fazer(estado, "votar", {"opcao_id": "inventada"}, contexto(ANA))

    def test_voto_aberto_mostra_nomes_e_anonimo_so_para_o_mestre(self):
        aberto = self.aberta()
        anonimo = self.aberta(anonima=True)
        for estado, jogador_ve_nomes in ((aberto, True), (anonimo, False)):
            opcao = estado["votacao"]["opcoes"][0]["id"]
            estado, _ = fazer(estado, "votar", {"opcao_id": opcao}, contexto(ANA))
            do_jogador = mesa.visao(estado, contexto(BRUNO))["votacao"]["opcoes"][0]
            do_mestre = mesa.visao(estado, GESTOR)["votacao"]["opcoes"][0]
            self.assertEqual("votantes" in do_jogador, jogador_ve_nomes)
            self.assertEqual(do_mestre["votantes"], ["Ana"])

    def test_fecha_sozinha_quando_todos_votam_e_guarda_o_resultado(self):
        estado = self.aberta()
        sim = estado["votacao"]["opcoes"][0]["id"]
        estado, _ = fazer(estado, "votar", {"opcao_id": sim}, contexto(ANA))
        estado, eventos = fazer(estado, "votar", {"opcao_id": sim}, contexto(BRUNO))
        self.assertIsNone(estado["votacao"])
        self.assertFalse(estado["ultima_votacao"]["aberta"])
        self.assertIn("Sim", eventos[-1]["texto"])
        self.assertEqual(mesa.visao(estado, contexto(ANA))["ultima_votacao"]["total_votos"], 2)
        with self.assertRaises(ErroMesa):
            fazer(estado, "votar", {"opcao_id": sim}, contexto(ANA))

    def test_mestre_fecha_com_resultado_no_evento(self):
        estado = self.aberta()
        estado, eventos = fazer(estado, "votacao_fechar", {})
        self.assertIn("Ninguém votou", eventos[0]["texto"])
        with self.assertRaises(ErroMesa):
            fazer(estado, "votacao_fechar", {})


class RelogioTests(unittest.TestCase):
    def test_fatias_validas_e_avanco_com_teto_e_piso(self):
        with self.assertRaises(ErroMesa):
            fazer(mesa.estado_inicial(), "relogio_criar", {"titulo": "X", "fatias": 5})
        estado, _ = fazer(mesa.estado_inicial(), "relogio_criar", {"titulo": "Ritual", "fatias": 4, "cor": "ritual"})
        rid = estado["relogios"][0]["id"]
        estado, _ = fazer(estado, "relogio_ajustar", {"relogio_id": rid, "delta": 3})
        estado, eventos = fazer(estado, "relogio_ajustar", {"relogio_id": rid, "delta": 5})
        self.assertEqual(estado["relogios"][0]["cheias"], 4)
        self.assertIn("completou", eventos[0]["texto"])
        estado, _ = fazer(estado, "relogio_ajustar", {"relogio_id": rid, "delta": -12})
        self.assertEqual(estado["relogios"][0]["cheias"], 0)

    def test_relogio_escondido_nao_chega_ao_jogador_nem_vai_ao_replay(self):
        estado, eventos = fazer(mesa.estado_inicial(), "relogio_criar", {"titulo": "Segredo", "fatias": 6, "visivel": False})
        self.assertEqual(eventos, [])
        rid = estado["relogios"][0]["id"]
        estado, eventos = fazer(estado, "relogio_ajustar", {"relogio_id": rid, "delta": 2})
        self.assertEqual(eventos, [])
        self.assertEqual(mesa.visao(estado, contexto(ANA))["relogios"], [])
        self.assertEqual(len(mesa.visao(estado, GESTOR)["relogios"]), 1)
        estado, _ = fazer(estado, "relogio_editar", {"relogio_id": rid, "visivel": True})
        self.assertEqual(len(mesa.visao(estado, contexto(ANA))["relogios"]), 1)

    def test_jogador_nao_mexe_no_relogio(self):
        estado, _ = fazer(mesa.estado_inicial(), "relogio_criar", {"titulo": "X", "fatias": 6})
        with self.assertRaises(ErroMesa):
            fazer(estado, "relogio_ajustar", {"relogio_id": estado["relogios"][0]["id"], "delta": 1}, contexto(ANA))

    def test_limite_de_relogios(self):
        estado = mesa.estado_inicial()
        for i in range(mesa.MAX_RELOGIOS):
            estado, _ = fazer(estado, "relogio_criar", {"titulo": f"R{i}", "fatias": 4})
        with self.assertRaises(ErroMesa):
            fazer(estado, "relogio_criar", {"titulo": "extra", "fatias": 4})


class BilheteTests(unittest.TestCase):
    def enviado(self):
        estado, eventos = fazer(mesa.estado_inicial(), "bilhete_enviar", {
            "para_usuario_id": ANA, "titulo": "Você viu algo", "texto": "Há um símbolo na parede.", "estilo": "runa",
        })
        return estado, eventos

    def test_so_o_destinatario_e_o_mestre_veem_o_bilhete(self):
        estado, _ = self.enviado()
        self.assertEqual(len(mesa.visao(estado, contexto(ANA))["bilhetes"]), 1)
        self.assertEqual(mesa.visao(estado, contexto(BRUNO))["bilhetes"], [])
        do_mestre = mesa.visao(estado, GESTOR)["bilhetes"][0]
        self.assertEqual((do_mestre["para_nome"], do_mestre["aberto_em"]), ("Ana", None))
        # O jogador nao recebe o id de outro jogador.
        self.assertNotIn("para_usuario_id", mesa.visao(estado, contexto(ANA))["bilhetes"][0])

    def test_bilhete_vai_para_o_replay_so_como_segredo(self):
        _, eventos = self.enviado()
        self.assertEqual([e["publico"] for e in eventos], [False])

    def test_so_o_destinatario_abre_e_o_mestre_ve_que_foi_lido(self):
        estado, _ = self.enviado()
        bilhete = estado["bilhetes"][0]["id"]
        with self.assertRaises(ErroMesa) as erro:
            fazer(estado, "bilhete_abrir", {"bilhete_id": bilhete}, contexto(BRUNO))
        self.assertEqual(erro.exception.codigo, 403)
        estado, eventos = fazer(estado, "bilhete_abrir", {"bilhete_id": bilhete}, contexto(ANA))
        self.assertIsNotNone(mesa.visao(estado, GESTOR)["bilhetes"][0]["aberto_em"])
        self.assertEqual(len(eventos), 1)
        _, repetido = fazer(estado, "bilhete_abrir", {"bilhete_id": bilhete}, contexto(ANA))
        self.assertEqual(repetido, [])

    def test_bilhete_para_quem_nao_e_jogador_e_recusado(self):
        with self.assertRaises(ErroMesa):
            fazer(mesa.estado_inicial(), "bilhete_enviar", {"para_usuario_id": MESTRE, "titulo": "x", "texto": "y"})
        with self.assertRaises(ErroMesa):
            fazer(mesa.estado_inicial(), "bilhete_enviar", {"para_usuario_id": ANA, "titulo": "x", "texto": "   "})

    def test_lotado_descarta_o_lido_mais_antigo_e_nunca_um_fechado(self):
        estado = mesa.estado_inicial()
        for i in range(mesa.MAX_BILHETES):
            estado, _ = fazer(estado, "bilhete_enviar", {"para_usuario_id": ANA, "titulo": f"B{i}", "texto": "t"})
        with self.assertRaises(ErroMesa):
            fazer(estado, "bilhete_enviar", {"para_usuario_id": ANA, "titulo": "novo", "texto": "t"})
        estado, _ = fazer(estado, "bilhete_abrir", {"bilhete_id": estado["bilhetes"][3]["id"]}, contexto(ANA))
        estado, _ = fazer(estado, "bilhete_enviar", {"para_usuario_id": ANA, "titulo": "novo", "texto": "t"})
        titulos = [b["titulo"] for b in estado["bilhetes"]]
        self.assertNotIn("B3", titulos)
        self.assertEqual(len(titulos), mesa.MAX_BILHETES)


if __name__ == "__main__":
    unittest.main()


class CronometroTests(unittest.TestCase):
    def _em(self, segundos):
        from datetime import timedelta
        return Contexto(
            ator=GESTOR.ator, agora=AGORA + timedelta(seconds=segundos),
            jogadores=GESTOR.jogadores,
        )

    def _criar(self, **extra):
        estado, _ = fazer(mesa.estado_inicial(), "cronometro_criar", {"titulo": "Bomba", "duracao_s": 300, **extra})
        return estado, estado["cronometros"][0]["id"]

    def test_criar_valida_duracao_e_nasce_parado(self):
        with self.assertRaises(ErroMesa):
            fazer(mesa.estado_inicial(), "cronometro_criar", {"titulo": "X", "duracao_s": 1})
        estado, _ = self._criar()
        visao = mesa.visao(estado, GESTOR)["cronometros"][0]
        self.assertEqual((visao["restante_s"], visao["situacao"]), (300, "parado"))

    def test_correr_pausar_e_zerar(self):
        estado, cid = self._criar()
        estado, _ = fazer(estado, "cronometro_iniciar", {"cronometro_id": cid})
        self.assertEqual(mesa.visao(estado, self._em(100))["cronometros"][0]["restante_s"], 200)
        estado, _ = fazer(estado, "cronometro_pausar", {"cronometro_id": cid}, self._em(100))
        visao = mesa.visao(estado, self._em(999))["cronometros"][0]
        self.assertEqual((visao["restante_s"], visao["situacao"]), (200, "pausado"))
        estado, _ = fazer(estado, "cronometro_iniciar", {"cronometro_id": cid}, self._em(1000))
        visao = mesa.visao(estado, self._em(1300))["cronometros"][0]
        self.assertEqual((visao["restante_s"], visao["situacao"]), (0, "zerado"))
        with self.assertRaises(ErroMesa):
            fazer(estado, "cronometro_pausar", {"cronometro_id": "x"})

    def test_ajustar_reiniciar_e_ocultar(self):
        estado, cid = self._criar(iniciar=True, visivel=False)
        estado, _ = fazer(estado, "cronometro_ajustar", {"cronometro_id": cid, "delta_s": 60})
        self.assertEqual(mesa.visao(estado, GESTOR)["cronometros"][0]["restante_s"], 360)
        self.assertEqual(mesa.visao(estado, contexto(ANA))["cronometros"], [])
        estado, _ = fazer(estado, "cronometro_reiniciar", {"cronometro_id": cid})
        self.assertEqual(mesa.visao(estado, GESTOR)["cronometros"][0]["situacao"], "parado")

    def test_jogador_nao_mexe_no_cronometro(self):
        estado, cid = self._criar()
        with self.assertRaises(ErroMesa):
            fazer(estado, "cronometro_iniciar", {"cronometro_id": cid}, contexto(ANA))
