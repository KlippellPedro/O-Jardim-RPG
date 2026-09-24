"""Gera as falas do painel de subida de nivel (voz do Grande Sabio).

Le os nomes de classes e as recompensas de data/ficha/classes.json e sintetiza
cada FRASE INTEIRA que o painel pode falar com a voz neural gratuita da
Microsoft (edge-tts), gravando em public/audio/sabio/ junto com um
manifest.json (chave = o texto exato mostrado na tela). O painel toca a frase
gravada e aplica por cima um leve efeito metalico com eco; o que nao estiver no
manifest cai na voz do navegador.

Por que a Francisca e nao a Thalita "Multilingual": a Thalita decide sozinha o
idioma de cada trecho e, nas linhas de Poder/Habilidade (nomes proprios em
portugues), 60% saiam em espanhol ou ingles ("Habilidade" virava "Habilidate").
Medido em 183 linhas: Francisca 100% em portugues e 95% de acerto, Thalita 40%
em portugues e 74% de acerto. A Francisca so fala portugues, entao nao escapa.

Por que frases inteiras: colar palavras soltas ("Guerreiro" + "chegou ao
nivel" + "tres") deixava a entonacao quebrada e fazia a voz escorregar para o
ingles ("Evento: Ringue" virava "Event Ring"). Medido com o Whisper, o erro
caiu de 39% para 22%. O SSML tambem declara pt-BR na raiz (o padrao da
biblioteca e en-US) e PRONUNCIAS corrige nomes estrangeiros.

Uso:
    pip install edge-tts
    python tools/gerar-voz-sabio.py              # gera so o que falta
    python tools/gerar-voz-sabio.py --refazer    # regrava tudo
    python tools/gerar-voz-sabio.py --voz pt-BR-FranciscaNeural

Trocar voz, taxa, tom ou pronuncias regrava tudo sozinho. Rode de novo sempre
que classes ou recompensas mudarem. As frases precisam bater com as montadas em
src/pages/Ficha/components/SubidaNivelHost.tsx.
"""
import argparse
import asyncio
import hashlib
import json
import sys
import unicodedata
from pathlib import Path

import edge_tts
from edge_tts import communicate

RAIZ = Path(__file__).resolve().parent.parent
CLASSES = RAIZ / "data" / "ficha" / "classes.json"
CONQUISTAS = RAIZ / "plataforma" / "core" / "conquistas.py"
MAGIAS = RAIZ / "data" / "ficha" / "magias.json"
FALAS_ANALISE = RAIZ / "src" / "pages" / "Ficha" / "utils" / "falasAnalise.json"
# Iguais a FRASES_APRENDIZADO em src/pages/Ficha/components/aprendizado.ts.
FRASES_APRENDIZADO = ("Magia aprendida", "Ritual aprendido", "Selo aprendido", "Encantamento aprendido")
SAIDA = RAIZ / "public" / "audio" / "sabio"

VOZ_PADRAO = "pt-BR-FranciscaNeural"
TAXA_PADRAO = "-8%"
TOM_PADRAO = "-6Hz"
MAX_NIVEL_TOTAL = 60
MAX_NIVEL_CLASSE = 20
MAX_GANHO = 60

# Nomes que a voz le errado. So muda o que e FALADO; a tela mostra o original.
PRONUNCIAS = {
    "Zanpakutō": "Zampacutô",
    "Kokusen": "Cocussên",
    "Konsō": "Cônsô",
    "Bankai": "Bancai",
    "Hackear": "Raquear",
    "Mise en Place": "Mizanplás",
    "Marketing": "Márquetin",
    "Km": "quilômetros",
}
ROTULO_TIPO = {
    "poder": "Poder", "habilidade": "Habilidade", "grau_pericia": "Grau de perícia",
    "evento": "Evento", "habilidade_final": "Habilidade final",
}


def sem_acento(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn").lower()


def fala_da_recompensa(tipo: str, titulo: str, quantidade: int = 1) -> str:
    """Mesma regra de descreverRecompensa em subidaNivel.ts (mantenha as duas iguais):
    nao repete o que a etiqueta ja diz."""
    if tipo == "grau_pericia":
        return "Mais um grau de perícia" if quantidade == 1 else f"Mais {quantidade} graus de perícia"
    rotulo = ROTULO_TIPO.get(tipo, "Recompensa")
    if sem_acento(titulo).startswith(sem_acento(rotulo) + " "):
        return titulo
    return f"{rotulo}: {titulo}"

UNIDADES = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
            "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete",
            "dezoito", "dezenove"]
DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"]


def _mkssml(tc, texto):
    """SSML com pt-BR na raiz (o padrao da biblioteca e en-US)."""
    if isinstance(texto, bytes):
        texto = texto.decode("utf-8")
    return (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='pt-BR'>"
        f"<voice name='{tc.voice}'>"
        f"<prosody pitch='{tc.pitch}' rate='{tc.rate}' volume='{tc.volume}'>{texto}</prosody>"
        "</voice></speak>"
    )


communicate.mkssml = _mkssml


def numero_por_extenso(n: int) -> str:
    if n < 20:
        return UNIDADES[n]
    dezena, unidade = divmod(n, 10)
    return DEZENAS[dezena] if unidade == 0 else f"{DEZENAS[dezena]} e {UNIDADES[unidade]}"


def falado(texto: str) -> str:
    for original, leitura in PRONUNCIAS.items():
        texto = texto.replace(original, leitura)
    return texto


def nomes_das_conquistas() -> list[str]:
    """Nomes do catalogo de conquistas do servidor (plataforma/core/conquistas.py)."""
    import importlib.util

    especificacao = importlib.util.spec_from_file_location("conquistas_catalogo", CONQUISTAS)
    modulo = importlib.util.module_from_spec(especificacao)
    sys.modules["conquistas_catalogo"] = modulo  # dataclass precisa do modulo registrado
    especificacao.loader.exec_module(modulo)
    return [conquista.nome for conquista in modulo.CATALOGO]


