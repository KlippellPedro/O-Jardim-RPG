from __future__ import annotations

import collections
import contextlib
import gzip
import io
import json
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock
from uuid import UUID

from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from core.backup import (
    TABELAS,
    TABELAS_IGNORADAS,
    gerar_backup,
    ler_cabecalho,
    nome_do_arquivo,
)
from core.automatic_backup import salvar_backup_automatico
from core import rate_limit_auth as limites
from core.character_summary import carregar_catalogos, iniciativa_fixa, resumir_ficha, sabedoria_desempate, xp_por_vd
from core.campaign_visibility import visible_campaign_config
from core.dados import _classificar, rolar_formula, rolar_teste
from core.config import load_settings
from core.notifications import notify
from core.security import (
    hash_password,
    hash_token,
    new_human_code,
    new_secret_token,
    new_temporary_password,
    normalize_human_code,
    verify_password,
)
from routers.characters import _eden_fruit_resource_bonus, _sheet_without_central_fields
from routers.sessions import _estado_bloqueado, _estado_da_vida, _inteiro_do_catalogo
from core.dependencies import AuthenticatedUser
from schemas import (
    AdminUserUpdateInput,
    CampaignUpdateInput,
    CharacterCreateInput,
    EconomyReplaceInput,
    DistributeXpInput,
    NotificationReadInput,
    ParticipantCreateInput,
    ParticipantReorderInput,
    ParticipantUpdateInput,
    PasswordChangeInput,
    PasswordHelpInput,
    RegisterInput,
    RollInput,
    SessionCharactersInput,
    SessionOpenInput,
    SessionTurnInput,
    UsageInput,
)


class SecurityTests(unittest.TestCase):
    def test_password_hash_is_not_plaintext_and_verifies(self):
        password = "uma-senha-realmente-forte-123"
        encoded = hash_password(password)
        self.assertNotEqual(encoded, password)
        self.assertTrue(verify_password(password, encoded))
        self.assertFalse(verify_password("senha-errada", encoded))

    def test_tokens_are_random_and_hashable(self):
        first = new_secret_token()
        second = new_secret_token()
        self.assertNotEqual(first, second)
        self.assertEqual(len(hash_token(first)), 64)

    def test_human_code_normalization(self):
        code = new_human_code()
        self.assertEqual(normalize_human_code(code.lower()), code)


class EdenFruitEffectsTests(unittest.TestCase):
    def test_despertar_substitui_bonus_base_sem_acumular(self):
        ficha = {
            "frutoEdenConsumido": {
                "itemId": "fruto-teste",
                "despertado": True,
                "conteudo": {
                    "efeitosFicha": [
                        {"categoria": "recurso", "alvo": "manaMaxima", "valor": 2},
                    ],
                    "efeitosFichaDespertado": [
                        {"categoria": "recurso", "alvo": "manaMaxima", "valor": 4},
                    ],
                },
            },
        }
        self.assertEqual(_eden_fruit_resource_bonus(ficha, "manaMaxima"), 4)


class SchemaTests(unittest.TestCase):
    def test_registration_password_boundary(self):
        with self.assertRaises(ValidationError):
            RegisterInput(
                email="player@example.com",
                nome_exibicao="Player",
                senha="1234567",
            )
        entrada = RegisterInput(
            email="player@example.com",
            nome_exibicao="Player",
            senha="12345678",
        )
        self.assertEqual(entrada.senha, "12345678")

    def test_large_sheet_is_rejected(self):
        with self.assertRaises(ValidationError):
            CharacterCreateInput(
                campanha_id="11111111-1111-1111-1111-111111111111",
                nome="Personagem",
                ficha={"texto": "x" * 1_000_001},
            )

    def test_economy_is_removed_from_freeform_sheet(self):
        result = _sheet_without_central_fields(
            {
                "nome": "Lys",
                "nivel": 1,
                "carteira": [{"moeda": "Lunaris", "saldo": 20}],
                "inventario": [{"id": "espada"}],
                "lunaris": 20,
            }
        )
        self.assertEqual(result, {"nome": "Lys", "nivel": 1})

    def test_duplicate_inventory_item_is_rejected(self):
        with self.assertRaises(ValidationError):
            EconomyReplaceInput(
                versao_esperada=1,
                inventario=[
                    {"item_id": "faca", "titulo": "Faca", "quantidade": 1},
                    {"item_id": "faca", "titulo": "Outra faca", "quantidade": 1},
                ],
            )

    def test_creator_cannot_be_assigned_by_admin_payload(self):
        with self.assertRaises(ValidationError):
            AdminUserUpdateInput(papel_plataforma="criador")

    def test_empty_campaign_update_is_rejected(self):
        with self.assertRaises(ValidationError):
            CampaignUpdateInput()


class PlatformRoleTests(unittest.TestCase):
    def make_user(self, role: str) -> AuthenticatedUser:
        return AuthenticatedUser(
            id=UUID("11111111-1111-1111-1111-111111111111"),
            email="conta@example.com",
            nome_exibicao="Conta",
            admin_plataforma=role in {"admin", "criador"},
            papel_plataforma=role,
            session_id=UUID("22222222-2222-2222-2222-222222222222"),
            csrf_hash="hash",
        )

    def test_player_cannot_create_campaign(self):
        self.assertFalse(self.make_user("player").can_create_campaign)

    def test_master_and_creator_can_create_campaign(self):
        self.assertTrue(self.make_user("mestre").can_create_campaign)
        self.assertTrue(self.make_user("criador").can_create_campaign)

    def test_only_admin_and_creator_have_platform_admin_access(self):
        self.assertFalse(self.make_user("mestre").is_platform_admin)
        self.assertTrue(self.make_user("admin").is_platform_admin)
        self.assertTrue(self.make_user("criador").is_platform_admin)


