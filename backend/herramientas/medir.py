"""Evidencia medida (guía, secciones 9 y 12): ejecuta los escenarios contra el despliegue y escribe
docs/pruebas/evidencia.md con lo que se midió.

Uso, desde backend/, con `docker compose up -d --build` en marcha (bases, api, outbox):

    uv run python -m herramientas.medir

Recarga la semilla al empezar y al terminar. Detiene Neo4j unos segundos (escenario de errores) y genera 4 semanas de
temporada alta (D-35) antes de medir rendimiento.
"""

import asyncio
import ctypes
import math
import os
import platform
import random
import re
import shutil
import statistics
import subprocess
import sys
import time
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx
import psycopg
from neo4j.exceptions import ConstraintError
from pymongo.errors import WriteError

from app.config import cargar_ajustes
from herramientas import esquemas, respaldo
from herramientas.reconciliar import reconciliar

RAIZ = Path(__file__).resolve().parents[2]
API = os.environ.get('SIGEDOC_API', 'http://127.0.0.1:8000') + '/api'
CONTRASENA = esquemas.CONTRASENA_DESARROLLO
ID = lambda n: f'00000000-0000-4000-8000-{n:012d}'  # noqa: E731
OP, CO, ASUNTO_LAB, MARTA, CARMEN = ID(101), ID(103), ID(401), ID(201), ID(214)
filas: list[tuple[str, str, str]] = []


def anotar(tipo: str, escenario: str, resultado: str) -> None:
    filas.append((tipo, escenario, resultado))
    print(f'· {tipo} · {escenario}\n    {resultado}')


def ms(segundos: float) -> int:
    return round(segundos * 1000)


def percentil(valores: list[float], p: float) -> int:
    ordenados = sorted(valores)
    return ms(ordenados[max(0, math.ceil(p * len(ordenados)) - 1)])


def cliente(correo: str) -> httpx.Client:
    c = httpx.Client(base_url=API, timeout=30)
    r = c.post('/sesiones', json={'correo': correo, 'contrasena': CONTRASENA})
    r.raise_for_status()
    return c


def nuevo(sintesis: str, **extra) -> dict:
    return {
        'tipo': 'oficio',
        'numero_emisor': None,
        'tipo_emisor': 'externo',
        'emisor': 'Ciudadano',
        'fecha_documento': None,
        'canal': 'papel',
        'fecha_recepcion': datetime.now(UTC).isoformat(),
        'sintesis': sintesis,
        'confidencial': False,
        'extemporaneo': False,
        'datos_tipo': {},
        **extra,
    }


# ── Entorno ────────────────────────────────────────────────────────────────────


def _salida(*comando: str) -> str:
    try:
        return subprocess.run(comando, capture_output=True, text=True, check=True, timeout=60).stdout.strip()  # noqa: S603
    except (OSError, subprocess.SubprocessError):
        return 'no disponible'


def _ram_gb() -> float:
    if sys.platform == 'win32':

        class Memoria(ctypes.Structure):
            _fields_ = [('dwLength', ctypes.c_ulong), ('dwMemoryLoad', ctypes.c_ulong)] + [
                (n, ctypes.c_ulonglong)
                for n in ('total', 'libre', 'pag_total', 'pag_libre', 'virt_total', 'virt_libre', 'ext_libre')
            ]

        m = Memoria()
        m.dwLength = ctypes.sizeof(Memoria)
        ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
        return m.total / 2**30
    return os.sysconf('SC_PAGE_SIZE') * os.sysconf('SC_PHYS_PAGES') / 2**30


