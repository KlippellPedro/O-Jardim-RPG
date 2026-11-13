"""Regras do mapa ao vivo: grade, barras dos tokens, quem move o quê e o que cada um vê.

Como `core/mesa.py`, este módulo não conhece banco nem HTTP. Recebe as linhas
já lidas (token, participante da sessão, ficha) e quem está olhando, e devolve
o recorte daquele papel. A regra de segredo mora aqui num lugar só:

- token oculto pelo Mestre não sai para jogador;
- token ligado a um participante da sessão segue os quatro degraus de
  visibilidade da Sessão (oculto, desconhecido, parcial, total);
- com a névoa ligada, monstro, NPC ou objeto com o centro coberto não sai para
  jogador (a conta da névoa mora em `core/nevoa.py`);
- as barras de cada token obedecem à escolha do dono (todos, só eu e o Mestre,
  ninguém), e nunca mostram número que o degrau do participante esconde.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from uuid import uuid4

from core import mesa_extras, recipientes

#: "hex" é o hexágono pontudo em cima; "hex-plano" é o de lado reto em cima.
TIPOS_GRADE = ("quadrada", "hex", "hex-plano", "nenhuma")
LINHAS_GRADE = ("solida", "tracejada", "pontilhada")
UNIDADES_GRADE = ("m", "ft")
#: Como a régua soma a diagonal: reta, igual a um passo (Chebyshev), 5-10-5, só pelos eixos, ou por hexágonos.
MEDICOES_GRADE = ("euclidiana", "chebyshev", "alternada", "manhattan", "hex")
LADOS = ("jogador", "aliado", "inimigo", "neutro")
BARRAS = ("vida", "mana", "estamina", "sanidade")
PARA_QUEM = ("todos", "dono", "ninguem")
PORTE_MAXIMO = 6
COR = re.compile(r"^#[0-9a-fA-F]{6}$")

FLUXOS = (
    "origem", "essencia", "comunicacao", "vitalidade", "inconstancia", "fisico",
    "espaco", "tempo", "vazio", "fim", "tecnologia",
)
#: Molduras que o site sabe desenhar (src/pages/Mapa/motor/molduras.ts). "nivel" é a
#: escada do retrato da ficha; "lado" é o aro simples na cor do lado do token; "nenhuma"
#: tira a borda (o retrato fica solto no mapa).
MOLDURAS = (
    "nivel", "lado", "nenhuma", "ferro", "ouro", "madeira", "osso", "runa", "cristal", "raiz", "sombra",
    #: Molduras ilustradas (public/assets/img/molduras): os ids são os de src/pages/Mapa/motor/molduras-arte.json.
    "arte-onda-katana", "arte-espinhos", "arte-tinta-negra", "arte-pincelada", "arte-veias", "arte-mandibula",
    "arte-ouroboros", "arte-vampiro", "arte-nuvens", "arte-sombra-negra", "arte-chifres-do-diabo",
    "arte-alienigena", "arte-gelo-espesso", "arte-hera", "arte-louro", "arte-coroa-de-espinhos",
    "arte-rosas-negras", "arte-borboletas", "arte-paladino-aco",
    *(f"fluxo-{fluxo}" for fluxo in FLUXOS),
)
ENQUADRAMENTO_PADRAO = {"zoom": 1.0, "x": 0.0, "y": 0.0}

GRADE_PADRAO = {
    "tipo": "quadrada",
    "tamanho": 100,
    "x": 0.0,
    "y": 0.0,
    "cor": "#ffffff",
    "opacidade": 0.18,
    #: Quanto vale uma casa, na unidade escolhida (o nome ficou de quando só havia metros).
    "metros": 1.5,
    "unidade": "m",
    "espessura": 1.0,
    "linha": "solida",
    "medicao": "euclidiana",
}

# Rótulos da Sessão (routers/sessions.py) e a fração que a barra desenha para
# cada um: quem vê só o degrau "parcial" sabe que o inimigo está ferido, mas
# não quanto exatamente.
ESTADOS_VIDA = (
    (1.0, "Ileso", 1.0),
    (0.75, "Arranhado", 0.8),
    (0.5, "Ferido", 0.55),
    (0.25, "Muito ferido", 0.3),
    (0.0001, "Quase morto", 0.1),
)

NOME_GENERICO = {
    "inimigo": "Inimigo Desconhecido",
    "aliado": "Aliado Desconhecido",
    "jogador": "Alguém Desconhecido",
}

#: Efeitos de clima que o site desenha (src/pages/Mapa/motor/clima.ts).
EFEITOS_CLIMA = (
    "chuva", "tempestade", "nuvens", "neve", "neblina", "areia", "cinzas", "calor", "folhas", "escuridao", "vazio", "fluxo",
)
MAX_EFEITOS_CLIMA = 4
#: Luz de um token: raio em casas, cor e se tremula como chama.
LUZ_MAXIMA_CASAS = 30
#: Efeitos de magia que a mesa inteira vê no mapa (src/pages/Mapa/motor/magia.ts).
FORMAS_MAGIA = ("circulo", "cone", "linha", "impacto")
#: Uma magia pode começar ou terminar um pouco fora do mapa, mas não longe dele.
FOLGA_MAGIA = 2000.0
#: Direção para onde o vento sopra, em graus na tela: 0 vai para a direita, 90 para baixo.
VENTO_PADRAO = {"direcao": 100.0, "forca": 0.3}
LUZ_PADRAO = 4.0
#: A luz da cena: não muda com a hora (como era antes), segue a hora do calendário ou fica numa hora fixa.
MODOS_CEU = ("nenhum", "mundo", "fixo")
CEU_PADRAO = {"modo": "nenhum", "minuto": 12 * 60}
MINUTOS_DO_DIA = 24 * 60
#: Portais da cena: soltar um token num lado leva ao outro (src/pages/Mapa/motor/portais.ts).
MAX_PORTAIS = 30
MAOS_PORTAL = ("dupla", "unica")
#: Quem atravessa: qualquer um, só quando um jogador solta o token, ou só quando o Mestre solta.
QUEM_USA_PORTAL = ("todos", "jogadores", "mestre")
#: Raio da boca do portal, em casas.
RAIO_PORTAL_PADRAO = 0.6
ID_PORTAL = re.compile(r"^[A-Za-z0-9_-]{1,40}$")
CAMADAS_MAPA = ("mapa", "props", "montarias", "personagens", "anotacoes")
CAMADAS_TOKEN = ("props", "montarias", "personagens")
ACOES_MESA = ("mover_tokens", "usar_ping", "usar_regua", "usar_magia")
FONTES_ANOTACAO = {
    "sans": "system-ui, sans-serif",
    "serif": "Georgia, serif",
    "fantasia": "Cinzel, serif",
    "mono": "monospace",
}
MAX_ANOTACOES = 200
TEXTO_ANOTACAO_MAX = 320
ID_ANOTACAO = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)


class ErroMapa(Exception):
    """Pedido recusado. `codigo` já é o status HTTP que a rota devolve."""

    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


@dataclass(frozen=True)
class Espectador:
    usuario_id: str
    gestor: bool
    #: Personagens ativos de quem olha, nesta campanha.
    personagens: frozenset[str] = field(default_factory=frozenset)
    #: Capacidades por pessoa, carregadas do membro da campanha; não vêm do cliente.
    permissoes_mesa: dict = field(default_factory=dict)


def normalizar_permissoes_mesa(dados, papel: str, atual: dict | None = None) -> dict:
    """Capacidades pessoais da mesa. Assistente e Mestre são gestores; observador é leitura."""
    padrao_acao = papel not in ("observador",)
    permissoes = {
        acao: padrao_acao
        for acao in ACOES_MESA
    }
    permissoes["camadas"] = {camada: True for camada in CAMADAS_MAPA}
    if isinstance(atual, dict):
        for acao in ACOES_MESA:
            if isinstance(atual.get(acao), bool):
                permissoes[acao] = atual[acao]
        camadas_atuais = atual.get("camadas")
        if isinstance(camadas_atuais, dict):
            for camada in CAMADAS_MAPA:
                if isinstance(camadas_atuais.get(camada), bool):
                    permissoes["camadas"][camada] = camadas_atuais[camada]
    if not isinstance(dados, dict):
        raise ErroMapa("permissoes da mesa invalidas")
    for chave, valor in dados.items():
        if chave in ACOES_MESA:
            if not isinstance(valor, bool):
                raise ErroMapa("permissao da mesa invalida")
            permissoes[chave] = valor
        elif chave == "camadas":
            if not isinstance(valor, dict):
                raise ErroMapa("permissoes de camada invalidas")
            for camada, visivel in valor.items():
                if camada not in CAMADAS_MAPA or not isinstance(visivel, bool):
                    raise ErroMapa("camada ou permissao invalida")
                permissoes["camadas"][camada] = visivel
        else:
            raise ErroMapa("permissao da mesa desconhecida")
    return permissoes


def ler_permissoes_mesa(dados, papel: str) -> dict:
    """Lê permissões legadas; configuração inválida não libera ações nem camadas."""
    try:
        return normalizar_permissoes_mesa(dados if isinstance(dados, dict) else {}, papel)
    except ErroMapa:
        return {
            **{acao: False for acao in ACOES_MESA},
            "camadas": {camada: False for camada in CAMADAS_MAPA},
        }


def _numero(valor, campo: str, minimo: float, maximo: float) -> float:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        raise ErroMapa(f"{campo} precisa ser um numero")
    if valor < minimo or valor > maximo:
        raise ErroMapa(f"{campo} precisa ficar entre {minimo:g} e {maximo:g}")
    return float(valor)


def normalizar_grade(dados, atual: dict | None = None) -> dict:
    """Mescla o que veio com a grade atual; campo inválido é recusado, não ignorado."""
    grade = dict(GRADE_PADRAO)
    grade.update(atual or {})
    if not isinstance(dados, dict):
        raise ErroMapa("grade invalida")
    if "tipo" in dados:
        if dados["tipo"] not in TIPOS_GRADE:
            raise ErroMapa("a grade e quadrada, hexagonal ou nenhuma")
        grade["tipo"] = dados["tipo"]
    if "tamanho" in dados:
        grade["tamanho"] = _numero(dados["tamanho"], "tamanho do quadrado", 10, 1000)
    for eixo in ("x", "y"):
        if eixo in dados:
            grade[eixo] = _numero(dados[eixo], f"deslocamento {eixo}", -1000, 1000)
    if "cor" in dados:
        if not isinstance(dados["cor"], str) or not COR.match(dados["cor"]):
            raise ErroMapa("cor da grade invalida")
        grade["cor"] = dados["cor"].lower()
    if "opacidade" in dados:
        grade["opacidade"] = _numero(dados["opacidade"], "opacidade", 0, 1)
    if "metros" in dados:
        grade["metros"] = _numero(dados["metros"], "distancia por quadrado", 0.1, 1000)
    if "espessura" in dados:
        grade["espessura"] = _numero(dados["espessura"], "espessura da linha", 0.5, 8)
    for campo, validos, texto in (
        ("unidade", UNIDADES_GRADE, "a unidade e metros ou pes"),
        ("linha", LINHAS_GRADE, "a linha e continua, tracejada ou pontilhada"),
        ("medicao", MEDICOES_GRADE, "medida da regua invalida"),
    ):
        if campo in dados:
            if dados[campo] not in validos:
                raise ErroMapa(texto)
            grade[campo] = dados[campo]
    return grade


#: A vista de uma pessoa que "traz todo mundo": centro (com folga além das bordas) e zoom.
FOLGA_VISTA = 50000.0


def normalizar_vista_mesa(dados, largura: int, altura: int) -> dict:
    """Centro e zoom que alguém manda para a mesa inteira ver. Só passa pelo tempo real."""
    if not isinstance(dados, dict):
        raise ErroMapa("vista invalida")
    zoom_min, zoom_max = mesa_extras.ZOOM_VISTA
    vista = {
        "x": round(_numero(dados.get("x"), "centro da vista", -FOLGA_VISTA, largura + FOLGA_VISTA), 1),
        "y": round(_numero(dados.get("y"), "centro da vista", -FOLGA_VISTA, altura + FOLGA_VISTA), 1),
        "zoom": round(_numero(dados.get("zoom"), "zoom da vista", zoom_min / 2, zoom_max * 2), 3),
    }
    # Quanto do mapa cabia na tela de quem pediu: telas de tamanhos diferentes enquadram a mesma área.
    for campo in ("vw", "vh"):
        if dados.get(campo) is not None:
            vista[campo] = round(_numero(dados[campo], "area da vista", 1, 400000), 1)
    return vista


def barras_padrao(lado: str) -> dict:
    """Jogador e aliado mostram tudo para a mesa; inimigo começa só para o Mestre."""
    if lado in ("jogador", "aliado"):
        return {"mostrar": list(BARRAS), "para": "todos"}
    return {"mostrar": ["vida"], "para": "dono"}


def normalizar_barras(dados, atual: dict | None = None, lado: str = "neutro") -> dict:
    barras = barras_padrao(lado)
    barras.update(atual or {})
    if not isinstance(dados, dict):
        raise ErroMapa("barras invalidas")
    if "mostrar" in dados:
        mostrar = dados["mostrar"]
        if not isinstance(mostrar, list) or any(item not in BARRAS for item in mostrar):
            raise ErroMapa("barras: vida, mana, estamina ou sanidade")
        barras["mostrar"] = [item for item in BARRAS if item in mostrar]
    if "para" in dados:
        if dados["para"] not in PARA_QUEM:
            raise ErroMapa("as barras aparecem para todos, para o dono ou para ninguem")
        barras["para"] = dados["para"]
    return barras


def limitar_posicao(x, y, largura: int, altura: int) -> tuple[float, float]:
    """Posição do centro do token, presa dentro do mapa."""
    px = _numero(x, "x", -1e7, 1e7)
    py = _numero(y, "y", -1e7, 1e7)
    return max(0.0, min(float(largura), px)), max(0.0, min(float(altura), py))


def porte_valido(valor) -> int:
    if isinstance(valor, bool) or not isinstance(valor, int) or not 1 <= valor <= PORTE_MAXIMO:
        raise ErroMapa(f"o porte vai de 1 a {PORTE_MAXIMO} quadrados")
    return valor


#: Nota só do Mestre num token, numa cena ou num mapa colocado: texto livre, com quebras de linha.
NOTA_MAXIMA = 4000


def normalizar_nota(valor) -> str:
    """O texto da nota sem espaço sobrando nas pontas e com as quebras de linha normalizadas; vazio apaga a nota."""
    if valor is None:
        return ""
    if not isinstance(valor, str):
        raise ErroMapa("a nota precisa ser um texto")
    texto = valor.replace("\r\n", "\n").replace("\r", "\n").strip()
    if len(texto) > NOTA_MAXIMA:
        raise ErroMapa(f"a nota passa de {NOTA_MAXIMA} caracteres")
    return texto


def normalizar_moldura(valor) -> str | None:
    """None (ou vazio) volta ao padrão; um nome que o site não desenha é recusado."""
    if valor is None or valor == "":
        return None
    if valor not in MOLDURAS:
        raise ErroMapa("moldura desconhecida")
    return valor


def normalizar_enquadramento(dados, atual: dict | None = None) -> dict:
    """Zoom de 1 a 4 e deslocamento de -1 a 1 (fração do raio) da foto dentro do círculo."""
    enquadramento = dict(ENQUADRAMENTO_PADRAO)
    enquadramento.update(atual or {})
    if not isinstance(dados, dict):
        raise ErroMapa("enquadramento invalido")
    if "zoom" in dados:
        enquadramento["zoom"] = _numero(dados["zoom"], "zoom", 1, 4)
    for eixo in ("x", "y"):
        if eixo in dados:
            enquadramento[eixo] = _numero(dados[eixo], f"deslocamento {eixo}", -1, 1)
    return enquadramento


def _area_do_clima(dados, largura: int, altura: int) -> dict | None:
    if dados is None:
        return None
    if not isinstance(dados, dict):
        raise ErroMapa("area do clima invalida")
    x = _numero(dados.get("x"), "x da area", -1e6, 1e6)
    y = _numero(dados.get("y"), "y da area", -1e6, 1e6)
    w = _numero(dados.get("w"), "largura da area", -1e6, 1e6)
    h = _numero(dados.get("h"), "altura da area", -1e6, 1e6)
    x0, x1 = sorted((max(0.0, min(largura, x)), max(0.0, min(largura, x + w))))
    y0, y1 = sorted((max(0.0, min(altura, y)), max(0.0, min(altura, y + h))))
    if x1 - x0 < 20 or y1 - y0 < 20:
        raise ErroMapa("a area do clima ficou pequena demais ou fora do mapa")
    return {"x": round(x0, 1), "y": round(y0, 1), "w": round(x1 - x0, 1), "h": round(y1 - y0, 1)}


def normalizar_clima(dados, largura: int, altura: int) -> dict:
    """Até quatro efeitos (cada um no mapa inteiro ou numa área) e um vento para a cena."""
    if not isinstance(dados, dict):
        raise ErroMapa("clima invalido")
    brutos = dados.get("efeitos", [])
    if not isinstance(brutos, list) or len(brutos) > MAX_EFEITOS_CLIMA:
        raise ErroMapa(f"a cena junta ate {MAX_EFEITOS_CLIMA} efeitos de clima")
    efeitos = []
    for bruto in brutos:
        if not isinstance(bruto, dict) or bruto.get("tipo") not in EFEITOS_CLIMA:
            raise ErroMapa("efeito de clima desconhecido")
        efeito = {
            "tipo": bruto["tipo"],
            "intensidade": round(_numero(bruto.get("intensidade", 0.5), "intensidade", 0.05, 1), 2),
            "area": _area_do_clima(bruto.get("area"), largura, altura),
        }
        if efeito["tipo"] == "fluxo":
            if bruto.get("fluxo") not in FLUXOS:
                raise ErroMapa("escolha o Fluxo das particulas")
            efeito["fluxo"] = bruto["fluxo"]
        if efeito["tipo"] == "escuridao":
            efeito["luz"] = round(_numero(bruto.get("luz", LUZ_PADRAO), "luz em volta dos tokens", 0, 30), 1)
        efeitos.append(efeito)
    vento = dados.get("vento", VENTO_PADRAO)
    if not isinstance(vento, dict):
        raise ErroMapa("vento invalido")
    return {
        "efeitos": efeitos,
        "vento": {
            "direcao": round(_numero(vento.get("direcao", VENTO_PADRAO["direcao"]), "direcao do vento", -360, 720) % 360, 1),
            "forca": round(_numero(vento.get("forca", VENTO_PADRAO["forca"]), "forca do vento", 0, 1), 2),
        },
        "ceu": normalizar_ceu(dados.get("ceu")),
    }


def normalizar_ceu(dados) -> dict:
    """Como a luz da cena acompanha a hora. `minuto` só vale no modo fixo (minutos desde a meia-noite)."""
    if dados is None:
        return dict(CEU_PADRAO)
    if not isinstance(dados, dict):
        raise ErroMapa("luz do dia invalida")
    modo = dados.get("modo", CEU_PADRAO["modo"])
    if modo not in MODOS_CEU:
        raise ErroMapa("a luz da cena segue o mundo, fica numa hora fixa ou nao muda")
    minuto = dados.get("minuto", CEU_PADRAO["minuto"])
    if isinstance(minuto, bool) or not isinstance(minuto, int) or not 0 <= minuto < MINUTOS_DO_DIA:
        raise ErroMapa("hora fixa invalida")
    return {"modo": modo, "minuto": minuto}


def ler_clima(dados, largura: int, altura: int) -> dict:
    """O clima guardado; um registro antigo ou quebrado vira céu limpo em vez de erro."""
    try:
        return normalizar_clima(dados if isinstance(dados, dict) else {}, largura, altura)
    except ErroMapa:
        return normalizar_clima({}, largura, altura)


def normalizar_luz(dados) -> dict | None:
    """None tira a luz; senão raio (casas), cor e se tremula, conferidos."""
    if dados is None:
        return None
    if not isinstance(dados, dict):
        raise ErroMapa("luz invalida")
    raio = _numero(dados.get("raio", 4), "raio da luz", 0.5, LUZ_MAXIMA_CASAS)
    cor = dados.get("cor", "#ffb35c")
    if not isinstance(cor, str) or not COR.match(cor):
        raise ErroMapa("cor da luz invalida")
    return {"raio": round(raio, 1), "cor": cor.lower(), "tremula": bool(dados.get("tremula", False))}


def normalizar_camadas_jogadores(dados, atual: dict | None = None) -> dict[str, bool]:
    """Define quais camadas da cena o servidor envia a jogadores. Mestre sempre vê todas."""
    if not isinstance(dados, dict):
        raise ErroMapa("visibilidade das camadas invalida")
    valores = {camada: True for camada in CAMADAS_MAPA}
    if isinstance(atual, dict):
        for camada in CAMADAS_MAPA:
            if isinstance(atual.get(camada), bool):
                valores[camada] = atual[camada]
    for camada, visivel in dados.items():
        if camada not in CAMADAS_MAPA or not isinstance(visivel, bool):
            raise ErroMapa("camada ou visibilidade invalida")
        valores[camada] = visivel
    return valores


def camadas_jogadores(estrutura) -> dict[str, bool]:
    """Lê a configuração salva. Estado antigo deixa todas visíveis; dado inválido falha fechado."""
    if not isinstance(estrutura, dict) or "camadas_jogadores" not in estrutura:
        return {camada: True for camada in CAMADAS_MAPA}
    try:
        return normalizar_camadas_jogadores(estrutura["camadas_jogadores"])
    except ErroMapa:
        return {camada: False for camada in CAMADAS_MAPA}


def normalizar_anotacoes(dados, largura: int, altura: int) -> list[dict]:
    """Confere textos colocados no mapa e limita fonte, tamanho, cor e coordenadas."""
    if not isinstance(dados, list) or len(dados) > MAX_ANOTACOES:
        raise ErroMapa(f"a cena pode ter ate {MAX_ANOTACOES} anotacoes")
    saida = []
    ids = set()
    for bruto in dados:
        if not isinstance(bruto, dict):
            raise ErroMapa("anotacao invalida")
        id_anotacao = str(bruto.get("id") or "").lower()
        if not ID_ANOTACAO.fullmatch(id_anotacao) or id_anotacao in ids:
            raise ErroMapa("id de anotacao invalido ou repetido")
        texto = str(bruto.get("texto") or "").replace("\r\n", "\n").strip()
        if not texto or len(texto) > TEXTO_ANOTACAO_MAX:
            raise ErroMapa(f"o texto da anotacao vai de 1 a {TEXTO_ANOTACAO_MAX} caracteres")
        fonte = bruto.get("fonte", "sans")
        if fonte not in FONTES_ANOTACAO:
            raise ErroMapa("fonte de anotacao desconhecida")
        cor = bruto.get("cor", "#ffffff")
        fundo = bruto.get("fundo", "#241d2b")
        if not isinstance(cor, str) or not COR.match(cor):
            raise ErroMapa("cor de anotacao invalida")
        if not isinstance(fundo, str) or not COR.match(fundo):
            raise ErroMapa("fundo de anotacao invalido")
        placa = bruto.get("placa", True)
        if not isinstance(placa, bool):
            raise ErroMapa("estilo da anotacao invalido")
        # Nota secreta: só o Mestre vê (lembrete de armadilha, nome verdadeiro do lugar).
        secreta = bruto.get("secreta", False)
        if not isinstance(secreta, bool):
            raise ErroMapa("nota secreta invalida")
        tamanho = _numero(bruto.get("tamanho", 32), "tamanho da anotacao", 12, 96)
        x, y = limitar_posicao(bruto.get("x"), bruto.get("y"), largura, altura)
        ids.add(id_anotacao)
        saida.append({
            "id": id_anotacao,
            "texto": texto,
            "x": round(x, 1),
            "y": round(y, 1),
            "fonte": fonte,
            "tamanho": round(tamanho, 1),
            "cor": cor.lower(),
            "fundo": fundo.lower(),
            "placa": placa,
            "secreta": secreta,
        })
    return saida


def ler_anotacoes(estrutura, largura: int, altura: int) -> list[dict]:
    """Anotações legadas ou malformadas não viram dados visíveis a jogadores."""
    if not isinstance(estrutura, dict) or not isinstance(estrutura.get("anotacoes"), list):
        return []
    try:
        return normalizar_anotacoes(estrutura["anotacoes"], largura, altura)
    except ErroMapa:
        return []


def _ponta_do_portal(dados, campo: str, largura: int, altura: int) -> dict:
    if not isinstance(dados, dict):
        raise ErroMapa(f"{campo} do portal invalido")
    x, y = limitar_posicao(dados.get("x"), dados.get("y"), largura, altura)
    return {"x": round(x, 1), "y": round(y, 1)}


#: Id de cena de destino de um portal entre cenas.
ID_CENA = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)
#: Sem a lista das cenas (lendo o que já foi gravado), a saída noutra cena só é conferida por cima.
_LADO_MAXIMO_PX = 10**6


def normalizar_portais(dados, largura: int, altura: int, destinos: dict | None = None) -> list[dict]:
    """A lista inteira de portais da cena. Portal sem id (ou com id repetido) ganha um novo.

    Portal entre cenas: `cena` é a cena da saída e `b` fica nela. Ele é só de ida (a volta é
    outro portal, na outra cena). `destinos` traz {id: (largura, altura, nome)} das outras
    cenas da campanha; sem ele (registro gravado), a cena e o nome ficam como estavam."""
    if not isinstance(dados, list) or len(dados) > MAX_PORTAIS:
        raise ErroMapa(f"a cena tem ate {MAX_PORTAIS} portais")
    portais: list[dict] = []
    ids: set[str] = set()
    for bruto in dados:
        if not isinstance(bruto, dict):
            raise ErroMapa("portal invalido")
        portal_id = bruto.get("id")
        if not isinstance(portal_id, str) or not ID_PORTAL.match(portal_id) or portal_id in ids:
            portal_id = f"p{uuid4().hex[:12]}"
        ids.add(portal_id)
        mao = bruto.get("mao", "dupla")
        if mao not in MAOS_PORTAL:
            raise ErroMapa("o portal e de ida e volta ou so de ida")
        usa = bruto.get("usa", "todos")
        if usa not in QUEM_USA_PORTAL:
            raise ErroMapa("o portal leva todos, so os jogadores ou so o Mestre")
        fluxo = bruto.get("fluxo", "espaco")
        if fluxo not in FLUXOS:
            raise ErroMapa("escolha o Fluxo do portal")
        cena_destino = bruto.get("cena") or None
        largura_b, altura_b, cena_nome = largura, altura, None
        if cena_destino is not None:
            cena_destino = str(cena_destino).lower()
            if destinos is not None:
                if cena_destino not in destinos:
                    raise ErroMapa("a cena de destino do portal nao existe")
                largura_b, altura_b, cena_nome = destinos[cena_destino]
            elif ID_CENA.fullmatch(cena_destino):
                largura_b, altura_b = _LADO_MAXIMO_PX, _LADO_MAXIMO_PX
                cena_nome = str(bruto.get("cena_nome") or "")[:80] or None
            else:
                raise ErroMapa("a cena de destino do portal nao existe")
            mao = "unica"
        portal = {
            "id": portal_id,
            "nome": " ".join(str(bruto.get("nome") or "").split())[:40] or "Portal",
            "a": _ponta_do_portal(bruto.get("a"), "a entrada", largura, altura),
            "b": _ponta_do_portal(bruto.get("b"), "a saida", largura_b, altura_b),
            "raio": round(_numero(bruto.get("raio", RAIO_PORTAL_PADRAO), "tamanho do portal", 0.3, 5), 2),
            "mao": mao,
            "usa": usa,
            "fluxo": fluxo,
            "visivel": bool(bruto.get("visivel", True)),
            "confirmar": bool(bruto.get("confirmar", False)),
            "ligado": bool(bruto.get("ligado", True)),
        }
        if cena_destino is not None:
            portal["cena"] = cena_destino
            portal["cena_nome"] = cena_nome
        portais.append(portal)
    return portais


def ler_estrutura(dados, largura: int, altura: int) -> dict:
    """O que mora em `mapa_cenas.estrutura` (hoje, os portais); registro quebrado vira vazio."""
    if not isinstance(dados, dict):
        return {"portais": []}
    try:
        portais = normalizar_portais(dados.get("portais", []), largura, altura)
    except ErroMapa:
        portais = []
    return {"portais": portais}


def portal_atingido(portais: list[dict], x: float, y: float, casa: float, *, gestor: bool, aceito: str | None = None):
    """O portal em que o token foi solto e para onde ele vai: (portal, (x, y)) ou None.

    Na mão dupla, a saída também leva de volta à entrada. Portal que pede confirmação só leva
    quando a pessoa aceitou (`aceito` é o id dele); um portal que o jogador não vê não pergunta
    nada, como uma armadilha.
    """
    for portal in portais:
        if not portal["ligado"]:
            continue
        if (portal["usa"] == "jogadores" and gestor) or (portal["usa"] == "mestre" and not gestor):
            continue
        lados = [("a", "b"), ("b", "a")] if portal["mao"] == "dupla" else [("a", "b")]
        for de, para in lados:
            boca = portal[de]
            if math.hypot(x - boca["x"], y - boca["y"]) > portal["raio"] * casa:
                continue
            pergunta = portal["confirmar"] and (gestor or portal["visivel"])
            if pergunta and aceito != portal["id"]:
                return None
            return portal, (portal[para]["x"], portal[para]["y"])
    return None


def portais_de(portais: list[dict], *, gestor: bool, revelado) -> list[dict]:
    """O que cada um vê dos portais. O Mestre vê todos; o jogador só os ligados e visíveis, e só
    a boca que a névoa deixa à vista (a outra chega como None)."""
    if gestor:
        return [dict(portal) for portal in portais]
    saida = []
    for portal in portais:
        if not (portal["ligado"] and portal["visivel"]):
            continue
        a = portal["a"] if revelado(portal["a"]["x"], portal["a"]["y"]) else None
        # A saída de um portal entre cenas fica noutra cena: o jogador não sabe onde dá.
        b = portal["b"] if not portal.get("cena") and revelado(portal["b"]["x"], portal["b"]["y"]) else None
        if a is None and b is None:
            continue
        saida.append({
            "id": portal["id"], "nome": portal["nome"], "a": a, "b": b, "raio": portal["raio"],
            "mao": portal["mao"], "usa": portal["usa"], "fluxo": portal["fluxo"],
            "visivel": True, "confirmar": portal["confirmar"], "ligado": True,
        })
    return saida


def normalizar_magia(dados, largura: int, altura: int) -> dict:
    """Efeito de magia jogado no mapa: forma, origem, alvo e o Fluxo que dá a cor. Só passa pelo
    tempo real (não fica gravado), então aqui só se confere o que chega antes de repassar."""
    if not isinstance(dados, dict):
        raise ErroMapa("magia invalida")
    forma = dados.get("forma")
    if forma not in FORMAS_MAGIA:
        raise ErroMapa("a magia e circulo, cone, linha ou impacto")
    fluxo = dados.get("fluxo")
    if fluxo not in FLUXOS:
        raise ErroMapa("escolha o Fluxo da magia")
    pontos = []
    for campo, limite in (("x", largura), ("y", altura), ("ax", largura), ("ay", altura)):
        pontos.append(round(_numero(dados.get(campo), campo, -FOLGA_MAGIA, limite + FOLGA_MAGIA), 1))
    x, y, ax, ay = pontos
    return {"forma": forma, "fluxo": fluxo, "x": x, "y": y, "ax": ax, "ay": ay}


def moldura_efetiva(token: dict, personagem: str | None, moldura_personagem: str | None, moldura_mesa: str | None) -> str:
    """A da mesa (o Mestre travou) vale acima de tudo; depois a do token; depois a do personagem;
    sem escolha, personagem usa a escada do nível e o resto, o aro do lado."""
    if moldura_mesa:
        return moldura_mesa
    if token.get("moldura"):
        return token["moldura"]
    if personagem:
        return moldura_personagem or "nivel"
    return "lado"


# ------------------------------------------------------------ quem é dono

def personagem_do_token(token: dict, participante: dict | None) -> str | None:
    if token.get("personagem_id"):
        return str(token["personagem_id"])
    if participante and participante.get("personagem_id"):
        return str(participante["personagem_id"])
    return None


def e_dono(token: dict, participante: dict | None, quem: Espectador) -> bool:
    personagem = personagem_do_token(token, participante)
    return bool(personagem and personagem in quem.personagens)


def pode_mover(token: dict, participante: dict | None, quem: Espectador, livre: bool) -> bool:
    """Mestre move tudo. Jogador move o próprio token, ou qualquer um que enxergue
    se o Mestre deixou a cena livre."""
    if quem.gestor:
        return True
    if not quem.permissoes_mesa.get("mover_tokens", True):
        return False
    if token.get("oculto"):
        return False
    if e_dono(token, participante, quem):
        return True
    if not livre:
        return False
    return degrau_de(token, participante, quem) in ("parcial", "total")


def some_na_nevoa(token: dict, participante: dict | None) -> bool:
    """Monstro, NPC ou objeto some para o jogador na névoa; personagem de jogador segue à vista da mesa."""
    return personagem_do_token(token, participante) is None


def degrau_de(token: dict, participante: dict | None, quem: Espectador) -> str | None:
    """Quanto este espectador enxerga do token: None (nada), desconhecido, parcial ou total."""
    if quem.gestor or e_dono(token, participante, quem):
        return "total"
    if token.get("oculto"):
        return None
    if participante is None:
        return "total"
    nivel = participante.get("visibilidade") or "total"
    if nivel == "oculto":
        return None
    return nivel if nivel in ("desconhecido", "parcial", "total") else "total"


# ------------------------------------------------------------- recursos

def _inteiro(valor) -> int | None:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        return None
    return int(valor)


def sanidade_da_ficha(ficha) -> tuple[int, int] | None:
    """(atual, máxima) como o HUD da ficha lê: atual ausente vale a máxima, máxima ausente vale 100."""
    status = ficha.get("status") if isinstance(ficha, dict) and isinstance(ficha.get("status"), dict) else None
    if status is None:
        return None
    maxima = _inteiro(status.get("sanidadeMaxima"))
    maxima = 100 if maxima is None or maxima <= 0 else maxima
    atual = _inteiro(status.get("sanidadeAtual"))
    atual = maxima if atual is None else max(0, min(atual, maxima))
    return atual, maxima


def _barra(tipo: str, atual, maxima) -> dict | None:
    atual = _inteiro(atual)
    maxima = _inteiro(maxima)
    if atual is None or maxima is None or maxima <= 0:
        return None
    return {"tipo": tipo, "atual": max(0, atual), "maximo": maxima}


def _barra_aproximada(atual, maxima) -> dict | None:
    atual = _inteiro(atual)
    maxima = _inteiro(maxima)
    if atual is None or maxima is None or maxima <= 0:
        return None
    if atual <= 0:
        return {"tipo": "vida", "rotulo": "Fora de combate", "fracao": 0.0}
    proporcao = atual / maxima
    for limite, rotulo, fracao in ESTADOS_VIDA:
        if proporcao >= limite:
            return {"tipo": "vida", "rotulo": rotulo, "fracao": fracao}
    return {"tipo": "vida", "rotulo": "Quase morto", "fracao": 0.1}


def recursos_do_token(participante: dict | None, recursos_ficha: dict | None, sanidade: tuple[int, int] | None) -> dict:
    """Números de Vida, Mana e Estamina (a Sessão manda; sem sessão, vale a ficha) e Sanidade (só a ficha)."""
    fonte = participante if participante else (recursos_ficha or {})
    return {
        "vida": (fonte.get("vida_atual"), fonte.get("vida_maxima")),
        "mana": (fonte.get("mana_atual"), fonte.get("mana_maxima")),
        "estamina": (fonte.get("estamina_atual"), fonte.get("estamina_maxima")),
        "sanidade": sanidade or (None, None),
    }


def barras_visiveis(token: dict, participante: dict | None, recursos: dict, quem: Espectador, degrau: str) -> list[dict]:
    config = normalizar_barras({}, token.get("barras") or {}, token.get("lado") or "neutro")
    if config["para"] == "ninguem":
        return []
    dono_ou_mestre = quem.gestor or e_dono(token, participante, quem)
    if config["para"] == "dono" and not dono_ou_mestre:
        return []
    if degrau == "desconhecido":
        return []
    if degrau == "parcial":
        # O degrau parcial da Sessão mostra só o estado qualitativo da Vida.
        if "vida" not in config["mostrar"]:
            return []
        aproximada = _barra_aproximada(*recursos["vida"])
        return [aproximada] if aproximada else []
    saida = []
    for tipo in config["mostrar"]:
        barra = _barra(tipo, *recursos[tipo])
        if barra:
            saida.append(barra)
    # A lista é filtrada antes de sair do servidor. O aparelho de cada jogador
    # escolhe a composição visual entre os recursos que este espectador recebeu.
    return saida


# ----------------------------------------------------------------- visão

def visao_token(
    token: dict,
    participante: dict | None,
    quem: Espectador,
    *,
    livre: bool,
    recursos_ficha: dict | None = None,
    sanidade: tuple[int, int] | None = None,
    nivel: int | None = None,
    tem_retrato: bool = False,
    condicoes: list | None = None,
    moldura: str = "lado",
    enquadramento: dict | None = None,
    na_nevoa: bool = False,
) -> dict | None:
    """O token como este espectador o recebe, ou None quando não deve nem saber que existe.

    `na_nevoa`: a névoa da cena está ligada e cobre o centro do token.
    """
    degrau = degrau_de(token, participante, quem)
    if degrau is None:
        return None
    if na_nevoa and not quem.gestor and not e_dono(token, participante, quem) and some_na_nevoa(token, participante):
        return None
    identidade = degrau in ("parcial", "total")
    nome = token.get("nome") or (participante or {}).get("nome") or "Token"
    if not identidade:
        nome = NOME_GENERICO.get((participante or {}).get("tipo"), "Desconhecido")
    recursos = recursos_do_token(participante, recursos_ficha, sanidade)
    saida = {
        "id": str(token["id"]),
        "x": float(token["x"]),
        "y": float(token["y"]),
        "porte": int(token.get("porte") or 1),
        "lado": token.get("lado") or "neutro",
        "camada": token.get("camada") if token.get("camada") in CAMADAS_TOKEN else "personagens",
        "flip_x": bool(token.get("flip_x", False)),
        "flip_y": bool(token.get("flip_y", False)),
        "nome": nome,
        "imagem": identidade and (bool(token.get("imagem_id")) or tem_retrato),
        "nivel": nivel if identidade else None,
        "barras": barras_visiveis(token, participante, recursos, quem, degrau),
        "condicoes": (condicoes or []) if identidade else [],
        "e_meu": e_dono(token, participante, quem),
        "pode_mover": pode_mover(token, participante, quem, livre),
        "desconhecido": degrau == "desconhecido",
        # Moldura de personagem entregaria quem é: o desconhecido usa o aro simples.
        "moldura": moldura if identidade else "lado",
        "enquadramento": normalizar_enquadramento({}, enquadramento or {}) if identidade else dict(ENQUADRAMENTO_PADRAO),
        # A luz se vê de longe: quem enxerga o token enxerga a tocha dele, conhecendo ou não quem é.
        "luz": token.get("luz") if isinstance(token.get("luz"), dict) else None,
    }
    # Baú, caixote, bolsa: quem enxerga o token sabe que ele guarda algo e vê o que saiu depois de aberto.
    if identidade:
        recipiente = recipientes.visao(token.get("recipiente"), gestor=quem.gestor)
        if recipiente is not None:
            saida["recipiente"] = recipiente
    # A aura escondida (o Mestre marcando uma área) é só de quem comanda e do dono do token.
    saida["aura"] = mesa_extras.aura_vista(token.get("aura"), gestor=quem.gestor, dono=saida["e_meu"])
    if quem.gestor or saida["e_meu"]:
        saida["config_barras"] = normalizar_barras({}, token.get("barras") or {}, saida["lado"])
        # Abre a ficha no painel lateral; só para quem já pode abrir aquela ficha.
        saida["personagem_id"] = personagem_do_token(token, participante)
    if quem.gestor:
        saida["oculto"] = bool(token.get("oculto"))
        saida["participante_id"] = str(token["participante_id"]) if token.get("participante_id") else None
        saida["personagem_id"] = personagem_do_token(token, participante)
        saida["imagem_id"] = str(token["imagem_id"]) if token.get("imagem_id") else None
        saida["visibilidade"] = (participante or {}).get("visibilidade")
        # A nota do Mestre não sai daqui para ninguém que não comande a mesa.
        saida["nota_mestre"] = token.get("nota_mestre") or ""
    return saida


def quem_ve(token: dict, participante: dict | None) -> str:
    """Para o tempo real: 'todos', 'gestores' ou 'donos' (Mestre e dono do personagem)."""
    if token.get("oculto"):
        return "gestores"
    if participante and participante.get("visibilidade") == "oculto":
        return "donos"
    return "todos"