class CreatorSettingsTests(unittest.TestCase):
    """A conta criador vem da configuração do servidor, nunca do painel."""

    def load(self, **env):
        base = {"CREATOR_USER_ID": "", "CREATOR_EMAIL": "", "DATABASE_URL": "postgresql://x/y"}
        with mock.patch.dict(os.environ, {**base, **env}, clear=False):
            return load_settings()

    def test_email_is_normalized_to_lowercase(self):
        settings = self.load(CREATOR_EMAIL="  Dono@Exemplo.com ")
        self.assertEqual(settings.creator_email, "dono@exemplo.com")
        self.assertTrue(settings.has_creator_rule)

    def test_no_creator_configured(self):
        self.assertFalse(self.load().has_creator_rule)

    def test_invalid_uuid_is_rejected(self):
        with self.assertRaises(RuntimeError):
            self.load(CREATOR_USER_ID="nao-e-uuid")


class NotificationTests(unittest.TestCase):
    class ConexaoFalsa:
        def __init__(self):
            self.inseridos = []

        def execute(self, _sql, params=None):
            self.inseridos.append(params)
            return self

        @contextlib.contextmanager
        def cursor(self):
            yield self

        def executemany(self, _sql, params_seq):
            for params in params_seq:
                self.inseridos.append(params)

    def test_actor_does_not_notify_itself(self):
        conexao = self.ConexaoFalsa()
        ator = UUID("11111111-1111-1111-1111-111111111111")
        outro = UUID("33333333-3333-3333-3333-333333333333")
        total = notify(
            conexao,
            user_ids=[ator, outro, outro],
            category="campanha",
            title="Mudou algo",
            actor_user_id=ator,
        )
        self.assertEqual(total, 1)
        self.assertEqual(len(conexao.inseridos), 1)

    def test_invalid_category_is_rejected(self):
        with self.assertRaises(ValueError):
            notify(self.ConexaoFalsa(), user_ids=[UUID(int=1)], category="qualquer", title="x")

    def test_marking_all_as_read_needs_no_ids(self):
        self.assertEqual(NotificationReadInput().ids, [])


class TemporaryPasswordTests(unittest.TestCase):
    """Senha provisória do admin: legível ao telefone e trocável só pelo dono."""

    def test_password_is_long_enough_for_registration_rules(self):
        senha = new_temporary_password()
        self.assertGreaterEqual(len(senha.replace("-", "")), 12)
        RegisterInput(email="a@b.com", nome_exibicao="Conta", senha=senha)

    def test_password_avoids_ambiguous_characters(self):
        for _ in range(30):
            self.assertFalse(set(new_temporary_password()) & set("O0I1l"))

    def test_passwords_are_not_repeated(self):
        self.assertEqual(len({new_temporary_password() for _ in range(50)}), 50)

    def test_change_requires_a_different_password(self):
        with self.assertRaises(ValidationError):
            PasswordChangeInput(senha_atual="repetida-1234", nova_senha="repetida-1234")

    def test_change_enforces_minimum_length(self):
        with self.assertRaises(ValidationError):
            PasswordChangeInput(senha_atual="provisoria", nova_senha="1234567")

        entrada = PasswordChangeInput(senha_atual="provisoria", nova_senha="12345678")
        self.assertEqual(entrada.nova_senha, "12345678")

    def test_valid_change_is_accepted(self):
        entrada = PasswordChangeInput(
            senha_atual="PFHW-KZ2E-CCVV-JTEL",
            nova_senha="uma-senha-so-minha",
        )
        self.assertEqual(entrada.senha_atual, "PFHW-KZ2E-CCVV-JTEL")


class CharacterSummaryTests(unittest.TestCase):
    """O contexto manda resumo, não a ficha inteira (que chega a 1 MB)."""

    @classmethod
    def setUpClass(cls):
        carregar_catalogos(Path(__file__).resolve().parent.parent.parent / "data")

    def test_ids_viram_nomes_legiveis(self):
        resumo = resumir_ficha({
            "racaId": "humano",
            "nivel": 7,
            "classes": [{"id": "guerreiro", "nivel": 5}, {"id": "ninja", "nivel": 2}],
        })
        self.assertEqual(resumo["raca"], "Humano")
        self.assertEqual(resumo["classes"], ["Guerreiro 5", "Ninja 2"])
        self.assertEqual(resumo["nivel"], 7)

    def test_vida_sai_do_par_derivados_recursos(self):
        resumo = resumir_ficha({"derivados": {"vida": 52}, "recursos": {"vidaAtual": 12}})
        self.assertEqual((resumo["vida_atual"], resumo["vida_maxima"]), (12, 52))

    def test_status_atual_prevalece_sobre_recursos_legados(self):
        resumo = resumir_ficha({
            "derivados": {"vida": 52},
            "recursos": {"vidaAtual": 12},
            "status": {"vidaAtual": 7},
        })
        self.assertEqual((resumo["vida_atual"], resumo["vida_maxima"]), (7, 52))

    def test_ficha_sem_vida_nao_inventa_numero(self):
        self.assertNotIn("vida_maxima", resumir_ficha({"nivel": 1}))

    def test_ficha_invalida_nao_quebra(self):
        for entrada in (None, [], "texto", 42):
            self.assertEqual(resumir_ficha(entrada), {})

    def test_resumo_nao_carrega_o_resto_da_ficha(self):
        resumo = resumir_ficha({
            "racaId": "humano",
            "inventario": [{"id": f"item-{i}"} for i in range(500)],
            "notas": "x" * 100_000,
        })
        self.assertNotIn("inventario", resumo)
        self.assertNotIn("notas", resumo)

    def test_iniciativa_fixa_soma_bonus_ajustes_e_efeitos_sem_d20(self):
        ficha = {
            "derivados": {"iniciativa": 14},
            "recursos": {
                "bonusIniciativa": 2,
                "ajustesIniciativa": [{"valor": 3}, {"valor": -1}],
            },
            "efeitosAtivos": {"habilidade-ativa": True},
            "poderes": [{
                "id": "poder-sempre",
                "efeitos": [{
                    "tipo": "combate", "alvo": "iniciativa", "valor": 2, "modo": "sempre",
                }],
            }],
            "habilidades": [{
                "id": "habilidade-ativa",
                "efeitos": [{
                    "tipo": "combate", "alvo": "iniciativa", "valor": 1, "modo": "ativavel",
                }],
            }, {
                "id": "habilidade-inativa",
                "efeitos": [{
                    "tipo": "combate", "alvo": "iniciativa", "valor": 99, "modo": "ativavel",
                }],
            }],
        }
        self.assertEqual(iniciativa_fixa(ficha), 21)

    def test_iniciativa_fixa_aplica_cansaco_e_surpreendido(self):
        ficha = {
            "derivados": {"iniciativa": 14},
            "status": {"cansacoAtual": 2},
            "condicoesAtivas": [{"nome": "Surpreendido"}],
        }
        self.assertEqual(iniciativa_fixa(ficha), 8)

    def test_iniciativa_fixa_aceita_efeito_criado_pelo_editor_de_poderes(self):
        ficha = {
            "derivados": {"iniciativa": 14},
            "poderes": [{
                "id": "aura",
                "efeitos": [{
                    "categoria": "combate",
                    "alvo": "iniciativa",
                    "valor": 3,
                    "modo": "bonus",
                }],
            }],
        }
        self.assertEqual(iniciativa_fixa(ficha), 17)

    def test_iniciativa_fixa_aceita_valor_decimal_do_editor(self):
        ficha = {
            "derivados": {"iniciativa": 14},
            "habilidades": [{
                "id": "reflexo-fracionado",
                "efeitos": [{
                    "categoria": "combate",
                    "alvo": "iniciativa",
                    "valor": 1.5,
                    "modo": "bonus",
                }],
            }],
        }
        self.assertEqual(iniciativa_fixa(ficha), 15.5)

    def test_iniciativa_fixa_aceita_valor_livre_e_limita_a_cinco_efeitos(self):
        ficha = {
            "derivados": {"iniciativa": 14},
            "poderes": [{
                "id": "aura",
                "efeitos": [{
                    "categoria": "combate",
                    "alvo": "iniciativa",
                    "valor": 100,
                    "modo": "bonus",
                } for _ in range(6)],
            }],
        }
        self.assertEqual(iniciativa_fixa(ficha), 514)

    def test_sabedoria_desempata_com_modificador(self):
        self.assertEqual(sabedoria_desempate({"atributosFinais": {"sabedoria": 15}}), 2)


