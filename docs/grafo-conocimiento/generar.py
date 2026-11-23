"""Genera README.md, grafo.cypher y grafo.html a partir de grafo.json.
Uso: python build.py grafo.json carpeta_salida
"""
import json, sys, os
from collections import Counter, defaultdict

src, outdir = sys.argv[1], sys.argv[2]
g = json.load(open(src, encoding="utf-8"))
nodos, rels = g["nodos"], g["relaciones"]
N = {n["id"]: n for n in nodos}
inc = defaultdict(list)
for e in rels:
    inc[e["destino"]].append(e)

def by(tipo):
    return [n for n in nodos if n["tipo"] == tipo]

def srcs(id, rel):
    return ", ".join(e["origen"] for e in inc[id] if e["relacion"] == rel) or "—"

ORDEN = ["Proyecto", "Contexto", "Problema", "Hallazgo", "Requerimiento", "Rol", "Consulta", "Operacion", "Patron",
         "Base", "Concepto", "Regla", "Decision", "Hueco", "DeudaTecnica", "Alcance", "Entregable"]
QUE = {
    "Proyecto": "El sistema SIGEDOC",
    "Contexto": "Organización, guía, alcance de evaluación, escenario hipotético de requerimientos y retroalimentación del profesor",
    "Problema": "El problema central",
    "Hallazgo": "Problemas concretos del escenario hipotético (supuestos)",
    "Requerimiento": "Requerimientos funcionales (activos y retirados)",
    "Consulta": "Consultas principales C1 a C5",
    "Operacion": "Catálogo de operaciones de la API",
    "Rol": "Roles de usuario y qué operaciones ejecutan",
    "Patron": "Patrones de acceso por base (AR relacional, AD documental, AG grafo)",
    "Base": "Los tres motores",
    "Concepto": "Conceptos del dominio y su fuente de verdad",
    "Regla": "Reglas de integridad y dónde se imponen",
    "Decision": "Decisiones de diseño tomadas",
    "Hueco": "Huecos técnicos detectados y su estado",
    "DeudaTecnica": "Compromisos aceptados o mitigados",
    "Alcance": "Lo que queda fuera y las limitaciones declaradas",
    "Entregable": "Entregables de la guía y su estado",
}
SIG = {"resuelto": "Una decisión lo cerró", "parcial": "Cubierto en parte; queda trabajo",
       "aceptado": "Se asume como limitación declarada", "eliminado": "Desapareció al cambiar el alcance",
       "abierto": "Sin resolver"}
tipos = Counter(n["tipo"] for n in nodos)
L = []
w = L.append
w("# Grafo de conocimiento del proyecto SIGEDOC\n")
w(f"Actualizado: {g['actualizado']}\n")
w("Este grafo reúne el contexto de la problemática, la solución con tres bases de datos (PostgreSQL, MongoDB y Neo4j), las decisiones tomadas, los huecos detectados y las deudas técnicas, y cómo se conectan entre sí. Sirve para justificar cualquier decisión rastreándola hasta el escenario hipotético de requerimientos, la guía del proyecto o la retroalimentación del profesor.\n")
w("## Archivos\n")
w("| Archivo | Para qué sirve |\n| --- | --- |")
w("| `grafo.json` | Fuente única: nodos y relaciones. Edítalo aquí y regenera lo demás. |")
w("| `grafo.html` | Visor interactivo. Ábrelo con doble clic en el navegador; no necesita internet. |")
w("| `grafo.cypher` | Script para cargar el grafo en Neo4j, con consultas de ejemplo al final. |")
w("| `verificar.py` | Revisa que cada hueco, deuda, requerimiento y decisión tenga las relaciones que su estado exige. |")
w("| `generar.py` | Regenera este README, el visor y el script Cypher a partir del JSON. |")
w("| `visor.html` | Plantilla del visor (paneles ajustables y ocultables); `generar.py` la necesita en la misma carpeta. |")
w("| `README.md` | Este resumen. |\n")
w(f"## Contenido: {len(nodos)} nodos y {len(rels)} relaciones\n")
w("| Tipo de nodo | Cantidad | Qué representa |\n| --- | --- | --- |")
for t in ORDEN:
    if tipos[t]:
        w(f"| {t} | {tipos[t]} | {QUE.get(t, '')} |")
