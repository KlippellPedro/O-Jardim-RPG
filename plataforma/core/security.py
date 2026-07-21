from __future__ import annotations

import hashlib
import secrets
import string

from pwdlib import PasswordHash


_password_hash = PasswordHash.recommended()
_HUMAN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


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
    caracteres que se confundem (0/O, 1/I). O tamanho respeita o mínimo de 12
    exigido no cadastro.
    """
    blocos = ["".join(secrets.choice(_HUMAN_ALPHABET) for _ in range(4)) for _ in range(4)]
    return "-".join(blocos)


def normalize_human_code(code: str) -> str:
    return "".join(char for char in code.upper() if char in string.ascii_uppercase + string.digits)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def constant_time_equal(left: str, right: str) -> bool:
    return secrets.compare_digest(left.encode("utf-8"), right.encode("utf-8"))
