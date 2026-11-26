import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    """프로토타입 API 실행 설정."""

    api_prefix: str = "/api/v1"
    data_source: str = "memory"
    log_requests: bool = os.getenv("GSEM_API_LOG", "1") != "0"
    allowed_origins: tuple[str, ...] = ("*",)


settings = Settings()
