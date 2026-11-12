"""Sobe personagens nível a nível como um jogador faria e passa cada passo pelo
validador do servidor (validar_regras_ficha). Rodar de dentro de plataforma/.
"""
from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path

sys.path.insert(0, ".")
from core.character_summary import (  # noqa: E402
    _CATALOGO, _GRAUS, _NIVEL_MINIMO_GRAU, _graus_de_treinamento, _pericias_concedidas,
    _vagas_escolha_habilidade, _vagas_poder, carregar_catalogos, validar_regras_ficha,
)
from core.progressao_niveis import aumentos_atributo_por_nivel, legados_por_nivel  # noqa: E402

carregar_catalogos(Path("..") / "data")
MAGIAS = json.loads((Path("..") / "data/ficha/magias.json").read_text(encoding="utf-8"))["magias"]
ATR = ["forca", "destreza", "constituicao", "inteligencia", "sabedoria", "carisma", "fluxo"]
CONFIG = {"racas_liberadas": [r for r in _CATALOGO["raca"]], "classes_liberadas": [c for c in _CATALOGO["classe"]]}

BUILDS = [
    ("Tanque", "anao", "forca", "constituicao", [("guerreiro", 20)]),
    ("Duelista", "humano", "destreza", "constituicao", [("espadachim", 20)]),
    ("Médica", "feerico", "sabedoria", "constituicao", [("medico", 20)]),
    ("Ninja", "goblim", "destreza", "constituicao", [("ninja", 20)]),
    ("Atirador", "humano", "destreza", "sabedoria", [("atirador", 20)]),
    ("Alquimista", "slime", "inteligencia", "constituicao", [("alquimista", 20)]),
    ("Guardião", "gigante", "constituicao", "forca", [("guardiao", 20)]),
    ("Engenheiro", "humano", "inteligencia", "destreza", [("engenheiro", 20)]),
    ("Comerciante", "goblim", "carisma", "inteligencia", [("comerciante", 20)]),
    ("Canalizador", "humano", "fluxo", "constituicao", [("canalizador", 20)]),
    ("Sintonizador", "humano", "fluxo", "constituicao", [("sintonizador", 20)]),
    ("Ritualista", "humano", "fluxo", "sabedoria", [("ritualista", 20)]),
    ("Cozinheiro", "humano", "sabedoria", "constituicao", [("cozinheiro", 20)]),
    ("Detetive", "humano", "inteligencia", "sabedoria", [("detetive", 20)]),
    ("Lutador", "humano", "forca", "constituicao", [("lutador", 20)]),
    ("Caçador", "humano", "destreza", "sabedoria", [("cacador", 20)]),
    ("Piloto", "humano", "destreza", "inteligencia", [("piloto", 20)]),
    ("Pop Star", "humano", "carisma", "destreza", [("pop-star", 20)]),
    ("Guerreiro→Médico→Campeão (60)", "humano", "forca", "constituicao", [("guerreiro", 20), ("medico", 20), ("campeao-dimensional", 20)]),
    ("Canal→Sinton→Elementarista (60)", "humano", "fluxo", "constituicao", [("canalizador", 20), ("sintonizador", 20), ("elementarista", 20)]),
    ("Espadachim→Ninja→Devorador (60)", "humano", "destreza", "constituicao", [("espadachim", 20), ("ninja", 20), ("devorador", 20)]),
    ("Ninja 50 + Invocador 10", "humano", "destreza", "constituicao", [("ninja", 50), ("invocador", 10)]),
    ("Cartista→Interceptador (especiais)", "humano", "fluxo", "destreza", [("atirador", 20), ("cartista-arcano", 20)]),
    ("Escritor de Contos", "humano", "carisma", "inteligencia", [("detetive", 20), ("escritor-de-contos", 20)]),
]

COMBATE = {"forca": "luta", "destreza": "pontaria", "fluxo": "misticismo", "sabedoria": "cura", "inteligencia": "oficio", "carisma": "diplomacia", "constituicao": "fortitude"}