class BackupTests(unittest.TestCase):
    """Formato do arquivo e regras de segurança, sem depender de Postgres.

    O SQL em si (row_to_json / json_populate_record) é exercitado em
    tests/test_database_integration.py, que precisa de TEST_DATABASE_URL.
    """

    class BancoFalso:
        """Duplo mínimo: responde às consultas que gerar_backup faz."""

        def __init__(self, tabelas, linhas=None):
            self.tabelas = tabelas
            self.linhas = linhas or {}

        def connection(self):
            banco = self

            class Conexao:
                def __enter__(self_):
                    return self_

                def __exit__(self_, *_):
                    return False

                def execute(self_, consulta, _params=None):
                    texto = str(consulta)
                    if "information_schema.tables" in texto:
                        self_.resultado = [{"table_name": t} for t in banco.tabelas]
                    else:
                        self_.resultado = []
                    return self_

                def fetchall(self_):
                    return self_.resultado

                def cursor(self_):
                    return Cursor()

            class Cursor:
                def __enter__(self_):
                    return self_

                def __exit__(self_, *_):
                    return False

                def execute(self_, consulta, _params=None):
                    # A consulta é um Composed do psycopg; o nome da tabela sai
                    # do repr do Identifier que ela carrega.
                    texto = repr(consulta)
                    nome = next(
                        (t for t in banco.linhas if f"'{t}'" in texto),
                        "",
                    )
                    self_.linhas = banco.linhas.get(nome, [])

                def __iter__(self_):
                    return iter({"linha": item} for item in self_.linhas)

            return Conexao()

    def gerar(self, tabelas, linhas=None):
        conteudo, resumo = gerar_backup(self.BancoFalso(tabelas, linhas))
        with gzip.GzipFile(fileobj=io.BytesIO(conteudo)) as arquivo:
            registros = [json.loads(linha) for linha in arquivo if linha.strip()]
        return registros[0], registros[1:], resumo

    def test_sessoes_e_tokens_nunca_entram_no_arquivo(self):
        cabecalho, _, _ = self.gerar(list(TABELAS) + list(TABELAS_IGNORADAS))
        for proibida in ("sessoes_auth", "limites_acesso", "codigos_vinculo_discord"):
            self.assertNotIn(proibida, cabecalho["tabelas"])
            self.assertIn(proibida, cabecalho["ignoradas"])

    def test_ordem_respeita_as_dependencias(self):
        posicao = {tabela: i for i, tabela in enumerate(TABELAS)}
        # Filho nunca antes do pai, senão a restauração quebra na chave estrangeira.
        for filho, pai in (
            ("campanhas", "usuarios"),
            ("personagens", "campanhas"),
            ("membros_campanha", "personagens"),
            ("liberacoes_informacao", "informacoes_campanha"),
            ("inventario_personagem", "personagens"),
            ("notificacoes", "campanhas"),
            ("sessoes_mesa", "campanhas"),
            ("sessao_participantes", "sessoes_mesa"),
            ("sessao_participantes", "personagens"),
            ("registros_mesa", "sessoes_mesa"),
        ):
            self.assertLess(posicao[pai], posicao[filho], f"{filho} antes de {pai}")

    def test_tabelas_novas_entraram_no_backup(self):
        """Recurso novo com tabela própria precisa entrar aqui, ou some no backup."""
        for tabela in ("sessoes_mesa", "sessao_participantes", "registros_mesa", "notificacoes"):
            self.assertIn(tabela, TABELAS)

    def test_tabela_desconhecida_e_denunciada_no_cabecalho(self):
        cabecalho, _, resumo = self.gerar([*TABELAS, "tabela_nova_do_futuro"])
        self.assertIn("tabela_nova_do_futuro", cabecalho["fora_do_backup"])
        self.assertIn("tabela_nova_do_futuro", resumo["fora_do_backup"])

    def test_dados_sobrevivem_ao_gzip_com_acento(self):
        linhas = {"usuarios": [{"nome": "Ação ✦", "id": "abc"}]}
        _, registros, resumo = self.gerar(["usuarios"], linhas)
        self.assertEqual(registros[0]["d"]["nome"], "Ação ✦")
        self.assertEqual(resumo["tabelas"]["usuarios"], 1)

    def test_cabecalho_recusa_arquivo_de_outra_origem(self):
        with self.assertRaises(ValueError):
            ler_cabecalho(gzip.compress(b'{"formato":"outro"}\n'))
        with self.assertRaises(ValueError):
            ler_cabecalho(gzip.compress(b""))

    def test_cabecalho_recusa_versao_futura(self):
        futuro = json.dumps({"formato": "jardim-backup", "versao": 99}).encode()
        with self.assertRaises(ValueError):
            ler_cabecalho(gzip.compress(futuro + b"\n"))

    def test_nome_do_arquivo_ordena_por_data(self):
        antigo = nome_do_arquivo(datetime(2026, 1, 2, 3, 4, tzinfo=timezone.utc))
        novo = nome_do_arquivo(datetime(2026, 11, 2, 3, 4, tzinfo=timezone.utc))
        self.assertLess(antigo, novo)
        self.assertTrue(novo.endswith(".jsonl.gz"))

    def test_backup_automatico_grava_e_rotaciona_sem_apagar_outros_arquivos(self):
        def gerador(_database):
            return b"backup", {"linhas": 3, "bytes": 6}

        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            unrelated = directory / "anotacoes.txt"
            unrelated.write_text("preservar", encoding="utf-8")
            moments = [
                datetime(2026, 1, day, 3, 0, tzinfo=timezone.utc)
                for day in (1, 2, 3)
            ]
            for moment in moments:
                salvar_backup_automatico(
                    object(), directory, 2, generator=gerador, moment=moment
                )

            backups = sorted(directory.glob("jardim-backup-*.jsonl.gz"))
            self.assertEqual(len(backups), 2)
            self.assertEqual(backups[0].read_bytes(), b"backup")
            self.assertTrue(unrelated.exists())

    def test_backup_automatico_recusa_diretorio_raiz(self):
        root = Path(Path.cwd().anchor)
        with self.assertRaises(ValueError):
            salvar_backup_automatico(
                object(), root, 2, generator=lambda _: (b"x", {})
            )