def entorno(pg, db, grafo) -> list[str]:
    if sys.platform == 'win32':
        cpu = _salida('powershell', '-NoProfile', '-Command', '(Get-CimInstance Win32_Processor).Name')
    else:
        cpu = platform.processor() or 'no disponible'
    componentes, _, _ = grafo.execute_query('CALL dbms.components() YIELD name, versions RETURN versions[0] AS v')
    return [
        f'- Fecha: {datetime.now().astimezone().isoformat(timespec="seconds")}',
        f'- Sistema: {platform.platform()}',
        f'- CPU: {cpu} ({os.cpu_count()} hilos)',
        f'- RAM: {_ram_gb():.1f} GB',
        f'- Docker: {_salida("docker", "version", "--format", "{{.Server.Version}}")}',
        f'- PostgreSQL {pg.execute("SHOW server_version").fetchone()[0].split()[0]} · '
        f'MongoDB {db.client.server_info()["version"]} · Neo4j {componentes[0]["v"]} (contenedores de docker-compose)',
        f'- Python {platform.python_version()} · Node {_salida(shutil.which("node") or "node", "-v")}',
        f'- API: {API} (contenedor `api`); outbox: contenedor `outbox`, intervalo '
        f'{cargar_ajustes().outbox_intervalo_ms} ms',
    ]


# ── Escenarios ─────────────────────────────────────────────────────────────────


def conectividad() -> None:
    r = httpx.get(f'{API}/salud', timeout=10)
    bases = r.json()['bases']
    detalle = ', '.join(f'{b} {"ok" if v["ok"] else v["error"]} {v["ms"]} ms' for b, v in bases.items())
    anotar(
        'Conectividad',
        '`GET /api/salud` con las tres bases',
        f'HTTP {r.status_code}, `{r.json()["estado"]}`: {detalle}',
    )


def funcional() -> None:
    pytest = subprocess.run(
        [sys.executable, '-m', 'pytest', '../tests', '-q', '-p', 'no:cacheprovider'],
        cwd=RAIZ / 'backend',
        capture_output=True,
        text=True,
        check=False,
    )
    pasadas = re.search(r'(\d+) passed', pytest.stdout)
    fallidas = re.search(r'(\d+) failed', pytest.stdout)
    p, f = int(pasadas.group(1)) if pasadas else 0, int(fallidas.group(1)) if fallidas else 0
    anotar('Funcional', '`uv run pytest ../tests` (unitarias e integración)', f'{p} pasadas de {p + f}')
    npm = subprocess.run(  # noqa: S603
        [shutil.which('npm') or 'npm', 'test'], cwd=RAIZ / 'frontend', capture_output=True, text=True, check=False
    )
    total = re.search(r'Tests\s+(?:(\d+) failed \| )?(\d+) passed \((\d+)\)', re.sub(r'\x1b\[[0-9;]*m', '', npm.stdout))
    anotar(
        'Funcional',
        '`npm test` (componentes y reglas de la interfaz)',
        f'{total.group(2)} pasadas de {total.group(3)}' if total else 'sin resultado',
    )


async def _registros_simultaneos(cookies: httpx.Cookies, n: int) -> list[httpx.Response]:
    async with httpx.AsyncClient(base_url=API, cookies=cookies, timeout=60) as c:
        return await asyncio.gather(*(c.post('/documentos', json=nuevo(f'Concurrente {i}')) for i in range(n)))


def integridad(pg, db, grafo) -> None:
    oficialia = cliente('mflores@institucion.gob.mx')
    respuestas = asyncio.run(_registros_simultaneos(oficialia.cookies, 20))
    consecutivos = [int(r.json()['folio'].rsplit('-', 1)[1]) for r in respuestas if r.status_code == 201]
    huecos = max(consecutivos) - min(consecutivos) + 1 - len(set(consecutivos))
    repetidos = len(consecutivos) - len(set(consecutivos))
    anotar(
        'Integridad',
        '20 registros simultáneos en oficialía (D-21)',
        f'{len(consecutivos)} registrados, {min(consecutivos)}–{max(consecutivos)}: '
        f'{huecos} huecos, {repetidos} repetidos',
    )
    rechazos = []
    try:
        with pg.transaction():
            pg.execute(
                'INSERT INTO folio (folio, id_documento, id_area, anio, consecutivo) VALUES (%s, %s, %s, 2026, 9999)',
                ('OP-2026-0139', ID(1000), OP),
            )
    except psycopg.errors.UniqueViolation as e:
        rechazos.append(f'folio repetido → `{e.diag.constraint_name}`')
    try:
        with pg.transaction():
            pg.execute(
                "UPDATE movimiento SET rol = 'apoyo' "
                'WHERE id_movimiento = (SELECT id_movimiento FROM movimiento LIMIT 1)'
            )
    except psycopg.errors.RestrictViolation:
        rechazos.append('UPDATE de movimiento → disparador `movimiento_inmutable`')
    ahora = datetime.now(UTC)
    try:
        db.expedientes.insert_one(
            {
                '_id': str(uuid.uuid4()),
                'tipo': 'requerimiento_auditoria',
                'datos_tipo': {},
                'referencias_citadas': [],
                'anexos': [],
                'notas': [],
                'creado_en': ahora,
                'actualizado_en': ahora,
            }
        )
    except WriteError as e:
        rechazos.append(f'expediente sin `ente_auditor` → código {e.code} de MongoDB')
    try:
        grafo.execute_query('CREATE (:Documento {id: $id})', id=ID(1004))
    except ConstraintError:
        rechazos.append('`Documento.id` repetido → restricción `documento_id` de Neo4j')
    anotar(
        'Integridad',
        'Folio repetido, UPDATE de movimiento, expediente inválido, id repetido en Neo4j',
        '; '.join(rechazos) + f' ({len(rechazos)} de 4 rechazados)',
    )


