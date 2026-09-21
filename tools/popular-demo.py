"""Popula uma campanha do banco LOCAL com dados de demonstração.

Serve para ver o Rank, o Mural, as Descobertas e o Calendário do Quadro cheios.
Tudo que entra usa ids determinísticos (uuid5), então rodar de novo não duplica,
e `--remover` apaga só o que este script criou.

    python tools/popular-demo.py --campanha <uuid>
    python tools/popular-demo.py --campanha <uuid> --remover

A conexão vem de DATABASE_URL (ou de plataforma/.env). Não rode contra produção.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import psycopg

RAIZ = Path(__file__).resolve().parent.parent
ESPACO = uuid.UUID("6b1c0f55-2d0e-4c39-9a53-0d3a5e0f7a11")
SENHA_INUTIL = "!demo-sem-login"

JOGADORES = [
    ("Marina", "Lyra Valen", 0),
    ("Tiago", "Bram Corvo", 1),
    ("Duda", "Iris Sombra", 2),
    ("Caio", "Toro Pedra", 3),
]

FRASES = [
    ("Eu não tô fugindo, eu tô reposicionando estrategicamente.", "Bram Corvo"),
    ("Se o dado falhar de novo eu processo o dado.", "Marina"),
    ("Tem certeza que isso é uma porta e não uma boca?", "Iris Sombra"),
    ("Eu só queria uma poção barata, por que virou guerra de facções?", "Toro Pedra"),
    ("Vinte natural, senhoras e senhores. Podem aplaudir.", "Lyra Valen"),
]


def uid(*partes: str) -> uuid.UUID:
    return uuid.uuid5(ESPACO, "/".join(partes))


def url_do_banco() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        env = RAIZ / "plataforma" / ".env"
        if env.exists():
            achado = re.search(r"^DATABASE_URL=(.+)$", env.read_text(encoding="utf-8"), re.M)
            url = achado.group(1).strip() if achado else ""
    if not url:
        raise SystemExit("Defina DATABASE_URL.")
    return url


def remover(con: psycopg.Connection, campanha: str) -> None:
    usuarios = [uid("usuario", nome) for nome, _, _ in JOGADORES]
    itens = [uid("mural", campanha, str(i)) for i in range(len(FRASES) + 2)]
    con.execute("DELETE FROM mural_itens WHERE id = ANY(%s)", (itens,))
    con.execute("DELETE FROM registros_mesa WHERE campanha_id=%s AND usuario_id = ANY(%s)", (campanha, usuarios))
    con.execute("DELETE FROM lancamentos_economia WHERE campanha_id=%s AND ator_usuario_id = ANY(%s)", (campanha, usuarios))
    con.execute("DELETE FROM mvp_votos WHERE votante_id = ANY(%s) OR alvo_usuario_id = ANY(%s)", (usuarios, usuarios))
    con.execute("DELETE FROM descobertas WHERE usuario_id = ANY(%s)", (usuarios,))
    con.execute("DELETE FROM personagens WHERE campanha_id=%s AND dono_usuario_id = ANY(%s)", (campanha, usuarios))
    con.execute("DELETE FROM membros_campanha WHERE campanha_id=%s AND usuario_id = ANY(%s)", (campanha, usuarios))
    con.execute("DELETE FROM usuarios WHERE id = ANY(%s)", (usuarios,))
    print("Dados de demonstração removidos.")


def popular(con: psycopg.Connection, campanha: str) -> None:
    mestre = con.execute(
        "SELECT usuario_id FROM membros_campanha WHERE campanha_id=%s AND papel='mestre' AND status='ativo' LIMIT 1",
        (campanha,),
    ).fetchone()
    if not mestre:
        raise SystemExit("A campanha não tem Mestre ativo.")
    mestre_id = mestre[0]
    agora = datetime.now(timezone.utc)
    sessao = con.execute(
        "SELECT id FROM sessoes_mesa WHERE campanha_id=%s AND status='encerrada' ORDER BY iniciada_em DESC LIMIT 1",
        (campanha,),
    ).fetchone()
    sessao_id = sessao[0] if sessao else None

    usuarios: dict[str, uuid.UUID] = {}
    personagens: dict[str, uuid.UUID] = {}
    for nome, personagem, _ in JOGADORES:
        usuario = uid("usuario", nome)
        usuarios[nome] = usuario
        con.execute(
            """INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, email_verificado, ativo)
               VALUES (%s, %s, %s, %s, true, true) ON CONFLICT (id) DO NOTHING""",
            (usuario, f"demo-{nome.lower()}@jardim.local", nome, SENHA_INUTIL),
        )
        con.execute(
            """INSERT INTO membros_campanha (campanha_id, usuario_id, papel, status)
               VALUES (%s, %s, 'jogador', 'ativo') ON CONFLICT DO NOTHING""",
            (campanha, usuario),
        )
        pid = uid("personagem", campanha, nome)
        personagens[nome] = pid
        con.execute(
            """INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, versao, status, criado_por)
               VALUES (%s, %s, %s, %s, %s, 1, 'ativo', %s) ON CONFLICT (id) DO NOTHING""",
            (pid, campanha, usuario, personagem, json.dumps({"nome": personagem}), mestre_id),
        )

    # Rolagens, críticos, falhas, dano e usos de poder, espalhados pelos últimos dias.
    perfis = {
        "Marina": {"rolagens": 14, "criticos": 4, "falhas": 0, "dano": [18, 24, 31]},
        "Tiago": {"rolagens": 11, "criticos": 1, "falhas": 4, "dano": [12, 40]},
        "Duda": {"rolagens": 9, "criticos": 2, "falhas": 1, "dano": [22]},
        "Caio": {"rolagens": 7, "criticos": 0, "falhas": 2, "dano": [9, 14]},
    }
    for nome, perfil in perfis.items():
        for i in range(perfil["rolagens"]):
            critico = i < perfil["criticos"]
            falha = perfil["criticos"] <= i < perfil["criticos"] + perfil["falhas"]
            dado = 20 if critico else 1 if falha else 6 + (i * 3) % 12
            detalhes = {"dados": [dado], "total": dado + 2, "bonus": 2, "critico_natural": critico, "falha_natural": falha}
            con.execute(
                """INSERT INTO registros_mesa (id, campanha_id, sessao_id, usuario_id, personagem_id, autor_nome,
                       tipo, titulo, formula, resultado, detalhes, criado_em)
                   VALUES (%s, %s, %s, %s, %s, %s, 'rolagem', 'Teste de perícia', '1d20+2', %s, %s, %s)
                   ON CONFLICT (id) DO NOTHING""",
                (uid("rolagem", campanha, nome, str(i)), campanha, sessao_id, usuarios[nome], personagens[nome], nome,
                 dado + 2, json.dumps(detalhes), agora - timedelta(hours=3 + i * 5)),
            )
        for i, dano in enumerate(perfil["dano"]):
            con.execute(
                """INSERT INTO registros_mesa (id, campanha_id, sessao_id, usuario_id, personagem_id, autor_nome,
                       tipo, titulo, formula, resultado, detalhes, criado_em)
                   VALUES (%s, %s, %s, %s, %s, %s, 'dano', 'Ataque', '2d8+4', %s, '{}'::jsonb, %s)
                   ON CONFLICT (id) DO NOTHING""",
                (uid("dano", campanha, nome, str(i)), campanha, sessao_id, usuarios[nome], personagens[nome], nome,
                 dano, agora - timedelta(hours=2 + i * 7)),
            )
        for i in range(3 if nome in ("Marina", "Duda") else 1):
            con.execute(
                """INSERT INTO registros_mesa (id, campanha_id, sessao_id, usuario_id, personagem_id, autor_nome,
                       tipo, titulo, formula, resultado, detalhes, criado_em)
                   VALUES (%s, %s, %s, %s, %s, %s, 'poder', 'Poder usado', '', NULL, '{}'::jsonb, %s)
                   ON CONFLICT (id) DO NOTHING""",
                (uid("poder", campanha, nome, str(i)), campanha, sessao_id, usuarios[nome], personagens[nome], nome,
                 agora - timedelta(hours=1 + i * 4)),
            )

    # Lunaris: gastos e ganhos (Tiago é o "gastador", Caio o "mão de vaca").
    gastos = {"Marina": [-400, -150], "Tiago": [-2500, -900, -1200], "Duda": [-350], "Caio": [-40]}
    ganhos = {"Marina": [800], "Tiago": [300], "Duda": [600, 200], "Caio": [500]}
    for nome in usuarios:
        for i, delta in enumerate(gastos[nome] + ganhos[nome]):
            con.execute(
                """INSERT INTO lancamentos_economia (id, campanha_id, personagem_id, moeda, delta, motivo, origem,
                       ator_usuario_id, criado_em)
                   VALUES (%s, %s, %s, 'Lunaris', %s, %s, 'demo', %s, %s) ON CONFLICT (id) DO NOTHING""",
                (uid("lancamento", campanha, nome, str(i)), campanha, personagens[nome], delta,
                 "compra na Loja" if delta < 0 else "recompensa da sessão", usuarios[nome],
                 agora - timedelta(hours=4 + i * 6)),
            )

    # Mural: frases com curtidas e a foto-legenda de texto (sem imagem, para não pesar).
    autores = [(n, u) for n, u in usuarios.items()]
    for i, (texto, quem) in enumerate(FRASES):
        autor_nome, autor_id = autores[i % len(autores)]
        item = uid("mural", campanha, str(i))
        con.execute(
            """INSERT INTO mural_itens (id, campanha_id, sessao_id, usuario_id, autor_nome, tipo, texto, criado_em)
               VALUES (%s, %s, %s, %s, %s, 'citacao', %s, %s) ON CONFLICT (id) DO NOTHING""",
            (item, campanha, sessao_id, autor_id, quem, texto, agora - timedelta(hours=1 + i * 9)),
        )
        eleitores = [mestre_id] + [u for n, u in autores if u != autor_id]
        for eleitor in eleitores[: (5 - i) if i < 4 else 1]:
            con.execute(
                "INSERT INTO mural_votos (item_id, usuario_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (item, eleitor),
            )

    # MVP da última sessão encerrada.
    if sessao_id:
        votos = {"Marina": "Tiago", "Tiago": "Marina", "Duda": "Marina", "Caio": "Marina"}
        for votante, alvo in votos.items():
            con.execute(
                """INSERT INTO mvp_votos (sessao_id, votante_id, alvo_usuario_id) VALUES (%s, %s, %s)
                   ON CONFLICT DO NOTHING""",
                (sessao_id, usuarios[votante], usuarios[alvo]),
            )

    # Descobertas: algumas já achadas por gente diferente, outras ficam misteriosas.
    achadas = [("jardineiro", "Marina"), ("jardineiro", "Caio"), ("coruja", "Tiago"), ("velho_truque", "Duda"),
               ("erudito", "Marina")]
    for chave, nome in achadas:
        con.execute(
            "INSERT INTO descobertas (chave, usuario_id, descoberta_em) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            (chave, usuarios[nome], agora - timedelta(days=1)),
        )

    # Agenda: toda sexta, 18h (Brasília), uma sexta cancelada e uma especial no sábado.
    hoje = datetime.now().date()
    proxima_sexta = hoje + timedelta(days=(4 - hoje.weekday()) % 7 or 7)
    cancelada = proxima_sexta + timedelta(days=7)
    sabado = proxima_sexta + timedelta(days=15)
    especial = {
        "id": str(uid("especial", campanha)),
        "em": datetime(sabado.year, sabado.month, sabado.day, 21, 0, tzinfo=timezone.utc).isoformat(),
        "titulo": "Sessão especial: o baile de máscaras",
        "nota": "Venha fantasiado, o Mestre vai gostar.",
    }
    recorrencia = {"ativa": True, "dia_semana": 4, "hora": "18:00", "fuso": "America/Sao_Paulo",
                   "titulo": "A Queda de Keryx", "nota": ""}
    con.execute(
        """INSERT INTO campanha_agenda (campanha_id, recorrencia, cancelados, especiais)
           VALUES (%s, %s, %s, %s)
           ON CONFLICT (campanha_id) DO UPDATE SET recorrencia=EXCLUDED.recorrencia,
               cancelados=EXCLUDED.cancelados, especiais=EXCLUDED.especiais, atualizado_em=CURRENT_TIMESTAMP""",
        (campanha, json.dumps(recorrencia), json.dumps([cancelada.isoformat()]), json.dumps([especial])),
    )
    print(f"Campanha {campanha} populada: {len(JOGADORES)} jogadores de demonstração, rolagens, Lunaris, mural, MVP, descobertas e agenda.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--campanha", required=True, help="uuid da campanha")
    parser.add_argument("--remover", action="store_true", help="apaga o que este script criou")
    args = parser.parse_args()
    with psycopg.connect(url_do_banco()) as con:
        (remover if args.remover else popular)(con, args.campanha)
        con.commit()


if __name__ == "__main__":
    main()
