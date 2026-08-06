import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHttpException

from backend.app.api.router import create_api_router
from backend.app.core.config import settings
from backend.app.core.errors import ApiError, error_body
from backend.app.core.middleware import RequestContextMiddleware
from backend.app.repositories.memory import InMemoryGsemRepository
from backend.app.services.gsem_service import GsemService


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


def _validation_fields(error: RequestValidationError) -> list[dict[str, str]]:
    fields: list[dict[str, str]] = []
    for detail in error.errors():
        location = detail.get("loc", ())
        field = str(location[-1]) if location else "request"
        error_type = str(detail.get("type", ""))
        if error_type == "string_too_long":
            reason = "100자 이하여야 합니다."
        elif error_type in {"greater_than_equal", "int_parsing"}:
            reason = "1 이상의 정수여야 합니다."
        elif error_type == "less_than_equal":
            reason = "1 이상 100 이하여야 합니다."
        else:
            reason = "올바른 값을 입력해야 합니다."
        fields.append({"field": field, "reason": reason})
    return fields


def create_app(service: GsemService | None = None) -> FastAPI:
    app = FastAPI(
        title="GSEM API",
        version="1.0.0-prototype",
        description="지원장비 관리시스템 프로토타입 조회 API",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_methods=["GET", "OPTIONS"],
        allow_headers=["Accept", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )
    app.add_middleware(RequestContextMiddleware)

    active_service = service or GsemService(InMemoryGsemRepository())
    app.include_router(create_api_router(active_service), prefix=settings.api_prefix)

    @app.get("/health")
    def health(request: Request) -> dict[str, Any]:
        return {"status": "ok", "dataSource": settings.data_source, "requestId": _request_id(request)}

    @app.exception_handler(ApiError)
    async def api_error(request: Request, error: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content=error_body(error.code, error.message, _request_id(request), error.field_errors),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content=error_body(
                "INVALID_REQUEST", "요청 조건을 확인해주세요.", _request_id(request), _validation_fields(error)
            ),
        )

    @app.exception_handler(StarletteHttpException)
    async def http_error(request: Request, error: StarletteHttpException) -> JSONResponse:
        if error.status_code == 405:
            code, message = "METHOD_NOT_ALLOWED", "지원하지 않는 요청 방식입니다."
        else:
            code, message = "NOT_FOUND", "요청한 경로가 없습니다."
        return JSONResponse(status_code=error.status_code, content=error_body(code, message, _request_id(request)))

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, error: Exception) -> JSONResponse:
        logging.getLogger("gsem.api").exception("처리하지 못한 API 오류", exc_info=error)
        return JSONResponse(
            status_code=500,
            content=error_body("INTERNAL_ERROR", "요청 처리 중 오류가 발생했습니다.", _request_id(request)),
        )

    return app


app = create_app()