def _esperar(condicion, limite: float = 60.0, paso: float = 0.025) -> float | None:
    inicio = time.perf_counter()
    while time.perf_counter() - inicio < limite:
        if condicion():
            return time.perf_counter() - inicio
        time.sleep(paso)
    return None


def integracion(pg) -> None:
    oficialia = cliente('mflores@institucion.gob.mx')
    tiempos = []
    for i in range(20):
        doc = oficialia.post('/documentos', json=nuevo(f'Integración {i}')).json()
        oficialia.post(f'/documentos/{doc["id"]}/turnos', json={'destinos': [{'id_area': CO, 'rol': 'responsable'}]})

        def replicado(id_doc=doc['id']):
            ficha = oficialia.get(f'/documentos/{id_doc}').json()
            return ficha['expediente'] is not None and len(ficha['recorrido'] or []) == 2

        tiempo = _esperar(replicado)
        if tiempo is not None:
            tiempos.append(tiempo)
    eventos = dict(pg.execute('SELECT estado, count(*) FROM outbox GROUP BY estado').fetchall())
    anotar(
        'Integración',
        'Registrar → turnar → outbox → ficha con las tres bases (20 documentos)',
        f'{len(tiempos)}/20 replicados; réplica mediana {ms(statistics.median(tiempos))} ms, '
        f'máximo {ms(max(tiempos))} ms; '
        f'outbox: {eventos.get("enviado", 0)} enviados, {eventos.get("error", 0)} fallidos, '
        f'{eventos.get("pendiente", 0)} pendientes',
    )


def _outbox_vacio(pg) -> bool:
    return pg.execute("SELECT count(*) FROM outbox WHERE estado = 'pendiente'").fetchone()[0] == 0


def consistencia(pg, db, grafo) -> None:
    d0152, d0137 = ID(1027), ID(1014)
    grafo.execute_query("MATCH (d:Documento {id: $id}) SET d.estado = 'cancelado'", id=d0152)
    db.expedientes.delete_one({'_id': d0137})
    primera = reconciliar(pg, db, grafo)
    _esperar(lambda: _outbox_vacio(pg), 60, 0.2)
    segunda = reconciliar(pg, db, grafo)
    clases = ', '.join(f'{c}: {n}' for c, n in primera['diferencias'].items())
    anotar(
        'Consistencia',
        'Estado cambiado a mano en Neo4j y expediente borrado en MongoDB; `herramientas.reconciliar`',
        f'{primera["total"]} diferencias detectadas ({clases}); {primera["corregidas"]} reencoladas y entregadas; '
        f'segunda pasada: {segunda["total"]} diferencias',
    )


