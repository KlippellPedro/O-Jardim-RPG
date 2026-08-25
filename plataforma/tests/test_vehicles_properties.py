"""Veículos e Propriedades híbridos da campanha.

Cobre o que quebrava em runtime antes desta suíte existir: a chamada de
`live_session.publicar` com argumento extra (TypeError em toda escrita), a
migração de item legado do inventário usando a chave errada (`id` em vez de
`item_id`, então nunca encontrava o item), o vazamento de veículos/propriedades
privados na listagem, e os endpoints de permissões/ocupantes/módulos que
antes não existiam.
"""

from __future__ import annotations

import json
import os
import threading
import unittest
import uuid
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from fastapi import HTTPException

from core.database import Database
from core.dependencies import AuthenticatedUser
from routers import vehicles, properties
from schemas import (
    CampaignPermissionGrantInput,
    CampaignPropertyInput,
    CampaignPropertyInstallationInput,
    CampaignPropertyMigrationInput,
    CampaignVehicleDeltaInput,
    CampaignVehicleInput,
    CampaignVehicleInventoryItemInput,
    CampaignVehicleMigrationInput,
    CampaignVehicleModuleInput,
    CampaignVehicleModuleToggleInput,
    CampaignVehicleOccupantInput,
)


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()

_CATALOGO_PATH = Path(__file__).resolve().parents[2] / "data" / "loja" / "catalogo.json"
_VEICULOS_COMPLETOS_REAIS = [
    entrada
    for entrada in json.loads(_CATALOGO_PATH.read_text(encoding="utf-8"))["entradas"]
    if entrada["tipo"] == "veiculo-completo"
]


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class VehiclesPropertiesTests(unittest.TestCase):
    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema))
            )
        isolated_dsn = make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}")
        self.database = Database(isolated_dsn)
        self.database.open()

        self.campanha_id = uuid.uuid4()
        self.mestre_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) "
                "VALUES (%s, 'mestre@jardim.test', 'Mestre', 'hash', 'mestre')",
                (self.mestre_id,),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa de Teste')",
                (self.campanha_id, self.mestre_id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')",
                (self.campanha_id, self.mestre_id),
            )
        self.mestre = self._actor(self.mestre_id, "mestre@jardim.test", "mestre")

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema))
            )

    # -- helpers ---------------------------------------------------------

    def _actor(self, usuario_id: uuid.UUID, email: str, papel_plataforma: str) -> AuthenticatedUser:
        return AuthenticatedUser(
            id=usuario_id,
            email=email,
            nome_exibicao=email.split("@")[0],
            admin_plataforma=False,
            papel_plataforma=papel_plataforma,
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )

    def _jogador(self, *, email: str) -> tuple[uuid.UUID, uuid.UUID, AuthenticatedUser]:
        usuario_id = uuid.uuid4()
        personagem_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) "
                "VALUES (%s, %s, 'Jogador', 'hash', 'player')",
                (usuario_id, email),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (self.campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, criado_por, status) "
                "VALUES (%s, %s, %s, 'Heroi', %s, 'ativo')",
                (personagem_id, self.campanha_id, usuario_id, self.mestre_id),
            )
        return usuario_id, personagem_id, self._actor(usuario_id, email, "player")

    def _veiculo_input(self, **overrides) -> CampaignVehicleInput:
        base = dict(
            nome="Moto Relâmpago", imagem_url=None, descricao="",
            vida_maxima=30, combustivel_maximo=10,
            defesa=2, resistencia=1, deslocamento=12, manobrabilidade=3,
            cobertura="parcial", capacidade=2, tripulacao_minima=1,
            sistemas_ativos_maximos=2, espacos_modulos_maximos=4, espacos_base=3,
            nivel_acesso_campanha="nenhum",
        )
        base.update(overrides)
        return CampaignVehicleInput(**base)

    def _item_legado_veiculo(self, personagem_id: uuid.UUID, item_id: str) -> None:
        dados = {
            "vida": {"maximo": 30, "atual": 25},
            "combustivel": {"maximo": 10, "atual": 8},
            "defesa": 2, "resistencia": 1, "deslocamento": 12, "manobrabilidade": 3,
            "cobertura": "parcial", "capacidade": 2,
            "tripulacaoMinima": 1, "sistemasAtivosMaximos": 2, "espacosBase": 3,
        }
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO inventario_personagem (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
                VALUES (%s, %s, %s, %s, 1, %s)
                """,
                (self.campanha_id, personagem_id, item_id, "Moto Relâmpago", Jsonb(dados)),
            )

    def _item_loja_veiculo(self, personagem_id: uuid.UUID, item_id: str, entrada: dict) -> None:
        """Insere um item exatamente como o fluxo atual da Loja grava: as
        chaves planas de `conteudo` espalhadas em `dados` (ver
        routers/shop.py:862-869, `item_data = {**editable_state,
        **item["conteudo"], ...}`) — ao contrário de `_item_legado_veiculo`,
        que usa o formato aninhado antigo."""
        dados = {
            **entrada["conteudo"],
            "tipo": entrada["tipo"],
            "categoria": "veiculo",
            "origem": "loja",
            "catalogo_item_id": entrada["id"],
        }
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO inventario_personagem (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
                VALUES (%s, %s, %s, %s, 1, %s)
                """,
                (self.campanha_id, personagem_id, item_id, entrada["titulo"], Jsonb(dados)),
            )

    # -- criação / edição --------------------------------------------------

    def test_create_update_delta_roundtrip(self):
        created = vehicles.create_vehicle(
            self.campanha_id, self._veiculo_input(raridade="incomum"),
            user=self.mestre, database=self.database,
        )
        vehicle_id = created["id"]

        updated = vehicles.update_vehicle(
            self.campanha_id, vehicle_id,
            self._veiculo_input(nome="Moto Relâmpago II", raridade="raro"),
            user=self.mestre, database=self.database,
        )
        self.assertEqual(updated["versao"], 2)

        delta = vehicles.update_vehicle_delta(
            self.campanha_id, vehicle_id,
            CampaignVehicleDeltaInput(versao=2, delta_vida=-10, delta_combustivel=-3),
            user=self.mestre, database=self.database,
        )
        self.assertEqual(delta["vida_atual"], 20)
        self.assertEqual(delta["combustivel_atual"], 7)
        self.assertEqual(delta["versao"], 3)
        with self.database.connection() as connection:
            raridade = connection.execute(
                "SELECT raridade FROM campanha_veiculos WHERE id=%s", (vehicle_id,)
            ).fetchone()["raridade"]
        self.assertEqual(raridade, "raro")

        with self.assertRaises(HTTPException) as raised:
            vehicles.update_vehicle_delta(
                self.campanha_id, vehicle_id,
                CampaignVehicleDeltaInput(versao=2, delta_vida=-1),
                user=self.mestre, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 409)

    def test_delta_clamps_within_bounds(self):
        created = vehicles.create_vehicle(self.campanha_id, self._veiculo_input(vida_maxima=10, combustivel_maximo=5), user=self.mestre, database=self.database)
        vehicle_id = created["id"]
        delta = vehicles.update_vehicle_delta(
            self.campanha_id, vehicle_id,
            CampaignVehicleDeltaInput(versao=1, delta_vida=-999, delta_combustivel=999),
            user=self.mestre, database=self.database,
        )
        self.assertEqual(delta["vida_atual"], 0)
        self.assertEqual(delta["combustivel_atual"], 5)

    def test_update_vehicle_clamps_current_when_lowering_maximos(self):
        """P1-2: vida_atual/combustivel_atual tem CHECK <= o respectivo
        maximo (core/schema.py). update_vehicle atualizava vida_maxima e
        combustivel_maximo sem tocar em vida_atual/combustivel_atual — se o
        atual (reduzido antes por update_vehicle_delta) ficasse acima do
        novo maximo, o UPDATE violava o CHECK e o mestre via um 500
        generico ao tentar baixar o maximo de um veiculo ja danificado."""
        created = vehicles.create_vehicle(
            self.campanha_id, self._veiculo_input(vida_maxima=30, combustivel_maximo=10),
            user=self.mestre, database=self.database,
        )
        vehicle_id = created["id"]

        vehicles.update_vehicle_delta(
            self.campanha_id, vehicle_id,
            CampaignVehicleDeltaInput(versao=1, delta_vida=-5, delta_combustivel=-2),
            user=self.mestre, database=self.database,
        )
        # vida_atual=25, combustivel_atual=8 agora

        vehicles.update_vehicle(
            self.campanha_id, vehicle_id,
            self._veiculo_input(vida_maxima=20, combustivel_maximo=5),
            user=self.mestre, database=self.database,
        )

        with self.database.connection() as connection:
            vehicle = connection.execute(
                "SELECT vida_maxima, vida_atual, combustivel_maximo, combustivel_atual "
                "FROM campanha_veiculos WHERE id=%s",
                (vehicle_id,),
            ).fetchone()
        self.assertEqual(vehicle["vida_maxima"], 20)
        self.assertEqual(vehicle["vida_atual"], 20)  # clampado de 25
        self.assertEqual(vehicle["combustivel_maximo"], 5)
        self.assertEqual(vehicle["combustivel_atual"], 5)  # clampado de 8

    def test_update_vehicle_does_not_raise_current_when_maximo_increases(self):
        """LEAST(atual, novo_maximo) so deve clampar pra baixo — subir o
        maximo nao pode inflar o atual de volta."""
        created = vehicles.create_vehicle(
            self.campanha_id, self._veiculo_input(vida_maxima=30, combustivel_maximo=10),
            user=self.mestre, database=self.database,
        )
        vehicle_id = created["id"]

        vehicles.update_vehicle_delta(
            self.campanha_id, vehicle_id,
            CampaignVehicleDeltaInput(versao=1, delta_vida=-5, delta_combustivel=-2),
            user=self.mestre, database=self.database,
        )

        vehicles.update_vehicle(
            self.campanha_id, vehicle_id,
            self._veiculo_input(vida_maxima=50, combustivel_maximo=20),
            user=self.mestre, database=self.database,
        )

        with self.database.connection() as connection:
            vehicle = connection.execute(
                "SELECT vida_atual, combustivel_atual FROM campanha_veiculos WHERE id=%s",
                (vehicle_id,),
            ).fetchone()
        self.assertEqual(vehicle["vida_atual"], 25)
        self.assertEqual(vehicle["combustivel_atual"], 8)

    # -- migração do inventário legado -------------------------------------

    def test_migrate_vehicle_from_inventory_is_found_and_removed(self):
        _, personagem_id, jogador = self._jogador(email="dono@jardim.test")
        item_id = str(uuid.uuid4())
        self._item_legado_veiculo(personagem_id, item_id)

        result = vehicles.migrate_vehicle(
            self.campanha_id,
            CampaignVehicleMigrationInput(personagem_id=personagem_id, item_id=item_id, compartilhar_campanha=True),
            user=jogador, database=self.database,
        )
        self.assertNotIn("migrated_already", result)

        with self.database.connection() as connection:
            restante = connection.execute(
                "SELECT COUNT(*) AS q FROM inventario_personagem WHERE personagem_id=%s", (personagem_id,)
            ).fetchone()["q"]
            vehicle = connection.execute(
                "SELECT nome, vida_atual, nivel_acesso_campanha FROM campanha_veiculos WHERE id=%s",
                (result["id"],),
            ).fetchone()

        self.assertEqual(restante, 0)
        self.assertEqual(vehicle["nome"], "Moto Relâmpago")
        self.assertEqual(vehicle["vida_atual"], 25)
        self.assertEqual(vehicle["nivel_acesso_campanha"], "utilizar")

    def test_migrate_vehicle_twice_is_idempotent(self):
        _, personagem_id, jogador = self._jogador(email="dono2@jardim.test")
        item_id = str(uuid.uuid4())
        self._item_legado_veiculo(personagem_id, item_id)

        payload = CampaignVehicleMigrationInput(personagem_id=personagem_id, item_id=item_id, compartilhar_campanha=False)
        first = vehicles.migrate_vehicle(self.campanha_id, payload, user=jogador, database=self.database)
        second = vehicles.migrate_vehicle(self.campanha_id, payload, user=jogador, database=self.database)

        self.assertEqual(first["id"], second["id"])
        self.assertTrue(second.get("migrated_already"))
        with self.database.connection() as connection:
            total = connection.execute(
                "SELECT COUNT(id) AS q FROM campanha_veiculos WHERE origem_item_id=%s", (item_id,)
            ).fetchone()["q"]
        self.assertEqual(total, 1)

    def test_migrate_vehicle_reads_flat_loja_fields_for_all_catalog_entries(self):
        """P0-2: routers/shop.py grava as chaves planas do catalogo
        (vidaMaxima, deslocamentoMetros, coberturaOcupantes, espacosBase...)
        em `dados`, nao a estrutura aninhada que `migrate_vehicle` lia antes
        (dados["vida"]["maximo"] etc., que nunca existe nesse formato) — todo
        veiculo migrado nascia com vida/deslocamento zerados e sem cobertura.
        Cobre as 16 entradas reais `veiculo-completo` do catalogo."""
        self.assertEqual(len(_VEICULOS_COMPLETOS_REAIS), 16)
        for entrada in _VEICULOS_COMPLETOS_REAIS:
            with self.subTest(veiculo=entrada["id"]):
                _, personagem_id, jogador = self._jogador(
                    email=f"{entrada['id']}@jardim.test"
                )
                item_id = str(uuid.uuid4())
                self._item_loja_veiculo(personagem_id, item_id, entrada)

                result = vehicles.migrate_vehicle(
                    self.campanha_id,
                    CampaignVehicleMigrationInput(
                        personagem_id=personagem_id,
                        item_id=item_id,
                        compartilhar_campanha=False,
                    ),
                    user=jogador,
                    database=self.database,
                )
                self.assertNotIn("migrated_already", result)

                conteudo = entrada["conteudo"]
                with self.database.connection() as connection:
                    vehicle = connection.execute(
                        """
                        SELECT vida_maxima, vida_atual, combustivel_maximo, combustivel_atual,
                               defesa, resistencia, deslocamento, manobrabilidade, cobertura,
                               capacidade, tripulacao_minima, sistemas_ativos_maximos,
                               espacos_modulos_maximos, espacos_base, raridade,
                               modulos_utilidade_integrados
                        FROM campanha_veiculos WHERE id=%s
                        """,
                        (result["id"],),
                    ).fetchone()

                self.assertEqual(vehicle["vida_maxima"], conteudo["vidaMaxima"])
                # vida inicial da Frota comeca no maximo: o catalogo nao
                # modela dano previo a migracao
                self.assertEqual(vehicle["vida_atual"], conteudo["vidaMaxima"])
                self.assertEqual(vehicle["combustivel_maximo"], 0)
                self.assertEqual(vehicle["combustivel_atual"], 0)
                self.assertEqual(vehicle["defesa"], conteudo["defesa"])
                self.assertEqual(vehicle["resistencia"], conteudo["resistencia"])
                self.assertEqual(vehicle["deslocamento"], conteudo["deslocamentoMetros"])
                self.assertEqual(vehicle["manobrabilidade"], conteudo["manobrabilidade"])
                self.assertEqual(vehicle["cobertura"], conteudo["coberturaOcupantes"])
                self.assertEqual(vehicle["capacidade"], conteudo["capacidade"])
                self.assertEqual(
                    vehicle["tripulacao_minima"], conteudo["tripulacaoMinima"]
                )
                self.assertEqual(
                    vehicle["sistemas_ativos_maximos"], conteudo["sistemasAtivosMaximos"]
                )
                self.assertEqual(
                    vehicle["espacos_modulos_maximos"], conteudo["sistemasAtivosMaximos"]
                )
                self.assertEqual(vehicle["espacos_base"], conteudo["espacosBase"])
                self.assertEqual(vehicle["raridade"], conteudo["raridade"])
                self.assertEqual(
                    vehicle["modulos_utilidade_integrados"],
                    len(conteudo.get("sistemas", [])),
                )

    def test_migrate_vehicle_preserves_explicit_zero_espacos_base(self):
        """`int(dados.get("espacosBase") or 1)` transformava um `espacosBase:
        0` real do catalogo (ex.: Moto-Flutuadora Ciclone) em `1`, porque `0`
        e falsy em Python — `0` explicito precisa continuar sendo `0`."""
        entrada = next(
            e for e in _VEICULOS_COMPLETOS_REAIS if e["conteudo"]["espacosBase"] == 0
        )
        _, personagem_id, jogador = self._jogador(email="espacos-zero@jardim.test")
        item_id = str(uuid.uuid4())
        self._item_loja_veiculo(personagem_id, item_id, entrada)

        result = vehicles.migrate_vehicle(
            self.campanha_id,
            CampaignVehicleMigrationInput(
                personagem_id=personagem_id, item_id=item_id, compartilhar_campanha=False
            ),
            user=jogador,
            database=self.database,
        )
        with self.database.connection() as connection:
            espacos_base = connection.execute(
                "SELECT espacos_base FROM campanha_veiculos WHERE id=%s", (result["id"],)
            ).fetchone()["espacos_base"]
        self.assertEqual(espacos_base, 0)

    def test_migrate_vehicle_preserves_explicit_zero_sistemas_ativos_maximos(self):
        """Mesma classe de bug do espacosBase, encontrada ao revisar os
        demais campos: `sistemasAtivosMaximos: 0` (ex.: Hoverboard
        Cyberpunk) tambem virava `1` pelo mesmo `or 1` falsy."""
        entrada = next(
            e
            for e in _VEICULOS_COMPLETOS_REAIS
            if e["conteudo"]["sistemasAtivosMaximos"] == 0
        )
        _, personagem_id, jogador = self._jogador(email="sistemas-zero@jardim.test")
        item_id = str(uuid.uuid4())
        self._item_loja_veiculo(personagem_id, item_id, entrada)

        result = vehicles.migrate_vehicle(
            self.campanha_id,
            CampaignVehicleMigrationInput(
                personagem_id=personagem_id, item_id=item_id, compartilhar_campanha=False
            ),
            user=jogador,
            database=self.database,
        )
        with self.database.connection() as connection:
            vehicle = connection.execute(
                """
                SELECT sistemas_ativos_maximos, espacos_modulos_maximos
                FROM campanha_veiculos WHERE id=%s
                """,
                (result["id"],),
            ).fetchone()
        self.assertEqual(vehicle["sistemas_ativos_maximos"], 0)
        self.assertEqual(vehicle["espacos_modulos_maximos"], 0)

    def test_migrate_vehicle_still_reads_legacy_nested_format(self):
        """Formato antigo (dados["vida"]["atual"] etc., usado por itens
        inseridos antes do fluxo atual da Loja) precisa continuar
        funcionando — nao e so uma questao do formato novo."""
        _, personagem_id, jogador = self._jogador(email="legado-nao-quebra@jardim.test")
        item_id = str(uuid.uuid4())
        self._item_legado_veiculo(personagem_id, item_id)

        result = vehicles.migrate_vehicle(
            self.campanha_id,
            CampaignVehicleMigrationInput(
                personagem_id=personagem_id, item_id=item_id, compartilhar_campanha=False
            ),
            user=jogador,
            database=self.database,
        )
        with self.database.connection() as connection:
            vehicle = connection.execute(
                """
                SELECT vida_maxima, vida_atual, combustivel_maximo, combustivel_atual,
                       deslocamento, cobertura
                FROM campanha_veiculos WHERE id=%s
                """,
                (result["id"],),
            ).fetchone()
        self.assertEqual(vehicle["vida_maxima"], 30)
        self.assertEqual(vehicle["vida_atual"], 25)
        self.assertEqual(vehicle["combustivel_maximo"], 10)
        self.assertEqual(vehicle["combustivel_atual"], 8)
        self.assertEqual(vehicle["deslocamento"], 12)
        self.assertEqual(vehicle["cobertura"], "parcial")

    # -- permissões e listagem ----------------------------------------------

    def test_list_hides_private_vehicle_from_other_players(self):
        _, dono_id, dono = self._jogador(email="dono3@jardim.test")
        _, _, outro = self._jogador(email="outro@jardim.test")

        vehicles.create_vehicle(
            self.campanha_id, self._veiculo_input(nome="Privado", nivel_acesso_campanha="nenhum"),
            user=self.mestre, database=self.database,
        )
        # veiculo criado por mestre com dono = ninguem: permanece invisivel a jogadores comuns
        listing = vehicles.list_vehicles(self.campanha_id, user=outro, database=self.database)
        self.assertEqual(listing["veiculos"], [])

        listing_mestre = vehicles.list_vehicles(self.campanha_id, user=self.mestre, database=self.database)
        self.assertEqual(len(listing_mestre["veiculos"]), 1)

    def test_list_shows_vehicle_with_visualizar_or_owned(self):
        _, dono_id, dono = self._jogador(email="dono4@jardim.test")
        _, _, outro = self._jogador(email="outro2@jardim.test")

        publico = vehicles.create_vehicle(
            self.campanha_id, self._veiculo_input(nome="Publico", nivel_acesso_campanha="visualizar"),
            user=self.mestre, database=self.database,
        )
        privado = vehicles.create_vehicle(
            self.campanha_id, self._veiculo_input(nome="Privado do Dono", nivel_acesso_campanha="nenhum"),
            user=self.mestre, database=self.database,
        )
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE campanha_veiculos SET proprietario_personagem_id=%s WHERE id=%s",
                (dono_id, privado["id"]),
            )

        listing_outro = vehicles.list_vehicles(self.campanha_id, user=outro, database=self.database)
        nomes_outro = {v["nome"] for v in listing_outro["veiculos"]}
        self.assertEqual(nomes_outro, {"Publico"})

        listing_dono = vehicles.list_vehicles(self.campanha_id, user=dono, database=self.database)
        nomes_dono = {v["nome"] for v in listing_dono["veiculos"]}
        self.assertEqual(nomes_dono, {"Publico", "Privado do Dono"})

    def test_non_owner_without_permission_cannot_manage(self):
        _, _, outro = self._jogador(email="intruso@jardim.test")
        created = vehicles.create_vehicle(self.campanha_id, self._veiculo_input(), user=self.mestre, database=self.database)
        with self.assertRaises(HTTPException) as raised:
            vehicles.update_vehicle(self.campanha_id, created["id"], self._veiculo_input(nome="Hackeado"), user=outro, database=self.database)
        self.assertEqual(raised.exception.status_code, 403)

    def test_individual_permission_grants_access(self):
        _, personagem_id, jogador = self._jogador(email="convidado@jardim.test")
        created = vehicles.create_vehicle(
            self.campanha_id, self._veiculo_input(nivel_acesso_campanha="nenhum"),
            user=self.mestre, database=self.database,
        )
        vehicle_id = created["id"]

        with self.assertRaises(HTTPException):
            vehicles.get_vehicle(self.campanha_id, vehicle_id, user=jogador, database=self.database)

        vehicles.set_vehicle_permission(
            self.campanha_id, vehicle_id,
            CampaignPermissionGrantInput(personagem_id=personagem_id, nivel_permissao="visualizar"),
            user=self.mestre, database=self.database,
        )
        detail = vehicles.get_vehicle(self.campanha_id, vehicle_id, user=jogador, database=self.database)
        self.assertEqual(detail["id"], vehicle_id)

        vehicles.remove_vehicle_permission(self.campanha_id, vehicle_id, personagem_id, user=self.mestre, database=self.database)
        with self.assertRaises(HTTPException):
            vehicles.get_vehicle(self.campanha_id, vehicle_id, user=jogador, database=self.database)

    # -- ocupantes / módulos / inventário -----------------------------------

    def test_occupants_modules_and_cargo_lifecycle(self):
        _, personagem_id, _ = self._jogador(email="tripulante@jardim.test")
        created = vehicles.create_vehicle(self.campanha_id, self._veiculo_input(), user=self.mestre, database=self.database)
        vehicle_id = created["id"]

        vehicles.set_vehicle_occupant(
            self.campanha_id, vehicle_id,
            CampaignVehicleOccupantInput(personagem_id=personagem_id, papel="Piloto", tipo="tripulacao"),
            user=self.mestre, database=self.database,
        )
        modulo = vehicles.add_vehicle_module(
            self.campanha_id, vehicle_id,
            CampaignVehicleModuleInput(nome="Escudo Deflector", espacos_ocupados=2),
            user=self.mestre, database=self.database,
        )
        vehicles.toggle_vehicle_module(
            self.campanha_id, vehicle_id, modulo["id"],
            CampaignVehicleModuleToggleInput(ativo=True),
            user=self.mestre, database=self.database,
        )
        item = vehicles.add_vehicle_cargo(
            self.campanha_id, vehicle_id,
            CampaignVehicleInventoryItemInput(nome="Kit de reparo", quantidade=3),
            user=self.mestre, database=self.database,
        )

        detail = vehicles.get_vehicle(self.campanha_id, vehicle_id, user=self.mestre, database=self.database)
        self.assertEqual(len(detail["ocupantes"]), 1)
        self.assertTrue(detail["modulos"][0]["ativo"])
        self.assertEqual(detail["inventario"][0]["quantidade"], 3)

        # Deletar com carga presente é bloqueado
        with self.assertRaises(HTTPException) as raised:
            vehicles.delete_vehicle(self.campanha_id, vehicle_id, user=self.mestre, database=self.database)
        self.assertEqual(raised.exception.status_code, 400)

        vehicles.remove_vehicle_cargo(self.campanha_id, vehicle_id, item["id"], user=self.mestre, database=self.database)
        vehicles.delete_vehicle(self.campanha_id, vehicle_id, user=self.mestre, database=self.database)

    def test_module_respects_sistemas_ativos_maximos(self):
        created = vehicles.create_vehicle(
            self.campanha_id, self._veiculo_input(sistemas_ativos_maximos=1), user=self.mestre, database=self.database,
        )
        vehicle_id = created["id"]
        m1 = vehicles.add_vehicle_module(self.campanha_id, vehicle_id, CampaignVehicleModuleInput(nome="A"), user=self.mestre, database=self.database)
        m2 = vehicles.add_vehicle_module(self.campanha_id, vehicle_id, CampaignVehicleModuleInput(nome="B"), user=self.mestre, database=self.database)

        vehicles.toggle_vehicle_module(self.campanha_id, vehicle_id, m1["id"], CampaignVehicleModuleToggleInput(ativo=True), user=self.mestre, database=self.database)
        with self.assertRaises(HTTPException) as raised:
            vehicles.toggle_vehicle_module(self.campanha_id, vehicle_id, m2["id"], CampaignVehicleModuleToggleInput(ativo=True), user=self.mestre, database=self.database)
        self.assertEqual(raised.exception.status_code, 400)

    def test_add_vehicle_module_blocks_while_vehicle_row_is_locked(self):
        """P2-3: add_vehicle_module lia espacos_modulos_maximos e a soma de
        espacos_ocupados sem travar a linha do veiculo (nenhum FOR UPDATE) —
        duas chamadas concorrentes podiam ler o mesmo total antes de
        qualquer INSERT confirmar e as duas passarem na checagem de
        capacidade, ultrapassando o limite (mesmo padrao ja usado em
        routers/shop.py para saldo/estoque). Este teste prova que a rota
        agora trava a linha (SELECT ... FOR UPDATE): mantendo a linha
        travada manualmente numa transacao separada, uma chamada real a
        add_vehicle_module precisa bloquear ate a trava ser liberada."""
        created = vehicles.create_vehicle(
            self.campanha_id, self._veiculo_input(espacos_modulos_maximos=2),
            user=self.mestre, database=self.database,
        )
        vehicle_id = created["id"]

        lock_ctx = self.database.connection()
        lock_connection = lock_ctx.__enter__()
        try:
            lock_connection.execute(
                "SELECT espacos_modulos_maximos FROM campanha_veiculos WHERE id=%s FOR UPDATE",
                (vehicle_id,),
            )

            outcome: dict = {}

            def call_add_module():
                outcome["result"] = vehicles.add_vehicle_module(
                    self.campanha_id, vehicle_id,
                    CampaignVehicleModuleInput(nome="Escudo", espacos_ocupados=1),
                    user=self.mestre, database=self.database,
                )

            worker = threading.Thread(target=call_add_module)
            worker.start()
            worker.join(timeout=0.5)
            self.assertTrue(
                worker.is_alive(),
                "add_vehicle_module deveria bloquear enquanto a linha do veiculo "
                "esta travada (FOR UPDATE) por outra transacao",
            )
        finally:
            lock_ctx.__exit__(None, None, None)  # commit: libera a trava

        worker.join(timeout=5)
        self.assertFalse(worker.is_alive())
        self.assertIn("id", outcome["result"])

    def test_toggle_vehicle_module_blocks_while_vehicle_row_is_locked(self):
        """Mesmo bug/correcao de P2-3, no outro endpoint afetado
        (sistemas_ativos_maximos em vez de espacos_modulos_maximos)."""
        created = vehicles.create_vehicle(
            self.campanha_id, self._veiculo_input(sistemas_ativos_maximos=1),
            user=self.mestre, database=self.database,
        )
        vehicle_id = created["id"]
        modulo = vehicles.add_vehicle_module(
            self.campanha_id, vehicle_id, CampaignVehicleModuleInput(nome="A"),
            user=self.mestre, database=self.database,
        )

        lock_ctx = self.database.connection()
        lock_connection = lock_ctx.__enter__()
        try:
            lock_connection.execute(
                "SELECT sistemas_ativos_maximos FROM campanha_veiculos WHERE id=%s FOR UPDATE",
                (vehicle_id,),
            )

            outcome: dict = {}

            def call_toggle():
                outcome["result"] = vehicles.toggle_vehicle_module(
                    self.campanha_id, vehicle_id, modulo["id"],
                    CampaignVehicleModuleToggleInput(ativo=True),
                    user=self.mestre, database=self.database,
                )

            worker = threading.Thread(target=call_toggle)
            worker.start()
            worker.join(timeout=0.5)
            self.assertTrue(
                worker.is_alive(),
                "toggle_vehicle_module deveria bloquear enquanto a linha do veiculo "
                "esta travada (FOR UPDATE) por outra transacao",
            )
        finally:
            lock_ctx.__exit__(None, None, None)

        worker.join(timeout=5)
        self.assertFalse(worker.is_alive())
        self.assertIn("versao", outcome["result"])

    # -- propriedades (mesma espinha dorsal) ---------------------------------

    def test_migrate_property_from_ficha_and_installations(self):
        _, personagem_id, jogador = self._jogador(email="baseira@jardim.test")
        payload = CampaignPropertyMigrationInput(
            personagem_id=personagem_id,
            propriedade_local_id="propriedade-local-1",
            nome="Refúgio na Colina",
            tipo="Base", localizacao="Colina Norte", descricao="Um esconderijo.",
            qualidade_quartos="boa", patamar="modesto",
            valor_aquisicao=500, manutencao=20,
            instalacoes=[{"nome": "Forja", "nivel": 2, "espacos": 3}],
            compartilhar_campanha=True,
        )
        result = properties.migrate_property(self.campanha_id, payload, user=jogador, database=self.database)
        detail = properties.get_property(self.campanha_id, result["id"], user=jogador, database=self.database)
        self.assertEqual(detail["nome"], "Refúgio na Colina")
        self.assertEqual(len(detail["instalacoes"]), 1)
        self.assertEqual(detail["instalacoes"][0]["nome"], "Forja")

        second = properties.migrate_property(self.campanha_id, payload, user=jogador, database=self.database)
        self.assertTrue(second.get("migrated_already"))
        self.assertEqual(second["id"], result["id"])

    def test_property_installation_and_permission_endpoints(self):
        _, personagem_id, jogador = self._jogador(email="hospede@jardim.test")
        created = properties.create_property(
            self.campanha_id,
            CampaignPropertyInput(nome="Torre", tipo="Base", nivel_acesso_campanha="nenhum"),
            user=self.mestre, database=self.database,
        )
        property_id = created["id"]

        properties.add_property_installation(
            self.campanha_id, property_id, CampaignPropertyInstallationInput(nome="Biblioteca"),
            user=self.mestre, database=self.database,
        )

        with self.assertRaises(HTTPException):
            properties.get_property(self.campanha_id, property_id, user=jogador, database=self.database)

        properties.set_property_permission(
            self.campanha_id, property_id,
            CampaignPermissionGrantInput(personagem_id=personagem_id, nivel_permissao="gerenciar"),
            user=self.mestre, database=self.database,
        )
        detail = properties.get_property(self.campanha_id, property_id, user=jogador, database=self.database)
        self.assertEqual(len(detail["instalacoes"]), 1)


if __name__ == "__main__":
    unittest.main()