def ficha_inicial(raca, principal, secundario, classe):
    valores = [15, 14, 13, 12, 10, 8, 8]
    ordem = [principal, secundario] + [a for a in ["constituicao", "destreza", "sabedoria", "fluxo", "inteligencia", "forca", "carisma"] if a not in (principal, secundario)]
    base = {a: valores[i] for i, a in enumerate(ordem)}
    pericias_base = [COMBATE.get(principal, "luta"), "fortitude", "reflexos", "vontade", "percepcao", "atletismo", "misticismo", "luta", "pontaria", "iniciativa"]
    pericias = []
    for p in pericias_base:
        if p in _CATALOGO["pericia"] and p not in pericias:
            pericias.append(p)
    rc = _CATALOGO["raca"][raca]
    iniciais = 6 + int(rc.get("pericias_iniciais_adicionais") or 0)
    escolha = {}
    if rc.get("variantes"):
        escolha["varianteId"] = rc["variantes"][0]["id"]
    return {
        "arvoreId": "aethel", "racaId": raca, "classeId": classe, "classes": [{"classeId": classe, "nivel": 1}],
        "nivel": 1, "xp": 0, "metodoAtributos": "padrao", "atributosBase": dict(base), "atributosFinais": dict(base),
        "aumentosAtributo": {a: 0 for a in ATR},
        "pericias": {p: "aprendiz" for p in pericias[:iniciais]}, "lunarisInicial": 20,
        "inventarioInicial": [{"titulo": "Espada curta", "quantidade": 1}], "escolhaRacial": escolha,
        "poderesClasseSelecionados": [], "legadosSelecionados": [], "escolhasHabilidade": {}, "magiasConhecidasIds": [],
    }


def valida(f, anterior=None, criacao=False):
    return validar_regras_ficha(f, CONFIG, criacao=criacao, ficha_anterior=anterior)


def tenta(f, anterior, mut):
    g = deepcopy(f)
    mut(g)
    return g if valida(g, anterior) is None else None