def errores(pg) -> None:
    oficialia = cliente('mflores@institucion.gob.mx')
    respaldo.compose('stop', 'neo4j')
    try:
        registro = oficialia.post('/documentos', json=nuevo('Registrado con Neo4j detenido'))
        doc = registro.json()
        # MongoDB sí está arriba: el outbox le entrega el expediente aunque los eventos a Neo4j fallen.
        _esperar(
            lambda: (
                pg.execute(
                    "SELECT count(*) FROM outbox WHERE destino = 'mongodb' AND datos->>'id_documento' = %s "
                    "AND estado = 'enviado'",
                    (doc['id'],),
                ).fetchone()[0]
                == 1
            ),
            30,
            0.5,
        )
        ficha = oficialia.get(f'/documentos/{doc["id"]}')
        pendientes = pg.execute(
            "SELECT count(*) FROM outbox WHERE destino = 'neo4j' AND datos->>'id_documento' = %s "
            "AND estado <> 'enviado'",
            (doc['id'],),
        ).fetchone()[0]
    finally:
        respaldo.compose('start', 'neo4j')
        respaldo._esperar_neo4j()
    total = pg.execute("SELECT count(*) FROM outbox WHERE datos->>'id_documento' = %s", (doc['id'],)).fetchone()[0]

    def entregados():
        return (
            pg.execute(
                "SELECT count(*) FROM outbox WHERE datos->>'id_documento' = %s AND estado = 'enviado'", (doc['id'],)
            ).fetchone()[0]
            == total
        )

    espera = _esperar(entregados, 120, 0.5)
    enviados = pg.execute(
        "SELECT count(*) FROM outbox WHERE datos->>'id_documento' = %s AND estado = 'enviado'", (doc['id'],)
    ).fetchone()[0]
    anotar(
        'Errores',
        'Neo4j detenido: registrar y abrir la ficha; reanudar',
        f'registro HTTP {registro.status_code}; ficha HTTP {ficha.status_code} con '
        f'`secciones_no_disponibles = {ficha.json()["secciones_no_disponibles"]}`; {pendientes} eventos a Neo4j '
        f'pendientes durante la caída; al reanudar, {enviados}/{total} enviados en {round(espera or 0)} s; '
        f'{total - enviados} perdidos',
    )


# ── Volumen y rendimiento ──────────────────────────────────────────────────────

FRASES = [
    'Solicitud de pago a proveedor',
    'Requisición de material de oficina',
    'Invitación a reunión de trabajo',
    'Informe mensual de actividades',
    'Petición de información pública',
    'Requerimiento de expedientes',
    'Aviso de mantenimiento',
    'Solicitud de viáticos',
    'Contrato de servicios de limpieza',
    'Reporte de incidencias',
]
DATOS_TIPO = {
    'requerimiento_auditoria': lambda r: {
        'ente_auditor': r.choice(['Órgano Interno de Control', 'Auditoría Superior de la Federación'])
    },
    'solicitud_transparencia': lambda r: {'solicitante': r.choice(['Ciudadano', 'Juan Hernández Gómez'])},
    'solicitud_material_pago': lambda r: {'concepto': r.choice(['Papelería', 'Equipo de cómputo', 'Mobiliario'])},
}


