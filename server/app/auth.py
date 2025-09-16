"""Utilities for validating Cognito ID tokens."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any, Dict

import jwt
from jwt import InvalidTokenError, PyJWKClient, PyJWKClientError

from .config import Settings, get_settings

logger = logging.getLogger(__name__)


class TokenVerificationError(Exception):
    """Raised when a Cognito token fails validation."""


@lru_cache
def _get_jwk_client(jwks_uri: str) -> PyJWKClient:
    """Return a cached PyJWKClient for the provided JWKS URI."""

    return PyJWKClient(jwks_uri)


def validate_id_token(id_token: str) -> Dict[str, Any]:
    """Validate the provided Cognito ID token.

    Args:
        id_token: Encoded Cognito ID token received from the client.

    Returns:
        The decoded token payload if verification succeeds.

    Raises:
        TokenVerificationError: If the token cannot be verified.
    """

    settings: Settings = get_settings()
    jwk_client = _get_jwk_client(settings.jwks_uri)

    try:
        signing_key = jwk_client.get_signing_key_from_jwt(id_token)
    except PyJWKClientError as exc:
        logger.debug("Unable to resolve signing key for JWT: %s", exc)
        raise TokenVerificationError("No signing key found for the provided token.") from exc

    try:
        payload = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.issuer,
            audience=settings.cognito_client_id,
        )
    except InvalidTokenError as exc:
        logger.debug("Failed to decode JWT: %s", exc)
        raise TokenVerificationError("Unable to verify token.") from exc

    if payload.get("token_use") != "id":
        raise TokenVerificationError("The provided token is not an ID token.")

    return payload