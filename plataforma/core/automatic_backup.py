"""Rotina de backup periódico da plataforma.

As cópias locais protegem contra exclusões acidentais e permitem restauração
rápida. Elas não substituem uma cópia baixada para outro serviço: se o app e o
seu disco forem perdidos juntos, os arquivos locais também desaparecem.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable

from core.backup import gerar_backup, nome_do_arquivo


log = logging.getLogger("jardim-plataforma")
PADRAO_ARQUIVO = "jardim-backup-*.jsonl.gz"


def _arquivos(directory: Path) -> list[Path]:
    return sorted(
        (path for path in directory.glob(PADRAO_ARQUIVO) if path.is_file()),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )


def salvar_backup_automatico(
    database,
    directory: Path,
    retention: int,
    *,
    generator: Callable = gerar_backup,
    moment: datetime | None = None,
) -> tuple[Path, dict]:
    """Gera uma cópia atômica e remove somente backups antigos do Jardim."""
    directory = directory.resolve()
    if directory == Path(directory.anchor):
        raise ValueError("o diretório raiz não pode ser usado para backups")

    directory.mkdir(parents=True, exist_ok=True)
    try:
        os.chmod(directory, 0o700)
    except OSError:
        pass

    content, summary = generator(database)
    destination = directory / nome_do_arquivo(moment)
    temporary = destination.with_name(f".{destination.name}.tmp")
    try:
        temporary.write_bytes(content)
        try:
            os.chmod(temporary, 0o600)
        except OSError:
            pass
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)

    for old_file in _arquivos(directory)[max(1, retention):]:
        old_file.unlink(missing_ok=True)

    return destination, summary


class AutomaticBackup:
    """Agenda cópias lógicas sem bloquear o loop HTTP do FastAPI."""

    def __init__(
        self,
        database,
        directory: Path,
        *,
        interval_hours: int,
        retention: int,
        generator: Callable = gerar_backup,
    ) -> None:
        self.database = database
        self.directory = directory.resolve()
        self.interval = timedelta(hours=interval_hours)
        self.retention = retention
        self.generator = generator
        self._stop = asyncio.Event()
        self._running = False
        self._last_error: str | None = None
        self._last_summary: dict | None = None

    def _latest(self) -> Path | None:
        if not self.directory.exists():
            return None
        files = _arquivos(self.directory)
        return files[0] if files else None

    def _seconds_until_due(self) -> float:
        latest = self._latest()
        if latest is None:
            return 0
        created = datetime.fromtimestamp(latest.stat().st_mtime, timezone.utc)
        remaining = (created + self.interval - datetime.now(timezone.utc)).total_seconds()
        return max(0, remaining)

    async def generate(self) -> tuple[Path, dict]:
        self._running = True
        self._last_error = None
        try:
            result = await asyncio.to_thread(
                salvar_backup_automatico,
                self.database,
                self.directory,
                self.retention,
                generator=self.generator,
            )
            self._last_summary = result[1]
            log.info(
                "Backup automatico criado: %s (%s registros).",
                result[0].name,
                result[1].get("linhas", 0),
            )
            return result
        except Exception as exc:
            self._last_error = str(exc)
            log.exception("Falha ao gerar backup automatico.")
            raise
        finally:
            self._running = False

    async def run(self) -> None:
        while not self._stop.is_set():
            delay = self._seconds_until_due()
            if delay:
                try:
                    await asyncio.wait_for(self._stop.wait(), timeout=delay)
                except TimeoutError:
                    pass
                continue

            try:
                await self.generate()
                retry_delay = self.interval.total_seconds()
            except Exception:
                retry_delay = min(900, self.interval.total_seconds())

            try:
                await asyncio.wait_for(self._stop.wait(), timeout=retry_delay)
            except TimeoutError:
                pass

    def stop(self) -> None:
        self._stop.set()

    def status(self) -> dict:
        latest = self._latest()
        files = _arquivos(self.directory) if self.directory.exists() else []
        next_at = None
        if latest:
            created = datetime.fromtimestamp(latest.stat().st_mtime, timezone.utc)
            next_at = (created + self.interval).isoformat()
        return {
            "ativo": True,
            "executando": self._running,
            "intervalo_horas": int(self.interval.total_seconds() // 3600),
            "retencao": self.retention,
            "arquivos": len(files),
            "ultimo_arquivo": latest.name if latest else None,
            "ultimo_em": (
                datetime.fromtimestamp(latest.stat().st_mtime, timezone.utc).isoformat()
                if latest else None
            ),
            "proximo_em": next_at,
            "ultimo_erro": self._last_error,
            "ultimo_resumo": self._last_summary,
        }