class CampaignVisibilityTests(unittest.TestCase):
    def test_jogador_recebe_apenas_a_propria_liberacao_individual(self):
        user_id = UUID("11111111-1111-1111-1111-111111111111")
        other_id = "22222222-2222-2222-2222-222222222222"
        visible = visible_campaign_config(
            {
                "lore_oculto": ["segredo"],
                "cronologia_geral_oculta": True,
                "registros_universais_ocultos": True,
                "racas_liberadas_membros": {
                    str(user_id): ["raca-propria"],
                    other_id: ["raca-alheia"],
                },
                "nota_privada": "não pode sair",
            },
            role="jogador",
            user_id=user_id,
        )
        self.assertEqual(visible["lore_oculto"], ["segredo"])
        self.assertTrue(visible["cronologia_geral_oculta"])
        self.assertTrue(visible["registros_universais_ocultos"])
        self.assertEqual(visible["racas_liberadas_membros"], {str(user_id): ["raca-propria"]})
        self.assertNotIn("nota_privada", visible)

    def test_mestre_recebe_configuracao_completa(self):
        config = {"nota_privada": "texto", "lore_oculto": ["segredo"]}
        self.assertEqual(
            visible_campaign_config(config, role="mestre", user_id=UUID(int=1)),
            config,
        )


