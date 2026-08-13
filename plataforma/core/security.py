from __future__ import annotations

import hashlib
import secrets
import string

from pwdlib import PasswordHash


_password_hash = PasswordHash.recommended()
_HUMAN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


# Hash "de mentira" usado quando não há usuário/hash real para comparar (ex.:
# email não cadastrado). Rodar verify_password contra ele mantém o custo de
# CPU igual ao de uma tentativa com conta existente, evitando um oráculo de
# timing que revelaria se o email está cadastrado. Calculado uma vez no
# import — o valor em si nunca é usado como senha válida de ninguém.
DUMMY_PASSWORD_HASH = _password_hash.hash("timing-attack-mitigation-placeholder")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hash.verify(password, password_hash)
    except Exception:
        return False


def new_secret_token(size: int = 32) -> str:
    return secrets.token_urlsafe(size)


def new_human_code(length: int = 8) -> str:
    return "".join(secrets.choice(_HUMAN_ALPHABET) for _ in range(length))


def new_temporary_password() -> str:
    """Senha provisória ditável por voz: blocos do alfabeto sem letra ambígua.

    O admin precisa passar isso por Discord ou pessoalmente, então nada de
    caracteres que se confundem (0/O, 1/I). Mesmo com o mínimo de cadastro em
    8 caracteres, a senha provisória continua maior por ser gerada pelo sistema.
    """
    blocos = ["".join(secrets.choice(_HUMAN_ALPHABET) for _ in range(4)) for _ in range(4)]
    return "-".join(blocos)


def normalize_human_code(code: str) -> str:
    return "".join(char for char in code.upper() if char in string.ascii_uppercase + string.digits)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def constant_time_equal(left: str, right: str) -> bool:
    return secrets.compare_digest(left.encode("utf-8"), right.encode("utf-8"))
