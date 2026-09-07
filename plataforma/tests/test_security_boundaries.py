from contextlib import contextmanager
from types import SimpleNamespace
from unittest import mock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from core.database import Database
from core.dependencies import AuthenticatedUser
from routers import properties, vehicles


class CampaignDatabase:
    """O recurso existe, mas só é retornado para a campanha à qual pertence.
    campaign_access e os helpers de recurso são os reais, sem mock de permissão.
    """
    def __init__(self, role, own_campaign=False):
        self.campaign, self.other, self.user, self.resource = (uuid4() for _ in range(4))
        self.role, self.own_campaign = role, own_campaign
        self.queries = []

    @contextmanager
    def connection(self):
        yield self

    def execute(self, sql, params=None):
        query = " ".join(str(sql).split())
        self.queries.append(query)
        if "FROM campanhas c" in query:
            row = dict(campanha_id=self.campaign, dono_id=self.user, status="ativa",
                       papel_plataforma="criador" if self.role == "criador" else "player",
                       usuario_id=self.user, papel=self.role, membro_status="ativo")
        elif "SELECT proprietario_personagem_id, nivel_acesso_campanha" in query:
            assert params == (self.resource, self.campaign)
            assert "id=%s AND campanha_id=%s" in query
            row = dict(proprietario_personagem_id=None, nivel_acesso_campanha="nenhum") if self.own_campaign else None
        else:
            raise AssertionError("A operação não deve consultar nem alterar o recurso de outra campanha: " + query)
        return SimpleNamespace(fetchone=lambda: row)


@pytest.mark.parametrize("role", ["mestre", "assistente", "criador"])
@pytest.mark.parametrize("module,kind", [(vehicles, "vehicle"), (properties, "property")])
@pytest.mark.parametrize("operation", ["get", "update", "delete"])
def test_routes_reject_resource_of_another_campaign(role, module, kind, operation):
    db = CampaignDatabase(role)
    user = AuthenticatedUser(db.user, "teste@example.com", "Teste", False, "player", uuid4(), "hash")
    kwargs = dict(campaign_id=db.campaign, user=user, database=db)
    kwargs[kind + "_id"] = db.resource
    if operation == "update":
        kwargs["payload"] = SimpleNamespace()  # Deve negar acesso antes de ler os campos.
    with mock.patch.object(module.live_session, "publicar") as publish:
        with pytest.raises(HTTPException) as error:
            getattr(module, operation + "_" + kind)(**kwargs)
        assert error.value.status_code == 404
        publish.assert_not_called()
    assert len(db.queries) == 2


@pytest.mark.parametrize("role", ["mestre", "assistente", "criador"])
@pytest.mark.parametrize("module,kind", [(vehicles, "vehicle"), (properties, "property")])
def test_manager_keeps_access_to_resource_in_own_campaign(role, module, kind):
    db = CampaignDatabase(role, own_campaign=True)
    access = getattr(module, "_require_" + kind + "_permission")(db, db.campaign, db.resource, db.user, "gerenciar")
    assert access.manages_content
    assert len(db.queries) == 2


def test_bootstrap_email_alone_never_queries_or_promotes():
    db = Database.__new__(Database)
    with mock.patch.object(db, "connection") as connection:
        assert db.configure_creator(None, "dono@example.com") is False
        connection.assert_not_called()


def test_bootstrap_uuid_uses_only_explicit_identity():
    db = Database.__new__(Database)
    identity = uuid4()
    connection = mock.MagicMock()
    connection.execute.return_value.fetchone.return_value = {"id": identity, "papel_plataforma": "criador"}
    with mock.patch.object(db, "connection") as context:
        context.return_value.__enter__.return_value = connection
        assert db.configure_creator(identity, "outra@example.com")
    assert connection.execute.call_count == 1
    assert connection.execute.call_args.args[1] == (identity,)


@pytest.mark.parametrize("role", ["mestre", "assistente", "criador"])
def test_every_resource_subroute_checks_campaign_before_payload(role):
    import inspect
    for module, kind in [(vehicles, "vehicle"), (properties, "property")]:
        for name, function in vars(module).items():
            if name.startswith("_") or not inspect.isfunction(function) or function.__module__ != module.__name__:
                continue
            parameters = inspect.signature(function).parameters
            if kind + "_id" not in parameters:
                continue
            db = CampaignDatabase(role)
            kwargs = {key: SimpleNamespace() for key, parameter in parameters.items()
                      if parameter.default is inspect.Parameter.empty}
            kwargs.update(campaign_id=db.campaign, user=SimpleNamespace(id=db.user), database=db)
            kwargs[kind + "_id"] = db.resource
            with pytest.raises(HTTPException) as error:
                function(**kwargs)
            assert error.value.status_code == 404, name
            assert len(db.queries) == 2, name


def _admin_cli():
    import importlib.util
    from pathlib import Path
    spec = importlib.util.spec_from_file_location("jardim_conta_admin", Path(__file__).resolve().parents[2] / "tools" / "conta-admin.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_offline_provisioning_creates_player_with_hashed_temporary_password(monkeypatch, capsys):
    from core.security import verify_password
    cli = _admin_cli()
    connection = mock.MagicMock()
    connection.__enter__.return_value = connection
    monkeypatch.setattr(cli, "_conectar", lambda: connection)
    assert cli.comando_criar(SimpleNamespace(email="novo@example.com", nome="Nova Conta")) == 0
    insert, audit = connection.execute.call_args_list
    assert "'player', FALSE, TRUE" in insert.args[0]
    output = capsys.readouterr().out
    temporary = output.split("titular): ")[1].splitlines()[0]
    assert verify_password(temporary, insert.args[1][3])
    assert temporary not in str(audit)
    connection.transaction.assert_called_once()


def test_offline_provisioning_rejects_invalid_identity_before_connecting(monkeypatch):
    cli = _admin_cli()
    connect = mock.Mock()
    monkeypatch.setattr(cli, "_conectar", connect)
    with pytest.raises(SystemExit):
        cli.comando_criar(SimpleNamespace(email="invalido", nome=""))
    connect.assert_not_called()
