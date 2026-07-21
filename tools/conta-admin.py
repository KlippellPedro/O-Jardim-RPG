"""Socorro de conta: resolve o que o site não consegue resolver sozinho.

Existe para o caso em que ninguém consegue entrar — a senha do dono se perdeu e
não há outro administrador para redefini-la pelo painel.

Dois modos, porque o banco de produção fica na VLAN da Discloud e normalmente
não aceita conexão de fora:

    # pela API (recomendado): precisa de SERVICE_API_KEY
    python tools/conta-admin.py senha eu@email.com --api https://jardim-rpg.discloud.app
    python tools/conta-admin.py promover eu@email.com --api https://jardim-rpg.discloud.app

    # direto no banco: precisa de DATABASE_URL que responda da sua máquina
    python tools/conta-admin.py listar
    python tools/conta-admin.py senha eu@email.com

`senha` gera uma provisória e obriga a troca no próximo acesso, igual ao botão
do painel. `promover` põe a conta como criador sem depender de reinício nem de
variável de ambiente. Ambos valem para a conta criador — é o único caminho de
volta se ela se perder.

Rode de dentro do venv de plataforma/, que tem psycopg e pwdlib:

    cd plataforma
    .venv-test\\Scripts\\python.exe ..\\tools\\conta-admin.py senha eu@email.com --api https://SEU-SITE
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


RAIZ = Path(__file__).resolve().parent.parent


def _carregar_env() -> None:
    for caminho in (RAIZ / ".env", RAIZ / "plataforma" / ".env"):
        if not caminho.exists():
            continue
        for linha in caminho.read_text(encoding="utf-8").splitlines():
            linha = linha.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            chave, _, valor = linha.partition("=")
            os.environ.setdefault(chave.strip(), valor.strip())


def _conectar():
    sys.path.insert(0, str(RAIZ / "plataforma"))
    try:
        import psycopg  # noqa: PLC0415
        from psycopg.rows import dict_row  # noqa: PLC0415
    except ImportError:
        raise SystemExit(
            "psycopg nao encontrado. Rode com o python do venv da plataforma:\n"
            "  cd plataforma\n"
            "  .venv-test\\Scripts\\python.exe ..\\tools\\conta-admin.py listar"
        ) from None

    dsn = os.getenv("DATABASE_URL", "").strip()
    if not dsn:
        raise SystemExit("DATABASE_URL nao definida (.env da raiz ou de plataforma/).")

    # Erro clássico: copiar a connection string de exemplo e esquecer de trocar
    # o [YOUR-PASSWORD]. Vale avisar antes de gastar uma tentativa de conexão.
    senha = re.match(r"\w+://[^:]+:([^@]*)@", dsn)
    if senha and senha.group(1).startswith("[") and senha.group(1).endswith("]"):
        raise SystemExit(
            "A DATABASE_URL ainda tem o placeholder de senha entre colchetes —\n"
            "essa string nunca foi preenchida.\n\n"
            "Se o banco de producao esta na Discloud (VLAN), ele nao responde da\n"
            "sua maquina: use o modo por API, que nao precisa da DATABASE_URL:\n"
            "  python tools/conta-admin.py senha SEU@EMAIL --api https://SEU-SITE"
        )

    try:
        return psycopg.connect(dsn, autocommit=True, row_factory=dict_row)
    except psycopg.OperationalError as erro:
        detalhe = str(erro).strip().splitlines()[0]
        if "password authentication failed" in detalhe:
            raise SystemExit(
                f"O banco recusou a senha da DATABASE_URL.\n  {detalhe}\n\n"
                "Confira a senha no painel do banco. Se o banco de producao so\n"
                "aceita conexao interna (VLAN da Discloud), use o modo por API:\n"
                "  python tools/conta-admin.py senha SEU@EMAIL --api https://SEU-SITE"
            ) from None
        raise SystemExit(
            f"Nao consegui falar com o banco.\n  {detalhe}\n\n"
            "Se o banco so aceita conexao interna, use o modo por API:\n"
            "  python tools/conta-admin.py senha SEU@EMAIL --api https://SEU-SITE"
        ) from None


def _tem_coluna(conexao, tabela: str, coluna: str) -> bool:
    """A migração 6 trouxe `senha_provisoria`; num banco anterior ela não existe.

    Esta é uma ferramenta de emergência: precisa funcionar no banco como ele
    está, não como deveria estar depois do próximo deploy.
    """
    return bool(conexao.execute(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name=%s AND column_name=%s
        """,
        (tabela, coluna),
    ).fetchone())


