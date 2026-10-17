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
