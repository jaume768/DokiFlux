import re

from django.core.exceptions import ValidationError

RESERVED_USERNAMES = {
    "admin", "administrator", "dokiflux", "api", "www", "support", "help",
    "billing", "null", "undefined", "root", "system", "mod", "moderator",
    "staff", "team", "official", "security", "info", "contact", "abuse",
    "postmaster", "webmaster", "dashboard", "settings", "account", "login",
    "register", "signup", "signin", "logout", "onboarding", "generate",
}


def validate_username(value):
    """
    Reglas:
    - 3-30 caracteres
    - Solo letras minúsculas, números, guiones y guiones bajos
    - Empieza con letra
    - No puede ser una palabra reservada
    """
    if len(value) < 3:
        raise ValidationError("El username debe tener al menos 3 caracteres.")
    if len(value) > 30:
        raise ValidationError("El username no puede tener más de 30 caracteres.")
    if not re.match(r"^[a-z][a-z0-9_-]*$", value):
        raise ValidationError(
            "El username solo puede contener letras minúsculas, números, "
            "guiones (-) y guiones bajos (_). Debe empezar con una letra."
        )
    if value in RESERVED_USERNAMES:
        raise ValidationError("Este username está reservado.")