def subir(nome, raca, principal, secundario, plano):
    log = {"nome": nome, "erros": [], "travas": [], "passos": 0}
    f = ficha_inicial(raca, principal, secundario, plano[0][0])
    arvore = next((_CATALOGO["classe"][c].get("arvore") for c, _ in plano if _CATALOGO["classe"][c].get("arvore")), None)
    if arvore:
        f["arvoreId"] = arvore
    erro = valida(f, None, criacao=True)
    if erro:
        log["erros"].append(f"criação: {erro}")
        return log, f
    fila = []
    for i, (cid, alvo) in enumerate(plano):
        fila += [cid] * (alvo - (1 if i == 0 else 0))
    for cid in fila:
        anterior = deepcopy(f)
        classes = {c["classeId"]: c for c in f["classes"]}
        if cid in classes:
            classes[cid]["nivel"] += 1
        else:
            f["classes"].append({"classeId": cid, "nivel": 1})
        f["nivel"] += 1
        nt = f["nivel"]
        # aumento de atributo
        if sum(f["aumentosAtributo"].values()) < aumentos_atributo_por_nivel(nt):
            alvo_at = principal if sum(f["aumentosAtributo"].values()) % 3 != 2 else secundario
            f["atributosFinais"][alvo_at] += 1
            f["aumentosAtributo"][alvo_at] += 1
        erro = valida(f, anterior)
        if erro:
            log["erros"].append(f"N{nt} ({cid}) após subir: {erro}")
            return log, f
        # perícias: gasta graus no que der, combate primeiro
        refs = [(_CATALOGO["classe"][c["classeId"]], c["nivel"]) for c in f["classes"]]
        for _ in range(6):
            mudou = False
            for p in sorted(f["pericias"], key=lambda x: (x != COMBATE.get(principal), _GRAUS.index(f["pericias"][x]))):
                i = _GRAUS.index(f["pericias"][p])
                if i + 1 < len(_GRAUS) and nt >= _NIVEL_MINIMO_GRAU[i + 1]:
                    g = tenta(f, anterior, lambda h, p=p, i=i: h["pericias"].__setitem__(p, _GRAUS[i + 1]))
                    if g:
                        f = g; mudou = True; break
            if not mudou:
                break
        # poderes
        cl = _CATALOGO["classe"][cid]
        nivel_cl = next(c["nivel"] for c in f["classes"] if c["classeId"] == cid)
        while sum(1 for s in f["poderesClasseSelecionados"] if s["classeId"] == cid) < _vagas_poder(cl, nivel_cl):
            ok = False
            for p in cl.get("poderes") or []:
                g = tenta(f, anterior, lambda h, p=p: h["poderesClasseSelecionados"].append({"classeId": cid, "poderId": p["id"]}))
                if g:
                    f = g; ok = True; break
            if not ok:
                log["travas"].append(f"N{nt} {cid} nível {nivel_cl}: vaga de poder sem nenhum poder válido")
                break
        # escolhas de habilidade
        for h in cl.get("habilidades") or []:
            vagas = _vagas_escolha_habilidade(h, nivel_cl)
            chave = f"{cid}:{h['id']}"
            while vagas and len(f["escolhasHabilidade"].get(chave, [])) < vagas:
                ok = False
                for o in h.get("opcoes") or []:
                    g = tenta(f, anterior, lambda x, o=o: x["escolhasHabilidade"].setdefault(chave, []).append(o["id"]))
                    if g:
                        f = g; ok = True; break
                if not ok:
                    log["travas"].append(f"N{nt} {cid}: escolha '{h['titulo']}' sem opção válida ({len(f['escolhasHabilidade'].get(chave, []))}/{vagas})")
                    break
        # legados
        rc = _CATALOGO["raca"][raca]
        vagas_leg = legados_por_nivel(nt) + int(rc.get("legados_adicionais") or 0)
        while len(f["legadosSelecionados"]) < vagas_leg:
            ok = False
            for lid in _CATALOGO["legado"]:
                g = tenta(f, anterior, lambda x, lid=lid: x["legadosSelecionados"].append(lid))
                if g:
                    f = g; ok = True; break
            if not ok:
                log["travas"].append(f"N{nt}: vaga de Legado sem nenhum Legado válido")
                break
        # magias: tenta encher vagas, do círculo mais alto pro mais baixo
        for _ in range(4):
            ok = False
            for m in sorted(MAGIAS, key=lambda m: -int(m["circulo"]) if str(m["circulo"]).isdigit() else 0):
                if m["id"] in f["magiasConhecidasIds"]:
                    continue
                g = tenta(f, anterior, lambda x, m=m: x["magiasConhecidasIds"].append(m["id"]))
                if g:
                    f = g; ok = True; break
            if not ok:
                break
        erro = valida(f, anterior)
        if erro:
            log["erros"].append(f"N{nt} final: {erro}")
            return log, f
        log["passos"] += 1
    return log, f


if __name__ == "__main__":
    saida = []
    for b in BUILDS:
        log, f = subir(*b)
        log["final"] = {
            "nivel": f["nivel"], "classes": f["classes"], "poderes": len(f["poderesClasseSelecionados"]),
            "legados": len(f["legadosSelecionados"]), "magias": len(f["magiasConhecidasIds"]),
            "escolhas": sum(len(v) for v in f["escolhasHabilidade"].values()), "pericias": f["pericias"],
            "atributos": f["atributosFinais"],
        }
        saida.append(log)
        print(f"{log['nome']:<40} passos={log['passos']:>3} N{f['nivel']:<3} poderes={log['final']['poderes']:>2} legados={log['final']['legados']:>2} magias={log['final']['magias']:>2} escolhas={log['final']['escolhas']:>2} erros={len(log['erros'])} travas={len(log['travas'])}")
        for e in log["erros"] + log["travas"][:6]:
            print("    ", e)
    Path(sys.argv[1] if len(sys.argv) > 1 else "subir.json").write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding="utf-8")
