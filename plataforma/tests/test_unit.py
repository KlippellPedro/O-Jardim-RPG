from __future__ import annotations

import collections
import gzip
import io
import json
import os
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock
from uuid import UUID

from pydantic import ValidationError

from core.backup import (
    TABELAS,
    TABELAS_IGNORADAS,
    gerar_backup,
    ler_cabecalho,
    nome_do_arquivo,
)
from core.character_summary import carregar_catalogos, resumir_ficha
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
from routers.characters import _sheet_without_central_fields
from routers.sessions import _estado_da_vida
from core.dependencies import AuthenticatedUser
from schemas import (
    AdminUserUpdateInput,
    CampaignUpdateInput,
    CharacterCreateInput,
    EconomyReplaceInput,
    NotificationReadInput,
    ParticipantCreateInput,
    ParticipantUpdateInput,
    PasswordChangeInput,
    PasswordHelpInput,
    RegisterInput,
    RollInput,
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


class SchemaTests(unittest.TestCase):
    def test_short_password_is_rejected(self):
        with self.assertRaises(ValidationError):
            RegisterInput(
                email="player@example.com",
                nome_exibicao="Player",
                senha="curta",
            )

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
            PasswordChangeInput(senha_atual="provisoria", nova_senha="curta")

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
        for proibida in ("sessoes_auth", "limites_login", "codigos_vinculo_discord"):
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

    def test_condicoes_repetidas_e_vazias_somem(self):
        entrada = ParticipantUpdateInput(condicoes=["Caído", " Caído ", "", "  ", "Cego"])
        self.assertEqual(entrada.condicoes, ["Caído", "Cego"])

    def test_atualizacao_exige_alguma_mudanca(self):
        with self.assertRaises(ValidationError):
            ParticipantUpdateInput()

    def test_participante_nasce_com_vida_escondida(self):
        # O padrão protege o mestre: o número do monstro só aparece se ele quiser.
        novo = ParticipantCreateInput(nome="Ogro")
        self.assertFalse(novo.vida_visivel)
        self.assertTrue(novo.visivel)
        self.assertEqual(novo.tipo, "inimigo")


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
        self.assertEqual(_classificar(25, 10, 15), "sucesso critico")
        self.assertEqual(_classificar(15, 10, 15), "sucesso")
        self.assertEqual(_classificar(14, 10, 15), "falha")
        self.assertEqual(_classificar(5, 10, 15), "falha critica")

    def test_natural_20_e_1_movem_um_grau(self):
        self.assertEqual(_classificar(14, 20, 15), "sucesso")
        self.assertEqual(_classificar(16, 1, 15), "falha")
        # Sem passar do topo nem do fundo da escala.
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
    """As rotas de página são o que evita o 404 no "voltar pro Jardim"."""

    def test_every_module_has_a_clean_address(self):
        from main import _PAGES

        for atalho in ("ficha", "mundo", "regras", "loja"):
            self.assertIn(atalho, _PAGES)
            self.assertTrue(_PAGES[atalho].endswith(".html"))

    def test_registered_paths_cover_index_and_modules(self):
        from main import app

        caminhos = {rota.path for rota in app.routes if hasattr(rota, "path")}
        self.assertIn("/", caminhos)
        self.assertIn("/index.html", caminhos)
        self.assertIn("/{pagina}", caminhos)


if __name__ == "__main__":
    unittest.main()