class SessaoAoVivoTests(unittest.TestCase):
    """Regras que decidem o que o jogador enxerga durante a sessão."""

    def test_estado_da_vida_em_palavras(self):
        # Fronteiras das faixas, em porcentagem da vida máxima.
        self.assertEqual(_estado_da_vida(50, 50), "Ileso")          # 100%
        self.assertEqual(_estado_da_vida(40, 50), "Arranhado")      # 80%
        self.assertEqual(_estado_da_vida(38, 50), "Arranhado")      # 76%
        self.assertEqual(_estado_da_vida(37, 50), "Ferido")         # 74%
        self.assertEqual(_estado_da_vida(25, 50), "Ferido")         # 50%
        self.assertEqual(_estado_da_vida(24, 50), "Muito ferido")   # 48%
        self.assertEqual(_estado_da_vida(13, 50), "Muito ferido")   # 26%
        self.assertEqual(_estado_da_vida(12, 50), "Quase morto")    # 24%
        self.assertEqual(_estado_da_vida(1, 50), "Quase morto")     # 2%

    def test_preparacao_de_jogador_nao_vaza_estado(self):
        estado = _estado_bloqueado("jogador")
        self.assertTrue(estado["bloqueada"])
        self.assertIsNone(estado["sessao"])
        self.assertEqual(estado["participantes"], [])
        self.assertFalse(estado["comando"])

    def test_vida_zerada_ou_negativa_sai_de_combate(self):
        self.assertEqual(_estado_da_vida(0, 30), "Fora de combate")
        self.assertEqual(_estado_da_vida(-8, 30), "Fora de combate")

    def test_sem_vida_maxima_nao_inventa_estado(self):
        self.assertEqual(_estado_da_vida(0, 0), "Sem ferimentos registrados")

    def test_acoes_de_turno_sao_fechadas(self):
        for acao in ("iniciar", "proximo", "anterior", "ordenar", "encerrar"):
            self.assertEqual(SessionTurnInput(acao=acao).acao, acao)
        with self.assertRaises(ValidationError):
            SessionTurnInput(acao="apagar-tudo")

    def test_sessao_nova_nao_inclui_todos_os_personagens_por_padrao(self):
        entrada = SessionOpenInput(campanha_id=UUID(int=1))
        self.assertFalse(entrada.incluir_personagens)

    def test_selecao_de_personagens_aceita_vazia_e_remove_duplicados(self):
        primeiro, segundo = UUID(int=1), UUID(int=2)
        self.assertEqual(SessionCharactersInput().personagem_ids, [])
        self.assertEqual(
            SessionCharactersInput(personagem_ids=[primeiro, segundo, primeiro]).personagem_ids,
            [primeiro, segundo],
        )

    def test_condicoes_repetidas_e_vazias_somem(self):
        entrada = ParticipantUpdateInput(condicoes=["Caído", " Caído ", "", "  ", "Cego"])
        self.assertEqual(
            entrada.condicoes,
            [{"nome": "Caído", "turnos": None}, {"nome": "Cego", "turnos": None}],
        )

    def test_condicao_com_duracao_em_turnos(self):
        entrada = ParticipantUpdateInput(condicoes=[{"nome": "Atordoado", "turnos": 2}, "Cego"])
        self.assertEqual(
            entrada.condicoes,
            [{"nome": "Atordoado", "turnos": 2}, {"nome": "Cego", "turnos": None}],
        )

    def test_atualizacao_exige_alguma_mudanca(self):
        with self.assertRaises(ValidationError):
            ParticipantUpdateInput()

    def test_participante_nasce_visivel_mas_com_vida_escondida(self):
        # O padrão protege o mestre: o número do monstro só aparece se ele
        # quiser. "parcial" é nome e estado visíveis, sem o número exato.
        novo = ParticipantCreateInput(nome="Ogro")
        self.assertEqual(novo.visibilidade, "parcial")
        self.assertEqual(novo.tipo, "inimigo")

    def test_visibilidade_recusa_nivel_fora_dos_quatro(self):
        with self.assertRaises(ValidationError):
            ParticipantCreateInput(nome="Ogro", visibilidade="invisivel-de-verdade")

    def test_defesa_e_opcional_e_segue_a_mesma_faixa_da_iniciativa(self):
        # Sem ficha vinculada (NPC, monstro), a Defesa é o que o mestre digita.
        self.assertIsNone(ParticipantCreateInput(nome="Ogro").defesa)
        self.assertEqual(ParticipantCreateInput(nome="Ogro", defesa=15).defesa, 15)
        with self.assertRaises(ValidationError):
            ParticipantCreateInput(nome="Ogro", defesa=-1)

    def test_pericias_nasce_vazia_e_nao_duplica(self):
        vazia = ParticipantCreateInput(nome="Ogro")
        self.assertEqual(vazia.pericias, [])
        com_pericias = ParticipantCreateInput(
            nome="Ogro",
            pericias=["Luta +12", "  Luta +12  ", "Fortitude +10", ""],
        )
        self.assertEqual(com_pericias.pericias, ["Luta +12", "Fortitude +10"])

    def test_ataques_nasce_vazio_e_aceita_nome_mais_detalhe(self):
        vazio = ParticipantCreateInput(nome="Ogro")
        self.assertEqual(vazio.ataques, [])
        com_ataques = ParticipantCreateInput(
            nome="Ogro",
            ataques=[{"nome": "Garra", "detalhe": "+7, 2d8+4 cortante"}, {"nome": "Mordida"}],
        )
        self.assertEqual(
            com_ataques.ataques,
            [{"nome": "Garra", "detalhe": "+7, 2d8+4 cortante"}, {"nome": "Mordida", "detalhe": ""}],
        )

    def test_ataques_descarta_entradas_sem_nome_e_nao_duplica(self):
        entrada = ParticipantUpdateInput(ataques=[
            {"nome": "Garra", "detalhe": "1d6"},
            {"nome": "  ", "detalhe": "ignorado"},
            {"nome": "garra", "detalhe": "repetido, ignora"},
        ])
        self.assertEqual(entrada.ataques, [{"nome": "Garra", "detalhe": "1d6"}])

    def test_mana_e_opcional_igual_a_defesa(self):
        novo = ParticipantCreateInput(nome="Ogro", mana_maxima=40)
        self.assertEqual(novo.mana_maxima, 40)
        with self.assertRaises(ValidationError):
            ParticipantCreateInput(nome="Ogro", mana_maxima=-1)

    def test_vd_aceita_um_a_dez_e_recusa_fora_da_faixa(self):
        self.assertIsNone(ParticipantCreateInput(nome="Ogro").vd)
        self.assertEqual(ParticipantCreateInput(nome="Ogro", vd=7).vd, 7)
        with self.assertRaises(ValidationError):
            ParticipantCreateInput(nome="Ogro", vd=0)
        with self.assertRaises(ValidationError):
            ParticipantCreateInput(nome="Ogro", vd=11)

    def test_xp_por_vd_cresce_com_a_dificuldade_e_ignora_vd_vazio(self):
        self.assertEqual(xp_por_vd(None), 0)
        self.assertEqual(xp_por_vd(1), 200)
        self.assertEqual(xp_por_vd(10), 11000)
        # A tabela só cobre 1-10; fora da faixa, satura nas pontas em vez de
        # estourar (defensivo contra dado sujo vindo do catálogo).
        self.assertEqual(xp_por_vd(0), xp_por_vd(1))
        self.assertEqual(xp_por_vd(99), xp_por_vd(10))
        anterior = 0
        for vd in range(1, 11):
            atual = xp_por_vd(vd)
            self.assertGreater(atual, anterior)
            anterior = atual

    def test_distribuir_xp_exige_ao_menos_um_participante(self):
        with self.assertRaises(ValidationError):
            DistributeXpInput(participante_ids=[])

    def test_inteiro_do_catalogo_aceita_texto_ou_numero(self):
        # Entradas antigas do catálogo guardam pv/defesa como texto ("120");
        # as novas já usam número — o Bestiário precisa aceitar os dois.
        self.assertEqual(_inteiro_do_catalogo("120"), 120)
        self.assertEqual(_inteiro_do_catalogo(95), 95)
        self.assertIsNone(_inteiro_do_catalogo(None))
        self.assertIsNone(_inteiro_do_catalogo("sem numero"))

    def test_reordenar_exige_ao_menos_um_participante(self):
        with self.assertRaises(ValidationError):
            ParticipantReorderInput(ordem=[])

    def test_reordenar_aceita_a_lista_de_ids_na_nova_ordem(self):
        primeiro, segundo = UUID(int=1), UUID(int=2)
        entrada = ParticipantReorderInput(ordem=[segundo, primeiro])
        self.assertEqual(entrada.ordem, [segundo, primeiro])


