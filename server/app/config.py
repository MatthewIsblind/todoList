"""Application configuration utilities."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import List

from dotenv import load_dotenv

# Load environment variables from a local .env file if present.
load_dotenv()


@dataclass(frozen=True)
class Settings:
    """Runtime configuration derived from environment variables."""

    port: int
    cognito_region: str
    cognito_user_pool_id: str
    cognito_client_id: str
    cognito_domain: str
    allowed_origins: List[str]

    @property
    def issuer(self) -> str:
        """Return the expected Cognito issuer URL."""

        return f"https://cognito-idp.{self.cognito_region}.amazonaws.com/{self.cognito_user_pool_id}"

    @property
    def jwks_uri(self) -> str:
        """Return the Cognito JWKS endpoint."""

        return f"{self.issuer}/.well-known/jwks.json"


REQUIRED_ENV_VARS = [
    "COGNITO_REGION",
    "COGNITO_USER_POOL_ID",
    "COGNITO_CLIENT_ID",
    "COGNITO_DOMAIN",
]


def _parse_allowed_origins(raw_origins: str | None) -> List[str]:
    if not raw_origins:
        return ["*"]

    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["*"]


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings.

    Raises:
        RuntimeError: If any required environment variable is missing.
    """

    missing = [key for key in REQUIRED_ENV_VARS if not os.getenv(key)]
    if missing:
        joined = ", ".join(missing)
        raise RuntimeError(f"Missing required environment variables: {joined}")

    port_raw = os.getenv("PORT", "4000")
    try:
        port = int(port_raw)
    except ValueError as exc:  # pragma: no cover - defensive coding
        raise RuntimeError("PORT must be an integer value") from exc

    allowed_origins = _parse_allowed_origins(os.getenv("ALLOWED_ORIGIN"))

    return Settings(
        port=port,
        cognito_region=os.environ["COGNITO_REGION"],
        cognito_user_pool_id=os.environ["COGNITO_USER_POOL_ID"],
        cognito_client_id=os.environ["COGNITO_CLIENT_ID"],
        cognito_domain=os.environ["COGNITO_DOMAIN"],
        allowed_origins=allowed_origins,
    )