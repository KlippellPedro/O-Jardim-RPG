"""Construtor de mapas do Mestre (docs/propostas/mapa-ao-vivo/CONSTRUTOR_E_EXTENSOES.md).

O projeto editável é só do Mestre: chão, paredes, aberturas e referências a objetos do
Acervo numa grade de casas. Ao publicar, o navegador do Mestre desenha o mapa em ladrilhos
e sobe ao acervo como um mapa comum; aqui fica o que vira camada viva da cena (paredes e
aberturas, em px), e o recorte do que cada um vê dela. O desenho mora em
src/pages/Mapa/construtor/.

Coordenadas do projeto em casas:
- chão: uma letra por casa, uma linha de texto por fileira ('.' é vazio);
- parede: aresta de uma casa entre dois cantos da grade. A chave "h,x,y" vai de (x, y) a
  (x+1, y); "v,x,y" vai de (x, y) a (x, y+1). O valor é o material;
- abertura: numa aresta que tem parede, com o tipo (porta, janela, porta secreta) e o
  estado da porta.
- peça: imagem pronta do tipo Objeto no Acervo, com posição e transformações; o navegador
  incorpora as peças na imagem final ao publicar.
"""

from __future__ import annotations

import math
import re

#: Laje, pedra bruta, tábua, terra, grama, areia, mármore, caverna, neve, água e lava.
MATERIAIS_CHAO = "LPTRGAMCNWV"
VAZIO = "."
MATERIAIS_PAREDE = ("pedra", "tijolo", "madeira", "caverna", "cerca", "sebe")
TIPOS_ABERTURA = ("porta", "janela", "secreta")
ESTADOS_PORTA = ("fechada", "aberta", "trancada")
CASAS_MIN = 4
CASAS_MAX = 120
CASA_MIN = 50
CASA_MAX = 200
CASA_PADRAO = 100
MAX_PAREDES = 20000
MAX_PROJETOS = 60
VERSAO = 1
ARESTA = re.compile(r"^([hv]),(\d{1,3}),(\d{1,3})$")
ID_PECA = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
LINHA_DE_CHAO = re.compile(rf"^[{re.escape(VAZIO)}{MATERIAIS_CHAO}]*$")
MAX_PECAS = 256
#: Largura máxima de uma peça, em casas. Um mapa do Acervo posto como peça ocupa dezenas de casas.
ESCALA_PECA_MAX = 120
#: Peça da mobília do Jardim (public/assets/construtor/mobilia/<id>.webp), em vez de uma imagem do Acervo.
ID_MOBILIA = re.compile(r"^[a-z0-9-]{1,40}$")
#: Chão (tapete, alçapão), objetos (embaixo das paredes) ou alto (copa de árvore, tocha de parede).
CAMADAS_PECA = ("chao", "objetos", "alto")
#: Luzes fixas do mapa (tocha na parede, braseiro): raio em casas, cor e se a chama tremula.
MAX_LUZES = 64
LUZ_MAXIMA_CASAS = 30
COR = re.compile(r"^#[0-9a-fA-F]{6}$")
#: Chão que ganha movimento na mesa: W é água, V é lava (MATERIAIS_CHAO).
LIQUIDOS = {"W": "agua", "V": "lava"}
MAX_LADO_IMAGEM_PECA = 32768


class ErroConstrutor(Exception):
    """Pedido recusado. `codigo` já é o status HTTP que a rota devolve."""

    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def _inteiro(valor, campo: str, minimo: int, maximo: int) -> int:
    if isinstance(valor, bool) or not isinstance(valor, int):
        raise ErroConstrutor(f"{campo} precisa ser um numero inteiro")
    if not minimo <= valor <= maximo:
        raise ErroConstrutor(f"{campo} vai de {minimo} a {maximo}")
    return valor


def _numero(valor, campo: str, minimo: float, maximo: float) -> float:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or (isinstance(valor, float) and not math.isfinite(valor)):
        raise ErroConstrutor(f"{campo} precisa ser um numero finito")
    if not minimo <= valor <= maximo:
        raise ErroConstrutor(f"{campo} precisa ficar entre {minimo:g} e {maximo:g}")
    return float(valor)


