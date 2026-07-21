"""Testes da fila e da resolução em lote, sem depender de Discord ou YouTube reais."""

import asyncio
import json
import sys
from pathlib import Path

import pytest

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core import musica


def test_discloud_instala_ffmpeg_do_sistema():
    config = (BASE / "discloud.config").read_text(encoding="utf-8")
    assert "APT=ffmpeg" in config.splitlines()
    assert musica.FFMPEG_EXECUTAVEL == "ffmpeg"
    assert musica.YDL_OPCOES["js_runtimes"]["deno"]["path"]


def test_valida_e_canonicaliza_link_spotify():
    track_id = "4cOdK2wGLETKBW3PvgPWqT"
    assert musica._url_spotify_track(
        f"https://open.spotify.com/intl-pt/track/{track_id}?si=segredo"
    ) == f"https://open.spotify.com/track/{track_id}"
    assert musica._url_spotify_track(f"spotify:track:{track_id}") == (
        f"https://open.spotify.com/track/{track_id}"
    )
    assert musica._url_spotify_track("Bohemian Rhapsody") is None


def test_valida_e_canonicaliza_link_youtube():
    video_id = "jNQXAC9IVRw"
    esperado = f"https://www.youtube.com/watch?v={video_id}"
    assert musica._url_youtube_video(f"https://youtu.be/{video_id}?si=segredo") == esperado
    assert musica._url_youtube_video(f"https://music.youtube.com/watch?v={video_id}") == esperado
    assert musica._url_youtube_video("Never Gonna Give You Up") is None


@pytest.mark.parametrize(
    "link",
    [
        "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
        "http://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
        "https://open.spotify.com/track/id-curto",
    ],
)
def test_recusa_link_spotify_ambiguo_ou_invalido(link):
    with pytest.raises(musica.ErroMusica):
        musica._url_spotify_track(link)


def test_oembed_spotify_tem_limite_timeout_e_titulo(monkeypatch):
    chamadas = {}

    class Resposta:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return None

        def read(self, limite):
            chamadas["limite"] = limite
            return json.dumps({"title": "Never Gonna Give You Up"}).encode()

    def abrir(requisicao, timeout):
        chamadas["url"] = requisicao.full_url
        chamadas["timeout"] = timeout
        return Resposta()

    monkeypatch.setattr(musica, "urlopen", abrir)
    titulo = musica._titulo_spotify(
        "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"
    )

    assert titulo == "Never Gonna Give You Up"
    assert chamadas["url"].startswith(musica.SPOTIFY_OEMBED)
    assert chamadas["timeout"] == musica.SPOTIFY_TIMEOUT_S
    assert chamadas["limite"] == 64 * 1024


def test_buscar_spotify_usa_metadado_e_busca_audio_no_youtube(monkeypatch):
    consultas = []
    track_id = "4cOdK2wGLETKBW3PvgPWqT"
    url_spotify = f"https://open.spotify.com/track/{track_id}"

    class YDL:
        def __init__(self, opcoes):
            assert opcoes["ignoreerrors"] is True

        def __enter__(self):
            return self

        def __exit__(self, *_):
            return None

        def extract_info(self, consulta, download):
            consultas.append((consulta, download))
            return {
                "entries": [{
                    "title": "Never Gonna Give You Up (Official Video)",
                    "url": "https://audio.invalid/faixa",
                    "webpage_url": "https://youtube.com/watch?v=falso",
                    "duration": 213,
                }]
            }

    monkeypatch.setattr(musica, "_titulo_spotify", lambda _: "Never Gonna Give You Up")
    monkeypatch.setattr(musica.yt_dlp, "YoutubeDL", YDL)

    faixa = asyncio.run(musica.buscar_faixa(url_spotify, solicitante_id=42))

    assert consultas == [("scsearch5:Never Gonna Give You Up", False)]
    assert faixa.url_pagina == url_spotify
    assert faixa.origem_audio == "spotify-espelhado"
    assert "SoundCloud" in faixa.observacao_origem()


