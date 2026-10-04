"""Cada teste fecha os bancos que abriu.

`novo_db()` abre um pool de conexões por teste. Sem fechar, as conexões se acumulam até o fim da execução e o
Postgres de teste (limite padrão de 100) passa a recusar com "too many clients" quando a suíte cresce.
"""
import pytest

from tests import db_utils


@pytest.fixture(autouse=True)
def _fechar_bancos_do_teste():
    yield
    db_utils._limpar_schemas()
