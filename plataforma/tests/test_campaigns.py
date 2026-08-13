"""Router de campanhas (routers/campaigns.py): dono x membro, convites,
transferência de posse e visibilidade de listagem.

Segue o mesmo estilo de `test_vehicles_properties.py`: banco Postgres real
num schema isolado por teste, funções do router chamadas diretamente (sem
TestClient), status HTTP conferido via `HTTPException.status_code`.
"""

from __future__ import annotations

import os
import unittest
import uuid
from datetime import datetime, timedelta, timezone

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo

from fastapi import HTTPException

from core.database import Database
from core.dependencies import AuthenticatedUser
from core.security import hash_token
from routers import campaigns
from schemas import (
    ActiveCharacterInput,
    CampaignCreateInput,
    CampaignInviteInput,
    CampaignOwnerInput,
    CampaignUpdateInput,
    JoinCampaignInput,
    MemberRoleInput,
)


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class CampaignsTests(unittest.TestCase):
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

        # dono/mestre com uma campanha já criada
        self.mestre = self._novo_usuario(email="mestre@jardim.test", papel_plataforma="mestre")
        created = campaigns.create_campaign(
            CampaignCreateInput(nome="Mesa de Teste", descricao="descricao inicial"),
            user=self.mestre, database=self.database,
        )
        self.campanha_id = created["id"]

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema))
            )

    # -- helpers ---------------------------------------------------------

    def _novo_usuario(self, *, email: str, papel_plataforma: str = "player") -> AuthenticatedUser:
        usuario_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) "
                "VALUES (%s, %s, %s, 'hash', %s)",
                (usuario_id, email, email.split("@")[0], papel_plataforma),
            )
        return AuthenticatedUser(
            id=usuario_id,
            email=email,
            nome_exibicao=email.split("@")[0],
            admin_plataforma=False,
            papel_plataforma=papel_plataforma,
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )

    def _entrar_como_membro(self, usuario: AuthenticatedUser, *, papel: str = "jogador") -> None:
        """Insere a linha de membro diretamente (bypassa o fluxo de convite,
        útil quando o teste não está exercitando o próprio fluxo de convite)."""
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                (self.campanha_id, usuario.id, papel),
            )

    def _personagem(self, usuario: AuthenticatedUser, *, status: str = "ativo") -> uuid.UUID:
        personagem_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, criado_por, status) "
                "VALUES (%s, %s, %s, 'Heroi', %s, %s)",
                (personagem_id, self.campanha_id, usuario.id, self.mestre.id, status),
            )
        return personagem_id

    def _inserir_convite_expirado(self, *, papel: str = "jogador") -> str:
        codigo = "codigo-expirado-123"
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO convites_campanha
                    (id, campanha_id, criado_por, codigo_hash, papel, max_usos, expira_em)
                VALUES (%s, %s, %s, %s, %s, 1, %s)
                """,
                (
                    uuid.uuid4(), self.campanha_id, self.mestre.id,
                    hash_token(codigo), papel,
                    datetime.now(timezone.utc) - timedelta(days=1),
                ),
            )
        return codigo

    # -- editar / arquivar: dono x membro comum ------------------------------

    def test_owner_can_update_campaign(self):
        updated = campaigns.update_campaign(
            self.campanha_id, CampaignUpdateInput(nome="Novo Nome"),
            user=self.mestre, database=self.database,
        )
        self.assertEqual(updated["campanha"]["nome"], "Novo Nome")

    def test_member_cannot_update_campaign(self):
        jogador = self._novo_usuario(email="jogador@jardim.test")
        self._entrar_como_membro(jogador, papel="jogador")
        with self.assertRaises(HTTPException) as raised:
            campaigns.update_campaign(
                self.campanha_id, CampaignUpdateInput(nome="Hackeado"),
                user=jogador, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 403)

    def test_assistant_cannot_update_campaign(self):
        """Assistente administra conteúdo mas não é `is_master` — só o
        mestre (dono) pode alterar nome/descrição/configurações."""
        assistente = self._novo_usuario(email="assistente@jardim.test")
        self._entrar_como_membro(assistente, papel="assistente")
        with self.assertRaises(HTTPException) as raised:
            campaigns.update_campaign(
                self.campanha_id, CampaignUpdateInput(nome="Hackeado"),
                user=assistente, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 403)

    def test_non_member_gets_404_not_403(self):
        """campaign_access esconde a existência da campanha de quem não é
        membro nem criador da plataforma: 404, nunca 403."""
        estranho = self._novo_usuario(email="estranho@jardim.test")
        with self.assertRaises(HTTPException) as raised:
            campaigns.update_campaign(
                self.campanha_id, CampaignUpdateInput(nome="Nome Novo"),
                user=estranho, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 404)

    def test_owner_can_archive_campaign_member_cannot(self):
        jogador = self._novo_usuario(email="jogador2@jardim.test")
        self._entrar_como_membro(jogador, papel="jogador")
        with self.assertRaises(HTTPException) as raised:
            campaigns.archive_campaign(self.campanha_id, user=jogador, database=self.database)
        self.assertEqual(raised.exception.status_code, 403)

        campaigns.archive_campaign(self.campanha_id, user=self.mestre, database=self.database)

        # campanha arquivada some do campaign_access até para o próprio mestre
        with self.assertRaises(HTTPException) as raised:
            campaigns.get_campaign(self.campanha_id, user=self.mestre, database=self.database)
        self.assertEqual(raised.exception.status_code, 404)

    def test_creator_bypasses_access_as_honorary_master(self):
        """papel_plataforma='criador' tem acesso implícito com role 'mestre'
        em qualquer campanha ativa, mesmo sem ser membro."""
        criador = self._novo_usuario(email="criador@jardim.test", papel_plataforma="criador")
        detail = campaigns.get_campaign(self.campanha_id, user=criador, database=self.database)
        self.assertEqual(detail["meu_papel"], "mestre")
        # criador também consegue editar mesmo sem estar em membros_campanha
        updated = campaigns.update_campaign(
            self.campanha_id, CampaignUpdateInput(nome="Editado pelo criador"),
            user=criador, database=self.database,
        )
        self.assertEqual(updated["campanha"]["nome"], "Editado pelo criador")

    def test_get_campaign_hides_member_list_from_regular_player(self):
        jogador = self._novo_usuario(email="jogador3@jardim.test")
        self._entrar_como_membro(jogador, papel="jogador")

        detail_jogador = campaigns.get_campaign(self.campanha_id, user=jogador, database=self.database)
        self.assertEqual(detail_jogador["membros"], [])

        detail_mestre = campaigns.get_campaign(self.campanha_id, user=self.mestre, database=self.database)
        emails = {m["email"] for m in detail_mestre["membros"]}
        self.assertIn("mestre@jardim.test", emails)
        self.assertIn("jogador3@jardim.test", emails)

    # -- convites: criar, listar, aceitar, expirado/inválido -----------------

    def test_only_manager_can_create_list_and_revoke_invites(self):
        jogador = self._novo_usuario(email="jogador4@jardim.test")
        self._entrar_como_membro(jogador, papel="jogador")

        with self.assertRaises(HTTPException) as raised:
            campaigns.create_invite(
                self.campanha_id, CampaignInviteInput(), user=jogador, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 403)

        with self.assertRaises(HTTPException) as raised:
            campaigns.list_invites(self.campanha_id, user=jogador, database=self.database)
        self.assertEqual(raised.exception.status_code, 403)

        invite = campaigns.create_invite(
            self.campanha_id, CampaignInviteInput(), user=self.mestre, database=self.database,
        )
        with self.assertRaises(HTTPException) as raised:
            campaigns.revoke_invite(
                self.campanha_id, invite["id"], user=jogador, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 403)

    def test_assistant_can_manage_invites(self):
        """require_campaign_manager aceita mestre OU assistente."""
        assistente = self._novo_usuario(email="assistente2@jardim.test")
        self._entrar_como_membro(assistente, papel="assistente")
        invite = campaigns.create_invite(
            self.campanha_id, CampaignInviteInput(), user=assistente, database=self.database,
        )
        self.assertIn("codigo", invite)
        listed = campaigns.list_invites(self.campanha_id, user=assistente, database=self.database)
        self.assertEqual(len(listed["convites"]), 1)

    def test_invite_list_never_exposes_the_raw_code(self):
        campaigns.create_invite(
            self.campanha_id, CampaignInviteInput(), user=self.mestre, database=self.database,
        )
        listed = campaigns.list_invites(self.campanha_id, user=self.mestre, database=self.database)
        self.assertEqual(len(listed["convites"]), 1)
        self.assertNotIn("codigo", listed["convites"][0])

    def test_join_campaign_with_valid_invite_adds_member_with_invite_role(self):
        invite = campaigns.create_invite(
            self.campanha_id, CampaignInviteInput(papel="assistente", max_usos=1),
            user=self.mestre, database=self.database,
        )
        novato = self._novo_usuario(email="novato@jardim.test")
        result = campaigns.join_campaign(
            JoinCampaignInput(codigo=invite["codigo"]), user=novato, database=self.database,
        )
        self.assertEqual(result["campanha_id"], self.campanha_id)
        self.assertEqual(result["papel"], "assistente")

        # e agora consegue acessar a campanha com o papel do convite
        detail = campaigns.get_campaign(self.campanha_id, user=novato, database=self.database)
        self.assertEqual(detail["meu_papel"], "assistente")

    def test_join_campaign_with_invalid_code_is_404(self):
        novato = self._novo_usuario(email="semcodigo@jardim.test")
        with self.assertRaises(HTTPException) as raised:
            campaigns.join_campaign(
                JoinCampaignInput(codigo="codigo-que-nao-existe"), user=novato, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 404)

    def test_join_campaign_with_expired_invite_is_404(self):
        codigo = self._inserir_convite_expirado()
        novato = self._novo_usuario(email="tarde@jardim.test")
        with self.assertRaises(HTTPException) as raised:
            campaigns.join_campaign(
                JoinCampaignInput(codigo=codigo), user=novato, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 404)

    def test_join_campaign_with_exhausted_invite_is_404(self):
        invite = campaigns.create_invite(
            self.campanha_id, CampaignInviteInput(max_usos=1),
            user=self.mestre, database=self.database,
        )
        primeiro = self._novo_usuario(email="primeiro@jardim.test")
        campaigns.join_campaign(
            JoinCampaignInput(codigo=invite["codigo"]), user=primeiro, database=self.database,
        )
        segundo = self._novo_usuario(email="segundo@jardim.test")
        with self.assertRaises(HTTPException) as raised:
            campaigns.join_campaign(
                JoinCampaignInput(codigo=invite["codigo"]), user=segundo, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 404)

    def test_join_campaign_with_revoked_invite_is_404(self):
        invite = campaigns.create_invite(
            self.campanha_id, CampaignInviteInput(), user=self.mestre, database=self.database,
        )
        campaigns.revoke_invite(self.campanha_id, invite["id"], user=self.mestre, database=self.database)
        novato = self._novo_usuario(email="revogado@jardim.test")
        with self.assertRaises(HTTPException) as raised:
            campaigns.join_campaign(
                JoinCampaignInput(codigo=invite["codigo"]), user=novato, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 404)

    def test_revoke_invite_from_another_campaign_is_404(self):
        """O WHERE já filtra por id+campanha_id: um invite_id real, mas de
        outra campanha, precisa cair em 404 (isolamento entre campanhas)."""
        outro_mestre = self._novo_usuario(email="outro-mestre@jardim.test", papel_plataforma="mestre")
        outra_campanha = campaigns.create_campaign(
            CampaignCreateInput(nome="Outra Mesa"), user=outro_mestre, database=self.database,
        )
        invite_outra_campanha = campaigns.create_invite(
            outra_campanha["id"], CampaignInviteInput(), user=outro_mestre, database=self.database,
        )
        with self.assertRaises(HTTPException) as raised:
            campaigns.revoke_invite(
                self.campanha_id, invite_outra_campanha["id"], user=self.mestre, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 404)

    def test_rejoining_after_removal_updates_role_from_invite(self):
        """Usuário removido que reentra com um convite de papel diferente
        deve assumir o novo papel (ON CONFLICT DO UPDATE papel=EXCLUDED.papel)."""
        jogador = self._novo_usuario(email="vai-e-volta@jardim.test")
        self._entrar_como_membro(jogador, papel="jogador")
        campaigns.remove_member(self.campanha_id, jogador.id, user=self.mestre, database=self.database)

        invite = campaigns.create_invite(
            self.campanha_id, CampaignInviteInput(papel="observador"),
            user=self.mestre, database=self.database,
        )
        result = campaigns.join_campaign(
            JoinCampaignInput(codigo=invite["codigo"]), user=jogador, database=self.database,
        )
        self.assertEqual(result["papel"], "observador")
        detail = campaigns.get_campaign(self.campanha_id, user=jogador, database=self.database)
        self.assertEqual(detail["meu_papel"], "observador")

    # -- remoção de membro e alteração de papel ------------------------------

    def test_master_can_remove_member_non_master_cannot(self):
        jogador = self._novo_usuario(email="removivel@jardim.test")
        self._entrar_como_membro(jogador, papel="jogador")
        outro = self._novo_usuario(email="sem-permissao@jardim.test")
        self._entrar_como_membro(outro, papel="jogador")

        with self.assertRaises(HTTPException) as raised:
            campaigns.remove_member(self.campanha_id, jogador.id, user=outro, database=self.database)
        self.assertEqual(raised.exception.status_code, 403)

        campaigns.remove_member(self.campanha_id, jogador.id, user=self.mestre, database=self.database)
        with self.assertRaises(HTTPException) as raised:
            campaigns.get_campaign(self.campanha_id, user=jogador, database=self.database)
        self.assertEqual(raised.exception.status_code, 404)

    def test_removing_owner_is_blocked_with_409(self):
        with self.assertRaises(HTTPException) as raised:
            campaigns.remove_member(self.campanha_id, self.mestre.id, user=self.mestre, database=self.database)
        self.assertEqual(raised.exception.status_code, 409)

    def test_removing_unknown_member_is_404(self):
        with self.assertRaises(HTTPException) as raised:
            campaigns.remove_member(
                self.campanha_id, uuid.uuid4(), user=self.mestre, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 404)

    def test_update_member_role_blocks_demoting_owner(self):
        with self.assertRaises(HTTPException) as raised:
            campaigns.update_member_role(
                self.campanha_id, self.mestre.id, MemberRoleInput(papel="jogador"),
                user=self.mestre, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 409)

    def test_update_member_role_success_and_permission(self):
        jogador = self._novo_usuario(email="promovivel@jardim.test")
        self._entrar_como_membro(jogador, papel="jogador")

        with self.assertRaises(HTTPException) as raised:
            campaigns.update_member_role(
                self.campanha_id, jogador.id, MemberRoleInput(papel="assistente"),
                user=jogador, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 403)

        result = campaigns.update_member_role(
            self.campanha_id, jogador.id, MemberRoleInput(papel="assistente"),
            user=self.mestre, database=self.database,
        )
        self.assertEqual(result["papel"], "assistente")

    # -- transferência de posse -----------------------------------------

    def test_only_owner_can_initiate_transfer(self):
        assistente = self._novo_usuario(email="assistente3@jardim.test")
        self._entrar_como_membro(assistente, papel="assistente")
        alvo = self._novo_usuario(email="alvo@jardim.test", papel_plataforma="mestre")
        self._entrar_como_membro(alvo, papel="jogador")

        with self.assertRaises(HTTPException) as raised:
            campaigns.transfer_campaign_ownership(
                self.campanha_id, CampaignOwnerInput(novo_dono_id=alvo.id),
                user=assistente, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 403)

    def test_platform_creator_can_initiate_transfer_even_without_membership(self):
        criador = self._novo_usuario(email="criador2@jardim.test", papel_plataforma="criador")
        alvo = self._novo_usuario(email="alvo2@jardim.test", papel_plataforma="mestre")
        self._entrar_como_membro(alvo, papel="jogador")

        result = campaigns.transfer_campaign_ownership(
            self.campanha_id, CampaignOwnerInput(novo_dono_id=alvo.id),
            user=criador, database=self.database,
        )
        self.assertEqual(result["dono_id"], alvo.id)

    def test_transfer_target_must_be_active_member(self):
        naomembro = self._novo_usuario(email="naomembro@jardim.test", papel_plataforma="mestre")
        with self.assertRaises(HTTPException) as raised:
            campaigns.transfer_campaign_ownership(
                self.campanha_id, CampaignOwnerInput(novo_dono_id=naomembro.id),
                user=self.mestre, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 422)

    def test_transfer_target_must_have_mestre_or_criador_platform_role(self):
        alvo_jogador_comum = self._novo_usuario(email="alvo3@jardim.test", papel_plataforma="player")
        self._entrar_como_membro(alvo_jogador_comum, papel="jogador")
        with self.assertRaises(HTTPException) as raised:
            campaigns.transfer_campaign_ownership(
                self.campanha_id, CampaignOwnerInput(novo_dono_id=alvo_jogador_comum.id),
                user=self.mestre, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 422)

    def test_transfer_to_current_owner_is_409(self):
        with self.assertRaises(HTTPException) as raised:
            campaigns.transfer_campaign_ownership(
                self.campanha_id, CampaignOwnerInput(novo_dono_id=self.mestre.id),
                user=self.mestre, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 409)

    def test_transfer_success_updates_owner_and_new_owner_role(self):
        alvo = self._novo_usuario(email="alvo4@jardim.test", papel_plataforma="mestre")
        self._entrar_como_membro(alvo, papel="jogador")

        result = campaigns.transfer_campaign_ownership(
            self.campanha_id, CampaignOwnerInput(novo_dono_id=alvo.id),
            user=self.mestre, database=self.database,
        )
        self.assertEqual(result["dono_id"], alvo.id)

        detail_alvo = campaigns.get_campaign(self.campanha_id, user=alvo, database=self.database)
        self.assertEqual(detail_alvo["campanha"]["dono_id"], alvo.id)
        self.assertEqual(detail_alvo["meu_papel"], "mestre")

        # dono antigo perde dono_id mas continua mestre como membro (não é
        # rebaixado automaticamente ao transferir)
        detail_antigo = campaigns.get_campaign(self.campanha_id, user=self.mestre, database=self.database)
        self.assertEqual(detail_antigo["meu_papel"], "mestre")

        # o antigo dono agora pode ser removido como qualquer outro mestre
        # não-dono (a proteção do 409 acompanha o dono_id da campanha)
        with self.assertRaises(HTTPException) as raised:
            campaigns.update_member_role(
                self.campanha_id, alvo.id, MemberRoleInput(papel="jogador"),
                user=alvo, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 409)

    # -- listagem respeita visibilidade por papel ----------------------------

    def test_list_campaigns_shows_only_own_memberships_for_regular_user(self):
        outro_mestre = self._novo_usuario(email="dono-de-outra@jardim.test", papel_plataforma="mestre")
        campaigns.create_campaign(
            CampaignCreateInput(nome="Mesa Alheia"), user=outro_mestre, database=self.database,
        )

        jogador = self._novo_usuario(email="so-uma-mesa@jardim.test")
        self._entrar_como_membro(jogador, papel="jogador")

        listing = campaigns.list_campaigns(user=jogador, database=self.database)
        nomes = {c["nome"] for c in listing["campanhas"]}
        self.assertEqual(nomes, {"Mesa de Teste"})

    def test_list_campaigns_creator_sees_every_active_campaign_as_honorary_master(self):
        outro_mestre = self._novo_usuario(email="dono-de-outra2@jardim.test", papel_plataforma="mestre")
        campaigns.create_campaign(
            CampaignCreateInput(nome="Mesa Alheia 2"), user=outro_mestre, database=self.database,
        )
        criador = self._novo_usuario(email="criador3@jardim.test", papel_plataforma="criador")

        listing = campaigns.list_campaigns(user=criador, database=self.database)
        nomes = {c["nome"] for c in listing["campanhas"]}
        self.assertEqual(nomes, {"Mesa de Teste", "Mesa Alheia 2"})
        for campanha in listing["campanhas"]:
            self.assertEqual(campanha["papel"], "mestre")

    def test_list_campaigns_does_not_show_archived_campaigns(self):
        campaigns.archive_campaign(self.campanha_id, user=self.mestre, database=self.database)
        listing = campaigns.list_campaigns(user=self.mestre, database=self.database)
        self.assertEqual(listing["campanhas"], [])

    # -- personagem ativo (jogador comum, sem ser manager) -------------------

    def test_player_can_set_own_active_character(self):
        jogador = self._novo_usuario(email="dono-de-ficha@jardim.test")
        self._entrar_como_membro(jogador, papel="jogador")
        personagem_id = self._personagem(jogador)

        result = campaigns.set_active_character(
            self.campanha_id, ActiveCharacterInput(personagem_id=personagem_id),
            user=jogador, database=self.database,
        )
        self.assertEqual(result["personagem_ativo_id"], personagem_id)

    def test_player_cannot_set_someone_elses_character_active(self):
        jogador = self._novo_usuario(email="tentando-roubar@jardim.test")
        self._entrar_como_membro(jogador, papel="jogador")
        outro = self._novo_usuario(email="dono-real@jardim.test")
        self._entrar_como_membro(outro, papel="jogador")
        personagem_do_outro = self._personagem(outro)

        with self.assertRaises(HTTPException) as raised:
            campaigns.set_active_character(
                self.campanha_id, ActiveCharacterInput(personagem_id=personagem_do_outro),
                user=jogador, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 422)

    def test_cannot_set_inactive_character_active(self):
        jogador = self._novo_usuario(email="ficha-inativa@jardim.test")
        self._entrar_como_membro(jogador, papel="jogador")
        personagem_inativo = self._personagem(jogador, status="arquivado")

        with self.assertRaises(HTTPException) as raised:
            campaigns.set_active_character(
                self.campanha_id, ActiveCharacterInput(personagem_id=personagem_inativo),
                user=jogador, database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 422)

    # -- auditoria: só manager --------------------------------------------

    def test_only_manager_can_list_audit_events(self):
        jogador = self._novo_usuario(email="curioso@jardim.test")
        self._entrar_como_membro(jogador, papel="jogador")
        with self.assertRaises(HTTPException) as raised:
            campaigns.list_audit_events(self.campanha_id, user=jogador, database=self.database)
        self.assertEqual(raised.exception.status_code, 403)

        events = campaigns.list_audit_events(self.campanha_id, user=self.mestre, database=self.database)
        acoes = {e["acao"] for e in events["eventos"]}
        self.assertIn("campanha.criada", acoes)


if __name__ == "__main__":
    unittest.main()