def generar_volumen(pg, db, grafo, semanas: int = 4, por_semana: int = 300) -> dict:
    """D-35: temporada alta, unos 300 documentos por semana con sus movimientos, escritos en las tres bases como la
    carga de O-41 (sin pasar por el outbox)."""
    r = random.Random(35)  # noqa: S311 - datos de prueba reproducibles
    semilla = esquemas.leer('relational/data/semilla.json')
    titular = {a['id_area']: a['id_titular'] for a in semilla['areas']}
    destinos = [a['id_area'] for a in semilla['areas'] if a['activa'] and a['id_area'] != OP]
    actores = [a['id_actor'] for a in semilla['actores'] if a['activo']]
    tipos = r.choices(
        ['oficio', 'solicitud_material_pago', 'requerimiento_auditoria', 'solicitud_transparencia', 'memorandum'],
        weights=[40, 25, 10, 15, 10],
        k=semanas * por_semana,
    )
    ahora = datetime.now(UTC)
    documentos, folios, movimientos, expedientes, pertenencias, referencias = [], [], [], [], [], []
    for i, tipo in enumerate(tipos):
        recibido = ahora - timedelta(days=r.uniform(1, semanas * 7), hours=r.uniform(0, 8))
        id_doc = str(uuid.uuid4())
        interno = r.random() < 0.3
        documentos.append(
            {
                'id_documento': id_doc,
                'sentido': 'entrada',
                'tipo': tipo,
                'numero_emisor': f'GEN-{i:04d}',
                'id_area_emisora': r.choice(destinos) if interno else None,
                'id_actor_emisor': None if interno else r.choice(actores),
                'id_actor_destinatario': None,
                'fecha_documento': recibido.date().isoformat(),
                'sintesis': f'{r.choice(FRASES)} {i}',
                'confidencial': r.random() < 0.05,
                'estado': 'en_tramite',
                'posible_duplicado': False,
                'duplicado_de': None,
                'motivo_cancelacion': None,
                'extemporaneo': False,
                'canal_inicial': r.choice(['papel', 'correo']),
                'fecha_recepcion_inicial': recibido.isoformat(),
                'canal_segunda': None,
                'fecha_recepcion_segunda': None,
                'fecha_recepcion_oficial': recibido.date().isoformat(),
                'id_responde_a': None,
                'fecha_registro': recibido.isoformat(),
            }
        )
        folios.append(
            {
                'folio': f'OP-2026-{2001 + i}',
                'id_documento': id_doc,
                'id_area': OP,
                'anio': 2026,
                'consecutivo': 2001 + i,
            }
        )
        expedientes.append(
            {
                '_id': id_doc,
                'tipo': tipo,
                'datos_tipo': DATOS_TIPO.get(tipo, lambda _: {})(r),
                'referencias_citadas': [],
                'anexos': [],
                'notas': [],
                'creado_en': recibido.isoformat(),
                'actualizado_en': recibido.isoformat(),
            }
        )

        def mov(tipo_mov, cuando, origen, destino, persona, id_doc=id_doc, **extra):
            movimientos.append(
                {
                    'id_movimiento': str(uuid.uuid4()),
                    'id_documento': id_doc,
                    'tipo': tipo_mov,
                    'fecha_hora': cuando.isoformat(),
                    'id_grupo_turno': extra.pop('grupo', None),
                    'id_area_origen': origen,
                    'id_area_destino': destino,
                    'rol': extra.pop('rol', 'responsable'),
                    'instruccion': None,
                    'motivo': extra.pop('motivo', None),
                    'id_area_sugerida': None,
                    'forma_conclusion': extra.pop('forma', None),
                    'id_persona': persona,
                    'id_titular_al_turnar': extra.pop('titular', None),
                    'id_movimiento_corregido': None,
                    'fecha_registro': cuando.isoformat(),
                }
            )

        mov('registro', recibido, None, OP, r.choice([MARTA, CARMEN]))
        if r.random() < 0.85:
            area = r.choice(destinos)
            turnado = recibido + timedelta(hours=r.uniform(1, 24))
            grupo = str(uuid.uuid4())
            mov('turno', turnado, OP, area, MARTA, grupo=grupo, titular=titular[area])
            if r.random() < 0.3:
                apoyo = r.choice([a for a in destinos if a != area])
                mov('turno', turnado, OP, apoyo, MARTA, grupo=grupo, rol='apoyo', titular=titular[apoyo])
            despues = turnado + timedelta(hours=r.uniform(4, 72))
            if despues < ahora and r.random() < 0.15:
                mov(
                    'devolucion',
                    despues,
                    area,
                    OP,
                    titular[area] or MARTA,
                    motivo=r.choice(['falta_firma', 'falta_anexo']),
                )
            elif despues < ahora and r.random() < 0.3:
                mov('conclusion', despues, area, area, titular[area] or MARTA, forma='enterado')
                documentos[-1]['estado'] = 'concluido'
        if i < 40:  # un hilo más largo para C2: 40 documentos en el asunto «Laboratorios», encadenados
            pertenencias.append(
                {
                    'id': str(uuid.uuid4()),
                    'id_documento': id_doc,
                    'id_asunto': ASUNTO_LAB,
                    'id_persona': MARTA,
                    'fecha_hora': recibido.isoformat(),
                }
            )
            if i > 0:
                referencias.append(
                    {
                        'id': str(uuid.uuid4()),
                        'tipo': 'DA_SEGUIMIENTO_A',
                        'id_origen': id_doc,
                        'id_destino': documentos[i - 1]['id_documento'],
                        'no_registrado': None,
                        'id_persona': MARTA,
                        'fecha_hora': recibido.isoformat(),
                    }
                )
    datos = {
        'areas': [],
        'personas': [],
        'usuarios': [],
        'actores': [],
        'documentos': documentos,
        'folios': folios,
        'movimientos': movimientos,
        'movimiento_origen': [],
        'acuses': [],
    }
    inicio = time.perf_counter()
    esquemas.datos_postgres(pg, datos)
    esquemas.datos_mongo(db, expedientes)
    esquemas.datos_neo4j(grafo, datos, {'asuntos': [], 'pertenece_a': pertenencias, 'referencias': referencias})
    return {
        'documentos': len(documentos),
        'movimientos': len(movimientos),
        'segundos': time.perf_counter() - inicio,
        'ids': [d['id_documento'] for d in documentos],
    }