class DadosTests(unittest.TestCase):
    """Motor de rolagem — o log só vale se o dado for justo e do servidor."""

    def test_d20_cobre_todas_as_faces_sem_viciar(self):
        contagem = collections.Counter(rolar_teste(0)["natural"] for _ in range(12_000))
        self.assertEqual(sorted(contagem), list(range(1, 21)))
        # Esperado 600 por face; margem larga só para pegar um gerador quebrado.
        self.assertGreater(min(contagem.values()), 400)
        self.assertLess(max(contagem.values()), 800)

    def test_vantagem_rola_dois_e_pega_o_maior(self):
        for _ in range(200):
            resultado = rolar_teste(0, vantagens=1)
            self.assertEqual(len(resultado["dados"]), 2)
            self.assertEqual(resultado["natural"], max(resultado["dados"]))

    def test_desvantagem_pega_o_menor(self):
        for _ in range(200):
            resultado = rolar_teste(0, desvantagens=1)
            self.assertEqual(resultado["natural"], min(resultado["dados"]))

    def test_fontes_opostas_se_anulam_sem_terceiro_dado(self):
        resultado = rolar_teste(0, vantagens=3, desvantagens=3)
        self.assertEqual(len(resultado["dados"]), 1)
        self.assertEqual(resultado["modo"], "normal")

    def test_bonus_entra_no_total(self):
        resultado = rolar_teste(7)
        self.assertEqual(resultado["total"], resultado["natural"] + 7)

    def test_classificacao_contra_a_dt(self):
        self.assertEqual(_classificar(25, 10, 15), "sucesso")
        self.assertEqual(_classificar(15, 10, 15), "sucesso")
        self.assertEqual(_classificar(14, 10, 15), "falha")
        self.assertEqual(_classificar(5, 10, 15), "falha")

    def test_somente_natural_20_e_1_geram_criticos(self):
        self.assertEqual(_classificar(14, 20, 15), "sucesso critico")
        self.assertEqual(_classificar(16, 1, 15), "falha critica")
        # A distância até a DT não muda o resultado crítico.
        self.assertEqual(_classificar(30, 20, 15), "sucesso critico")
        self.assertEqual(_classificar(1, 1, 15), "falha critica")

    def test_formula_de_dano(self):
        resultado = rolar_formula("2d6+3")
        self.assertEqual(len(resultado["dados"]), 2)
        self.assertEqual(resultado["total"], sum(resultado["dados"]) + 3)
        self.assertTrue(5 <= resultado["total"] <= 15)

    def test_formula_aceita_variacoes(self):
        self.assertEqual(len(rolar_formula("d8")["dados"]), 1)
        self.assertLessEqual(rolar_formula("1d4-1")["total"], 3)
        self.assertEqual(len(rolar_formula(" 3D10 ")["dados"]), 3)

    def test_varios_termos_na_mesma_expressao(self):
        resultado = rolar_formula("1d20+1d4-2")
        self.assertEqual(len(resultado["dados"]), 2)
        self.assertEqual(resultado["bonus"], -2)
        self.assertEqual(resultado["total"], sum(resultado["dados"]) - 2)

    def test_repeticao_do_rollem_gera_rolagens_separadas(self):
        # 2#d20 são DUAS rolagens independentes, não 2d20 somado.
        resultado = rolar_formula("2#d20")
        self.assertEqual(resultado["repeticoes"], 2)
        self.assertEqual(len(resultado["rolagens"]), 2)
        for rolagem in resultado["rolagens"]:
            self.assertEqual(len(rolagem["dados"]), 1)
            self.assertTrue(1 <= rolagem["total"] <= 20)
        self.assertEqual(resultado["formula"], "2#d20")

    def test_repeticao_aplica_a_expressao_inteira(self):
        resultado = rolar_formula("3#2d6+3")
        self.assertEqual(len(resultado["rolagens"]), 3)
        for rolagem in resultado["rolagens"]:
            self.assertEqual(len(rolagem["dados"]), 2)
            self.assertEqual(rolagem["total"], sum(rolagem["dados"]) + 3)

    def test_uma_repeticao_se_comporta_como_expressao_simples(self):
        resultado = rolar_formula("1#d20")
        self.assertEqual(resultado["repeticoes"], 1)
        self.assertNotIn("rolagens", resultado)

    def test_formula_invalida_e_recusada(self):
        for entrada in ("", "abacaxi", "999d6", "2d99999", "0d6", "d6; DROP TABLE",
                        "#d20", "2#", "0#d20", "99#d20", "2#3#d6", "d20#2"):
            with self.assertRaises(ValueError, msg=entrada):
                rolar_formula(entrada)

    def test_rolagem_pede_titulo(self):
        with self.assertRaises(ValidationError):
            RollInput(campanha_id=UUID(int=1), titulo="")

    def test_uso_so_aceita_tipos_conhecidos(self):
        with self.assertRaises(ValidationError):
            UsageInput(campanha_id=UUID(int=1), tipo="inventado", titulo="X")


