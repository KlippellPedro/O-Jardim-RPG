"""Descobertas: coisas escondidas no site que as pessoas vão achando.

O catálogo mora só aqui. A tela mostra o nome e quem achou, mas a `dica` só
aparece para quem ainda não achou, e nenhuma resposta diz ONDE a coisa está.
O gatilho de cada descoberta vive no cliente (é um jogo de curiosidade, não de
segurança): o servidor só valida a chave, guarda quem achou primeiro e quando.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Descoberta:
    chave: str
    nome: str
    dica: str
    raridade: str  # comum | rara


CATALOGO: tuple[Descoberta, ...] = (
    Descoberta("jardineiro", "O Jardineiro Paciente", "Alguns títulos gostam de atenção insistente.", "comum"),
    Descoberta("erudito", "Erudito Curioso", "O Livro guarda um segredo no próprio nome.", "comum"),
    Descoberta("mercador_fantasma", "O Mercador Fantasma", "A Loja abre uma porta para quem bate na entrada.", "comum"),
    Descoberta("cartografo", "Cartógrafo do Invisível", "O Mundo tem uma dobra que só aparece para quem insiste.", "comum"),
    Descoberta("vaidoso", "Nome de Peso", "O nome de um personagem responde a quem o chama muitas vezes.", "comum"),
    Descoberta("coruja", "Coruja da Madrugada", "O Jardim tem outra cara para quem o visita quando o mundo dorme.", "comum"),
    Descoberta("palavra_magica", "Palavra de Aventureiros", "Uma palavra dos primeiros aventureiros funciona em qualquer tela.", "rara"),
    Descoberta("velho_truque", "O Velho Truque", "Certas sequências de teclas vêm de outra era dos jogos.", "rara"),
    Descoberta("contemplativo", "O Contemplativo", "Ficar parado numa página também é uma forma de procurar.", "rara"),
    Descoberta("runa_solitaria", "A Runa Solitária", "Na entrada do Jardim, um sinal antigo espera no canto, quase apagado.", "comum"),
    Descoberta("folha_dourada", "A Folha Dourada", "Entre os materiais, uma folha que não é material nenhum.", "comum"),
    Descoberta("pegada", "Rastro no Quadro", "Quem cuida do quadro deixa marcas no rodapé dele.", "comum"),
    Descoberta("selo_da_mesa", "O Selo da Mesa", "Toda mesa tem um selo. Alguns ficam no fim da lista.", "comum"),
    Descoberta("moeda_perdida", "A Moeda Perdida", "Caiu algo do balcão da Loja, bem lá embaixo.", "comum"),
    Descoberta("vaga_lume", "O Vaga-lume", "No fim do Mundo, uma luz pequena só reage a quem a toca sem pressa.", "comum"),
    Descoberta("nota_de_rodape", "Nota de Rodapé", "O Livro tem uma nota que nenhum capítulo cita.", "comum"),
    Descoberta("olho_atento", "O Olho Atento", "Ao fim de uma ficha, algo observa de volta.", "rara"),
    Descoberta("nome_do_lugar", "O Nome do Lugar", "Dizer o nome do lugar em voz alta, mesmo digitando, tem efeito.", "rara"),
    Descoberta("bolso_cheio", "Bolso Cheio", "A moeda do reino também é uma palavra que abre coisas.", "rara"),
)

POR_CHAVE: dict[str, Descoberta] = {item.chave: item for item in CATALOGO}


def montar_lista(achadas_por_mim: dict[str, str], descobridores: dict[str, list[str]]) -> list[dict]:
    """A lista que a tela mostra.

    `achadas_por_mim`: chave -> data ISO em que EU achei.
    `descobridores`: chave -> nomes de quem, na campanha, já achou.

    O nome só aparece se eu achei ou se alguém da campanha achou; do contrário
    a tela recebe "???" e a dica. Achar continua sendo tarefa de quem procura.
    """
    itens = []
    for item in CATALOGO:
        achei = item.chave in achadas_por_mim
        nomes = descobridores.get(item.chave, [])
        conhecida = achei or bool(nomes)
        itens.append({
            "chave": item.chave,
            "nome": item.nome if conhecida else "???",
            "raridade": item.raridade,
            "achei": achei,
            "achei_em": achadas_por_mim.get(item.chave),
            # A dica é o convite a procurar; some quando já se achou.
            "dica": None if achei else item.dica,
            "descobridores": nomes,
        })
    return itens


def ranking(descobridores: dict[str, list[str]]) -> list[dict]:
    """Quem achou mais coisas na campanha, do mais para o menos."""
    contagem: dict[str, int] = {}
    for nomes in descobridores.values():
        for nome in nomes:
            contagem[nome] = contagem.get(nome, 0) + 1
    return [
        {"nome": nome, "total": total}
        for nome, total in sorted(contagem.items(), key=lambda par: (-par[1], par[0].casefold()))
    ]
