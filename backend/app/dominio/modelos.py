"""Listas cerradas (D-72) y modelos de entrada y salida del contrato (Apéndice A)."""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

Rol = Literal['OF', 'DI', 'TI', 'PE', 'AD']
RolTurno = Literal['responsable', 'apoyo', 'conocimiento']
Canal = Literal['correo', 'papel']
TipoMovimiento = Literal['registro', 'turno', 'devolucion', 'atraccion', 'conclusion', 'correccion']

TIPOS_DOCUMENTO = [
    'oficio',
    'solicitud_material_pago',
    'requerimiento_auditoria',
    'solicitud_transparencia',
    'memorandum',
    'circular',
    'informe',
]
MOTIVOS_DEVOLUCION = ['falta_informacion', 'falta_firma', 'falta_anexo', 'corregir_dato', 'no_competencia']
FORMAS_CONCLUSION = ['con_respuesta', 'atencion_sin_oficio', 'enterado', 'no_procede', 'duplicado']
CANALES = ['correo', 'papel']
ROLES = ['OF', 'DI', 'TI', 'PE', 'AD']
ROLES_TURNO = ['responsable', 'apoyo', 'conocimiento']
ESTADOS_DOCUMENTO = ['en_tramite', 'concluido', 'cancelado', 'sin_efecto']
TIPOS_RELACION = ['responde_a', 'da_seguimiento_a', 'en_alcance_a', 'sustituye_a']
TIPOS_ACTOR = ['institucion', 'municipio', 'proveedor', 'ciudadano']

# D-66: campos propios de tres tipos; los demás no tienen.
CAMPOS_TIPO: dict[str, list[dict[str, Any]]] = {
    'requerimiento_auditoria': [
        {'clave': 'ente_auditor', 'etiqueta': 'Ente auditor', 'forma': 'texto', 'obligatorio': True},
        {'clave': 'puntos', 'etiqueta': 'Puntos de auditoría', 'forma': 'lista', 'obligatorio': False},
    ],
    'solicitud_transparencia': [
        {'clave': 'solicitante', 'etiqueta': 'Solicitante', 'forma': 'texto', 'obligatorio': True},
    ],
    'solicitud_material_pago': [
        {'clave': 'concepto', 'etiqueta': 'Concepto', 'forma': 'texto', 'obligatorio': False},
    ],
}


@dataclass(frozen=True)
class ContextoUsuario:
    """D-29: quién pide y qué áreas ve. Toda lectura de documentos lo recibe."""

    id_persona: UUID
    nombre: str
    rol: str
    id_area: UUID | None
    nombre_area: str | None
    areas_visibles: frozenset[UUID]
    ve_recorrido_completo: bool


# ── Sesión ─────────────────────────────────────────────────────────────────────


class Credenciales(BaseModel):
    correo: str = ''
    contrasena: str = ''


class Sesion(BaseModel):
    id_persona: UUID
    nombre: str
    rol: Rol
    id_area: UUID | None
    nombre_area: str | None


# ── Catálogos y organización ───────────────────────────────────────────────────


class ActorCatalogo(BaseModel):
    id: UUID
    nombre: str
    tipo: str


class Catalogos(BaseModel):
    tipos_documento: list[str]
    campos_tipo: dict[str, list[dict[str, Any]]]
    actores_externos: list[ActorCatalogo]
    motivos_devolucion: list[str]
    formas_conclusion: list[str]
    canales: list[str]
    roles: list[str]
    roles_turno: list[str]
    estados_documento: list[str]
    tipos_relacion: list[str]
    tipos_actor: list[str]


class Area(BaseModel):
    id: UUID
    nombre: str
    siglas: str
    id_titular: UUID | None
    nombre_titular: str | None


class PersonaArea(BaseModel):
    id: UUID
    nombre: str
    rol: str | None


class AreaOrganizacion(Area):
    id_padre: UUID | None
    activa: bool
    personas: list[PersonaArea]
    pendientes: int
    con_folios: bool


class Listado[T](BaseModel):
    elementos: list[T]
    total: int


# ── Documentos y recorrido ─────────────────────────────────────────────────────


class NuevoDocumento(BaseModel):
    tipo: str = ''
    numero_emisor: str | None = None
    tipo_emisor: str = ''
    emisor: str = ''
    fecha_documento: date | None = None
    canal: str = ''
    fecha_recepcion: datetime | None = None
    sintesis: str = ''
    confidencial: bool = False
    extemporaneo: bool = False
    datos_tipo: dict[str, Any] = Field(default_factory=dict)


class DocumentoRegistrado(BaseModel):
    id: UUID
    folio: str


class DestinoTurno(BaseModel):
    id_area: UUID | None = None
    rol: str = ''
    instruccion: str | None = None


class Turno(BaseModel):
    destinos: list[DestinoTurno] = Field(default_factory=list)


class Devolucion(BaseModel):
    motivo: str = ''
    id_area_sugerida: UUID | None = None
    nota: str | None = None


class Atraccion(BaseModel):
    justificacion: str = ''


