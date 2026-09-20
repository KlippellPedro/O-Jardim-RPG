"""Gera as falas do painel de subida de nivel (voz do Grande Sabio).

Le os nomes de classes e as recompensas de data/ficha/classes.json e sintetiza
cada peca de fala com uma voz neural em portugues (edge-tts), gravando em
public/audio/sabio/ junto com um manifest.json. O painel monta as frases
juntando pecas (ex.: "Guerreiro" + "chegou ao nivel" + "tres"); o que nao
estiver no manifest cai na voz do navegador.

Provedores:
    openai (padrao)  gpt-4o-mini-tts, aceita instrucoes de tom. Precisa da
                     variavel de ambiente OPENAI_API_KEY (nao vai para o repo).
    edge             voz neural gratuita da Microsoft (pip install edge-tts).

Uso:
    python tools/gerar-voz-sabio.py                      # gera so o que falta
    python tools/gerar-voz-sabio.py --refazer            # regrava tudo
    python tools/gerar-voz-sabio.py --voz coral          # outra voz da OpenAI
    python tools/gerar-voz-sabio.py --provedor edge      # voz gratuita

Rode de novo sempre que classes ou recompensas mudarem. A chave de cada peca
precisa bater com a de src/pages/Ficha/components/vozGrandeSabio.ts.
"""
import argparse
import asyncio
import hashlib
import json
from pathlib import Path

import os
import urllib.request

RAIZ = Path(__file__).resolve().parent.parent
CLASSES = RAIZ / "data" / "ficha" / "classes.json"
SAIDA = RAIZ / "public" / "audio" / "sabio"
MAX_NUMERO = 99

MODELO_OPENAI = "gpt-4o-mini-tts"
VOZ_PADRAO = {"openai": "sage", "edge": "pt-BR-FranciscaNeural"}
INSTRUCOES = (
    "Fale em português do Brasil com a voz de uma inteligência sábia e serena: "
    "feminina, calma, levemente grave, dicção clara e ritmo pausado. Tom "
    "constante e natural, sem exagero de emoção. Leia apenas o texto, sem "
    "acrescentar nada."
)

UNIDADES = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
            "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete",
            "dezoito", "dezenove"]
DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"]

ROTULOS = ["Poder", "Habilidade", "Grau de perícia", "Evento", "Habilidade final", "Recompensa"]
FIXAS = ["Nível", "alcançado", "chegou ao nível", "Nova classe", "Vida", "Mana", "mais", "menos"]


def numero_por_extenso(n: int) -> str:
    if n < 20:
        return UNIDADES[n]
    dezena, unidade = divmod(n, 10)
    return DEZENAS[dezena] if unidade == 0 else f"{DEZENAS[dezena]} e {UNIDADES[unidade]}"


def pecas() -> dict[str, str]:
    """chave do manifest -> texto que a voz deve falar."""
    itens: dict[str, str] = {f"n:{n}": numero_por_extenso(n) for n in range(0, MAX_NUMERO + 1)}
    for texto in FIXAS + ROTULOS:
        itens[texto] = texto

    dados = json.loads(CLASSES.read_text(encoding="utf-8"))
    lista = dados if isinstance(dados, list) else next(v for v in dados.values() if isinstance(v, list))
    for classe in lista:
        if not isinstance(classe, dict) or not classe.get("id") or not classe.get("titulo"):
            continue
        itens[classe["titulo"]] = classe["titulo"]
        for marco in classe.get("progressao") or []:
            for recompensa in marco.get("recompensas") or []:
                if recompensa.get("titulo"):
                    itens[recompensa["titulo"]] = recompensa["titulo"]
    return itens


def nome_arquivo(chave: str) -> str:
    return hashlib.sha1(chave.encode("utf-8")).hexdigest()[:12] + ".mp3"


def sintetizar_openai(texto: str, voz: str, destino: Path) -> None:
    chave = os.environ.get("OPENAI_API_KEY", "").strip()
    if not chave:
        raise SystemExit("Defina a variavel de ambiente OPENAI_API_KEY antes de rodar.")
    corpo = json.dumps({
        "model": MODELO_OPENAI,
        "voice": voz,
        "input": texto,
        "instructions": INSTRUCOES,
        "response_format": "mp3",
    }).encode("utf-8")
    pedido = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=corpo,
        headers={"Authorization": f"Bearer {chave}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(pedido, timeout=60) as resposta:
        destino.write_bytes(resposta.read())


async def sintetizar_edge(texto: str, voz: str, destino: Path) -> None:
    import edge_tts

    await edge_tts.Communicate(texto, voz, rate="-4%", pitch="-2Hz").save(str(destino))


async def gerar(provedor: str, voz: str, refazer: bool) -> None:
    SAIDA.mkdir(parents=True, exist_ok=True)
    itens = pecas()

    # Trocar de provedor ou de voz invalida as pecas ja gravadas: regrava tudo.
    manifest_atual = SAIDA / "manifest.json"
    if manifest_atual.exists() and not refazer:
        anterior = json.loads(manifest_atual.read_text(encoding="utf-8"))
        if (anterior.get("provedor", "edge"), anterior.get("voz")) != (provedor, voz):
            print("Provedor ou voz mudou: regravando todas as pecas.")
            refazer = True
    limite = asyncio.Semaphore(4)
    novos = 0

    async def uma(chave: str, texto: str) -> None:
        nonlocal novos
        destino = SAIDA / nome_arquivo(chave)
        if destino.exists() and not refazer:
            return
        async with limite:
            for tentativa in range(3):
                try:
                    if provedor == "openai":
                        await asyncio.to_thread(sintetizar_openai, texto, voz, destino)
                    else:
                        await sintetizar_edge(texto, voz, destino)
                    novos += 1
                    return
                except SystemExit:
                    raise
                except Exception as erro:  # rede instavel ou limite de taxa: tenta de novo
                    if tentativa == 2:
                        print(f"FALHOU: {chave!r}: {erro}")
                    await asyncio.sleep(2 + tentativa * 3)

    await asyncio.gather(*(uma(chave, texto) for chave, texto in itens.items()))

    clips = {chave: nome_arquivo(chave) for chave in itens if (SAIDA / nome_arquivo(chave)).exists()}
    manifest = {"provedor": provedor, "voz": voz, "clips": clips}
    (SAIDA / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")

    # remove sobras de pecas que nao existem mais
    validos = set(clips.values()) | {"manifest.json"}
    for arquivo in SAIDA.iterdir():
        if arquivo.name not in validos:
            arquivo.unlink()

    tamanho = sum(a.stat().st_size for a in SAIDA.iterdir()) / 1024 / 1024
    print(f"{len(clips)}/{len(itens)} pecas prontas ({novos} novas), {tamanho:.1f} MB em {SAIDA}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--provedor", choices=["openai", "edge"], default="openai")
    ap.add_argument("--voz", help="voz do provedor (openai: sage, coral, nova, shimmer...)")
    ap.add_argument("--refazer", action="store_true")
    args = ap.parse_args()
    asyncio.run(gerar(args.provedor, args.voz or VOZ_PADRAO[args.provedor], args.refazer))
