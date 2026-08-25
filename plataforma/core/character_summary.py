from __future__ import annotations

import json
import logging
import math
import re
import unicodedata
from pathlib import Path


log = logging.getLogger("jardim-plataforma")

_NOMES: dict[str, dict[str, str]] = {
    "raca": {}, "classe": {}, "pericia": {}, "legado": {}, "magia": {},
    "ritual": {}, "selo": {}, "encantamento": {},
}
# (fluxo_minimo, circulo) em ordem decrescente, lido de data/ficha/magias.json.
_CIRCULOS_POR_FLUXO: list[tuple[int, int]] = []
# Ids validos de cicatriz, lidos de data/ficha/marcas-de-circulo.json.
_CICATRIZES: set[str] = set()
# Ids validos de Simbolo, lidos de data/ficha/pecados-e-virtudes.json.
_SIMBOLOS: set[str] = set()
_CATALOGO: dict[str, dict[str, dict]] = {
    "raca": {}, "classe": {}, "pericia": {}, "legado": {}, "magia": {},
    "ritual": {}, "selo": {}, "encantamento": {},
}
_ATRIBUTOS = ("forca", "destreza", "constituicao", "inteligencia", "sabedoria", "carisma", "fluxo")
_VALORES_PADRAO = sorted((15, 14, 13, 12, 10, 8, 8))
_GRAUS = ("iniciante", "aprendiz", "treinado", "especialista", "mestre", "veterano", "renomado")
_NIVEL_MINIMO_GRAU = (1, 1, 3, 7, 13, 19, 29)
_FLUXOS_CATALISAVEIS = {
    "origem", "essencia", "comunicacao", "vitalidade", "inconstancia",
    "fisico", "espaco", "tempo", "vazio", "fim",
}

# Espelha src/services/racaService.ts::RACA_PERSONALIZADA_ID.
RACA_PERSONALIZADA_ID = "raca-personalizada"


