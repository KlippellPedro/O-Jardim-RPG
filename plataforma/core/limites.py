"""Limite de tentativas por ação, guardado no banco.

O limitador nasceu dentro do login e ficou só lá. Cadastro e pedido de senha
eram rotas públicas sem freio nenhum: dava para criar conta em massa ou encher
a fila do administrador variando o e-mail. Aqui a mesma mecânica atende
qualquer ação, mudando só a política.

A contagem vive no banco, não em memória, porque um restart do container não
pode servir de reset para quem está martelando a porta.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status

from .security import hash_token


@dataclass(frozen=True)
class Politica:
    """Quantas tentativas, em que janela, e por quanto tempo bloqueia."""

    acao: str
    tentativas: int
    janela_minutos: int
    bloqueio_minutos: int


# Login: protege a conta alvo. A chave inclui o e-mail, então errar a senha de
# uma conta não tranca o acesso das outras a partir do mesmo lugar.
LOGIN = Politica("login", tentativas=5, janela_minutos=15, bloqueio_minutos=15)

# Cadastro: a chave é só o IP. Três contas por hora é folgado para uma pessoa
# de verdade e apertado para um script.
CADASTRO = Politica("cadastro", tentativas=3, janela_minutos=60, bloqueio_minutos=60)

# Pedido de senha: já existe índice de um pedido aberto por e-mail, mas quem
# varia o endereço criava um pedido novo a cada vez.
PEDIDO_SENHA = Politica("pedido-senha", tentativas=5, janela_minutos=60, bloqueio_minutos=60)

# Troca de senha: exige a senha atual, então é alvo de tentativa às cegas.
TROCA_SENHA = Politica("troca-senha", tentativas=5, janela_minutos=15, bloqueio_minutos=15)


def impressao_do_cliente(request: Request) -> str:
    """Identifica quem chama sem guardar o IP em texto claro."""
    encaminhado = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    ip = encaminhado or (request.client.host if request.client else "desconhecido")
    return hash_token(ip)


def chave(politica: Politica, *partes: str) -> str:
    """Chave da contagem. A ação entra junto para os limites não se misturarem."""
    return hash_token("|".join((politica.acao, *partes)))


def conferir(connection, politica: Politica, chave_hash: str) -> None:
    """Levanta 429 se ainda estiver bloqueado. Chame antes de fazer o trabalho."""
    linha = connection.execute(
        "SELECT bloqueado_ate, janela_iniciada_em FROM limites_acesso WHERE chave_hash=%s FOR UPDATE",
        (chave_hash,),
    ).fetchone()
    if not linha:
        return

    agora = datetime.now(timezone.utc)
    if linha["bloqueado_ate"] and linha["bloqueado_ate"] > agora:
        faltam = int((linha["bloqueado_ate"] - agora).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"muitas tentativas; tente novamente em {faltam} minuto(s)",
            headers={"Retry-After": str(faltam * 60)},
        )
    if linha["janela_iniciada_em"] < agora - timedelta(minutes=politica.janela_minutos):
        connection.execute("DELETE FROM limites_acesso WHERE chave_hash=%s", (chave_hash,))


def registrar(connection, politica: Politica, chave_hash: str) -> None:
    """Conta mais uma tentativa e bloqueia ao atingir o teto."""
    linha = connection.execute(
        "SELECT tentativas, janela_iniciada_em FROM limites_acesso WHERE chave_hash=%s FOR UPDATE",
        (chave_hash,),
    ).fetchone()

    agora = datetime.now(timezone.utc)
    if not linha or linha["janela_iniciada_em"] < agora - timedelta(minutes=politica.janela_minutos):
        tentativas, janela = 1, agora
    else:
        tentativas, janela = int(linha["tentativas"]) + 1, linha["janela_iniciada_em"]

    bloqueado_ate = (
        agora + timedelta(minutes=politica.bloqueio_minutos)
        if tentativas >= politica.tentativas
        else None
    )
    connection.execute(
        """
        INSERT INTO limites_acesso
            (chave_hash, tentativas, janela_iniciada_em, bloqueado_ate)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (chave_hash) DO UPDATE SET
            tentativas=EXCLUDED.tentativas,
            janela_iniciada_em=EXCLUDED.janela_iniciada_em,
            bloqueado_ate=EXCLUDED.bloqueado_ate
        """,
        (chave_hash, tentativas, janela, bloqueado_ate),
    )


def limpar(connection, chave_hash: str) -> None:
    """Sucesso zera a contagem — senão o acerto seguinte herdaria os erros."""
    connection.execute("DELETE FROM limites_acesso WHERE chave_hash=%s", (chave_hash,))


def cobrar(database, politica: Politica, chave_hash: str) -> None:
    """Confere e conta a tentativa numa transação só dela.

    A conexão do pool faz rollback quando a rota levanta exceção. Contar a
    tentativa na mesma transação do trabalho seria contar em vão justamente
    nas tentativas recusadas — que são as que precisam ser contadas. Numa
    transação própria, o registro persiste independente do que aconteça depois.
    """
    with database.connection() as connection:
        conferir(connection, politica, chave_hash)
        registrar(connection, politica, chave_hash)
