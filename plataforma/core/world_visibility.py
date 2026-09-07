"""Projeção de publicações de Mundo autorizadas para uma campanha.

Não recebe rascunhos. A hierarquia oculta descendentes e o resultado não altera
os documentos originais da biblioteca nem as publicações globais.
"""
from copy import deepcopy


def _ids(config, key):
    value = config.get(key)
    return {str(item) for item in value} if isinstance(value, list) else set()


def without_private_fields(value):
    if isinstance(value, dict):
        return {k: without_private_fields(v) for k, v in value.items()
                if k not in {"corpoMestre", "rascunho"} and not k.startswith("_")}
    if isinstance(value, list):
        return [without_private_fields(item) for item in value]
    return value


def visible_world(entries, config, manages_content=False):
    if manages_content:
        return entries
    config = config if isinstance(config, dict) else {}
    entries = deepcopy(entries)
    by_id = {str(e.get("id")): e for e in entries if e.get("tipo") not in {"cronologia", "entidade", "faccao"}}

    def revealed(entry, prefix):
        key = str(entry.get("id"))
        return (key not in _ids(config, prefix + "_oculto") if entry.get("revelado") is not False
                else key in _ids(config, prefix + "_revelado"))

    def tree_visible(tree_id):
        deity = by_id.get(tree_id, {"id": tree_id, "revelado": tree_id != "keryx"})
        return revealed(deity, "arvores")

    def allowed(entry, ancestors=frozenset()):
        key = str(entry.get("id"))
        if key in ancestors:
            return False
        if not revealed(entry, "entidades" if entry.get("tipo") == "entidade" else "lore"):
            return False
        if entry.get("registro_universal") and config.get("registros_universais_ocultos") is True:
            return False
        if entry.get("tipo") == "faccao" and entry.get("conteudo", {}).get("estado") != "canonica":
            return False
        tree = entry.get("arvore_origem") or (key if entry.get("tipo") == "deidade" else None)
        if tree and not tree_visible(tree):
            return False
        content = entry.get("conteudo") or {}
        if not isinstance(content, dict):
            return False
        for field in ("local_pai", "galho", "dimensao", "reino"):
            parent_id = content.get(field)
            if isinstance(parent_id, str):
                parent = by_id.get(parent_id)
                if parent is None or not allowed(parent, ancestors | {key}):
                    return False
        tree_id = content.get("no_vazio") or content.get("arvore")
        if isinstance(tree_id, str) and tree_id in by_id and by_id[tree_id].get("tipo") == "deidade" and not tree_visible(tree_id):
            return False
        trees = content.get("arvores")
        if isinstance(trees, list) and any(not tree_visible(t) for t in trees if isinstance(t, str)):
            return False
        return True

    hidden_events = _ids(config, "cronica_eventos_ocultos")
    hidden_sections = _ids(config, "cronica_secoes_ocultas")
    hidden_titles = {e.get("titulo") for e in by_id.values() if not allowed(e)}

    def events(values):
        return [e for e in values if isinstance(e, dict) and e.get("id") not in hidden_events
                and all(tree_visible(t) for t in (e.get("arvores") or []))]

    result = []
    for entry in entries:
        if entry.get("tipo") != "cronologia":
            if allowed(entry):
                result.append(without_private_fields(entry))
            continue
        if not revealed(entry, "lore"):
            continue
        content = entry.get("conteudo") or {}
        content["linha_tempo_geral"] = ([] if config.get("cronologia_geral_oculta") is True
                                        else events(content.get("linha_tempo_geral") or []))
        trees = []
        for tree in content.get("arvores") or []:
            if not isinstance(tree, dict) or not tree_visible(tree.get("id")):
                continue
            for field in ("tese", "atmosfera", "historia", "cronologia"):
                if f"{tree.get('id')}:{field}" in hidden_sections:
                    tree[field] = [] if field in {"historia", "cronologia"} else ""
            tree["cronologia"] = events(tree.get("cronologia") or [])
            if isinstance(tree.get("lugares"), list):
                tree["lugares"] = [place for place in tree["lugares"]
                                   if isinstance(place, dict) and place.get("nome") not in hidden_titles]
            trees.append(tree)
        content["arvores"] = trees
        entry["conteudo"] = content
        result.append(without_private_fields(entry))
    return result
