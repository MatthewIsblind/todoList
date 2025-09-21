"""Utilities for integrating with Amazon Cognito."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any, Dict

import jwt
import requests
from jwt import InvalidTokenError, PyJWKClient, PyJWKClientError
from requests import Response
from requests.auth import HTTPBasicAuth
from requests.exceptions import RequestException

from .config import Settings, get_settings

logger = logging.getLogger(__name__)


class TokenVerificationError(Exception):
    """Raised when a Cognito token fails validation."""


class TokenExchangeError(Exception):
    """Raised when exchanging an authorization code for tokens fails."""


class UserInfoError(Exception):
    """Raised when fetching the Cognito user info document fails."""


@lru_cache
def _get_jwk_client(jwks_uri: str) -> PyJWKClient:
    """Return a cached PyJWKClient for the provided JWKS URI."""

    return PyJWKClient(jwks_uri)


def _raise_for_status(response: Response, message: str) -> None:
    """Raise a TokenExchangeError with additional context."""

    try:
        response.raise_for_status()
    except RequestException as exc:
        detail = response.text or str(exc)
        raise TokenExchangeError(f"{message}: {detail}") from exc


def exchange_code_for_tokens(code: str, redirect_uri: str | None = None) -> Dict[str, Any]:
    """Exchange an authorization code for Cognito tokens."""
    settings: Settings = get_settings()
    redirect_target = redirect_uri or settings.cognito_redirect_uri

    if redirect_target not in settings.cognito_redirect_uris:
        configured_list = ", ".join(settings.cognito_redirect_uris)
        logger.debug(
            "Rejecting token exchange because redirect URI %s is not in configured list: %s",
            redirect_target,
            configured_list,
        )
        raise TokenExchangeError(
            "Received redirect URI does not match configured value. "
            "Expected one of: "
            f"{configured_list}"
        )
    
    data = {
        "grant_type": "authorization_code",
        "client_id": settings.cognito_client_id,
        "code": code,
        "redirect_uri": redirect_target,
    }

    auth = None
    if settings.cognito_client_secret:
        auth = HTTPBasicAuth(settings.cognito_client_id, settings.cognito_client_secret)

    try:
        response = requests.post(
            settings.token_endpoint,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
            auth=auth,
        )
    except RequestException as exc:
        raise TokenExchangeError("Unable to reach Cognito token endpoint.") from exc

    _raise_for_status(response, "Cognito token request failed")

    try:
        payload = response.json()
    except ValueError as exc:  # pragma: no cover - defensive coding
        raise TokenExchangeError("Cognito token response was not valid JSON.") from exc

    if "id_token" not in payload:
        raise TokenExchangeError("Token response from Cognito did not include an id_token.")

    return payload


def fetch_userinfo(access_token: str) -> Dict[str, Any]:
    """Retrieve the userinfo document for the provided access token."""

    settings: Settings = get_settings()

    try:
        response = requests.get(
            settings.userinfo_endpoint,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
    except RequestException as exc:
        raise UserInfoError("Unable to reach Cognito userInfo endpoint.") from exc

    _raise_for_status(response, "Cognito userInfo request failed")

    try:
        return response.json()
    except ValueError as exc:  # pragma: no cover - defensive coding
        raise UserInfoError("Cognito userInfo response was not valid JSON.") from exc


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