class PedidoDeSenhaTests(unittest.TestCase):
    """Pedido público de senha: só o e-mail, e sem revelar quem tem conta."""

    def test_aceita_email_valido(self):
        # O Pydantic normaliza só o domínio; a rota faz `.lower()` no todo antes
        # de procurar a conta, então "Pedro@X.com" acha "pedro@x.com".
        self.assertEqual(PasswordHelpInput(email="Pedro@Example.com").email, "Pedro@example.com")

    def test_recusa_email_invalido(self):
        for entrada in ("", "sem-arroba", "a@", "@b.com"):
            with self.assertRaises(ValidationError, msg=entrada):
                PasswordHelpInput(email=entrada)

    def test_pedido_nao_carrega_mais_nada(self):
        # Nada além do e-mail é confiável numa rota sem autenticação.
        self.assertEqual(set(PasswordHelpInput.model_fields), {"email"})


class FrontendRouteTests(unittest.TestCase):
    """O FastAPI entrega o bundle Vite sem capturar rotas ou erros da API."""

    @classmethod
    def setUpClass(cls):
        from main import _FRONTEND_INDEX, _FRONTEND_ROOT, app

        cls.frontend_index = _FRONTEND_INDEX
        cls.frontend_root = _FRONTEND_ROOT
        cls.client = TestClient(app, raise_server_exceptions=False)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def test_localiza_dist_no_repositorio_e_no_pacote(self):
        from main import _localizar_frontend_dist

        with tempfile.TemporaryDirectory() as temp:
            raiz = Path(temp)
            app_root = raiz / "plataforma"
            app_root.mkdir()

            dist_repositorio = raiz / "dist"
            dist_repositorio.mkdir()
            (dist_repositorio / "index.html").write_text("repo", encoding="utf-8")
            self.assertEqual(_localizar_frontend_dist(app_root), dist_repositorio.resolve())

            dist_pacote = app_root / "dist"
            dist_pacote.mkdir()
            (dist_pacote / "index.html").write_text("pacote", encoding="utf-8")
            self.assertEqual(_localizar_frontend_dist(app_root), dist_pacote.resolve())

    def test_raiz_e_rotas_react_devolvem_o_mesmo_index(self):
        esperado = self.frontend_index.read_bytes()
        rotas = (
            "/",
            "/login",
            "/campanhas",
            "/admin",
            "/ficha/00000000-0000-0000-0000-000000000001",
            "/regras/classes/guerreiro?origem=link-direto",
        )

        for rota in rotas:
            resposta = self.client.get(rota, headers={"Accept": "text/html"})
            self.assertEqual(resposta.status_code, 200, rota)
            self.assertIn("text/html", resposta.headers["content-type"], rota)
            self.assertEqual(resposta.content, esperado, rota)

        self.assertIn(b"/assets/", esperado)
        self.assertNotIn(b"/src/main.tsx", esperado)

    def test_asset_compilado_e_servido_sem_fallback_html(self):
        asset = next((self.frontend_root / "assets").glob("*.js"))
        caminho = "/" + asset.relative_to(self.frontend_root).as_posix()

        resposta = self.client.get(caminho)

        self.assertEqual(resposta.status_code, 200)
        self.assertIn("javascript", resposta.headers["content-type"])
        self.assertNotEqual(resposta.content, self.frontend_index.read_bytes())

    def test_arquivo_ausente_nao_devolve_index(self):
        for caminho in ("/assets/inexistente.js", "/models/inexistente.glb", "/sw.js"):
            resposta = self.client.get(caminho, headers={"Accept": "text/html"})
            self.assertEqual(resposta.status_code, 404, caminho)
            self.assertNotIn("text/html", resposta.headers.get("content-type", ""), caminho)

    def test_api_inexistente_continua_json_mesmo_aceitando_html(self):
        for metodo in (self.client.get, self.client.post):
            resposta = metodo(
                "/api/v1/inexistente",
                headers={"Accept": "text/html"},
            )

            self.assertEqual(resposta.status_code, 404)
            self.assertIn("application/json", resposta.headers["content-type"])

    def test_openapi_e_catalogos_publicos_nao_caem_no_fallback(self):
        openapi = self.client.get(
            "/api/openapi.json",
            headers={"Accept": "text/html"},
        )
        catalogo = self.client.get(
            "/data/ficha/classes.json",
            headers={"Accept": "text/html"},
        )
        catalogo_ausente = self.client.get(
            "/data/ficha/inexistente.json",
            headers={"Accept": "text/html"},
        )

        self.assertEqual(openapi.status_code, 200)
        self.assertIn("application/json", openapi.headers["content-type"])
        self.assertEqual(catalogo.status_code, 200)
        self.assertIn("application/json", catalogo.headers["content-type"])
        self.assertEqual(catalogo_ausente.status_code, 404)
        self.assertNotIn(
            "text/html", catalogo_ausente.headers.get("content-type", "")
        )

    def test_fontes_e_templates_antigos_nao_sao_expostos(self):
        for caminho in ("/src/main.tsx", "/templates/ficha.html"):
            resposta = self.client.get(caminho, headers={"Accept": "text/html"})
            self.assertEqual(resposta.status_code, 404, caminho)
            self.assertNotIn("text/html", resposta.headers.get("content-type", ""))

    def test_frontend_ausente_responde_503_sem_gerar_erro_interno(self):
        import main

        with tempfile.TemporaryDirectory() as temp:
            index_ausente = Path(temp) / "dist" / "index.html"
            with mock.patch.object(main, "_FRONTEND_INDEX", index_ausente):
                resposta = main._frontend_index_response()

        self.assertEqual(resposta.status_code, 503)
        self.assertEqual(resposta.headers["cache-control"], "no-store")

    def test_fallback_exige_navegacao_html(self):
        resposta = self.client.get("/login", headers={"Accept": "application/json"})

        self.assertEqual(resposta.status_code, 404)
        self.assertIn("application/json", resposta.headers["content-type"])

    def test_fallback_preserva_method_not_allowed_da_api(self):
        resposta = self.client.get(
            "/api/v1/auth/entrar",
            headers={"Accept": "text/html"},
        )

        self.assertEqual(resposta.status_code, 405)
        self.assertIn("application/json", resposta.headers["content-type"])

    def test_fallback_preserva_redirect_de_barra_da_api(self):
        resposta = self.client.get(
            "/api/v1/contexto/",
            headers={"Accept": "text/html"},
            follow_redirects=False,
        )

        self.assertEqual(resposta.status_code, 307)
        self.assertTrue(resposta.headers["location"].endswith("/api/v1/contexto"))

    def test_registered_paths_cover_index_and_modules(self):
        from main import app

        caminhos = {rota.path for rota in app.routes if hasattr(rota, "path")}
        self.assertIn("/", caminhos)
        self.assertIn("/index.html", caminhos)
        self.assertNotIn("/{full_path:path}", caminhos)
        self.assertIn(404, app.exception_handlers)