def nome_limpo(valor) -> str:
    nome = " ".join(str(valor or "").split())[:80]
    if not nome:
        raise ErroConstrutor("de um nome ao mapa")
    return nome


def tamanho(largura, altura, casa) -> tuple[int, int, int]:
    return (
        _inteiro(largura, "largura em casas", CASAS_MIN, CASAS_MAX),
        _inteiro(altura, "altura em casas", CASAS_MIN, CASAS_MAX),
        _inteiro(casa, "tamanho da casa", CASA_MIN, CASA_MAX),
    )


def conteudo_vazio(largura: int, altura: int) -> dict:
    return {"versao": VERSAO, "chao": [VAZIO * largura for _ in range(altura)], "paredes": {}, "aberturas": {}, "pecas": [], "luzes": []}


def aresta_valida(chave: str, largura: int, altura: int) -> tuple[str, int, int] | None:
    """A aresta "h,x,y" ou "v,x,y" que cabe na grade, ou None."""
    achado = ARESTA.match(chave) if isinstance(chave, str) else None
    if not achado:
        return None
    eixo, x, y = achado.group(1), int(achado.group(2)), int(achado.group(3))
    if eixo == "h" and 0 <= x < largura and 0 <= y <= altura:
        return eixo, x, y
    if eixo == "v" and 0 <= x <= largura and 0 <= y < altura:
        return eixo, x, y
    return None