def comando_listar(_argumentos) -> int:
    with _conectar() as conexao:
        provisoria = _tem_coluna(conexao, "usuarios", "senha_provisoria")
        linhas = conexao.execute(
            f"""
            SELECT email, nome_exibicao, papel_plataforma, ativo
                   {', senha_provisoria' if provisoria else ''}
            FROM usuarios ORDER BY papel_plataforma, email
            """
        ).fetchall()
    if not linhas:
        print("Nenhuma conta cadastrada.")
        return 0
    print(f"{'CARGO':<12} {'ATIVO':<6} {'E-MAIL':<34} NOME")
    for linha in linhas:
        marca = "sim" if linha["ativo"] else "NAO"
        provisoria = " (senha provisoria)" if linha.get("senha_provisoria") else ""
        print(f"{linha['papel_plataforma']:<12} {marca:<6} {linha['email']:<34} {linha['nome_exibicao']}{provisoria}")
    return 0


def _chamar_api(api: str, caminho: str, email: str) -> dict:
    """Modo VLAN: o banco não aceita conexão de fora, mas a API está no ar."""
    chave = os.getenv("SERVICE_API_KEY", "").strip()
    if not chave:
        raise SystemExit(
            "SERVICE_API_KEY nao definida. Pegue o valor no painel da Discloud\n"
            "(variaveis da plataforma) e coloque no .env da raiz."
        )
    requisicao = urllib.request.Request(
        f"{api.rstrip('/')}/api/v1/interno/{caminho}",
        data=json.dumps({"email": email}).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-Service-Key": chave},
        method="POST",
    )
    try:
        with urllib.request.urlopen(requisicao, timeout=60) as resposta:
            return json.loads(resposta.read())
    except urllib.error.HTTPError as erro:
        corpo = erro.read().decode("utf-8", "replace")[:300]
        if erro.code == 401:
            raise SystemExit("A API recusou a SERVICE_API_KEY. Confira o valor no painel.") from None
        if erro.code == 404:
            raise SystemExit(f"Conta {email} nao encontrada no site.") from None
        raise SystemExit(f"A API respondeu {erro.code}: {corpo}") from None
    except urllib.error.URLError as erro:
        raise SystemExit(f"Nao consegui falar com {api}: {erro.reason}") from None