class Movimiento(BaseModel):
    id: UUID
    id_documento: UUID
    tipo: TipoMovimiento
    fecha_hora: datetime
    id_grupo_turno: UUID | None
    id_area_origen: UUID | None
    otros_origenes: list[UUID] = Field(default_factory=list)
    id_area_destino: UUID
    rol: RolTurno
    instruccion: str | None
    motivo: str | None
    id_area_sugerida: UUID | None
    forma_conclusion: str | None = None
    id_corrige: UUID | None = None
    id_persona: UUID
    id_titular_al_turnar: UUID | None


class ResultadoTurno(BaseModel):
    id_grupo_turno: UUID
    movimientos: list[Movimiento]


class UltimoMovimiento(BaseModel):
    tipo: TipoMovimiento
    descripcion: str


class PendienteBandeja(BaseModel):
    id_documento: UUID
    folio: str
    asunto: str | None  # nulo si es confidencial y quien consulta no ve su contenido (D-29)
    tipo: str
    emisor: str
    rol: Literal['responsable', 'apoyo']
    antiguedad_dias: int
    titular_al_turnar: str | None
    titular_ya_no_adscrito: bool
    ultimo_movimiento: UltimoMovimiento
    posible_duplicado: bool
    confidencial: bool


# ── Ficha (O-11) ───────────────────────────────────────────────────────────────


class Recepcion(BaseModel):
    canal: Canal
    fecha_recepcion: datetime


class RegistroDocumento(BaseModel):
    id: UUID
    folio: str
    asunto: str | None
    tipo: str
    estado: str
    confidencial: bool
    posible_duplicado: bool
    extemporaneo: bool
    numero_emisor: str | None
    emisor: str
    tipo_emisor: Literal['area', 'externo']
    fecha_documento: date | None
    canal: Canal
    fecha_recepcion: datetime
    segunda_recepcion: Recepcion | None
    fecha_oficial: date
    origen_fecha_oficial: str
    sintesis: str | None


class UbicacionActual(BaseModel):
    area: str
    rol: Literal['responsable', 'apoyo']
    desde: datetime
    antiguedad_dias: int
    llegada: str


class Anexo(BaseModel):
    id: UUID
    titulo: str
    hojas: int
    ubicacion: str


class Nota(BaseModel):
    id: UUID
    tipo: Literal['general', 'evidencia_atencion']
    area: str
    autor: str
    fecha_hora: datetime
    texto: str


class Expediente(BaseModel):
    datos_tipo: dict[str, Any]
    anexos: list[Anexo]
    notas: list[Nota]


class Relacion(BaseModel):
    tipo: str
    id_documento: UUID | None
    referencia: str
    descripcion: str | None
    estado: str | None


class AsuntoResumen(BaseModel):
    id: UUID
    nombre: str


class MovimientoRecorrido(BaseModel):
    """Un paso del recorrido (C1) con los nombres que muestra la interfaz."""

    id: UUID
    tipo: TipoMovimiento
    id_corrige: UUID | None
    id_grupo_turno: UUID | None
    area_origen: str | None
    area_destino: str
    rol: RolTurno
    instruccion: str | None
    motivo: str | None
    forma_conclusion: str | None
    persona: str
    titular_al_turnar: str | None
    fecha_hora: datetime


class Ficha(BaseModel):
    acceso: Literal['completo', 'restringido']
    contenido_oculto: bool
    registro: RegistroDocumento
    ubicacion_actual: list[UbicacionActual]
    expediente: Expediente | None
    recorrido: list[MovimientoRecorrido] | None
    relaciones: list[Relacion] | None
    asuntos: list[AsuntoResumen] | None
    secciones_no_disponibles: list[Literal['expediente', 'recorrido', 'relaciones']]


# ── Expediente (O-09, O-28, O-29) ──────────────────────────────────────────────


class DatosExpediente(BaseModel):
    datos_tipo: dict[str, Any] = Field(default_factory=dict)


class NuevoAnexo(BaseModel):
    titulo: str = ''
    hojas: int | None = None
    ubicacion: str = ''


class NuevaNota(BaseModel):
    texto: str = ''


# ── Cierre y correcciones (O-05, O-19, O-24, O-25, O-26) ───────────────────────


class Conclusion(BaseModel):
    forma: str = ''
    id_respuesta: UUID | None = None
    id_original: UUID | None = None
    nota: str | None = None


class Cancelacion(BaseModel):
    motivo: str = ''


class SegundaRecepcion(BaseModel):
    canal: str = ''
    fecha_recepcion: datetime | None = None


class Correccion(BaseModel):
    rol: str = ''
    motivo: str = ''


class ResumenDocumento(BaseModel):
    id: UUID
    folio: str
    asunto: str
    falta: Literal['numero', 'fecha']


class DocumentoComparado(BaseModel):
    id: UUID
    folio: str
    numero_emisor: str | None
    emisor: str
    fecha_documento: date | None
    canal: Canal
    fecha_recepcion: datetime
    sintesis: str
    estado: str
    ubicacion: str | None


class ComparacionDuplicado(BaseModel):
    posterior: DocumentoComparado
    candidato: DocumentoComparado | None
    coincidencias: list[Literal['numero_emisor', 'emisor', 'fecha_documento', 'sintesis']]


class ResolucionDuplicado(BaseModel):
    id_otro: UUID | None = None
    decision: str = ''
