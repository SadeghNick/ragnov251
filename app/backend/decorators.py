import logging
from collections.abc import Callable
from functools import wraps
from typing import Any, TypeVar, cast

from quart import abort, current_app, request

from config import CONFIG_AUTH_CLIENT, CONFIG_SEARCH_CLIENT
from core.authentication import AuthError
from error import error_response

import jwt
import os


def authenticated_path(route_fn: Callable[[str, dict[str, Any]], Any]):
    """
    Decorator for routes that request a specific file that might require access control enforcement
    """

    @wraps(route_fn)
    async def auth_handler(path=""):
        # If authentication is enabled, validate the user can access the file
        auth_helper = current_app.config[CONFIG_AUTH_CLIENT]
        search_client = current_app.config[CONFIG_SEARCH_CLIENT]
        authorized = False
        try:
            auth_claims = await auth_helper.get_auth_claims_if_enabled(request.headers)
            authorized = await auth_helper.check_path_auth(path, auth_claims, search_client)
        except AuthError:
            abort(403)
        except Exception as error:
            logging.exception("Problem checking path auth %s", error)
            return error_response(error, route="/content")

        if not authorized:
            abort(403)

        return await route_fn(path, auth_claims)

    return auth_handler


_C = TypeVar("_C", bound=Callable[..., Any])


def authenticated(route_fn: _C) -> _C:
    """
    Decorator for routes that might require access control.  When AZURE_USE_AUTHENTICATION
    is true, it uses the AuthenticationHelper.  When false, it requires a valid
    Bearer token created by /login and extracts the username as the oid claim.
    """
    @wraps(route_fn)
    async def auth_handler(*args, **kwargs):
        auth_helper = current_app.config[CONFIG_AUTH_CLIENT]
        # If Entra auth is enabled, use the existing helper
        if auth_helper.use_authentication:
            try:
                auth_claims = await auth_helper.get_auth_claims_if_enabled(request.headers)
            except AuthError:
                abort(403)
        else:
            # Simple JWT-based auth: expect Authorization: Bearer <token>
            header = request.headers.get("Authorization")
            if not header or not header.lower().startswith("bearer "):
                abort(401)
            token = header.split()[1]
            secret = os.getenv("APP_SECRET_KEY", "default-secret-change-me")
            try:
                payload = jwt.decode(token, secret, algorithms=["HS256"])
            except Exception:
                abort(401)
            # Reuse the claim structure: oid is the user id; set it to the username
            auth_claims = {"oid": payload["sub"]}
        return await route_fn(auth_claims, *args, **kwargs)
    return cast(_C, auth_handler)

