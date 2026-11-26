from typing import Any


class ApiError(Exception):
    """공통 오류 응답으로 변환되는 애플리케이션 오류."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        field_errors: list[dict[str, str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.field_errors = field_errors or []


def error_body(
    code: str,
    message: str,
    request_id: str,
    field_errors: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    error: dict[str, Any] = {"code": code, "message": message, "traceId": request_id}
    if field_errors:
        error["fieldErrors"] = field_errors
    return {"error": error}
