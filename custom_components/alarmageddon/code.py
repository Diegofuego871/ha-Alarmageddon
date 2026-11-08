"""Alarmcode: nur als Hash speichern, nie im Klartext."""

from __future__ import annotations

import hashlib
import hmac
import secrets

from .const import CODE_HASH_ITERATIONS


def hash_code(code: str, salt: str | None = None) -> tuple[str, str]:
    """
    Gibt (hash, salt) zurück. PBKDF2 statt einfachem SHA-256, weil ein
    vier- bis achtstelliger Code sonst aus einer Sicherung in Sekunden
    durchprobiert wäre. Rechnet einige Millisekunden: im Executor aufrufen.
    """
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", code.encode(), bytes.fromhex(salt), CODE_HASH_ITERATIONS)
    return digest.hex(), salt


def match_code(code: str, candidates: list[tuple[str, str]]) -> int | None:
    """
    Index des passenden Codes oder None. Prüft immer alle, damit die
    Antwortzeit nicht verrät, der wievielte Code passt.
    """
    found = None
    for index, (code_hash, salt) in enumerate(candidates):
        if verify_code(code, code_hash, salt) and found is None:
            found = index
    return found


def verify_code(code: str, code_hash: str, salt: str) -> bool:
    """Vergleich in konstanter Zeit, damit die Antwortzeit nichts über den Code verrät."""
    digest, _ = hash_code(code, salt)
    return hmac.compare_digest(digest, code_hash)
