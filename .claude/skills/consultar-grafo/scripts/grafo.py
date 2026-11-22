"""Consulta el grafo de conocimiento de SIGEDOC sin cargarlo completo en el contexto.

Uso (desde la raíz del repositorio):
  python .claude/skills/consultar-grafo/scripts/grafo.py O-01 D-29        # nodos con sus relaciones
  python .claude/skills/consultar-grafo/scripts/grafo.py --tipo Operacion  # lista por tipo
  python .claude/skills/consultar-grafo/scripts/grafo.py --buscar folio    # busca en id, nombre y descripción
  python .claude/skills/consultar-grafo/scripts/grafo.py --operacion O-01  # operación con patrones, decisiones y RF
Solo usa la biblioteca estándar. Es de lectura: nunca modifica el grafo.
"""
import argparse
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[4]
GRAFO = RAIZ / "docs" / "grafo-conocimiento" / "grafo.json"
CATALOGO = RAIZ / "docs" / "operaciones" / "catalogo.json"


def cargar():
    g = json.loads(GRAFO.read_text(encoding="utf-8"))
    return {n["id"]: n for n in g["nodos"]}, g["relaciones"]


def corto(n):
    return f'{n["id"]} [{n["tipo"]}] {n["nombre"]}'


def mostrar(id, N, R):
    n = N.get(id)
    if not n:
        print(f"{id}: no existe en el grafo")
        return
    print("=" * 72)
    print(corto(n))
    for k, v in n.items():
        if k not in ("id", "tipo", "nombre"):
            print(f"  {k}: {v}")
    sal = [r for r in R if r["origen"] == id]
    ent = [r for r in R if r["destino"] == id]
    if sal:
        print("  salientes:")
        for r in sal:
            print(f'    -{r["relacion"]}-> {corto(N[r["destino"]])}')
    if ent:
        print("  entrantes:")
        for r in ent:
            print(f'    <-{r["relacion"]}- {corto(N[r["origen"]])}')


def operacion(id, N, R):
    cat = json.loads(CATALOGO.read_text(encoding="utf-8"))
    op = next((o for o in cat["operaciones"] if o["id"] == id), None)
    if not op:
        print(f"{id}: no está en el catálogo")
        return
    print("=" * 72)
    for k, v in op.items():
        print(f"{k}: {v}")
    pats = [p for p in cat["patrones"] if id in p["sirve_a"]]
    print("patrones:")
    for p in pats:
        print(f'  {p["id"]} ({p["base"]}) {p["nombre"]}: {p["mecanismo"]}')
    decs = sorted({r["origen"] for r in R if r["destino"] == id and N[r["origen"]]["tipo"] == "Decision"})
    for d in decs:
        print(f'decisión {corto(N[d])}: {N[d]["descripcion"]}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--tipo")
    ap.add_argument("--buscar")
    ap.add_argument("--operacion")
    a = ap.parse_args()
    N, R = cargar()
    if a.tipo:
        for n in N.values():
            if n["tipo"].lower() == a.tipo.lower():
                print(corto(n))
    if a.buscar:
        t = a.buscar.lower()
        for n in N.values():
            if t in json.dumps(n, ensure_ascii=False).lower():
                print(corto(n))
    if a.operacion:
        operacion(a.operacion, N, R)
    for id in a.ids:
        mostrar(id, N, R)
    if not (a.tipo or a.buscar or a.operacion or a.ids):
        ap.print_help()


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
