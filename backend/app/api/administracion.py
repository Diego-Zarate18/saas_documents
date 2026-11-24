"""O-33 a O-35. /api/areas (escritura), /api/personas y /api/actores-externos."""

from uuid import UUID

from fastapi import APIRouter

from app.api.dependencias import Contexto, Pool
from app.dominio import modelos as m
from app.servicios import administracion as adm

router = APIRouter(tags=['administracion'])


@router.post('/areas', status_code=201, summary='O-33 Crear área')
async def crear_area(datos: m.DatosArea, ctx: Contexto, pool: Pool) -> m.Area:
    return await adm.guardar_area(pool, ctx, datos)


@router.patch('/areas/{id_area}', summary='O-33 Actualizar área')
async def actualizar_area(id_area: UUID, datos: m.DatosArea, ctx: Contexto, pool: Pool) -> m.Area:
    return await adm.guardar_area(pool, ctx, datos, id_area)


@router.post('/areas/{id_area}/desactivacion', status_code=204, summary='O-33 Desactivar área')
async def desactivar_area(id_area: UUID, ctx: Contexto, pool: Pool) -> None:
    await adm.desactivar_area(pool, ctx, id_area)


@router.get('/personas', summary='O-34 Personas y usuarios')
async def personas(ctx: Contexto, pool: Pool) -> m.Listado[m.Persona]:
    return await adm.personas(pool, ctx)


@router.post('/personas', status_code=201, summary='O-34 Alta de persona')
async def crear_persona(datos: m.DatosPersona, ctx: Contexto, pool: Pool) -> m.Persona:
    return await adm.guardar_persona(pool, ctx, datos)


@router.patch('/personas/{id_persona}', summary='O-34 Actualizar persona')
async def actualizar_persona(id_persona: UUID, datos: m.DatosPersona, ctx: Contexto, pool: Pool) -> m.Persona:
    return await adm.guardar_persona(pool, ctx, datos, id_persona)


@router.post('/personas/{id_persona}/baja', status_code=204, summary='O-34 Dar de baja')
async def dar_de_baja(id_persona: UUID, ctx: Contexto, pool: Pool) -> None:
    await adm.dar_de_baja(pool, ctx, id_persona)


@router.get('/actores-externos', summary='O-35 Actores externos')
async def actores(ctx: Contexto, pool: Pool) -> m.Listado[m.ActorExterno]:
    return await adm.actores(pool, ctx)


@router.post('/actores-externos', status_code=201, summary='O-35 Alta de actor')
async def crear_actor(datos: m.DatosActor, ctx: Contexto, pool: Pool) -> m.ActorExterno:
    return await adm.guardar_actor(pool, ctx, datos)


@router.patch('/actores-externos/{id_actor}', summary='O-35 Actualizar actor')
async def actualizar_actor(id_actor: UUID, datos: m.DatosActor, ctx: Contexto, pool: Pool) -> m.ActorExterno:
    return await adm.guardar_actor(pool, ctx, datos, id_actor)


@router.post('/actores-externos/{id_actor}/desactivacion', status_code=204, summary='O-35 Desactivar actor')
async def desactivar_actor(id_actor: UUID, ctx: Contexto, pool: Pool) -> None:
    await adm.desactivar_actor(pool, ctx, id_actor)
