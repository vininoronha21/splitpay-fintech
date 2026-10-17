from datetime import date, datetime, timedelta, timezone

# Business Rule 18: Brasília time is a fixed UTC-3 offset (no daylight saving
# time since 2019), the same as SQL's datetime('now', '-3 hours').
BRASILIA = timezone(timedelta(hours=-3), "BRT")


def brasilia_today() -> date:
    """Today's date in Brasília, whatever the server's own timezone is."""
    return datetime.now(BRASILIA).date()


class DomainError(Exception):
    """A business-rule violation, turned into the standard error shape by main.py.

    Services raise it instead of an HTTP exception, so they stay free of FastAPI.
    `message` is pt-BR because it reaches the user as is.
    """

    def __init__(self, code: str, message: str, status_code: int = 422) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