def rendimiento(volumen: dict) -> None:
    oficialia = cliente('mflores@institucion.gob.mx')
    r = random.Random(50)  # noqa: S311
    muestras = r.sample(volumen['ids'], 50)
    escenarios = {
        'Bandeja de oficialía (`GET /api/bandeja`, 100 por página)': lambda i: oficialia.get(
            '/bandeja', params={'id_area': OP}
        ),
        'Ficha integrada (`GET /api/documentos/{id}`)': lambda i: oficialia.get(f'/documentos/{muestras[i]}'),
        'Recorrido C1 (`GET /api/documentos/{id}/recorrido`)': lambda i: oficialia.get(
            f'/documentos/{muestras[i]}/recorrido'
        ),
        'Búsqueda O-30 por texto (`GET /api/documentos?texto=`)': lambda i: oficialia.get(
            '/documentos', params={'texto': FRASES[i % len(FRASES)].split()[0]}
        ),
        'Hilo C2 de un asunto con 42 documentos (`GET /api/asuntos/{id}/hilo`)': lambda i: oficialia.get(
            f'/asuntos/{ASUNTO_LAB}/hilo'
        ),
    }
    for nombre, pedir in escenarios.items():
        tiempos, fallos = [], 0
        for i in range(50):
            inicio = time.perf_counter()
            respuesta = pedir(i)
            tiempos.append(time.perf_counter() - inicio)
            fallos += respuesta.status_code != 200
        anotar(
            'Rendimiento',
            f'{nombre}, 50 peticiones',
            f'p50 {percentil(tiempos, 0.5)} ms, p95 {percentil(tiempos, 0.95)} ms, {fallos} con error',
        )


C1_CYPHER = """
MATCH (:Documento {id: $id})<-[:SOBRE]-(r:Movimiento {tipo: 'registro'})
MATCH camino = (r)-[:SIGUIENTE*0..]->(m:Movimiento)
RETURN m.id AS id, min(length(camino)) AS paso
ORDER BY paso
"""

C1_SQL = """
WITH RECURSIVE recorrido AS (
  SELECT m.id_movimiento, m.id_area_destino, m.fecha_hora, 0 AS paso
  FROM movimiento m
  WHERE m.id_documento = %(id)s AND m.tipo = 'registro'
  UNION
  SELECT s.id_movimiento, s.id_area_destino, s.fecha_hora, r.paso + 1
  FROM recorrido r
  JOIN movimiento s ON s.id_documento = %(id)s AND s.tipo <> 'correccion' AND s.fecha_hora > r.fecha_hora
  LEFT JOIN movimiento_origen o ON o.id_movimiento = s.id_movimiento
  WHERE (s.id_area_origen = r.id_area_destino OR o.id_area = r.id_area_destino)
    AND NOT EXISTS (
      SELECT 1 FROM movimiento x
      WHERE x.id_documento = %(id)s AND x.tipo <> 'correccion' AND x.id_area_destino = r.id_area_destino
        AND x.fecha_hora > r.fecha_hora AND x.fecha_hora < s.fecha_hora
    )
)
SELECT id_movimiento, min(paso) AS paso FROM recorrido GROUP BY id_movimiento ORDER BY paso
"""


