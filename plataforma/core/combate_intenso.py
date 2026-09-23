"""Combate intenso: o combate que cansa de verdade.

Regra do livro (capítulo Descanso): o combate conta como intenso quando o
personagem desce à metade dos PV, gasta metade da Mana ou da Estamina, ou entra
em Morrendo. A cena inteira gera 1 de Cansaço, mesmo que vários gatilhos
aconteçam. O espelho no site é `combateFoiIntenso` em descansoService.ts.

Como o servidor sabe disso sem olhar cada clique: ao iniciar o combate cada
participante ganha uma "marca" com os valores de partida e os piores pontos
(mínimos). Toda escrita de recurso durante o combate chama `registrar_minimos`,
e ao encerrar `encerrar_combate_e_cansar` compara a partida com o pior ponto,
soma 1 de Cansaço nas fichas que cruzaram algum gatilho e limpa as marcas.
"""

from __future__ import annotations

CANSACO_MAXIMO = 6


def iniciar_marcas(connection, sessao_id) -> None:
    """Fotografa Vida, Mana e Estamina de quem está em cena no começo do combate."""
    connection.execute(
        """
        UPDATE sessao_participantes
        SET combate_marcas = jsonb_build_object(
            'vida_base', vida_atual, 'vida_min', vida_atual,
            'mana_base', mana_atual, 'mana_min', mana_atual,
            'estamina_base', estamina_atual, 'estamina_min', estamina_atual
        )
        WHERE sessao_id=%s
        """,
        (sessao_id,),
    )


def registrar_minimos(connection, sessao_id) -> None:
    """Guarda o pior ponto de cada recurso desde o começo do combate. Sem marca
    (fora de combate) não faz nada."""
    connection.execute(
        """
        UPDATE sessao_participantes
        SET combate_marcas = combate_marcas || jsonb_build_object(
            'vida_min', LEAST(COALESCE((combate_marcas->>'vida_min')::int, vida_atual), vida_atual),
            'mana_min', LEAST(COALESCE((combate_marcas->>'mana_min')::int, mana_atual), mana_atual),
            'estamina_min', LEAST(COALESCE((combate_marcas->>'estamina_min')::int, estamina_atual), estamina_atual)
        )
        WHERE sessao_id=%s AND combate_marcas IS NOT NULL
        """,
        (sessao_id,),
    )


def _inteiro(valor) -> int | None:
    return int(valor) if isinstance(valor, (int, float)) and not isinstance(valor, bool) else None


def _gastou_metade(base, minimo, maximo) -> bool:
    base, minimo, maximo = _inteiro(base), _inteiro(minimo), _inteiro(maximo)
    if base is None or minimo is None or not maximo or maximo <= 0:
        return False
    return (base - minimo) * 2 >= maximo


def combate_foi_intenso(marcas: dict | None, vida_maxima, mana_maxima, estamina_maxima) -> bool:
    """A regra pura, sem banco: ver o docstring do módulo."""
    if not isinstance(marcas, dict):
        return False
    vida_min, vida_base = _inteiro(marcas.get("vida_min")), _inteiro(marcas.get("vida_base"))
    vida_maxima = _inteiro(vida_maxima)
    if vida_min is not None and vida_min <= 0:
        return True
    if (
        vida_min is not None and vida_base is not None and vida_maxima
        and vida_maxima > 0 and vida_min * 2 <= vida_maxima and vida_base * 2 > vida_maxima
    ):
        return True
    return (
        _gastou_metade(marcas.get("mana_base"), marcas.get("mana_min"), mana_maxima)
        or _gastou_metade(marcas.get("estamina_base"), marcas.get("estamina_min"), estamina_maxima)
    )


def encerrar_combate_e_cansar(connection, sessao_id) -> list[str]:
    """Soma 1 de Cansaço nas fichas dos personagens cujo combate foi intenso e
    limpa as marcas de todos. Devolve os nomes de quem cansou, para o replay."""
    linhas = connection.execute(
        """
        SELECT id, personagem_id, nome, combate_marcas,
               vida_maxima, mana_maxima, estamina_maxima
        FROM sessao_participantes
        WHERE sessao_id=%s AND combate_marcas IS NOT NULL
        """,
        (sessao_id,),
    ).fetchall()
    cansados: list[str] = []
    for linha in linhas:
        if not linha["personagem_id"]:
            continue
        if not combate_foi_intenso(
            linha["combate_marcas"], linha["vida_maxima"], linha["mana_maxima"], linha["estamina_maxima"]
        ):
            continue
        connection.execute(
            """
            UPDATE personagens
            SET ficha=jsonb_set(
                    ficha,
                    '{status}',
                    COALESCE(ficha->'status', '{}'::jsonb) || jsonb_build_object(
                        'cansacoAtual',
                        LEAST(%s, COALESCE((ficha->'status'->>'cansacoAtual')::int, 0) + 1)
                    ),
                    true
                ),
                versao=versao+1,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND status='ativo'
            """,
            (CANSACO_MAXIMO, linha["personagem_id"]),
        )
        cansados.append(str(linha["nome"]))
    connection.execute(
        "UPDATE sessao_participantes SET combate_marcas=NULL WHERE sessao_id=%s",
        (sessao_id,),
    )
    return cansados