def normalizar_conteudo(dados, largura: int, altura: int) -> dict:
    """Confere o projeto inteiro. Fileira do tamanho errado é cortada ou completada com vazio;
    parede fora da grade ou de material desconhecido é recusada; abertura sem parede some."""
    if not isinstance(dados, dict):
        raise ErroConstrutor("projeto invalido")
    chao_bruto = dados.get("chao", [])
    if not isinstance(chao_bruto, list) or len(chao_bruto) > CASAS_MAX:
        raise ErroConstrutor("chao invalido")
    chao = []
    for indice in range(altura):
        linha = chao_bruto[indice] if indice < len(chao_bruto) else ""
        if not isinstance(linha, str) or not LINHA_DE_CHAO.match(linha):
            raise ErroConstrutor("chao com material desconhecido")
        chao.append((linha + VAZIO * largura)[:largura])
    paredes_brutas = dados.get("paredes", {})
    if not isinstance(paredes_brutas, dict) or len(paredes_brutas) > MAX_PAREDES:
        raise ErroConstrutor(f"o mapa tem ate {MAX_PAREDES} trechos de parede")
    paredes = {}
    for chave, material in paredes_brutas.items():
        if aresta_valida(chave, largura, altura) is None:
            # Diminuir o mapa deixa paredes de fora: elas somem com a área cortada.
            continue
        if material not in MATERIAIS_PAREDE:
            raise ErroConstrutor("parede de material desconhecido")
        paredes[chave] = material
    aberturas_brutas = dados.get("aberturas", {})
    if not isinstance(aberturas_brutas, dict):
        raise ErroConstrutor("aberturas invalidas")
    aberturas = {}
    for chave, abertura in aberturas_brutas.items():
        if chave not in paredes:
            continue
        if not isinstance(abertura, dict) or abertura.get("tipo") not in TIPOS_ABERTURA:
            raise ErroConstrutor("a abertura e porta, janela ou porta secreta")
        estado = abertura.get("estado", "fechada")
        if estado not in ESTADOS_PORTA:
            raise ErroConstrutor("a porta fica fechada, aberta ou trancada")
        aberturas[chave] = {"tipo": abertura["tipo"], "estado": estado if abertura["tipo"] != "janela" else "fechada"}
    pecas_brutas = dados.get("pecas", [])
    if not isinstance(pecas_brutas, list) or len(pecas_brutas) > MAX_PECAS:
        raise ErroConstrutor(f"o mapa pode ter ate {MAX_PECAS} pecas")
    pecas = []
    ids_vistos = set()
    for peca in pecas_brutas:
        if not isinstance(peca, dict):
            raise ErroConstrutor("peca invalida")
        id_peca = str(peca.get("id") or "").lower()
        pacote = peca.get("pacote") or None
        imagem_id = "" if pacote else str(peca.get("imagem_id") or "").lower()
        if not ID_PECA.fullmatch(id_peca) or id_peca in ids_vistos:
            raise ErroConstrutor("id de peca invalido ou repetido")
        if pacote is not None and (not isinstance(pacote, str) or not ID_MOBILIA.fullmatch(pacote)):
            raise ErroConstrutor("peca de mobilia desconhecida")
        if pacote is None and not ID_PECA.fullmatch(imagem_id):
            raise ErroConstrutor("imagem da peca invalida")
        camada = peca.get("camada", "objetos")
        if camada not in CAMADAS_PECA:
            raise ErroConstrutor("a peca fica no chao, com os objetos ou no alto")
        ids_vistos.add(id_peca)
        rotulo = " ".join(str(peca.get("rotulo") or "Objeto").split())[:80] or "Objeto"
        imagem_largura = _inteiro(peca.get("imagem_largura"), "largura da imagem da peca", 1, MAX_LADO_IMAGEM_PECA)
        imagem_altura = _inteiro(peca.get("imagem_altura"), "altura da imagem da peca", 1, MAX_LADO_IMAGEM_PECA)
        x = _numero(peca.get("x"), "posicao X da peca", -CASAS_MAX, largura + CASAS_MAX)
        y = _numero(peca.get("y"), "posicao Y da peca", -CASAS_MAX, altura + CASAS_MAX)
        escala = _numero(peca.get("escala"), "escala da peca", 0.1, ESCALA_PECA_MAX)
        rotacao = _numero(peca.get("rotacao", 0), "rotacao da peca", -3600, 3600) % 360
        espelhada = peca.get("espelhada", False)
        if not isinstance(espelhada, bool):
            raise ErroConstrutor("espelhamento da peca invalido")
        pecas.append({
            "id": id_peca, "imagem_id": imagem_id, "pacote": pacote, "camada": camada, "rotulo": rotulo,
            "imagem_largura": imagem_largura, "imagem_altura": imagem_altura,
            "x": x, "y": y, "escala": escala, "rotacao": rotacao, "espelhada": espelhada,
        })
    luzes_brutas = dados.get("luzes", [])
    if not isinstance(luzes_brutas, list) or len(luzes_brutas) > MAX_LUZES:
        raise ErroConstrutor(f"o mapa pode ter ate {MAX_LUZES} luzes fixas")
    luzes = []
    ids_luzes = set()
    for luz in luzes_brutas:
        if not isinstance(luz, dict):
            raise ErroConstrutor("luz invalida")
        id_luz = str(luz.get("id") or "").lower()
        if not ID_PECA.fullmatch(id_luz) or id_luz in ids_luzes:
            raise ErroConstrutor("id de luz invalido ou repetido")
        ids_luzes.add(id_luz)
        cor = luz.get("cor", "#ffb35c")
        if not isinstance(cor, str) or not COR.fullmatch(cor):
            raise ErroConstrutor("cor da luz invalida")
        tremula = luz.get("tremula", False)
        if not isinstance(tremula, bool):
            raise ErroConstrutor("tremor da luz invalido")
        luzes.append({
            "id": id_luz,
            "x": _numero(luz.get("x"), "posicao X da luz", 0, largura),
            "y": _numero(luz.get("y"), "posicao Y da luz", 0, altura),
            "raio": round(_numero(luz.get("raio", 4), "alcance da luz", 0.5, LUZ_MAXIMA_CASAS), 2),
            "cor": cor.lower(),
            "tremula": tremula,
        })
    return {"versao": VERSAO, "chao": chao, "paredes": paredes, "aberturas": aberturas, "pecas": pecas, "luzes": luzes}


MAX_PRONTAS = 40
MAX_PECAS_POR_PRONTA = 32


