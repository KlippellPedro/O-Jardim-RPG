"""
Núcleo de música do Barista: busca/extração via yt-dlp e fila por servidor.

Abordagem escolhida (ver Analise_Infra_Discloud.md): tocar direto com
FFmpeg no processo do próprio bot, sem Lavalink — mais simples de operar e
cabe no orçamento de RAM atual da Discloud. Isso usa mais CPU/rede durante
a reprodução e depende do binário `ffmpeg` estar disponível no host.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, List, Optional, Union
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

import discord
import deno
import yt_dlp

from . import config

log = logging.getLogger("barista.musica")


class _YTDLPLogger:
    """Evita que candidatos descartados pelo ignoreerrors poluam o painel.

    Erros finais continuam virando DownloadError/ErroMusica e são registrados
    por ``buscar_faixa`` com o contexto da consulta feita pelo jogador.
    """

    def debug(self, mensagem: str) -> None:
        log.debug("yt-dlp: %s", mensagem)

    def warning(self, mensagem: str) -> None:
        log.debug("yt-dlp aviso: %s", mensagem)

    def error(self, mensagem: str) -> None:
        log.debug("yt-dlp candidato descartado: %s", mensagem)

# Reconecta streams instáveis em vez de morrer no primeiro soluço de rede.
FFMPEG_ANTES_OPCOES = "-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5"
FFMPEG_OPCOES = "-vn"
FFMPEG_EXECUTAVEL = "ffmpeg"
SPOTIFY_OEMBED = "https://open.spotify.com/oembed"
YOUTUBE_OEMBED = "https://www.youtube.com/oembed"
SPOTIFY_TIMEOUT_S = 8
_SPOTIFY_ID_RE = re.compile(r"^[A-Za-z0-9]{22}$")
_YOUTUBE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")

# O pacote oficial `deno` instala o executável junto do ambiente Python.
# O yt-dlp atual precisa de um runtime JavaScript externo para obter todos
# os formatos do YouTube de forma confiável.
DENO_EXECUTAVEL = deno.find_deno_bin()

YDL_OPCOES = {
    "format": "bestaudio/best",
    "noplaylist": True,
    "default_search": "scsearch5",
    "quiet": True,
    "no_warnings": True,
    "no_color": True,
    "logger": _YTDLPLogger(),
    "source_address": "0.0.0.0",
    "js_runtimes": {"deno": {"path": DENO_EXECUTAVEL}},
}

# Com cookies de uma conta YouTube, o Barista tenta o YouTube direto e só cai no
# SoundCloud se falhar. Sem cookies, o IP de datacenter da Discloud toma bloqueio
# anti-bot do YouTube, então a busca vai direto pro SoundCloud (comportamento antigo).
_COOKIES_YT = config.youtube_cookies_path()
YOUTUBE_DISPONIVEL = bool(_COOKIES_YT)
if _COOKIES_YT:
    YDL_OPCOES["cookiefile"] = _COOKIES_YT
    log.info("Cookies do YouTube em %s — YouTube direto ativado.", _COOKIES_YT)

VOLUME_PADRAO = 0.5


class ErroMusica(Exception):
    """Erro esperado (busca vazia, ffmpeg ausente, etc.) — mostrável ao usuário."""


@dataclass
class Faixa:
    titulo: str
    url_stream: str
    url_pagina: str
    duracao_s: Optional[int]
    solicitante_id: int
    origem_audio: str = "fonte informada"

    def duracao_fmt(self) -> str:
        if not self.duracao_s:
            return "ao vivo/desconhecida"
        minutos, segundos = divmod(int(self.duracao_s), 60)
        horas, minutos = divmod(minutos, 60)
        if horas:
            return f"{horas}:{minutos:02d}:{segundos:02d}"
        return f"{minutos}:{segundos:02d}"

    def observacao_origem(self) -> str:
        if self.origem_audio == "spotify-espelhado":
            return "\n*Link do Spotify; áudio correspondente localizado no SoundCloud.*"
        if self.origem_audio == "youtube-espelhado":
            return "\n*Link do YouTube; áudio correspondente localizado no SoundCloud.*"
        if self.origem_audio == "busca-soundcloud":
            return "\n*Áudio localizado no SoundCloud.*"
        return ""


def _url_spotify_track(consulta: str) -> Optional[str]:
    """Valida e canonicaliza um link/URI de faixa do Spotify.

    Retorna ``None`` quando a consulta não é Spotify. Links Spotify de álbum,
    artista ou playlist são recusados explicitamente: escolher uma faixa é
    necessário para não tocar algo diferente do que a pessoa pediu.
    """
    texto = consulta.strip()
    if texto.lower().startswith("spotify:"):
        partes = texto.split(":")
        if len(partes) == 3 and partes[1].lower() == "track" and _SPOTIFY_ID_RE.fullmatch(partes[2]):
            return f"https://open.spotify.com/track/{partes[2]}"
        raise ErroMusica("Use o link de uma faixa do Spotify, não de álbum ou playlist.")

    try:
        parsed = urlsplit(texto)
    except ValueError:
        return None
    host = (parsed.hostname or "").lower().rstrip(".")
    if host not in {"open.spotify.com", "www.open.spotify.com"}:
        return None
    if parsed.scheme.lower() != "https":
        raise ErroMusica("O link do Spotify precisa usar HTTPS.")

    partes = [parte for parte in parsed.path.split("/") if parte]
    if partes and partes[0].lower().startswith("intl-"):
        partes = partes[1:]
    if len(partes) < 2 or partes[0].lower() != "track":
        raise ErroMusica("Use o link de uma faixa do Spotify, não de álbum ou playlist.")
    track_id = partes[1]
    if not _SPOTIFY_ID_RE.fullmatch(track_id):
        raise ErroMusica("Esse link de faixa do Spotify é inválido.")
    return f"https://open.spotify.com/track/{track_id}"


def _titulo_spotify(url_track: str) -> str:
    """Obtém somente metadados públicos no oEmbed oficial do Spotify."""
    endpoint = f"{SPOTIFY_OEMBED}?{urlencode({'url': url_track})}"
    requisicao = Request(endpoint, headers={"User-Agent": "O-Jardim-Barista/1.0"})
    try:
        with urlopen(requisicao, timeout=SPOTIFY_TIMEOUT_S) as resposta:
            # O payload normal é pequeno; o limite evita consumo de memória
            # inesperado se o serviço remoto responder conteúdo incorreto.
            payload = resposta.read(64 * 1024)
        dados = json.loads(payload.decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, UnicodeError, json.JSONDecodeError) as exc:
        log.warning("Falha no oEmbed do Spotify para %s: %s", url_track, exc)
        raise ErroMusica(
            "Não consegui ler os dados dessa faixa no Spotify agora. Tenta pelo nome da música."
        ) from exc

    titulo = dados.get("title") if isinstance(dados, dict) else None
    if not isinstance(titulo, str) or not titulo.strip():
        raise ErroMusica("O Spotify não informou o título dessa faixa.")
    return titulo.strip()[:200]


def _url_youtube_video(consulta: str) -> Optional[str]:
    """Valida links públicos de vídeo do YouTube sem abrir URL arbitrária."""
    try:
        parsed = urlsplit(consulta.strip())
    except ValueError:
        return None
    host = (parsed.hostname or "").lower().rstrip(".")
    hosts_youtube = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"}
    if host not in hosts_youtube | {"youtu.be", "www.youtu.be"}:
        return None
    if parsed.scheme.lower() != "https":
        raise ErroMusica("O link do YouTube precisa usar HTTPS.")

    video_id = None
    partes = [parte for parte in parsed.path.split("/") if parte]
    if host in {"youtu.be", "www.youtu.be"} and partes:
        video_id = partes[0]
    elif parsed.path == "/watch":
        # parse_qs não é necessário aqui: queremos somente a primeira chave v
        # e o ID tem um alfabeto estrito.
        for item in parsed.query.split("&"):
            chave, _, valor = item.partition("=")
            if chave == "v":
                video_id = valor
                break
    elif len(partes) >= 2 and partes[0] in {"shorts", "live", "embed"}:
        video_id = partes[1]

    if not video_id or not _YOUTUBE_ID_RE.fullmatch(video_id):
        raise ErroMusica("Use o link de um vídeo/faixa do YouTube, não de canal ou playlist.")
    return f"https://www.youtube.com/watch?v={video_id}"


def _metadados_youtube(url_video: str) -> tuple[str, str]:
    """Lê título/autor pelo oEmbed oficial; não tenta extrair áudio do YouTube."""
    endpoint = f"{YOUTUBE_OEMBED}?{urlencode({'url': url_video, 'format': 'json'})}"
    requisicao = Request(endpoint, headers={"User-Agent": "O-Jardim-Barista/1.0"})
    try:
        with urlopen(requisicao, timeout=SPOTIFY_TIMEOUT_S) as resposta:
            payload = resposta.read(64 * 1024)
        dados = json.loads(payload.decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, UnicodeError, json.JSONDecodeError) as exc:
        log.warning("Falha no oEmbed do YouTube para %s: %s", url_video, exc)
        raise ErroMusica(
            "Não consegui ler os dados desse vídeo do YouTube agora. Tenta pelo nome da música."
        ) from exc

    titulo = dados.get("title") if isinstance(dados, dict) else None
    autor = dados.get("author_name") if isinstance(dados, dict) else None
    if not isinstance(titulo, str) or not titulo.strip():
        raise ErroMusica("O YouTube não informou o título desse vídeo.")
    return titulo.strip()[:200], autor.strip()[:100] if isinstance(autor, str) else ""


async def buscar_faixa(consulta: str, solicitante_id: int) -> Faixa:
    """Resolve uma busca ou URL num stream tocável. O yt-dlp é bloqueante,
    então roda numa thread separada pra não travar o loop do bot."""
    loop = asyncio.get_running_loop()

    def _extrair():
        url_spotify = _url_spotify_track(consulta)
        url_youtube = None if url_spotify else _url_youtube_video(consulta)
        eh_url = urlsplit(consulta.strip()).scheme.lower() in {"http", "https"}

        # Cada tentativa é (consulta_ydl, origem_audio, url_original). Com cookies,
        # o YouTube vem primeiro e o SoundCloud é o fallback; sem cookies, só o
        # SoundCloud (o YouTube bloqueia o IP de datacenter da Discloud).
        tentativas = []
        if url_spotify:
            # A API do Spotify não entrega o áudio completo para bots.
            titulo_spotify = _titulo_spotify(url_spotify)
            tentativas.append((f"scsearch5:{titulo_spotify}", "spotify-espelhado", url_spotify))
        elif url_youtube:
            if YOUTUBE_DISPONIVEL:
                tentativas.append((url_youtube, "youtube", url_youtube))
            try:
                titulo_youtube, autor_youtube = _metadados_youtube(url_youtube)
                tentativas.append(
                    (f"scsearch5:{titulo_youtube} {autor_youtube}".strip(), "youtube-espelhado", url_youtube)
                )
            except ErroMusica:
                if not tentativas:
                    raise  # sem YouTube direto e sem metadados: não há como tocar
        elif not eh_url:
            if YOUTUBE_DISPONIVEL:
                tentativas.append((f"ytsearch5:{consulta.strip()}", "busca-youtube", None))
            tentativas.append((f"scsearch5:{consulta.strip()}", "busca-soundcloud", None))
        else:
            # URL direta que não é Spotify nem YouTube (ex.: SoundCloud) — toca como veio.
            tentativas.append((consulta, "fonte informada", None))

        erro_download = None
        for consulta_ydl, origem_audio, url_original in tentativas:
            opcoes_ydl = dict(YDL_OPCOES)
            if consulta_ydl.startswith(("scsearch", "ytsearch")):
                # Buscas às vezes trazem itens DRM-only/indisponíveis; ignoreerrors
                # pula o item e mantém as próximas correspondências tocáveis.
                opcoes_ydl["ignoreerrors"] = True
            try:
                with yt_dlp.YoutubeDL(opcoes_ydl) as ydl:
                    info = ydl.extract_info(consulta_ydl, download=False)
                if info and "entries" in info:
                    entradas = [e for e in info["entries"] if e and e.get("url")]
                    info = entradas[0] if entradas else None
                if info and info.get("url"):
                    return info, url_original, origem_audio
            except yt_dlp.utils.DownloadError as exc:
                # Guarda o PRIMEIRO erro (o do YouTube, tentado antes) — é o mais
                # informativo (ex.: bloqueio anti-bot) que o "nada tocável" genérico.
                erro_download = erro_download or exc
                log.warning("Tentativa (%s) falhou, indo pro fallback: %s", origem_audio, exc)
        if erro_download is not None:
            raise erro_download
        raise ErroMusica("Não encontrei áudio tocável pra essa busca.")

    try:
        info, url_original, origem_audio = await loop.run_in_executor(None, _extrair)
    except ErroMusica:
        raise
    except yt_dlp.utils.DownloadError as exc:
        log.warning("Falha ao extrair \"%s\": %s", consulta, exc)
        texto_exc = str(exc).lower()
        if "sign in" in texto_exc or "confirm you" in texto_exc:
            raise ErroMusica(
                "O YouTube bloqueou esse link com uma verificação anti-bot "
                "(bloqueio do lado do YouTube pro IP do host, não é erro do "
                "comando). Tenta de novo em alguns segundos ou tenta outro "
                "link — nem todo vídeo é afetado."
            ) from exc
        raise ErroMusica(f"Não consegui carregar isso: {exc}") from exc

    if not info or not info.get("url"):
        raise ErroMusica("Não encontrei áudio tocável pra essa busca.")

    return Faixa(
        titulo=info.get("title") or "Sem título",
        url_stream=info["url"],
        url_pagina=url_original or info.get("webpage_url") or consulta,
        duracao_s=info.get("duration"),
        solicitante_id=solicitante_id,
        origem_audio=origem_audio,
    )


async def buscar_faixas_em_lote(
    consultas: List[str],
    solicitante_id: int,
    concorrencia: int = 4,
) -> List[Union[Faixa, ErroMusica]]:
    """Resolve várias consultas em paralelo, usado pelo /playlist_tocar.
    Limita a concorrência (em vez de disparar tudo de uma vez) pra não
    parecer uma rajada de bot pro YouTube. Cada posição do resultado é a
    Faixa resolvida ou o ErroMusica daquela consulta especificamente —
    uma falha isolada não derruba as outras."""
    semaforo = asyncio.Semaphore(max(1, concorrencia))

    async def _um(consulta: str):
        async with semaforo:
            try:
                return await buscar_faixa(consulta, solicitante_id)
            except ErroMusica as exc:
                return exc

    return await asyncio.gather(*(_um(c) for c in consultas))


@dataclass
class FilaServidor:
    """Fila de reprodução de um único servidor (guild)."""

    guild_id: int
    faixas: Deque[Faixa] = field(default_factory=deque)
    atual: Optional[Faixa] = None
    volume: float = VOLUME_PADRAO
    canal: Optional[discord.abc.Messageable] = None
    fonte_atual: Optional[discord.AudioSource] = None

    def adicionar(self, faixa: Faixa) -> int:
        self.faixas.append(faixa)
        return len(self.faixas)

    def proxima(self) -> Optional[Faixa]:
        self.atual = self.faixas.popleft() if self.faixas else None
        return self.atual

    def limpar(self) -> None:
        self.faixas.clear()
        self.atual = None
        self.fonte_atual = None


class GerenciadorMusica:
    """Uma fila por servidor + helper pra iniciar a reprodução da próxima faixa."""

    def __init__(self):
        self._filas: Dict[int, FilaServidor] = {}

    def fila(self, guild_id: int) -> FilaServidor:
        if guild_id not in self._filas:
            self._filas[guild_id] = FilaServidor(guild_id)
        return self._filas[guild_id]

    def tocar_proxima(self, voice_client: discord.VoiceClient, guild_id: int, ao_terminar) -> Optional[Faixa]:
        """Tira a próxima faixa da fila e manda o VoiceClient tocá-la.
        Devolve a faixa iniciada, ou None se a fila estava vazia."""
        fila = self.fila(guild_id)
        faixa = fila.proxima()
        if faixa is None:
            fila.fonte_atual = None
            return None

        try:
            # Entrega pacotes Opus prontos ao Discord. O pacote APT oficial da
            # Discloud fornece FFmpeg + codecs no contêiner; isso evita depender
            # da libopus compartilhada do Python e de binários estáticos que
            # podem não ser compatíveis com o ambiente da hospedagem.
            fonte = discord.FFmpegOpusAudio(
                faixa.url_stream,
                executable=FFMPEG_EXECUTAVEL,
                before_options=FFMPEG_ANTES_OPCOES,
                options=f"{FFMPEG_OPCOES} -filter:a volume={fila.volume}",
            )
        except discord.ClientException as exc:
            raise ErroMusica(f"Não consegui iniciar o áudio (ffmpeg): {exc}") from exc

        fila.fonte_atual = fonte
        voice_client.play(fonte, after=ao_terminar)
        return faixa