def frases() -> dict[str, str]:
    """texto mostrado na tela (chave do manifest) -> texto que a voz deve falar."""
    itens: dict[str, str] = {}

    for n in range(2, MAX_NIVEL_TOTAL + 1):
        itens[f"Nível {n} alcançado"] = f"Nível {numero_por_extenso(n)} alcançado"
    for rotulo in ("Vida", "Mana", "Estamina"):
        for n in range(1, MAX_GANHO + 1):
            itens[f"{rotulo} +{n}"] = f"{rotulo} mais {numero_por_extenso(n)}"

    # O Grande Sabio anuncia cada conquista: "Conquista desbloqueada" e o nome.
    itens["Conquista desbloqueada"] = "Conquista desbloqueada"
    for nome in nomes_das_conquistas():
        itens[nome] = nome

    # Analise do Grande Sabio: frases fixas, sem numeros (ver analiseSabio.ts).
    for fala in json.loads(FALAS_ANALISE.read_text(encoding="utf-8")).values():
        itens[fala] = fala

    # Painel de "aprendeu": a frase e o nome de cada magia, ritual, selo e encantamento.
    for frase in FRASES_APRENDIZADO:
        itens[frase] = frase
    catalogo_magico = json.loads(MAGIAS.read_text(encoding="utf-8"))
    for lista_magica in ("magias", "rituais", "selos", "encantamentos"):
        for entrada in catalogo_magico.get(lista_magica, []):
            if entrada.get("titulo"):
                itens[entrada["titulo"]] = entrada["titulo"]

    dados = json.loads(CLASSES.read_text(encoding="utf-8"))
    lista = dados if isinstance(dados, list) else next(v for v in dados.values() if isinstance(v, list))
    for classe in lista:
        if not isinstance(classe, dict) or not classe.get("id") or not classe.get("titulo"):
            continue
        nome = classe["titulo"]
        itens[f"Nova classe: {nome}"] = f"Nova classe: {nome}"
        for n in range(2, MAX_NIVEL_CLASSE + 1):
            itens[f"{nome} chegou ao nível {n}"] = f"{nome} chegou ao nível {numero_por_extenso(n)}"
        for marco in classe.get("progressao") or []:
            for recompensa in marco.get("recompensas") or []:
                if recompensa.get("titulo"):
                    linha = fala_da_recompensa(
                        recompensa.get("tipo", ""), recompensa["titulo"], recompensa.get("quantidade") or 1
                    )
                    itens[linha] = linha
    return {chave: falado(texto) for chave, texto in itens.items()}


def nome_arquivo(chave: str) -> str:
    return hashlib.sha1(chave.encode("utf-8")).hexdigest()[:12] + ".mp3"


async def sintetizar(texto: str, voz: str, taxa: str, tom: str) -> bytes:
    fala = edge_tts.Communicate(texto, voz, rate=taxa, pitch=tom)
    audio = bytearray()
    async for parte in fala.stream():
        if parte["type"] == "audio":
            audio.extend(parte["data"])
    if not audio:
        raise RuntimeError("audio ausente")
    return bytes(audio)


async def gerar(voz: str, taxa: str, tom: str, refazer: bool) -> None:
    SAIDA.mkdir(parents=True, exist_ok=True)
    itens = frases()
    configuracao = {"voz": voz, "taxa": taxa, "tom": tom, "pronuncias": PRONUNCIAS, "modo": "frase"}

    manifest_atual = SAIDA / "manifest.json"
    if manifest_atual.exists() and not refazer:
        anterior = json.loads(manifest_atual.read_text(encoding="utf-8"))
        if anterior.get("config") != configuracao:
            print("Voz, taxa, tom ou pronuncias mudaram: regravando tudo.")
            refazer = True

    limite = asyncio.Semaphore(8)
    novos = 0

    async def uma(chave: str, texto: str) -> None:
        nonlocal novos
        destino = SAIDA / nome_arquivo(chave)
        if destino.exists() and not refazer:
            return
        async with limite:
            for tentativa in range(3):
                try:
                    destino.write_bytes(await sintetizar(texto, voz, taxa, tom))
                    novos += 1
                    return
                except Exception as erro:  # rede instavel: tenta de novo
                    if tentativa == 2:
                        print(f"FALHOU: {chave!r}: {erro}")
                    await asyncio.sleep(1.5)

    await asyncio.gather(*(uma(chave, texto) for chave, texto in itens.items()))

    clips = {
        chave: {"a": nome_arquivo(chave), "i": 0}
        for chave in itens
        if (SAIDA / nome_arquivo(chave)).exists()
    }
    manifest = {"config": configuracao, "clips": clips}
    manifest_atual.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")

    validos = {dados["a"] for dados in clips.values()} | {"manifest.json"}
    for arquivo in SAIDA.iterdir():
        if arquivo.name not in validos:
            arquivo.unlink()

    tamanho = sum(a.stat().st_size for a in SAIDA.iterdir()) / 1024 / 1024
    print(f"{len(clips)}/{len(itens)} frases prontas ({novos} novas), {tamanho:.1f} MB em {SAIDA}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--voz", default=VOZ_PADRAO)
    ap.add_argument("--taxa", default=TAXA_PADRAO, help="ex.: -8%%")
    ap.add_argument("--tom", default=TOM_PADRAO, help="ex.: -6Hz")
    ap.add_argument("--refazer", action="store_true")
    args = ap.parse_args()
    asyncio.run(gerar(args.voz, args.taxa, args.tom, args.refazer))