def normalizar_prontas(dados) -> list[dict]:
    """As peças prontas da campanha: grupos de peças com posição relativa ao centro do grupo."""
    if not isinstance(dados, list) or len(dados) > MAX_PRONTAS:
        raise ErroConstrutor(f"a campanha guarda ate {MAX_PRONTAS} pecas prontas")
    saida = []
    ids = set()
    for pronta in dados:
        if not isinstance(pronta, dict):
            raise ErroConstrutor("peca pronta invalida")
        pronta_id = str(pronta.get("id") or "").lower()
        if not ID_PECA.fullmatch(pronta_id) or pronta_id in ids:
            raise ErroConstrutor("id de peca pronta invalido ou repetido")
        ids.add(pronta_id)
        pecas = pronta.get("pecas")
        if not isinstance(pecas, list) or not 1 <= len(pecas) <= MAX_PECAS_POR_PRONTA:
            raise ErroConstrutor(f"a peca pronta junta de 1 a {MAX_PECAS_POR_PRONTA} pecas")
        # As posições são relativas ao centro: a conferência é a mesma das peças de um mapa grande.
        conferidas = normalizar_conteudo({"pecas": pecas}, CASAS_MAX, CASAS_MAX)["pecas"]
        saida.append({"id": pronta_id, "nome": " ".join(str(pronta.get("nome") or "").split())[:60] or "Peça pronta", "pecas": conferidas})
    return saida


def ler_conteudo(dados, largura: int, altura: int) -> dict:
    """O que está gravado; um registro quebrado vira um mapa vazio em vez de erro."""
    try:
        return normalizar_conteudo(dados if isinstance(dados, dict) else {}, largura, altura)
    except ErroConstrutor:
        return conteudo_vazio(largura, altura)


def _ponta(eixo: str, x: int, y: int) -> tuple[int, int]:
    return (x + 1, y) if eixo == "h" else (x, y + 1)


def segmentos_de_parede(paredes: dict, aberturas: dict) -> list[list[int]]:
    """As paredes em trechos retos e compridos [x1, y1, x2, y2] (em casas), juntando as arestas
    vizinhas do mesmo eixo. A porta abre um vão; janela e porta secreta continuam parede."""
    horizontais: dict[int, set[int]] = {}
    verticais: dict[int, set[int]] = {}
    for chave in paredes:
        if aberturas.get(chave, {}).get("tipo") == "porta":
            continue
        eixo, x, y = chave.split(",")[0], int(chave.split(",")[1]), int(chave.split(",")[2])
        if eixo == "h":
            horizontais.setdefault(y, set()).add(x)
        else:
            verticais.setdefault(x, set()).add(y)
    saida: list[list[int]] = []
    for y, xs in sorted(horizontais.items()):
        for inicio, fim in _corridas(xs):
            saida.append([inicio, y, fim + 1, y])
    for x, ys in sorted(verticais.items()):
        for inicio, fim in _corridas(ys):
            saida.append([x, inicio, x, fim + 1])
    return saida


def _corridas(valores: set[int]) -> list[tuple[int, int]]:
    corridas: list[tuple[int, int]] = []
    for valor in sorted(valores):
        if corridas and corridas[-1][1] == valor - 1:
            corridas[-1] = (corridas[-1][0], valor)
        else:
            corridas.append((valor, valor))
    return corridas


def estrutura_publicada(conteudo: dict, casa: int) -> dict:
    """O que a cena guarda ao publicar: paredes (para bloquear e tapar a visão, nas próximas
    levas) e aberturas, já em px do mapa."""
    paredes = [[x1 * casa, y1 * casa, x2 * casa, y2 * casa] for x1, y1, x2, y2 in segmentos_de_parede(conteudo["paredes"], conteudo["aberturas"])]
    aberturas = []
    for chave, abertura in sorted(conteudo["aberturas"].items()):
        eixo, x, y = chave.split(",")[0], int(chave.split(",")[1]), int(chave.split(",")[2])
        x2, y2 = _ponta(eixo, x, y)
        aberturas.append({
            "id": chave, "tipo": abertura["tipo"], "estado": abertura["estado"],
            "material": conteudo["paredes"].get(chave, "pedra"),
            "x1": x * casa, "y1": y * casa, "x2": x2 * casa, "y2": y2 * casa,
        })
    luzes = [
        {"id": luz["id"], "x": round(luz["x"] * casa, 1), "y": round(luz["y"] * casa, 1), "raio": luz["raio"], "cor": luz["cor"], "tremula": luz["tremula"]}
        for luz in conteudo.get("luzes", [])
    ]
    return {"paredes": paredes, "aberturas": aberturas, "luzes": luzes, "liquidos": liquidos_do_chao(conteudo["chao"], casa)}