class LimiteDeTentativasTests(unittest.TestCase):
    """Cadastro e pedido de senha eram rotas públicas sem freio nenhum."""

    class ConexaoFalsa:
        """Banco de mentira que guarda uma linha por chave."""

        def __init__(self):
            self.linhas: dict[str, dict] = {}
            self.apagadas: list[str] = []

        def execute(self, sql, params=None):
            sql_limpo = " ".join(sql.split())
            self.ultimo = (sql_limpo, params)
            if sql_limpo.startswith("SELECT"):
                self.resultado = self.linhas.get(params[0])
            elif sql_limpo.startswith("DELETE"):
                self.apagadas.append(params[0])
                self.linhas.pop(params[0], None)
                self.resultado = None
            else:  # INSERT ... ON CONFLICT
                chave, tentativas, janela, bloqueado = params
                self.linhas[chave] = {
                    "tentativas": tentativas,
                    "janela_iniciada_em": janela,
                    "bloqueado_ate": bloqueado,
                }
                self.resultado = None
            return self

        def fetchone(self):
            return self.resultado

    def test_acoes_diferentes_nao_compartilham_contagem(self):
        origem = "mesmo-ip"
        self.assertNotEqual(
            limites.chave(limites.LOGIN, origem),
            limites.chave(limites.CADASTRO, origem),
        )

    def test_bloqueia_ao_atingir_o_teto(self):
        conexao = self.ConexaoFalsa()
        chave = limites.chave(limites.CADASTRO, "um-ip")
        for _ in range(limites.CADASTRO.tentativas):
            limites.conferir(conexao, limites.CADASTRO, chave)
            limites.registrar(conexao, limites.CADASTRO, chave)
        with self.assertRaises(HTTPException) as capturado:
            limites.conferir(conexao, limites.CADASTRO, chave)
        self.assertEqual(capturado.exception.status_code, 429)
        self.assertIn("Retry-After", capturado.exception.headers)

    def test_uma_tentativa_a_menos_ainda_passa(self):
        conexao = self.ConexaoFalsa()
        chave = limites.chave(limites.CADASTRO, "outro-ip")
        for _ in range(limites.CADASTRO.tentativas - 1):
            limites.registrar(conexao, limites.CADASTRO, chave)
        limites.conferir(conexao, limites.CADASTRO, chave)  # não levanta

    def test_janela_vencida_e_esquecida(self):
        conexao = self.ConexaoFalsa()
        chave = limites.chave(limites.LOGIN, "ip-antigo")
        conexao.linhas[chave] = {
            "tentativas": 99,
            "janela_iniciada_em": datetime.now(timezone.utc)
            - timedelta(minutes=limites.LOGIN.janela_minutos + 1),
            "bloqueado_ate": None,
        }
        limites.conferir(conexao, limites.LOGIN, chave)
        self.assertIn(chave, conexao.apagadas)

    def test_sucesso_zera_a_contagem(self):
        conexao = self.ConexaoFalsa()
        chave = limites.chave(limites.LOGIN, "ip")
        limites.registrar(conexao, limites.LOGIN, chave)
        limites.limpar(conexao, chave)
        self.assertNotIn(chave, conexao.linhas)

    def test_tentativa_e_contada_fora_da_transacao_do_trabalho(self):
        """O registro não pode ser desfeito pelo rollback da rota que recusou.

        A conexão do pool faz rollback quando a rota levanta exceção. Se a
        contagem morasse na mesma transação, toda tentativa recusada — as que
        mais importam — seria esquecida, e o limite nunca chegaria ao teto.
        """
        conexao = self.ConexaoFalsa()

        class BancoFalso:
            @contextlib.contextmanager
            def connection(self):
                yield conexao

        chave = limites.chave(limites.CADASTRO, "ip")
        limites.cobrar(BancoFalso(), limites.CADASTRO, chave)
        self.assertEqual(conexao.linhas[chave]["tentativas"], 1)


class ModoDeCadastroTests(unittest.TestCase):
    """Sem confirmação de e-mail, cadastro livre num site público vira spam."""

    def load(self, **env):
        base = {"DATABASE_URL": "postgresql://x/y", "CADASTRO": "", "APP_ENV": ""}
        with mock.patch.dict(os.environ, {**base, **env}, clear=False):
            return load_settings()

    def test_producao_exige_convite_por_padrao(self):
        settings = self.load(APP_ENV="production")
        self.assertEqual(settings.cadastro, "convite")
        self.assertTrue(settings.cadastro_exige_convite)

    def test_desenvolvimento_fica_aberto(self):
        self.assertEqual(self.load(APP_ENV="development").cadastro, "aberto")

    def test_modo_invalido_e_recusado_no_boot(self):
        settings = self.load(CADASTRO="mais_ou_menos")
        with self.assertRaises(RuntimeError):
            settings.validate()

    def test_fechado_reconhecido(self):
        self.assertTrue(self.load(CADASTRO="fechado").cadastro_fechado)

    def test_convite_cabe_no_cadastro(self):
        entrada = RegisterInput(
            email="a@b.com", nome_exibicao="Conta",
            senha="uma-senha-bem-longa", convite="ABC-123",
        )
        self.assertEqual(entrada.convite, "ABC-123")

    def test_convite_e_opcional_quando_a_mesa_esta_aberta(self):
        entrada = RegisterInput(
            email="a@b.com", nome_exibicao="Conta", senha="uma-senha-bem-longa",
        )
        self.assertIsNone(entrada.convite)


if __name__ == "__main__":
    unittest.main()