w("")
hu = by("Hueco")
w("## Estado de los huecos\n")
w("| Estado | Cantidad | Significado |\n| --- | --- | --- |")
hc = Counter(n["estado"] for n in hu)
for s in ["resuelto", "parcial", "aceptado", "eliminado", "abierto"]:
    if hc[s]:
        w(f"| {s} | {hc[s]} | {SIG[s]} |")
w("\n### Huecos abiertos o parciales\n")
w("| ID | Hueco | Estado | Nota |\n| --- | --- | --- | --- |")
pend = [n for n in hu if n["estado"] in ("abierto", "parcial")]
for n in pend:
    w(f"| {n['id']} | {n['nombre']} | {n['estado']} | {n['descripcion']} |")
if not pend:
    w("| — | Ninguno | — | Todos los huecos están resueltos, aceptados o eliminados. |")
w("\n### Huecos aceptados\n")
w("| ID | Hueco | Aceptado por | Nota |\n| --- | --- | --- | --- |")
for n in hu:
    if n["estado"] == "aceptado":
        w(f"| {n['id']} | {n['nombre']} | {srcs(n['id'], 'ACEPTA')} | {n['descripcion']} |")
w("\n## Deudas técnicas\n")
w("Una deuda **parchada** tiene una decisión que la mitiga; una **aceptada** se asume conscientemente para acotar el alcance.\n")
w("| ID | Deuda | Estado | Generada por | Mitigada por |\n| --- | --- | --- | --- | --- |")
for n in by("DeudaTecnica"):
    w(f"| {n['id']} | {n['nombre']} | {n['estado']} | {srcs(n['id'], 'GENERA')} | {srcs(n['id'], 'MITIGA')} |")
w("\n## Fuera de alcance\n")
for n in by("Alcance"):
    w(f"**{n['nombre']}.** {n['descripcion']}\n")
w("## Reglas de integridad\n")
w("| ID | Regla | Se impone en | Detalle |\n| --- | --- | --- | --- |")
for n in by("Regla"):
    w(f"| {n['id']} | {n['nombre']} | {n.get('imposicion', '')} | {n['descripcion']} |")
w("\n## Roles\n")
w("| ID | Rol | Qué hace |\n| --- | --- | --- |")
for n in by("Rol"):
    w(f"| {n['id']} | {n['nombre']} | {n['descripcion']} |")
w("\n## Operaciones\n")
w("El detalle (qué recibe, qué devuelve y reglas) está en cada nodo y en el documento de operaciones.\n")
w("| ID | Operación | Rol | Tipo | Bases | Frec. |\n| --- | --- | --- | --- | --- | --- |")
for n in sorted(by("Operacion"), key=lambda x: int(x["id"].split("-")[1])):
    w(f"| {n['id']} | {n['nombre']} | {n.get('roles','')} | {n.get('tipo_operacion','')} | {n.get('bases','')} | {n.get('frecuencia','')} |")
w("\n## Patrones de acceso\n")
w("| ID | Base | Patrón | Sirve a |\n| --- | --- | --- | --- |")
srv = defaultdict(list)
for e in rels:
    if e["relacion"] == "SIRVE_A":
        srv[e["origen"]].append(e["destino"])
for n in by("Patron"):
    w(f"| {n['id']} | {n.get('base','')} | {n['nombre']} | {', '.join(srv[n['id']])} |")
w("\n## Decisiones\n")
w("Las marcadas con * son supuestos declarados, pendientes de validar con dirección y Jurídico.\n")
w("| ID | Decisión | Justificada por | Detalle |\n| --- | --- | --- | --- |")
for n in by("Decision"):
    mark = " *" if n.get("supuesto") else ""
    w(f"| {n['id']} | {n['nombre']}{mark} | {srcs(n['id'], 'JUSTIFICA')} | {n['descripcion']} |")
w("\n## Tipos de relación\n")
w("| Relación | Cantidad |\n| --- | --- |")
for r, c in sorted(Counter(e["relacion"] for e in rels).items()):
    w(f"| {r} | {c} |")
