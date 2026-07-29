"""Sem um @loop.error, uma exceção não tratada dentro de um @tasks.loop mata
o ciclo pra sempre (silenciosamente, até o bot reiniciar): é o que
`registrar_reinicio_em_erro` evita, reiniciando o ciclo sozinho."""

from __future__ import annotations

import logging


def registrar_reinicio_em_erro(loop, nome: str, log: logging.Logger) -> None:
    async def _ao_erro(erro: BaseException) -> None:
        log.exception("erro fatal no ciclo '%s': reiniciando sozinho", nome, exc_info=erro)
        loop.restart()

    loop.error(_ao_erro)