def liquidos_do_chao(chao: list[str], casa: int) -> dict:
    """As casas de água e de lava em retângulos [x, y, w, h] (px), juntando as vizinhas da fileira."""
    saida: dict[str, list[list[int]]] = {nome: [] for nome in LIQUIDOS.values()}
    for y, linha in enumerate(chao):
        x = 0
        while x < len(linha):
            letra = linha[x]
            if letra not in LIQUIDOS:
                x += 1
                continue
            inicio = x
            while x < len(linha) and linha[x] == letra:
                x += 1
            saida[LIQUIDOS[letra]].append([inicio * casa, y * casa, (x - inicio) * casa, casa])
    return saida


def luzes_de(luzes: list[dict], *, gestor: bool, revelado) -> list[dict]:
    """O Mestre vê todas as luzes fixas; o jogador, só as que a névoa deixa à vista (o brilho fica
    por cima da névoa e entregaria um lugar ainda escondido)."""
    return [dict(luz) for luz in luzes if gestor or revelado(luz["x"], luz["y"])]


def ler_luzes(estrutura) -> list[dict]:
    if not isinstance(estrutura, dict) or not isinstance(estrutura.get("luzes"), list):
        return []
    return [
        luz for luz in estrutura["luzes"]
        if isinstance(luz, dict) and all(isinstance(luz.get(c), (int, float)) for c in ("x", "y", "raio"))
        and isinstance(luz.get("cor"), str) and COR.fullmatch(luz["cor"])
    ]


def ler_liquidos(estrutura) -> dict:
    vazio = {nome: [] for nome in LIQUIDOS.values()}
    if not isinstance(estrutura, dict) or not isinstance(estrutura.get("liquidos"), dict):
        return vazio
    for nome in vazio:
        lista = estrutura["liquidos"].get(nome)
        if isinstance(lista, list):
            vazio[nome] = [r for r in lista if isinstance(r, list) and len(r) == 4 and all(isinstance(v, (int, float)) for v in r)]
    return vazio


def aberturas_de(aberturas: list[dict], *, gestor: bool, revelado) -> list[dict]:
    """O que cada um vê das aberturas da cena. O Mestre vê todas; o jogador não vê a porta
    secreta (no mapa ela é parede) e só vê a abertura cujo meio a névoa deixa à vista."""
    if gestor:
        return [dict(abertura) for abertura in aberturas]
    saida = []
    for abertura in aberturas:
        if abertura.get("tipo") == "secreta":
            continue
        meio_x = (abertura["x1"] + abertura["x2"]) / 2
        meio_y = (abertura["y1"] + abertura["y2"]) / 2
        if revelado(meio_x, meio_y):
            # Que a porta já foi secreta é coisa do Mestre (ele pode escondê-la de novo).
            saida.append({chave: valor for chave, valor in abertura.items() if chave != "era_secreta"})
    return saida


def ler_aberturas(estrutura) -> list[dict]:
    """As aberturas gravadas na cena; registro estranho vira lista vazia."""
    if not isinstance(estrutura, dict) or not isinstance(estrutura.get("aberturas"), list):
        return []
    saida = []
    for abertura in estrutura["aberturas"]:
        if (
            isinstance(abertura, dict) and abertura.get("tipo") in TIPOS_ABERTURA and abertura.get("estado") in ESTADOS_PORTA
            and all(isinstance(abertura.get(campo), (int, float)) for campo in ("x1", "y1", "x2", "y2"))
        ):
            saida.append(abertura)
    return saida