def carregar_catalogos(data_root: Path) -> None:
    """Guarda id -> título (pro painel do mestre) e o item completo (pra
    validar Árvore/liberação na criação de personagem — ver
    `validar_arvore_raca_classe`).

    A ficha grava `racaId` e `classes[].id`; o painel do mestre precisa do nome
    legível. Ler o catálogo aqui evita mandar 86 KB de JSON ao navegador só
    para traduzir dois rótulos.
    """
    for chave, arquivo in (("raca", "racas.json"), ("classe", "classes.json")):
        caminho = data_root / "ficha" / arquivo
        if not caminho.exists():
            log.warning("Catalogo de %s ausente em %s", chave, caminho)
            continue
        try:
            itens = json.loads(caminho.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            log.exception("Falha ao ler catalogo em %s", caminho)
            continue
        if not isinstance(itens, list):
            continue
        _NOMES[chave] = {
            str(item.get("id")): str(item.get("titulo") or item.get("id"))
            for item in itens
            if isinstance(item, dict) and item.get("id")
        }
        _CATALOGO[chave] = {
            str(item.get("id")): item
            for item in itens
            if isinstance(item, dict) and item.get("id")
        }

    caminho_pericias = data_root / "ficha" / "pericias.json"
    try:
        documento = json.loads(caminho_pericias.read_text(encoding="utf-8"))
        pericias = documento.get("pericias", []) if isinstance(documento, dict) else []
        _NOMES["pericia"] = {
            str(item.get("id")): str(item.get("titulo") or item.get("id"))
            for item in pericias
            if isinstance(item, dict) and item.get("id")
        }
        _CATALOGO["pericia"] = {
            str(item.get("id")): item
            for item in pericias
            if isinstance(item, dict) and item.get("id")
        }
    except (OSError, json.JSONDecodeError, AttributeError):
        log.exception("Falha ao ler catalogo de pericias em %s", caminho_pericias)

    legados: list[dict] = []
    for arquivo, chave in (("legados.json", "legados"), ("legados-novos.json", "novos")):
        caminho = data_root / "ficha" / arquivo
        try:
            documento = json.loads(caminho.read_text(encoding="utf-8"))
            encontrados = documento.get(chave, []) if isinstance(documento, dict) else []
            legados.extend(item for item in encontrados if isinstance(item, dict) and item.get("id"))
        except (OSError, json.JSONDecodeError, AttributeError):
            log.exception("Falha ao ler catalogo de legados em %s", caminho)
    _NOMES["legado"] = {str(item["id"]): str(item.get("titulo") or item["id"]) for item in legados}
    _CATALOGO["legado"] = {str(item["id"]): item for item in legados}

    caminho_magias = data_root / "ficha" / "magias.json"
    try:
        documento = json.loads(caminho_magias.read_text(encoding="utf-8"))
        magias = documento.get("magias", []) if isinstance(documento, dict) else []
        _NOMES["magia"] = {
            str(item.get("id")): str(item.get("titulo") or item.get("id"))
            for item in magias
            if isinstance(item, dict) and item.get("id")
        }
        _CATALOGO["magia"] = {
            str(item.get("id")): item
            for item in magias
            if isinstance(item, dict) and item.get("id")
        }
        for chave, chave_plural in (("ritual", "rituais"), ("selo", "selos"), ("encantamento", "encantamentos")):
            itens = documento.get(chave_plural, []) if isinstance(documento, dict) else []
            _NOMES[chave] = {
                str(item.get("id")): str(item.get("titulo") or item.get("id"))
                for item in itens
                if isinstance(item, dict) and item.get("id")
            }
            _CATALOGO[chave] = {
                str(item.get("id")): item
                for item in itens
                if isinstance(item, dict) and item.get("id")
            }
        regras = documento.get("regras", {}) if isinstance(documento, dict) else {}
        circulos = [
            (_inteiro(item.get("fluxo_minimo")) or 0, _inteiro(item.get("circulo")) or 0)
            for item in regras.get("circulos") or []
            if isinstance(item, dict)
        ]
        _CIRCULOS_POR_FLUXO.clear()
        _CIRCULOS_POR_FLUXO.extend(sorted(circulos, reverse=True))
    except (OSError, json.JSONDecodeError, AttributeError):
        log.exception("Falha ao ler catalogo de magias em %s", caminho_magias)

    # Marcas do 5o ao 9o circulo sao derivadas do Fluxo e do circulo alcancado,
    # entao nao precisam de validacao. Cicatriz e guardada na ficha e concede
    # beneficio, entao o servidor confere id e quantidade.
    caminho_marcas = data_root / "ficha" / "marcas-de-circulo.json"
    try:
        documento = json.loads(caminho_marcas.read_text(encoding="utf-8"))
        cicatrizes = documento.get("cicatrizes", []) if isinstance(documento, dict) else []
        _CICATRIZES.clear()
        _CICATRIZES.update(
            str(item.get("id"))
            for item in cicatrizes
            if isinstance(item, dict) and item.get("id")
        )
    except (OSError, json.JSONDecodeError, AttributeError):
        log.exception("Falha ao ler marcas de circulo em %s", caminho_marcas)

    # Simbolo dos Sete: concede muito, entao o servidor confere o id e so o
    # mestre troca, porque o rito acontece na mesa e exige sete pessoas.
    caminho_setes = data_root / "ficha" / "pecados-e-virtudes.json"
    try:
        documento = json.loads(caminho_setes.read_text(encoding="utf-8"))
        _SIMBOLOS.clear()
        for chave in ("pecados", "virtudes"):
            _SIMBOLOS.update(
                str(item.get("id"))
                for item in documento.get(chave, [])
                if isinstance(item, dict) and item.get("id")
            )
    except (OSError, json.JSONDecodeError, AttributeError):
        log.exception("Falha ao ler pecados e virtudes em %s", caminho_setes)


_CHAVES_LIBERACAO = {
    "raca": ("racas_liberadas", "racas_liberadas_membros"),
    "classe": ("classes_liberadas", "classes_liberadas_membros"),
}


def _liberados_para(config: dict, tipo: str, usuario_id) -> list:
    """União do que o mestre liberou pra campanha inteira com o que liberou
    só pra este jogador (`racas_liberadas_membros`/`classes_liberadas_membros`,
    chaveado por usuario_id) — espelha data/mundo/arvoresCatalog.ts::filtrarPorLiberacao,
    que já faz essa mesma união do lado do cliente."""
    chave_global, chave_membros = _CHAVES_LIBERACAO[tipo]
    globais = config.get(chave_global) or []
    membros = config.get(chave_membros) or {}
    individuais = (membros.get(str(usuario_id)) if usuario_id and isinstance(membros, dict) else None) or []
    return [*globais, *individuais]


def _compativel_com_arvore(tipo: str, item_id, arvore_id, liberados: list) -> str | None:
    """None = ok; string = motivo do bloqueio."""
    if not item_id:
        return None
    item = _CATALOGO.get(tipo, {}).get(str(item_id))
    if not item:
        # id fora do catálogo conhecido: não é essa validação que garante
        # integridade referencial, só a regra de Árvore/liberação.
        return None
    if item.get("indisponivel"):
        return f"{tipo} indisponível: {item.get('motivo_indisponivel') or 'conteúdo ainda não liberado'}"
    disponibilidade = item.get("disponibilidade")
    arvore = item.get("arvore")
    arvores = item.get("arvores") or []
    compativel_arvore = (
        not arvore_id
        or arvore_id == "sem-arvore"
        or arvore_id == "universal"
        or disponibilidade == "geral"
        or arvore == arvore_id
        or (isinstance(arvores, list) and arvore_id in arvores)
    )
    if not compativel_arvore:
        return f"{tipo} não disponível para esta Árvore"
    if item.get("categoria") == "esquecida" and str(item_id) not in liberados:
        return f"{tipo} especial ainda não liberado pelo mestre nesta campanha"
    return None


def validar_arvore_raca_classe(arvore_id, raca_id, classe_id, configuracoes: dict | None) -> str | None:
    """Confere Raça/Classe contra a Árvore escolhida e contra o que o mestre
    liberou na campanha (`configuracoes.racas_liberadas`/`classes_liberadas`).
    Devolve None se estiver tudo certo, ou uma mensagem pronta pra 422.
    Só chamada para jogadores comuns — mestre/assistente ignora a regra."""
    config = configuracoes or {}
    erro = _compativel_com_arvore("raca", raca_id, arvore_id, config.get("racas_liberadas") or [])
    if erro:
        return erro
    return _compativel_com_arvore("classe", classe_id, arvore_id, config.get("classes_liberadas") or [])


def _inteiro(valor) -> int | None:
    if isinstance(valor, bool):
        return None
    try:
        numero = int(valor)
    except (TypeError, ValueError, OverflowError):
        return None
    return numero if str(valor).strip() == str(numero) or isinstance(valor, int) else None


def _classes_da_ficha(ficha: dict) -> list[dict]:
    bruto = ficha.get("classes")
    if not isinstance(bruto, list) or not bruto:
        classe_id = ficha.get("classeId")
        return [{"classeId": classe_id, "nivel": ficha.get("nivel", 1)}] if classe_id else []
    return [item for item in bruto if isinstance(item, dict)]


# VD (Valor de Desafio): classifica a dificuldade das criaturas do Bestiário
# em 10 graus (mesma contagem dos círculos dos Fluxos). O XP de cada grau já
# vem pronto aqui — o mestre só escolhe o VD da criatura, sem inventar XP na
# mão pra cada uma.
XP_POR_VD: dict[int, int] = {
    1: 200, 2: 600, 3: 1200, 4: 2000, 5: 3000,
    6: 4200, 7: 5600, 8: 7200, 9: 9000, 10: 11000,
}


def xp_por_vd(vd: int | None) -> int:
    if vd is None:
        return 0
    return XP_POR_VD.get(max(1, min(10, int(vd))), 0)


def _pericias_concedidas(classes: list[tuple[dict, int]]) -> dict[str, int]:
    """Pericias que a propria classe entrega, como o Oficio (Engenharia) do
    Engenheiro. Devolve o id e o indice do grau concedido: ele nao ocupa uma das
    pericias iniciais e nao consome Grau de Treinamento."""
    concedidas: dict[str, int] = {}
    for classe, _nivel in classes:
        for item in classe.get("pericias_concedidas") or []:
            if not isinstance(item, dict):
                continue
            pericia_id = str(item.get("id") or "").strip()
            if not pericia_id:
                continue
            grau = str(item.get("grau_inicial") or "aprendiz").lower()
            indice = _GRAUS.index(grau) if grau in _GRAUS else _GRAUS.index("aprendiz")
            concedidas[pericia_id] = max(concedidas.get(pericia_id, 0), indice)
    return concedidas


def _graus_de_treinamento(classes: list[tuple[dict, int]]) -> int:
    total = 0
    for classe, nivel in classes:
        for marco in classe.get("progressao") or []:
            if not isinstance(marco, dict) or _inteiro(marco.get("nivel")) is None:
                continue
            if int(marco["nivel"]) > nivel:
                continue
            for recompensa in marco.get("recompensas") or []:
                if isinstance(recompensa, dict) and recompensa.get("tipo") == "grau_pericia":
                    total += max(1, _inteiro(recompensa.get("quantidade")) or 1)
    return total


def _vagas_poder(classe: dict, nivel: int) -> int:
    return sum(
        1
        for marco in classe.get("progressao") or []
        if isinstance(marco, dict) and (_inteiro(marco.get("nivel")) or 99) <= nivel
        for recompensa in marco.get("recompensas") or []
        if isinstance(recompensa, dict) and recompensa.get("tipo") == "poder"
    )


def _vagas_escolha_habilidade(habilidade: dict, nivel: int) -> int:
    """Vagas de escolha de uma habilidade com catalogo proprio (as Engenhocas
    do Engenheiro, por exemplo). Espelha `vagasEscolhaHabilidade` em
    src/services/progressaoFichaService.ts."""
    config = habilidade.get("escolha_opcoes")
    if not isinstance(config, dict) or not (habilidade.get("opcoes") or []):
        return 0
    # `total` e quantidade liberada de uma vez, nao um atalho para ignorar o
    # nivel de desbloqueio. O Estilo de Combate do Lutador so existe no 18.
    liberada = any(
        (_inteiro(marco) or 99) <= nivel
        for marco in habilidade.get("niveis") or []
    )
    if not liberada:
        return 0
    total = _inteiro(config.get("total"))
    if total:
        return max(0, total)
    # Vaga que nao sai em todo estagio: a Rede de Negocios do Comerciante abre
    # praca nos niveis 1 e 5, e nada nos estagios seguintes.
    niveis_vaga = config.get("niveis_vaga")
    if isinstance(niveis_vaga, list) and niveis_vaga:
        return sum(1 for marco in niveis_vaga if (_inteiro(marco) or 99) <= nivel)
    estagios = sum(1 for marco in habilidade.get("niveis") or [] if (_inteiro(marco) or 99) <= nivel)
    return max(0, estagios * max(1, _inteiro(config.get("por_estagio")) or 1))


def efeitos_escolhas_habilidade(ficha: dict | None) -> list[dict]:
    """Resolve efeitos permanentes das opções de classe selecionadas.

    Espelha `opcoesHabilidadeSelecionadas` do front-end. Cada marco substitui
    o anterior: Coração de Leviatã no degrau 4 vale +20, não +5+10+15+20.
    """
    if not isinstance(ficha, dict):
        return []
    escolhas = ficha.get("escolhasHabilidade")
    if not isinstance(escolhas, dict):
        return []

    resultado: list[dict] = []
    for referencia in _classes_da_ficha(ficha):
        classe_id = str(referencia.get("classeId") or referencia.get("id") or "")
        classe = _CATALOGO["classe"].get(classe_id)
        nivel_classe = max(1, _inteiro(referencia.get("nivel")) or 1)
        if not isinstance(classe, dict):
            continue
        for habilidade in classe.get("habilidades") or []:
            if not isinstance(habilidade, dict):
                continue
            vagas = _vagas_escolha_habilidade(habilidade, nivel_classe)
            chave = f"{classe_id}:{habilidade.get('id')}"
            selecionadas = escolhas.get(chave)
            if not vagas or not isinstance(selecionadas, list):
                continue

            opcoes = {
                str(item.get("id")): item
                for item in habilidade.get("opcoes") or []
                if isinstance(item, dict) and item.get("id")
            }
            marcos_escada = (habilidade.get("escalonamento") or {}).get("marcos") or []
            nivel_escada = max((
                _inteiro(marco.get("nivel")) or 0
                for marco in marcos_escada
                if isinstance(marco, dict)
                and (_inteiro(marco.get("nivel_classe")) or 99) <= nivel_classe
            ), default=0)
            nivel_aplicacao = max(1, nivel_escada)

            for opcao_id in selecionadas[:vagas]:
                opcao = opcoes.get(str(opcao_id))
                if not opcao:
                    continue
                marco_atual = max((
                    marco
                    for marco in opcao.get("efeitos_por_nivel") or []
                    if isinstance(marco, dict)
                    and (_inteiro(marco.get("nivel")) or 99) <= nivel_aplicacao
                ), key=lambda marco: _inteiro(marco.get("nivel")) or 0, default=None)
                if not marco_atual:
                    continue
                resultado.extend(
                    efeito for efeito in marco_atual.get("efeitos") or []
                    if isinstance(efeito, dict)
                )
    return resultado


def bonus_escolhas_habilidade(ficha: dict | None, categoria: str, alvo: str) -> int:
    total = 0
    for efeito in efeitos_escolhas_habilidade(ficha):
        if efeito.get("categoria") != categoria or efeito.get("alvo") != alvo:
            continue
        if efeito.get("modo", "bonus") != "bonus":
            continue
        valor = efeito.get("valor")
        if isinstance(valor, (int, float)) and not isinstance(valor, bool) and math.isfinite(valor):
            total += int(valor)
    return total


def _indice_grau(grau) -> int:
    try:
        return _GRAUS.index(str(grau).lower())
    except ValueError:
        return -1


def _atende_requisito_legado(requisito, ficha: dict, nivel_total: int) -> bool:
    if not isinstance(requisito, dict):
        return True
    alternativas = requisito.get("ou")
    if isinstance(alternativas, list):
        return any(_atende_requisito_legado(item, ficha, nivel_total) for item in alternativas)
    minimo_nivel = _inteiro(requisito.get("nivel_personagem"))
    if minimo_nivel is not None and nivel_total < minimo_nivel:
        return False
    atributo = requisito.get("atributo")
    if atributo:
        finais = ficha.get("atributosFinais") if isinstance(ficha.get("atributosFinais"), dict) else {}
        if (_inteiro(finais.get(str(atributo).lower())) or 0) < (_inteiro(requisito.get("valor_minimo")) or 0):
            return False
    pericia = requisito.get("pericia")
    if pericia:
        pericias = ficha.get("pericias") if isinstance(ficha.get("pericias"), dict) else {}
        if _indice_grau(pericias.get(str(pericia))) < _indice_grau(requisito.get("nivel")):
            return False
    return True


def _normalizar_texto(valor) -> str:
    return "".join(
        caractere for caractere in unicodedata.normalize("NFD", str(valor or "").lower().strip())
        if unicodedata.category(caractere) != "Mn"
    )


def _atende_requisito_poder(requisito, classe: dict, nivel: int, ficha: dict, ids_selecionados: set[str]) -> bool:
    texto = str(requisito or "").strip()
    por_nivel = re.search(r"n[ií]vel\s+(\d+)(?:\s+de\s+(.+))?", texto, re.IGNORECASE)
    if por_nivel:
        nome = _normalizar_texto(por_nivel.group(2) or classe.get("titulo"))
        corresponde = nome in {_normalizar_texto(classe.get("id")), _normalizar_texto(classe.get("titulo"))}
        return not corresponde or nivel >= int(por_nivel.group(1))
    por_atributo = re.match(r"^(for[cç]a|destreza|constitui[cç][aã]o|intelig[eê]ncia|sabedoria|carisma|fluxo)\s+(\d+)$", texto, re.IGNORECASE)
    if por_atributo:
        finais = ficha.get("atributosFinais") if isinstance(ficha.get("atributosFinais"), dict) else {}
        return (_inteiro(finais.get(_normalizar_texto(por_atributo.group(1)))) or 0) >= int(por_atributo.group(2))
    por_estagio = re.match(r"^(.+?)\s+(\d+)$", texto)
    if por_estagio:
        habilidade = next((item for item in classe.get("habilidades") or [] if _normalizar_texto(item.get("titulo")) == _normalizar_texto(por_estagio.group(1))), None)
        liberados = sum(1 for marco in (habilidade.get("niveis") or []) if (_inteiro(marco) or 99) <= nivel) if habilidade else 0
        return habilidade is not None and liberados >= int(por_estagio.group(2))
    poder = next((item for item in classe.get("poderes") or [] if _normalizar_texto(item.get("titulo")) == _normalizar_texto(texto)), None)
    return bool(poder and str(poder.get("id")) in ids_selecionados)


def _validar_escolhas_progressao(ficha: dict, anterior: dict, classes: list[tuple[dict, int]], nivel_total: int, raca: dict) -> str | None:
    escolha_racial = ficha.get("escolhaRacial") if isinstance(ficha.get("escolhaRacial"), dict) else {}
    fragmentos = {str(item.get("id")): item for item in raca.get("fragmentos") or [] if isinstance(item, dict) and item.get("id")}
    conhecidos = escolha_racial.get("fragmentosConhecidosIds") or []
    expressos = escolha_racial.get("fragmentosExpressosIds") or []
    if any(not isinstance(lista, list) for lista in (conhecidos, expressos)):
        return "fragmentos raciais devem ser listas de ids"
    max_conhecidos = max(0, _inteiro((raca.get("fragmentos_config") or {}).get("conhecidos_maximo")) or 0)
    max_expressos = max(0, _inteiro((raca.get("fragmentos_config") or {}).get("expressos")) or 0)
    if any(not isinstance(item, str) for item in conhecidos + expressos):
        return "fragmentos raciais devem conter apenas ids"
    if len(conhecidos) != len(set(conhecidos)) or len(conhecidos) > max_conhecidos or any(item not in fragmentos for item in conhecidos):
        return "fragmentos conhecidos excedem o limite racial ou contem id invalido"
    if len(expressos) != len(set(expressos)) or len(expressos) > max_expressos or any(item not in conhecidos for item in expressos):
        return "fragmentos expressos devem estar entre os conhecidos e respeitar o limite racial"

    modificacoes_catalogo = {str(item.get("id")): item for item in raca.get("modificacoes") or [] if isinstance(item, dict) and item.get("id")}
    modificacoes = escolha_racial.get("modificacoesIds") or []
    if not isinstance(modificacoes, list) or any(not isinstance(item, str) for item in modificacoes) or len(modificacoes) != len(set(modificacoes)):
        return "modificacoes raciais devem ser uma lista sem ids repetidos"
    capacidade_config = raca.get("capacidade_modificacoes") or {}
    capacidade = max(0, _inteiro(capacidade_config.get("base")) or 0) + nivel_total // max(1, _inteiro(capacidade_config.get("nivel_por_slot")) or 2)
    if len(modificacoes) > capacidade or any(item not in modificacoes_catalogo for item in modificacoes):
        return "modificacoes instaladas excedem a capacidade racial ou contem id invalido"
    postura = escolha_racial.get("varianteId")
    candidatas = [modificacoes_catalogo[item] for item in modificacoes]
    if any(nivel_total < max(1, _inteiro(item.get("nivel_minimo")) or 1) for item in candidatas):
        return "o nivel total ainda nao permite uma modificacao instalada"
    if any(item.get("postura_exigida") and item.get("postura_exigida") != postura for item in candidatas):
        return "uma modificacao instalada exige outro chassi ou postura"
    passivas = sum(1 for item in candidatas if item.get("categoria") == "passiva")
    if any(item.get("categoria") == "ativa" and passivas < max(0, _inteiro(item.get("passivas_exigidas")) or 0) for item in candidatas):
        return "uma modificacao ativa exige mais modificacoes passivas"

    selecoes = ficha.get("poderesClasseSelecionados") or []
    if not isinstance(selecoes, list):
        return "poderesClasseSelecionados deve ser uma lista"
    referencias = {str(classe.get("id")): (classe, nivel) for classe, nivel in classes}
    ids_selecionados = {
        str(item.get("poderId"))
        for item in selecoes
        if isinstance(item, dict) and item.get("poderId")
    }
    contagem: dict[str, int] = {}
    repeticoes: dict[tuple[str, str], int] = {}
    for selecao in selecoes:
        if not isinstance(selecao, dict):
            return "selecao de poder de classe invalida"
        classe_id = str(selecao.get("classeId") or "")
        poder_id = str(selecao.get("poderId") or "")
        referencia = referencias.get(classe_id)
        poder = next((item for item in (referencia[0].get("poderes") or []) if str(item.get("id")) == poder_id), None) if referencia else None
        if not referencia or not isinstance(poder, dict):
            return "a ficha contem um poder que nao pertence a uma classe adquirida"
        contagem[classe_id] = contagem.get(classe_id, 0) + 1
        chave = (classe_id, poder_id)
        repeticoes[chave] = repeticoes.get(chave, 0) + 1
        limite = max(1, _inteiro(poder.get("limite")) or (99 if poder.get("repetivel") else 1))
        if repeticoes[chave] > limite:
            return "um poder de classe foi escolhido mais vezes que o permitido"
        if not all(_atende_requisito_poder(item, referencia[0], referencia[1], ficha, ids_selecionados) for item in poder.get("pre_requisitos") or []):
            return "a ficha nao atende aos pre-requisitos de um poder de classe"
    for classe_id, quantidade in contagem.items():
        classe, nivel = referencias[classe_id]
        if quantidade > _vagas_poder(classe, nivel):
            return "a ficha possui mais poderes de classe do que as vagas liberadas"

    escolhas_habilidade = ficha.get("escolhasHabilidade") or {}
    if not isinstance(escolhas_habilidade, dict):
        return "escolhasHabilidade deve ser um objeto"
    catalogo_escolhas: dict[str, tuple[dict, int]] = {}
    for classe, nivel in classes:
        for habilidade in classe.get("habilidades") or []:
            if not isinstance(habilidade, dict):
                continue
            vagas_habilidade = _vagas_escolha_habilidade(habilidade, nivel)
            if vagas_habilidade:
                catalogo_escolhas[f"{classe.get('id')}:{habilidade.get('id')}"] = (habilidade, vagas_habilidade)
    for chave, escolhidos in escolhas_habilidade.items():
        if not isinstance(escolhidos, list) or any(not isinstance(item, str) for item in escolhidos):
            return "cada escolha de habilidade deve ser uma lista de ids"
        registro = catalogo_escolhas.get(str(chave))
        if registro is None:
            if escolhidos:
                return "a ficha escolheu opcoes de uma habilidade que ainda nao foi liberada"
            continue
        habilidade, vagas_habilidade = registro
        if len(escolhidos) > vagas_habilidade:
            return "a ficha preparou mais opcoes de habilidade do que as vagas liberadas"
        ids_opcoes = {str(item.get("id")) for item in habilidade.get("opcoes") or [] if isinstance(item, dict)}
        if any(item not in ids_opcoes for item in escolhidos):
            return "a ficha contem uma opcao inexistente no catalogo da habilidade"
        repetivel = bool((habilidade.get("escolha_opcoes") or {}).get("repetivel"))
        if not repetivel and len(set(escolhidos)) != len(escolhidos):
            return "esta habilidade nao permite escolher a mesma opcao duas vezes"

    selecionados = ficha.get("legadosSelecionados") or []
    if not isinstance(selecionados, list) or any(not isinstance(item, str) for item in selecionados):
        return "legadosSelecionados deve ser uma lista de ids"
    vagas = nivel_total // 5 + max(0, _inteiro(raca.get("legados_adicionais")) or 0)
    if len(selecionados) > vagas:
        return "a ficha possui mais Legados do que os marcos liberados"
    contagem_legados: dict[str, int] = {}
    for legado_id in selecionados:
        legado = _CATALOGO["legado"].get(legado_id)
        if not legado:
            return "a ficha contem um Legado inexistente"
        contagem_legados[legado_id] = contagem_legados.get(legado_id, 0) + 1
        limite = max(1, _inteiro(legado.get("limite")) or (2 if legado.get("repetivel") else 1))
        if contagem_legados[legado_id] > limite:
            return "um Legado foi escolhido mais vezes que o permitido"
        if not all(_atende_requisito_legado(item, ficha, nivel_total) for item in legado.get("pre_requisitos") or []):
            return "a ficha nao atende aos pre-requisitos de um Legado escolhido"

    if anterior:
        poderes_anteriores = anterior.get("poderesClasseSelecionados") or []
        legados_anteriores = anterior.get("legadosSelecionados") or []
        if any(item not in selecoes for item in poderes_anteriores if isinstance(item, dict)):
            return "poderes de classe adquiridos so podem ser removidos pelo mestre"
        if any(selecionados.count(item) < legados_anteriores.count(item) for item in set(legados_anteriores)):
            return "Legados adquiridos so podem ser removidos pelo mestre"
    return None


def _escolha_racial_vazia(valor) -> bool:
    """Campo de escolha racial que nunca foi preenchido."""
    return valor is None or valor == "" or valor == [] or valor == {}


def _opcao_racial_valida(raca: dict, campo: str, valor) -> bool:
    """Confere se `valor` e uma opcao que a raca realmente oferece nesse campo.
    Campos que guardam listas (a escolha de atributos raciais) so precisam vir
    preenchidos - o conteudo deles ja e conferido em `_atributo_efetivo`."""
    colecao = {
        "varianteId": "variantes",
        "linhagemId": "linhagens",
        "condicaoAncestralId": "condicoes_ancestrais",
    }.get(campo)
    if colecao is None:
        return not _escolha_racial_vazia(valor)
    return any(
        isinstance(item, dict) and str(item.get("id")) == str(valor)
        for item in raca.get(colecao) or []
    )


def _fluxo_efetivo(ficha: dict, raca: dict) -> int:
    finais = ficha.get("atributosFinais") if isinstance(ficha.get("atributosFinais"), dict) else {}
    valor = _inteiro(finais.get("fluxo")) or 1
    ajuste = _inteiro((raca.get("ajustes_atributos") or {}).get("fluxo")) or 0
    escolha = ficha.get("escolhaRacial") if isinstance(ficha.get("escolhaRacial"), dict) else {}
    variante_id = escolha.get("varianteId")
    for colecao in ("variantes", "linhagens", "condicoes_ancestrais"):
        opcao = next(
            (
                item for item in raca.get(colecao) or []
                if isinstance(item, dict) and str(item.get("id")) == str(variante_id)
            ),
            None,
        )
        if opcao:
            ajuste += _inteiro((opcao.get("ajustes_atributos") or {}).get("fluxo")) or 0
            break
    configuracao = raca.get("escolha_atributos") if isinstance(raca.get("escolha_atributos"), dict) else {}
    campo = str(configuracao.get("campo") or "atributosRaciais")
    escolhas = escolha.get(campo) if isinstance(escolha.get(campo), list) else []
    total = max(0, _inteiro(configuracao.get("total")) or 0)
    escolhas_unicas = list(dict.fromkeys(item for item in escolhas if isinstance(item, str)))
    if "fluxo" in escolhas_unicas[:total]:
        ajuste += _inteiro(configuracao.get("bonus_por_escolha")) or 0
    limite = _inteiro((raca.get("limites_atributos") or {}).get("fluxo"))
    if limite is not None and ajuste > 0:
        ajuste = min(ajuste, max(0, limite - valor))
    return max(1, valor + ajuste)


def _circulo_por_fluxo(fluxo: int) -> int:
    """Maior circulo que o atributo Fluxo sustenta, pelos limiares publicados
    em data/ficha/magias.json (14, 18, 22... ate o 10o circulo)."""
    for minimo, circulo in _CIRCULOS_POR_FLUXO:
        if fluxo >= minimo:
            return circulo
    return 0


def _validar_manifestacao_magica(
    ficha: dict,
    anterior: dict,
    classes: list[tuple[dict, int]],
    *,
    chave_catalogo: str,
    rotulo_plural: str,
    campo_conhecidos: str,
    campo_concedidos: str,
    campo_progressao: str,
    criacao: bool,
) -> str | None:
    """Rituais, Selos e Encantamentos nao tem circulo nem 'fontes_permitidas'
    (ver data/ficha/magias.json.regras.formas) - so vagas por nivel de classe,
    concessao do mestre e o mesmo travamento pos-criacao que ja vale pra
    magiasConhecidasIds/magiasConcedidasIds."""
    conhecidos = ficha.get(campo_conhecidos) or []
    concedidos = ficha.get(campo_concedidos) or []
    if not isinstance(conhecidos, list) or any(not isinstance(item, str) for item in conhecidos):
        return f"{campo_conhecidos} deve ser uma lista de ids"
    if not isinstance(concedidos, list) or any(not isinstance(item, str) for item in concedidos):
        return f"{campo_concedidos} deve ser uma lista de ids"
    if len(conhecidos) != len(set(conhecidos)) or len(concedidos) != len(set(concedidos)):
        return f"{rotulo_plural} conhecidos e concedidos nao podem repetir ids"
    catalogo = _CATALOGO[chave_catalogo]
    if any(item not in catalogo for item in conhecidos + concedidos):
        return f"a ficha contem um {chave_catalogo} inexistente"

    vagas = 0
    for classe, nivel in classes:
        fonte = classe.get(campo_progressao) if isinstance(classe.get(campo_progressao), dict) else {}
        marcos = [
            marco for marco in fonte.get("marcos") or []
            if isinstance(marco, dict) and (_inteiro(marco.get("nivel")) or 99) <= nivel
        ]
        if not marcos:
            continue
        marco = max(marcos, key=lambda item: _inteiro(item.get("nivel")) or 0)
        vagas += max(0, _inteiro(marco.get("vagas")) or 0)

    if len(conhecidos) > vagas:
        return f"a ficha possui mais {rotulo_plural} conhecidos do que as vagas liberadas"

    if criacao and (conhecidos or concedidos):
        return f"a criacao comum nao comeca com {rotulo_plural}"
    if anterior:
        anteriores = anterior.get(campo_conhecidos) or []
        if any(item not in conhecidos for item in anteriores if isinstance(item, str)):
            return f"{rotulo_plural} aprendidos so podem ser removidos pelo mestre"
        if concedidos != (anterior.get(campo_concedidos) or []):
            return f"somente o mestre pode alterar {rotulo_plural} concedidos"
    return None


def _validar_rituais_selos_encantamentos(
    ficha: dict,
    anterior: dict,
    classes: list[tuple[dict, int]],
    *,
    criacao: bool,
) -> str | None:
    especificacoes = (
        ("ritual", "rituais", "rituaisConhecidosIds", "rituaisConcedidosIds", "progressao_rituais"),
        ("selo", "selos", "selosConhecidosIds", "selosConcedidosIds", "progressao_selos"),
        ("encantamento", "encantamentos", "encantamentosConhecidosIds", "encantamentosConcedidosIds", "progressao_encantamentos"),
    )
    for chave_catalogo, rotulo_plural, campo_conhecidos, campo_concedidos, campo_progressao in especificacoes:
        erro = _validar_manifestacao_magica(
            ficha, anterior, classes,
            chave_catalogo=chave_catalogo,
            rotulo_plural=rotulo_plural,
            campo_conhecidos=campo_conhecidos,
            campo_concedidos=campo_concedidos,
            campo_progressao=campo_progressao,
            criacao=criacao,
        )
        if erro:
            return erro
    return None


def _validar_catalisadores_fluxo(ficha: dict, classes: list[tuple[dict, int]]) -> str | None:
    """Valida a configuração operacional usada por Sintonizador e
    Interceptador. Catalisador não concede fonte, círculos ou vagas; por isso
    esta validação permanece separada de `_validar_magias`."""
    configuracao = ficha.get("catalisadoresFluxo")
    if configuracao is None:
        return None
    if not isinstance(configuracao, dict):
        return "catalisadoresFluxo deve ser um objeto"

    preparados = configuracao.get("preparadosIds") or []
    ativo = configuracao.get("ativoId")
    if not isinstance(preparados, list) or any(not isinstance(item, str) for item in preparados):
        return "catalisadores preparados devem ser uma lista de ids"
    if len(preparados) != len(set(preparados)):
        return "o mesmo catalisador nao pode ser preparado duas vezes"
    if any(item not in _FLUXOS_CATALISAVEIS for item in preparados):
        return "a ficha contem um catalisador de Fluxo invalido"
    if ativo is not None and (not isinstance(ativo, str) or ativo not in preparados):
        return "o catalisador ativo deve estar entre os preparados"

    niveis = {str(classe.get("id")): nivel for classe, nivel in classes}
    nivel_sintonizador = niveis.get("sintonizador", 0)
    possui_interceptador = niveis.get("interceptador", 0) > 0
    limite_base = 3 if nivel_sintonizador >= 15 else 2 if nivel_sintonizador >= 5 else 1 if nivel_sintonizador > 0 else 0
    foco_reserva = any(
        isinstance(item, dict)
        and item.get("classeId") == "sintonizador"
        and item.get("poderId") == "foco-reserva"
        for item in ficha.get("poderesClasseSelecionados") or []
    )
    limite = max(1 if possui_interceptador else 0, limite_base + (1 if foco_reserva else 0))
    if limite == 0 and preparados:
        return "a ficha nao possui classe capaz de preparar catalisadores"
    if len(preparados) > limite:
        return "os catalisadores preparados excedem o limite da classe"
    return None


def _validar_magias(
    ficha: dict,
    anterior: dict,
    classes: list[tuple[dict, int]],
    raca: dict,
    *,
    criacao: bool,
) -> str | None:
    conhecidas = ficha.get("magiasConhecidasIds") or []
    concedidas = ficha.get("magiasConcedidasIds") or []
    if not isinstance(conhecidas, list) or any(not isinstance(item, str) for item in conhecidas):
        return "magiasConhecidasIds deve ser uma lista de ids"
    if not isinstance(concedidas, list) or any(not isinstance(item, str) for item in concedidas):
        return "magiasConcedidasIds deve ser uma lista de ids"
    if len(conhecidas) != len(set(conhecidas)) or len(concedidas) != len(set(concedidas)):
        return "magias conhecidas e concedidas nao podem repetir ids"
    if any(item not in _CATALOGO["magia"] for item in conhecidas + concedidas):
        return "a ficha contem uma magia inexistente"

    circulo_fonte = 0
    vagas = 0
    tradicoes: set[str] = set()
    for classe, nivel in classes:
        fonte = classe.get("progressao_magia") if isinstance(classe.get("progressao_magia"), dict) else {}
        marcos = [
            marco for marco in fonte.get("marcos") or []
            if isinstance(marco, dict) and (_inteiro(marco.get("nivel")) or 99) <= nivel
        ]
        if not marcos:
            continue
        marco = max(marcos, key=lambda item: _inteiro(item.get("nivel")) or 0)
        circulo_fonte = max(circulo_fonte, _inteiro(marco.get("circulo")) or 0)
        vagas += max(0, _inteiro(marco.get("vagas")) or 0)
        tradicoes.update(str(item) for item in fonte.get("tradicoes") or [])

    if len(conhecidas) > vagas:
        return "a ficha possui mais magias conhecidas do que as vagas liberadas"
    circulo_fluxo = _circulo_por_fluxo(_fluxo_efetivo(ficha, raca))
    for magia_id in conhecidas:
        magia = _CATALOGO["magia"][magia_id]
        circulo = _inteiro(magia.get("circulo"))
        if circulo is None or magia.get("somente_mestre"):
            return "rituais e magias especiais precisam ser concedidos pelo mestre"
        if circulo > circulo_fonte:
            return "a fonte de magia ainda nao libera o circulo escolhido"
        if circulo > circulo_fluxo:
            return "Fluxo insuficiente para o circulo de uma magia conhecida"
        # "tradicao" nomeia o Fluxo da magia; quem casa com a classe e
        # "fontes_permitidas" (Canalizacao, Sintonia, Cartomancia de Fluxo).
        permitidas = {str(item) for item in magia.get("fontes_permitidas") or []}
        if permitidas and not (permitidas & tradicoes):
            return "a fonte da ficha nao ensina a tradicao de uma magia conhecida"

    # Uma cicatriz por magia de 10o circulo aprendida, sem repetir e sem id
    # inventado. Concessao do mestre nao gera cicatriz.
    cicatrizes = ficha.get("cicatrizesIds") or []
    if not isinstance(cicatrizes, list) or any(not isinstance(item, str) for item in cicatrizes):
        return "cicatrizesIds deve ser uma lista de ids"
    if len(cicatrizes) != len(set(cicatrizes)):
        return "a mesma cicatriz nao pode aparecer duas vezes"
    if any(item not in _CICATRIZES for item in cicatrizes):
        return "a ficha contem uma cicatriz inexistente"
    decimo_circulo = sum(
        1
        for magia_id in conhecidas
        if _inteiro((_CATALOGO["magia"].get(magia_id) or {}).get("circulo")) == 10
    )
    if len(cicatrizes) > decimo_circulo:
        return "a ficha possui mais cicatrizes do que magias de 10o circulo aprendidas"

    # O Simbolo dos Sete vem de um rito com sete pessoas, conduzido na mesa.
    simbolo = ficha.get("simboloId")
    if simbolo is not None:
        if not isinstance(simbolo, str) or simbolo.strip() not in _SIMBOLOS:
            return "a ficha contem um simbolo dos Sete inexistente"
    if criacao and simbolo:
        return "a criacao comum nao comeca com um simbolo dos Sete"
    if anterior and simbolo != anterior.get("simboloId"):
        return "somente o mestre pode alterar o simbolo dos Sete"

    if criacao and (conhecidas or concedidas or ficha.get("magias")):
        return "a criacao comum nao comeca com magias"
    if anterior:
        anteriores = anterior.get("magiasConhecidasIds") or []
        if any(item not in conhecidas for item in anteriores if isinstance(item, str)):
            return "magias aprendidas so podem ser removidas pelo mestre"
        if concedidas != (anterior.get("magiasConcedidasIds") or []):
            return "somente o mestre pode alterar magias concedidas"
        if ficha.get("magias") != anterior.get("magias"):
            return "somente o mestre pode alterar registros antigos de magia"
    return None


def validar_regras_ficha(
    ficha: dict,
    configuracoes: dict | None,
    *,
    criacao: bool = False,
    ficha_anterior: dict | None = None,
    usuario_id=None,
) -> str | None:
    """Valida as regras publicadas para fichas de jogadores comuns.

    Mestre e assistente continuam podendo preparar NPCs e excecoes narrativas;
    essa decisao de permissao fica no router, nao no cliente.

    `usuario_id` (o dono do personagem) resolve liberação individual - ver
    `_liberados_para`. Sem ele, só a liberação da campanha inteira conta.
    """
    if not isinstance(ficha, dict):
        return "ficha invalida"
    anterior = ficha_anterior if isinstance(ficha_anterior, dict) else {}
    config = configuracoes or {}
    arvore_id = ficha.get("arvoreId")
    raca_id = str(ficha.get("racaId") or "")
    raca = _CATALOGO["raca"].get(raca_id)
    if not raca:
        return "raca inexistente no catalogo oficial"
    liberados_raca = _liberados_para(config, "raca", usuario_id)
    # Criação normalmente exige raça comum; uma raça especial já liberada
    # pra este jogador (ou pra campanha) é a exceção documentada no painel
    # do mestre ("aparecem na criação/edição de fichas depois de liberadas").
    if criacao and raca.get("categoria") != "padrao" and raca_id not in liberados_raca:
        return "a criacao deve comecar com uma raca comum, ou uma raca especial liberada pelo mestre"
    erro = _compativel_com_arvore("raca", raca_id, arvore_id, liberados_raca)
    if erro:
        return erro

    for campo in ("arvoreId", "metodoAtributos"):
        if not criacao and campo in anterior and ficha.get(campo) != anterior.get(campo):
            return f"jogador nao pode alterar {campo} depois da criacao"
    if not criacao and "racaId" in anterior and raca_id != str(anterior.get("racaId") or ""):
        # Trocar de raça depois de criado só é permitido se a NOVA raça for
        # especial e liberada pra este jogador - uma "transformação" que o
        # mestre concedeu, nunca respec livre entre duas raças comuns (essa
        # continua caindo no "raca inexistente"/liberação acima se não bater).
        if raca.get("categoria") != "esquecida" or raca_id not in liberados_raca:
            return "jogador so pode trocar de raca para uma raca especial liberada pelo mestre"
    for campo in ("proficiencias", "resistenciasTexto"):
        if not criacao and ficha.get(campo) != anterior.get(campo):
            return f"somente o mestre pode alterar {campo}"
    if not criacao:
        escolha = ficha.get("escolhaRacial") if isinstance(ficha.get("escolhaRacial"), dict) else {}
        escolha_anterior = anterior.get("escolhaRacial") if isinstance(anterior.get("escolhaRacial"), dict) else {}
        campos_fixos = {"varianteId", "linhagemId", "condicaoAncestralId"}
        configuracao_atributos = raca.get("escolha_atributos")
        if isinstance(configuracao_atributos, dict) and configuracao_atributos.get("campo"):
            campos_fixos.add(str(configuracao_atributos["campo"]))
        for campo in campos_fixos:
            atual = escolha.get(campo)
            anterior_campo = escolha_anterior.get(campo)
            if atual == anterior_campo:
                continue
            # Quando uma raca ganha uma escolha que nao existia na epoca em que a
            # ficha foi criada (a Cor da Alma do Espirito, por exemplo), o jogador
            # preenche o campo vazio uma unica vez. Trocar um valor ja escolhido
            # continua sendo prerrogativa do mestre.
            if _escolha_racial_vazia(anterior_campo) and _opcao_racial_valida(raca, campo, atual):
                continue
            return "escolhas raciais de criacao so podem ser alteradas pelo mestre"

    liberados_classe = _liberados_para(config, "classe", usuario_id)
    referencias = _classes_da_ficha(ficha)
    if not referencias:
        return "informe ao menos uma classe"
    ids: list[str] = []
    classes: list[tuple[dict, int]] = []
    for referencia in referencias:
        classe_id = str(referencia.get("classeId") or referencia.get("id") or "")
        nivel = _inteiro(referencia.get("nivel"))
        classe = _CATALOGO["classe"].get(classe_id)
        if not classe:
            return "classe inexistente no catalogo oficial"
        if nivel is None or not 1 <= nivel <= 20:
            return "cada classe deve ter entre 1 e 20 niveis"
        if classe_id in ids:
            return "a mesma classe nao pode ocupar dois espacos"
        ids.append(classe_id)
        classes.append((classe, nivel))
        erro = _compativel_com_arvore("classe", classe_id, arvore_id, liberados_classe)
        if erro:
            return erro

    comuns = [(classe, nivel) for classe, nivel in classes if classe.get("categoria") == "padrao"]
    especiais = [(classe, nivel) for classe, nivel in classes if classe.get("categoria") != "padrao"]
    nivel_total = sum(nivel for _, nivel in classes)
    if nivel_total > 60:
        return "o nivel total nao pode passar de 60"
    if len(comuns) > 2 or len(especiais) > 1:
        return "o limite e duas classes comuns e uma classe especial"
    if criacao:
        if len(classes) != 1 or classes[0][1] != 1:
            return "a criacao deve comecar no nivel 1 de uma unica classe"
        classe_inicial = classes[0][0]
        # Mesma exceção da raça: uma classe especial já liberada pra este
        # jogador (ou pra campanha) pode começar a ficha, não só uma comum.
        if classe_inicial.get("categoria") != "padrao" and str(classe_inicial.get("id")) not in liberados_classe:
            return "a criacao deve comecar com uma classe comum, ou uma classe especial liberada pelo mestre"
    if len(comuns) == 2 and not any(nivel == 20 for _, nivel in comuns):
        return "a segunda classe comum so pode ser escolhida depois de uma classe chegar ao nivel 20"
    if especiais and comuns:
        # O nível 20 só é pré-requisito quando a especial vem MULTICLASSANDO
        # sobre uma base comum já em progresso. Uma ficha que É a especial
        # liberada desde a criação (sem base comum) não tem "antes" nenhum
        # pra exigir - senão a própria exceção de criação acima não faria
        # sentido: ela nunca teria 20 níveis pra mostrar no nível 1.
        nivel_sem_especial = nivel_total - especiais[0][1]
        if nivel_sem_especial < 20:
            return "uma classe especial exige nivel total 20 antes de ser adquirida"
    if str(ficha.get("classeId") or "") != ids[0]:
        return "classeId deve identificar a primeira classe da ficha"
    nivel_declarado = _inteiro(ficha.get("nivel"))
    if nivel_declarado != nivel_total:
        return "o nivel da ficha deve ser a soma dos niveis de classe"

    # O jogador pode adicionar/remover classes, trocar a escolhida e ajustar
    # o nível e o XP livremente pela própria ficha - o router
    # (characters.py::update_character) avisa o mestre/assistente sempre que
    # um jogador mexe nisso, então a revisão acontece depois, não como
    # bloqueio aqui. Só as regras de catálogo acima (nível 1-20, sem classe
    # repetida, compatibilidade de árvore, limite de 60 níveis, duas comuns +
    # uma especial e a ordem de multiclasse) continuam valendo pra todo mundo.

    xp = _inteiro(ficha.get("xp", 0))
    if xp is None or xp < 0:
        return "XP deve ser um numero inteiro nao negativo"
    if criacao and xp != 0:
        return "personagens comecam com 0 XP"

    metodo = ficha.get("metodoAtributos")
    base = ficha.get("atributosBase")
    finais = ficha.get("atributosFinais")
    if not isinstance(base, dict) or not isinstance(finais, dict):
        return "atributosBase e atributosFinais sao obrigatorios"
    valores_base = [_inteiro(base.get(atributo)) for atributo in _ATRIBUTOS]
    valores_finais = [_inteiro(finais.get(atributo)) for atributo in _ATRIBUTOS]
    if any(valor is None for valor in valores_base + valores_finais):
        return "todos os sete atributos devem ser numeros inteiros"
    if metodo == "padrao" and sorted(valores_base) != _VALORES_PADRAO:
        return "o conjunto padrao deve usar 15, 14, 13, 12, 10, 8 e 8 uma vez cada"
    if metodo == "pontos" and (any(not 8 <= valor <= 15 for valor in valores_base) or sum(valores_base) != 80):
        return "a compra deve distribuir exatamente 24 pontos, com valores entre 8 e 15"
    if metodo not in {"padrao", "pontos"}:
        return "a rolagem de atributos exige autorizacao do mestre"
    # O teto de 20 só rege a CRIAÇÃO (métodos padrao/pontos acima, que nunca
    # passam de 15 de qualquer forma). Depois de criado, o atributo final
    # pode passar de 20 por bênção, mutação ou algo negociado com o mestre -
    # só o piso de 1 continua valendo, pra não aceitar atributo negativo/zero.
    if any(valor < 1 for valor in valores_finais):
        return "atributos naturais nao podem ficar abaixo de 1"
    aumentos = [final - inicial for inicial, final in zip(valores_base, valores_finais)]
    if any(aumento < 0 for aumento in aumentos):
        return "atributos adquiridos nao podem ficar abaixo dos valores de criacao"
    if sum(aumentos) > nivel_total // 4:
        return "a ficha possui mais aumentos de atributo do que os niveis permitem"
    if criacao and any(aumentos):
        return "atributos de criacao ainda nao recebem aumentos de nivel"
    if not criacao and isinstance(anterior.get("atributosBase"), dict) and base != anterior.get("atributosBase"):
        return "os atributos-base nao podem ser alterados depois da criacao"
    if not criacao and isinstance(anterior.get("atributosFinais"), dict):
        for atributo in _ATRIBUTOS:
            if (_inteiro(finais.get(atributo)) or 0) < (_inteiro(anterior["atributosFinais"].get(atributo)) or 0):
                return "jogador nao pode reduzir um atributo adquirido"

    pericias = ficha.get("pericias") or {}
    if not isinstance(pericias, dict):
        return "pericias deve ser um objeto de id para grau"
    customizadas = {
        str(item.get("id"))
        for item in ficha.get("periciasCustomizadas") or []
        if isinstance(item, dict) and str(item.get("id") or "").startswith("custom_")
    }
    concedidas = _pericias_concedidas(classes)
    custo_graus = 0
    indices: dict[str, int] = {}
    for pericia_id, grau in pericias.items():
        if (
            str(pericia_id) not in _CATALOGO["pericia"]
            and str(pericia_id) not in customizadas
            and str(pericia_id) not in concedidas
        ):
            return "a ficha contem uma pericia inexistente"
        if grau not in _GRAUS:
            return "a ficha contem um grau de pericia invalido"
        indice = _GRAUS.index(grau)
        if nivel_total < _NIVEL_MINIMO_GRAU[indice]:
            return f"o nivel total ainda nao permite o grau {grau}"
        indices[str(pericia_id)] = indice
        # O grau que a classe deu de graca sai do custo; so o que passou dele
        # pesa nos Graus de Treinamento.
        custo_graus += max(0, indice - concedidas.get(str(pericia_id), 0))
    iniciais = 6 + max(0, _inteiro(raca.get("pericias_iniciais_adicionais")) or 0)
    escolhidas = {
        pericia_id: grau
        for pericia_id, grau in pericias.items()
        if str(pericia_id) not in concedidas or _GRAUS.index(grau) > concedidas[str(pericia_id)]
    }
    if criacao and (len(escolhidas) != iniciais or any(grau != "aprendiz" for grau in escolhidas.values())):
        return f"escolha exatamente {iniciais} pericias em Aprendiz na criacao"
    bonus_maestria = 2 if (_inteiro(finais.get("inteligencia")) or 0) >= 20 else 0
    orcamento_graus = iniciais + _graus_de_treinamento(classes) + bonus_maestria
    if custo_graus > orcamento_graus:
        return "os graus de pericia excedem os Graus de Treinamento recebidos"
    if not criacao and isinstance(anterior.get("pericias"), dict):
        for pericia_id, grau_anterior in anterior["pericias"].items():
            if grau_anterior in _GRAUS and indices.get(str(pericia_id), -1) < _GRAUS.index(grau_anterior):
                return "jogador nao pode reduzir um grau de pericia adquirido"

    erro_progressao = _validar_escolhas_progressao(ficha, anterior, classes, nivel_total, raca)
    if erro_progressao:
        return erro_progressao

    erro_catalisadores = _validar_catalisadores_fluxo(ficha, classes)
    if erro_catalisadores:
        return erro_catalisadores

    erro_magias = _validar_magias(ficha, anterior, classes, raca, criacao=criacao)
    if erro_magias:
        return erro_magias
    erro_manifestacoes = _validar_rituais_selos_encantamentos(ficha, anterior, classes, criacao=criacao)
    if erro_manifestacoes:
        return erro_manifestacoes

    if criacao:
        if _inteiro(ficha.get("lunarisInicial")) != 20:
            return "personagens comecam com 20 Lunaris"
        inventario = ficha.get("inventarioInicial")
        if not isinstance(inventario, list) or len(inventario) != 1:
            return "escolha exatamente um item comum inicial"
        item = inventario[0]
        titulo = item.get("titulo") if isinstance(item, dict) else None
        if not isinstance(titulo, str) or not 2 <= len(" ".join(titulo.split())) <= 200:
            return "o item comum inicial precisa de um nome valido"
    return None


def _nome(tipo: str, identificador) -> str | None:
    if not identificador:
        return None
    chave = str(identificador)
    return _NOMES.get(tipo, {}).get(chave) or chave


def _numero(valor, padrao: int = 0) -> int:
    try:
        return int(float(valor))
    except (TypeError, ValueError, OverflowError):
        return padrao


def _status_ficha(ficha: dict) -> dict:
    legado = ficha.get("recursos") if isinstance(ficha.get("recursos"), dict) else {}
    atual = ficha.get("status") if isinstance(ficha.get("status"), dict) else {}
    return {**legado, **atual}


def _normalizar_condicoes_iniciativa(condicoes) -> set[str]:
    resultado: set[str] = set()
    for item in condicoes or []:
        if isinstance(item, str):
            resultado.add(_normalizar_texto(item))
        elif isinstance(item, dict):
            for campo in ("id", "nome", "titulo"):
                valor = _normalizar_texto(item.get(campo))
                if valor:
                    resultado.add(valor)
    return resultado


def _condicoes_ficha(ficha: dict) -> set[str]:
    return _normalizar_condicoes_iniciativa(ficha.get("condicoesAtivas"))


def _atributo_efetivo(ficha: dict, atributo: str) -> int:
    finais = ficha.get("atributosFinais") if isinstance(ficha.get("atributosFinais"), dict) else {}
    base = _numero(finais.get(atributo), 10)
    raca = _CATALOGO["raca"].get(str(ficha.get("racaId") or "")) or {}
    escolha = ficha.get("escolhaRacial") if isinstance(ficha.get("escolhaRacial"), dict) else {}
    ajuste = _numero((raca.get("ajustes_atributos") or {}).get(atributo))
    limite = (raca.get("limites_atributos") or {}).get(atributo)

    for colecao, campo in (
        ("variantes", "varianteId"),
        ("linhagens", "linhagemId"),
        ("condicoes_ancestrais", "condicaoAncestralId"),
    ):
        opcao = next((
            item for item in raca.get(colecao) or []
            if isinstance(item, dict) and str(item.get("id")) == str(escolha.get(campo))
        ), None)
        if opcao:
            ajuste += _numero((opcao.get("ajustes_atributos") or {}).get(atributo))
            if atributo in (opcao.get("limites_atributos") or {}):
                limite = opcao["limites_atributos"][atributo]
            break

    configuracao = raca.get("escolha_atributos") if isinstance(raca.get("escolha_atributos"), dict) else {}
    campo = str(configuracao.get("campo") or "atributosRaciais")
    escolhas = escolha.get(campo) if isinstance(escolha.get(campo), list) else []
    total = max(0, _numero(configuracao.get("total")))
    if atributo in list(dict.fromkeys(item for item in escolhas if isinstance(item, str)))[:total]:
        ajuste += _numero(configuracao.get("bonus_por_escolha"))
        if configuracao.get("limite") is not None:
            limite = configuracao.get("limite")

    limite_numero = _inteiro(limite)
    if limite_numero is not None and ajuste > 0:
        ajuste = min(ajuste, max(0, limite_numero - base))
    return max(1, base + ajuste)


def sabedoria_desempate(ficha: dict | None) -> int:
    if not isinstance(ficha, dict):
        return -99
    return (_atributo_efetivo(ficha, "sabedoria") - 10) // 2


def iniciativa_fixa(ficha: dict | None, *, condicoes=None) -> int | float:
    """Calcula a iniciativa da ficha sem dado, igual ao front-end.

    Iniciativa é um atributo fixo: base derivada + bônus/penalidade + ajustes
    nomeados + efeitos de combate ativos. Nenhum d20 participa deste cálculo.
    """
    if not isinstance(ficha, dict):
        return 0
    derivados = ficha.get("derivados") if isinstance(ficha.get("derivados"), dict) else {}
    status = _status_ficha(ficha)
    total = _numero(derivados.get("iniciativa"), 10)
    total += _numero(status.get("bonusIniciativa"))
    total += sum(
        _numero(item.get("valor"))
        for item in (status.get("ajustesIniciativa") or [])
        if isinstance(item, dict)
    )
    if _numero(status.get("cansacoAtual")) >= 2:
        total -= 1
    condicoes_ativas = _condicoes_ficha(ficha) if condicoes is None else _normalizar_condicoes_iniciativa(condicoes)
    if "surpreendido" in condicoes_ativas:
        total -= 5

    ativos = ficha.get("efeitosAtivos") if isinstance(ficha.get("efeitosAtivos"), dict) else {}
    for colecao in ("poderes", "habilidades", "magias"):
        itens = ficha.get(colecao)
        if not isinstance(itens, list):
            continue
        for item in itens:
            if not isinstance(item, dict):
                continue
            efeitos = item.get("efeitos")
            if not isinstance(efeitos, list):
                continue
            for indice, efeito in enumerate(efeitos):
                if not isinstance(efeito, dict):
                    continue
                formato_editor = "categoria" in efeito
                if formato_editor and indice >= 5:
                    continue
                ativo = (
                    formato_editor
                    or efeito.get("modo") == "sempre"
                    or ativos.get(str(item.get("id"))) is True
                )
                categoria = efeito.get("categoria") if formato_editor else efeito.get("tipo")
                if ativo and categoria == "combate" and efeito.get("alvo") == "iniciativa":
                    if formato_editor:
                        try:
                            valor = float(efeito.get("valor"))
                        except (TypeError, ValueError, OverflowError):
                            continue
                        if not math.isfinite(valor):
                            continue
                    else:
                        valor = _numero(efeito.get("valor"))
                    total += valor
    return total


def resumir_ficha(ficha: dict | None) -> dict:
    """Extrai da ficha só o que a lista de personagens do mestre mostra.

    Uma ficha pode chegar a 1 MB; mandá-la inteira em toda página era o maior
    peso do endpoint de contexto.
    """
    if not isinstance(ficha, dict):
        return {}

    classes = []
    for item in ficha.get("classes") or []:
        if not isinstance(item, dict):
            continue
        nome = _nome("classe", item.get("id"))
        if not nome:
            continue
        nivel = item.get("nivel")
        classes.append(f"{nome} {nivel}" if nivel else nome)

    derivados = ficha.get("derivados") if isinstance(ficha.get("derivados"), dict) else {}
    status = _status_ficha(ficha)
    vida_maxima = derivados.get("vida")
    if isinstance(vida_maxima, (int, float)):
        vida_maxima += bonus_escolhas_habilidade(ficha, "recurso", "vidaMaxima")
    vida_atual = status.get("vidaAtual")

    raca_id = str(ficha.get("racaId") or "")
    # Espelha src/services/racaService.ts::nomeExibicaoRaca - a raça
    # personalizada é mecanicamente vazia, o nome de verdade vem do texto
    # livre que o jogador escreveu, não do rótulo genérico do catálogo.
    nome_raca = (
        str(ficha.get("racaNomePersonalizado") or "").strip() or _nome("raca", raca_id)
        if raca_id == RACA_PERSONALIZADA_ID
        else _nome("raca", raca_id)
    )
    resumo = {
        "raca": nome_raca,
        "classes": classes,
        "nivel": ficha.get("nivel"),
    }
    if isinstance(vida_maxima, (int, float)):
        resumo["vida_maxima"] = int(vida_maxima)
        resumo["vida_atual"] = int(vida_atual) if isinstance(vida_atual, (int, float)) else int(vida_maxima)
    return resumo
