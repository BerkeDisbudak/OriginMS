from datetime import UTC, datetime
from secrets import token_hex


def new_id(prefix: str) -> str:
    stamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S%f")
    return f"{prefix}_{stamp}{token_hex(4)}"