def comparacion(pg, grafo, volumen: dict) -> None:
    """D-09: el recorrido con ramas es una consulta de grafo; en SQL hay que reconstruir SIGUIENTE en cada lectura."""
    muestras = random.Random(9).sample(volumen['ids'], 50)  # noqa: S311
    t_cypher, t_sql, iguales = [], [], 0
    for id_doc in muestras:
        inicio = time.perf_counter()
        en_grafo, _, _ = grafo.execute_query(C1_CYPHER, id=id_doc)
        t_cypher.append(time.perf_counter() - inicio)
        inicio = time.perf_counter()
        en_sql = pg.execute(C1_SQL, {'id': id_doc}).fetchall()
        t_sql.append(time.perf_counter() - inicio)
        # Mismo conjunto de pasos; dentro de un paso (turnos de un mismo grupo) el orden no importa.
        iguales += sorted((r['paso'], r['id']) for r in en_grafo) == sorted((f[1], str(f[0])) for f in en_sql)
    lineas = lambda q: len([linea for linea in q.strip().splitlines() if linea.strip()])  # noqa: E731
    anotar(
        'Comparación',
        'Recorrido C1 de 50 documentos: Cypher sobre SIGUIENTE frente a `WITH RECURSIVE` sobre la bitácora',
        f'Cypher: {lineas(C1_CYPHER)} líneas, p50 {percentil(t_cypher, 0.5)} ms; SQL: {lineas(C1_SQL)} líneas, '
        f'p50 {percentil(t_sql, 0.5)} ms; mismo resultado en {iguales}/50',
    )


# ── Documento ──────────────────────────────────────────────────────────────────


def escribir(lineas_entorno: list[str], volumen: dict) -> Path:
    destino = RAIZ / 'docs' / 'pruebas' / 'evidencia.md'
    texto = [
        '# Evidencia de ejecución',
        '',
        'Generado por `uv run python -m herramientas.medir` (desde `backend/`) contra el despliegue de '
        '`docker compose up -d --build`. '
        'Cada resultado sale de esta ejecución; nada es estimado. La semilla se recarga al empezar y al terminar.',
        '',
        '## Entorno',
        '',
        *lineas_entorno,
        f'- Volumen para rendimiento y comparación: {volumen["documentos"]} documentos y '
        f'{volumen["movimientos"]} movimientos generados (4 semanas de temporada alta, D-35) más la semilla, '
        f'cargados en las tres bases en {volumen["segundos"]:.1f} s.',
        '',
        '## Resultados',
        '',
        '| Tipo de prueba (guía, sección 9) | Escenario | Resultado medido |',
        '| --- | --- | --- |',
        *(f'| {t} | {e} | {r} |' for t, e, r in filas),
        '',
    ]
    destino.write_text('\n'.join(texto), encoding='utf-8', newline='\n')
    return destino


def main() -> None:
    ajustes = cargar_ajustes()
    pg, mongo, grafo = esquemas.conectar(ajustes)
    db = mongo[ajustes.mongo_db]

    def recargar():
        esquemas.esquema_postgres(pg)
        esquemas.vaciar_datos(pg, db, grafo)
        esquemas.cargar_semilla(pg, db, grafo)

    try:
        lineas_entorno = entorno(pg, db, grafo)
        recargar()
        conectividad()
        funcional()  # las pruebas de integración recargan la semilla al terminar
        recargar()
        integridad(pg, db, grafo)
        integracion(pg)
        consistencia(pg, db, grafo)
        errores(pg)
        volumen = generar_volumen(pg, db, grafo)
        rendimiento(volumen)
        comparacion(pg, grafo, volumen)
        print('\n', escribir(lineas_entorno, volumen))
    finally:
        recargar()
        grafo.close()
        mongo.close()
        pg.close()


if __name__ == '__main__':
    main()
