import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from secrets import token_hex
from typing import Any, cast

from origin_ms.domain.errors import DomainError


def hash_password(password: str, *, salt: str | None = None) -> str:
    salt_value = salt or token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt_value.encode(), 120_000)
    return f"pbkdf2_sha256${salt_value}${base64.urlsafe_b64encode(digest).decode()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, salt, _expected = password_hash.split("$", 2)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    return hmac.compare_digest(hash_password(password, salt=salt), password_hash)


def create_token(*, subject: str, secret: str, expires_delta: timedelta) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    signing_input = f"{_b64_json(header)}.{_b64_json(payload)}"
    signature = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{_b64_bytes(signature)}"


def decode_token(token: str, *, secret: str) -> str:
    try:
        header_segment, payload_segment, signature_segment = token.split(".")
        signing_input = f"{header_segment}.{payload_segment}"
        expected = _b64_bytes(
            hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(expected, signature_segment):
            raise ValueError("signature mismatch")
        decoded_payload: object = json.loads(_b64_decode(payload_segment))
        if not isinstance(decoded_payload, dict):
            raise ValueError("payload is not an object")
        payload = cast(dict[str, object], decoded_payload)
        exp = payload.get("exp")
        sub = payload.get("sub")
        if not isinstance(exp, int) or not isinstance(sub, str):
            raise ValueError("payload missing claims")
        if datetime.now(UTC).timestamp() >= exp:
            raise ValueError("token expired")
        return sub
    except (ValueError, json.JSONDecodeError) as exc:
        raise DomainError(
            detail="Invalid or expired token.", status_code=401, title="Unauthorized"
        ) from exc


def _b64_json(value: dict[str, Any]) -> str:
    return _b64_bytes(json.dumps(value, separators=(",", ":")).encode())


def _b64_bytes(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def _b64_decode(value: str) -> str:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}").decode()
