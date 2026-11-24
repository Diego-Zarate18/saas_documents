"""D-29. Función central de visibilidad: la usan la ficha, el expediente y la bandeja."""

from app.dominio.modelos import ContextoUsuario


def acceso_completo(ctx: ContextoUsuario, area_involucrada: bool) -> bool:
    """Lo suyo completo (su área tiene algún movimiento en el documento); oficialía y dirección, todo."""
    return ctx.ve_recorrido_completo or area_involucrada


def contenido_visible(
    ctx: ContextoUsuario, confidencial: bool, persona_involucrada: bool, area_involucrada: bool
) -> bool:
    """Lo confidencial solo lo ven quien tiene un movimiento en él (como autor o titular al turnar) y el titular de un
    área involucrada."""
    return not confidencial or persona_involucrada or (ctx.rol == 'TI' and area_involucrada)
