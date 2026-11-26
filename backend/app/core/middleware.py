import logging
import re
import time
from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from .config import settings

LOGGER = logging.getLogger("gsem.api")
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,100}$")


def resolve_request_id(value: str | None) -> str:
    normalized = value.strip() if value else ""
    return normalized if REQUEST_ID_PATTERN.fullmatch(normalized) else str(uuid4())


class RequestContextMiddleware(BaseHTTPMiddleware):
    """요청 식별자·캐시 정책·기본 접근 로그를 일관되게 적용한다."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        started_at = time.perf_counter()
        request_id = resolve_request_id(request.headers.get("X-Request-ID"))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["Cache-Control"] = "no-store"

        if settings.log_requests:
            elapsed_ms = (time.perf_counter() - started_at) * 1000
            LOGGER.info(
                "request_id=%s method=%s path=%s status=%s duration_ms=%.1f",
                request_id,
                request.method,
                request.url.path,
                response.status_code,
                elapsed_ms,
            )
        return response