def test_buscar_youtube_usa_oembed_e_espelha_no_soundcloud(monkeypatch):
    consultas = []
    url_youtube = "https://www.youtube.com/watch?v=jNQXAC9IVRw"

    class YDL:
        def __init__(self, _):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_):
            return None

        def extract_info(self, consulta, download):
            consultas.append((consulta, download))
            return {"entries": [{"title": "Me at the zoo", "url": "https://audio.invalid", "duration": 19}]}

    monkeypatch.setattr(musica, "_metadados_youtube", lambda _: ("Me at the zoo", "jawed"))
    monkeypatch.setattr(musica.yt_dlp, "YoutubeDL", YDL)

    faixa = asyncio.run(musica.buscar_faixa(url_youtube, solicitante_id=42))

    assert consultas == [("scsearch5:Me at the zoo jawed", False)]
    assert faixa.url_pagina == url_youtube
    assert faixa.origem_audio == "youtube-espelhado"
    assert "SoundCloud" in faixa.observacao_origem()


def _faixa(titulo: str) -> musica.Faixa:
    return musica.Faixa(
        titulo=titulo,
        url_stream=f"https://stream.invalid/{titulo}",
        url_pagina=f"https://pagina.invalid/{titulo}",
        duracao_s=61,
        solicitante_id=1,
    )


def test_fila_preserva_ordem_e_posicao():
    fila = musica.FilaServidor(guild_id=1)
    assert fila.adicionar(_faixa("a")) == 1
    assert fila.adicionar(_faixa("b")) == 2
    assert fila.proxima().titulo == "a"
    assert fila.proxima().titulo == "b"
    assert fila.proxima() is None


def test_limpar_remove_atual_fila_e_fonte():
    fila = musica.FilaServidor(guild_id=1)
    fila.adicionar(_faixa("a"))
    fila.proxima()
    fila.fonte_atual = object()
    fila.adicionar(_faixa("b"))

    fila.limpar()

    assert list(fila.faixas) == []
    assert fila.atual is None
    assert fila.fonte_atual is None


def test_gerenciador_isola_filas_por_servidor():
    gerenciador = musica.GerenciadorMusica()
    assert gerenciador.fila(1) is gerenciador.fila(1)
    assert gerenciador.fila(1) is not gerenciador.fila(2)


def test_busca_em_lote_preserva_sucessos_e_falhas(monkeypatch):
    async def buscar(consulta, solicitante_id):
        if consulta == "falha":
            raise musica.ErroMusica("falhou")
        return _faixa(consulta)

    monkeypatch.setattr(musica, "buscar_faixa", buscar)
    resultados = asyncio.run(
        musica.buscar_faixas_em_lote(["a", "falha", "b"], solicitante_id=1, concorrencia=2)
    )

    assert resultados[0].titulo == "a"
    assert isinstance(resultados[1], musica.ErroMusica)
    assert resultados[2].titulo == "b"


def test_tocar_proxima_configura_volume_e_callback(monkeypatch):
    fontes = []

    class FonteOpus:
        def __init__(self, *args, **kwargs):
            self.args = args
            self.kwargs = kwargs

    class VoiceClient:
        def play(self, fonte, after):
            fontes.append((fonte, after))

    monkeypatch.setattr(musica.discord, "FFmpegOpusAudio", FonteOpus)

    gerenciador = musica.GerenciadorMusica()
    fila = gerenciador.fila(1)
    fila.volume = 0.75
    faixa = _faixa("teste")
    fila.adicionar(faixa)
    callback = object()

    iniciada = gerenciador.tocar_proxima(VoiceClient(), 1, callback)

    assert iniciada is faixa
    assert fila.atual is faixa
    assert fila.fonte_atual.args == (faixa.url_stream,)
    assert fila.fonte_atual.kwargs["executable"] == musica.FFMPEG_EXECUTAVEL
    assert "volume=0.75" in fila.fonte_atual.kwargs["options"]
    assert fontes == [(fila.fonte_atual, callback)]