def comando_senha(argumentos) -> int:
    if argumentos.api:
        dados = _chamar_api(argumentos.api, "contas/senha", argumentos.email)
        print(f"Conta: {dados['nome_exibicao']} <{dados['email']}> ({dados['papel_plataforma']})")
        print(f"Senha provisoria: {dados['senha_provisoria']}")
        print("Entre com ela no site; a troca por uma senha sua e exigida na hora.")
        return 0

    sys.path.insert(0, str(RAIZ / "plataforma"))
    from core.security import hash_password, new_temporary_password  # noqa: PLC0415

    temporaria = new_temporary_password()
    with _conectar() as conexao:
        alvo = conexao.execute(
            "SELECT id, nome_exibicao, ativo FROM usuarios WHERE LOWER(email)=LOWER(%s)",
            (argumentos.email,),
        ).fetchone()
        if not alvo:
            raise SystemExit(f"Nenhuma conta com o e-mail {argumentos.email}.")
        if not alvo["ativo"]:
            print("Aviso: a conta esta desativada; reative-a pelo painel depois de entrar.")

        if _tem_coluna(conexao, "usuarios", "senha_provisoria"):
            conexao.execute(
                """
                UPDATE usuarios
                SET senha_hash=%s, senha_provisoria=TRUE,
                    senha_alterada_em=CURRENT_TIMESTAMP, atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                (hash_password(temporaria), alvo["id"]),
            )
            obriga_troca = True
        else:
            # Banco anterior à migração 6: dá para entrar, mas o site ainda não
            # sabe exigir a troca. Troque na mão em Minha conta depois de entrar.
            conexao.execute(
                "UPDATE usuarios SET senha_hash=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
                (hash_password(temporaria), alvo["id"]),
            )
            obriga_troca = False
        # Toda sessão aberta cai: se a conta foi perdida, o intruso sai junto.
        conexao.execute(
            """
            UPDATE sessoes_auth SET revogada_em=CURRENT_TIMESTAMP
            WHERE usuario_id=%s AND revogada_em IS NULL
            """,
            (alvo["id"],),
        )

    print(f"Conta: {alvo['nome_exibicao']} <{argumentos.email}>")
    print(f"Senha provisoria: {temporaria}")
    if obriga_troca:
        print("Entre com ela no site; a troca por uma senha sua e exigida na hora.")
    else:
        print("Entre com ela e troque a senha em Minha conta (este banco ainda")
        print("nao tem a migracao 6, entao o site nao vai exigir a troca sozinho).")
    return 0


def comando_promover(argumentos) -> int:
    if argumentos.api:
        dados = _chamar_api(argumentos.api, "contas/criador", argumentos.email)
        print(f"{dados['nome_exibicao']} <{dados['email']}> agora e criador "
              f"(era {dados['papel_anterior']}).")
        print("Saia e entre de novo no site para o cargo aparecer.")
        return 0

    with _conectar() as conexao:
        alvo = conexao.execute(
            "SELECT id, nome_exibicao, papel_plataforma FROM usuarios WHERE LOWER(email)=LOWER(%s)",
            (argumentos.email,),
        ).fetchone()
        if not alvo:
            raise SystemExit(
                f"Nenhuma conta com o e-mail {argumentos.email}. "
                "Cadastre-se no site primeiro e rode de novo."
            )
        if alvo["papel_plataforma"] == "criador":
            print(f"{argumentos.email} ja e criador.")
            return 0

        # O cargo criador é único: quem estiver nele desce para admin.
        conexao.execute(
            """
            UPDATE usuarios
            SET papel_plataforma='admin', admin_plataforma=TRUE,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE papel_plataforma='criador' AND id<>%s
            """,
            (alvo["id"],),
        )
        conexao.execute(
            """
            UPDATE usuarios
            SET papel_plataforma='criador', admin_plataforma=TRUE,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (alvo["id"],),
        )
    print(f"{alvo['nome_exibicao']} <{argumentos.email}> agora e criador (era {alvo['papel_plataforma']}).")
    print("Saia e entre de novo no site para o cargo aparecer.")
    return 0


def main() -> int:
    _carregar_env()
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="comando", required=True)

    sub.add_parser("listar", help="mostra as contas e seus cargos")

    ajuda_api = (
        "usa a API em vez do banco (para quando o Postgres so aceita conexao "
        "interna); exige SERVICE_API_KEY. Ex.: --api https://jardim-rpg.discloud.app"
    )

    senha = sub.add_parser("senha", help="gera uma senha provisoria para um e-mail")
    senha.add_argument("email")
    senha.add_argument("--api", default=os.getenv("JARDIM_API_PUBLICA"), help=ajuda_api)

    promover = sub.add_parser("promover", help="torna a conta o criador da plataforma")
    promover.add_argument("email")
    promover.add_argument("--api", default=os.getenv("JARDIM_API_PUBLICA"), help=ajuda_api)

    argumentos = parser.parse_args()
    return {
        "listar": comando_listar,
        "senha": comando_senha,
        "promover": comando_promover,
    }[argumentos.comando](argumentos)


if __name__ == "__main__":
    raise SystemExit(main())