w("\n## Cómo mantenerlo\n")
w("1. Agrega o cambia nodos y relaciones en `grafo.json`. Cada relación usa los `id` de sus nodos de origen y destino.")
w("2. Ejecuta `python verificar.py grafo.json`. Debe terminar sin errores; un aviso indica algo cubierto solo por una regla o una decisión.")
w("3. Ejecuta `python generar.py grafo.json .` para regenerar este README, `grafo.html` y `grafo.cypher`.")
w("4. Para consultarlo con Cypher, ejecuta `grafo.cypher` en una base de Neo4j dedicada (no en la base del proyecto).")
open(os.path.join(outdir, "README.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")

# ---------- Cypher ----------
def lit(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("\\", "\\\\").replace("'", "\\'") + "'"

C = ["// Grafo de conocimiento de SIGEDOC. Ejecutar en una base de Neo4j dedicada.",
     f"// Actualizado: {g['actualizado']}", "",
     "CREATE CONSTRAINT nodo_id IF NOT EXISTS FOR (n:Nodo) REQUIRE n.id IS UNIQUE;", ""]
for n in nodos:
    props = ", ".join(f"{k}: {lit(v)}" for k, v in n.items() if k not in ("id", "tipo"))
    C.append(f"MERGE (n:Nodo:`{n['tipo']}` {{id: {lit(n['id'])}}}) SET n += {{{props}}};")
C.append("")
for e in rels:
    C.append(f"MATCH (a:Nodo {{id: {lit(e['origen'])}}}), (b:Nodo {{id: {lit(e['destino'])}}}) MERGE (a)-[:`{e['relacion']}`]->(b);")
C += ["", "// ---------- Consultas de ejemplo ----------", "",
      "// Huecos abiertos o parciales y a qué entregable afectan",
      "MATCH (h:Hueco) WHERE h.estado IN ['abierto', 'parcial']",
      "OPTIONAL MATCH (h)-[:AFECTA|BLOQUEA]->(e:Entregable)",
      "RETURN h.id, h.nombre, h.estado, collect(e.id) AS entregables;", "",
      "// Rastrear una decisión hasta el escenario hipotético: hallazgo que la justifica o que origina lo que afecta",
      "MATCH (d:Decision {id: 'D-29'})",
      "OPTIONAL MATCH (h:Hallazgo)-[:JUSTIFICA]->(d)",
      "OPTIONAL MATCH (d)-[:AFECTA]->(:Requerimiento)<-[:ORIGINA]-(h2:Hallazgo)",
      "RETURN d.nombre, collect(DISTINCT h.referencia_escenario) + collect(DISTINCT h2.referencia_escenario) AS referencias;", "",
      "// Deudas con la decisión que las genera y la que las mitiga",
      "MATCH (g:Decision)-[:GENERA]->(t:DeudaTecnica)",
      "OPTIONAL MATCH (m:Decision)-[:MITIGA]->(t)",
      "RETURN t.id, t.nombre, t.estado, g.id AS generada_por, collect(m.id) AS mitigada_por ORDER BY t.id;", "",
      "// Qué base es fuente de verdad de cada concepto y dónde se replica",
      "MATCH (b:Base)-[:FUENTE_DE_VERDAD_DE]->(k:Concepto)",
      "OPTIONAL MATCH (k)-[:REPLICADO_EN]->(r:Base)",
      "RETURN k.nombre, b.nombre AS fuente, collect(r.nombre) AS replicas;", "",
      "// Requerimientos y la consulta u operación que los implementa",
      "MATCH (r:Requerimiento {estado: 'activo'})",
      "OPTIONAL MATCH (x)-[:IMPLEMENTA]->(r)",
      "RETURN r.id, r.nombre, collect(x.id) AS implementado_por ORDER BY r.id;", ""]
open(os.path.join(outdir, "grafo.cypher"), "w", encoding="utf-8").write("\n".join(C))

# ---------- HTML ----------
tpl = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "visor.html"), encoding="utf-8").read()
data = json.dumps(g, ensure_ascii=False).replace("</", "<\\/")
html = tpl.replace("__DATOS__", data).replace("__FECHA__", g["actualizado"])
open(os.path.join(outdir, "grafo.html"), "w", encoding="utf-8").write(html)
print("Listo:", outdir)
