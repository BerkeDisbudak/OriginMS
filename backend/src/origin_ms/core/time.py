from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

ISTANBUL = ZoneInfo("Europe/Istanbul")


def utc_now() -> datetime:
    return datetime.now(UTC)


def today_istanbul() -> date:
    return datetime.now(ISTANBUL).date()
