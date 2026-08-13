import os
from dataclasses import dataclass
from urllib.parse import quote_plus


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


@dataclass(frozen=True)
class Settings:
    """프로토타입 API 실행 설정."""

    api_prefix: str = "/api/v1"
    data_source: str = _env("GSEM_DATA_SOURCE", "memory").lower()
    log_requests: bool = os.getenv("GSEM_API_LOG", "1") != "0"
    allowed_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    )

    db_host: str = _env("GSEM_DB_HOST", "166.103.117.105")
    db_port: str = _env("GSEM_DB_PORT", "1433")
    db_name: str = _env("GSEM_DB_NAME", "GSEMS")
    db_user: str = _env("GSEM_DB_USER")
    db_password: str = _env("GSEM_DB_PASSWORD")
    db_driver: str = _env("GSEM_DB_DRIVER", "ODBC Driver 17 for SQL Server")
    db_trust_server_certificate: str = _env("GSEM_DB_TRUST_SERVER_CERTIFICATE", "yes")
    db_encrypt: str = _env("GSEM_DB_ENCRYPT", "yes")
    db_timeout_seconds: int = int(_env("GSEM_DB_TIMEOUT_SECONDS", "5"))

    @property
    def is_sqlserver_enabled(self) -> bool:
        return self.data_source in {"sqlserver", "mssql", "db"}

    @property
    def odbc_connection_string(self) -> str:
        return (
            f"DRIVER={{{self.db_driver}}};"
            f"SERVER={self.db_host},{self.db_port};"
            f"DATABASE={self.db_name};"
            f"UID={self.db_user};"
            f"PWD={self.db_password};"
            f"Encrypt={self.db_encrypt};"
            f"TrustServerCertificate={self.db_trust_server_certificate};"
            f"Connection Timeout={self.db_timeout_seconds};"
        )

    @property
    def quoted_odbc_connection_string(self) -> str:
        """SQLAlchemy URL 등에 재사용할 수 있는 인코딩된 ODBC 문자열."""

        return quote_plus(self.odbc_connection_string)


settings = Settings()
