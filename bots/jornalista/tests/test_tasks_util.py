"""registrar_reinicio_em_erro: sem @loop.error, uma exceção não tratada
dentro de um @tasks.loop mata o ciclo pra sempre até o bot reiniciar.
Nenhum dos 10 ciclos do Jornalista tinha isso."""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core.tasks_util import registrar_reinicio_em_erro


class _LoopFake:
    def __init__(self):
        self._handler = None
        self.restart_chamado = False

    def error(self, coro):
        self._handler = coro
        return coro

    def restart(self):
        self.restart_chamado = True


def test_registra_um_handler_de_erro():
    loop = _LoopFake()
    registrar_reinicio_em_erro(loop, "meu_ciclo", logging.getLogger("teste"))
    assert loop._handler is not None


def test_handler_reinicia_o_ciclo_ao_ser_chamado():
    loop = _LoopFake()
    registrar_reinicio_em_erro(loop, "meu_ciclo", logging.getLogger("teste"))

    asyncio.run(loop._handler(RuntimeError("boom")))

    assert loop.restart_chamado is True


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
