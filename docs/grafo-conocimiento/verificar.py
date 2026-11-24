"""Verifica la consistencia del grafo de SIGEDOC."""
import json, sys
from collections import Counter, defaultdict

g = json.load(open(sys.argv[1], encoding="utf-8"))
N = {}
errs, warns = [], []
for n in g["nodos"]:
    if n["id"] in N:
        errs.append(f"id duplicado {n['id']}")
    N[n["id"]] = n
inc, out = defaultdict(list), defaultdict(list)
seen = set()
for e in g["relaciones"]:
    k = (e["origen"], e["relacion"], e["destino"])
    if k in seen:
        errs.append(f"relación duplicada {k}")
    seen.add(k)
    for end in ("origen", "destino"):
        if e[end] not in N:
            errs.append(f"extremo inexistente {k}")
    inc[e["destino"]].append(e)
    out[e["origen"]].append(e)

def inn(id, rel, tipo=None):
    return [e for e in inc[id] if e["relacion"] == rel and (tipo is None or N[e["origen"]]["tipo"] == tipo)]

def outs(id, rel):
    return [e for e in out[id] if e["relacion"] == rel]

ESTADOS_HU = {"resuelto", "parcial", "aceptado", "eliminado", "abierto"}
for id, n in N.items():
    t, est = n["tipo"], n.get("estado")
    if t == "Hueco":
        if est not in ESTADOS_HU:
            errs.append(f"{id} estado inválido {est}")
        if not inn(id, "TIENE_HUECO"):
            errs.append(f"{id} sin TIENE_HUECO")
        p, a = inn(id, "PARCHA"), inn(id, "ACEPTA")
        if est in ("resuelto", "eliminado") and not p:
            errs.append(f"{id} {est} sin PARCHA")
        if est == "aceptado" and not a:
            errs.append(f"{id} aceptado sin ACEPTA")
        if est == "abierto" and (p or a):
            errs.append(f"{id} abierto pero con PARCHA/ACEPTA")
    if t == "DeudaTecnica":
        if not inn(id, "TIENE_DEUDA"):
            errs.append(f"{id} sin TIENE_DEUDA")
        if not inn(id, "GENERA"):
            errs.append(f"{id} sin GENERA")
        m = inn(id, "MITIGA")
        if est == "parchada" and not m:
            errs.append(f"{id} parchada sin MITIGA")
        if est == "aceptada" and m:
            errs.append(f"{id} aceptada pero con MITIGA")
        if est not in ("parchada", "aceptada"):
            errs.append(f"{id} estado inválido {est}")
    if t == "Requerimiento":
        if est == "activo":
            if not inn(id, "ORIGINA"):
                errs.append(f"{id} activo sin hallazgo de origen")
            if not inn(id, "ATIENDE") and not outs(id, "ATIENDE"):
                errs.append(f"{id} no atiende el problema")
            if not inn(id, "IMPLEMENTA"):
                if inn(id, "REGULA") or inn(id, "AFECTA", "Decision"):
                    warns.append(f"{id} cubierto solo por regla o decisión, sin operación")
                elif [e for e in inn(id, "AFECTA", "Hueco") if N[e["origen"]].get("estado") == "abierto"]:
                    warns.append(f"{id} sin operación; lo registra un hueco abierto")
                else:
                    errs.append(f"{id} sin consulta, operación, regla ni decisión que lo cubra")
        elif est == "retirado" and not inn(id, "RETIRA"):
            errs.append(f"{id} retirado sin RETIRA")
    if t == "Hallazgo":
        if not inn(id, "REVELA"):
            errs.append(f"{id} sin entrevista que lo revele")
        if not outs(id, "CONTRIBUYE_A"):
            errs.append(f"{id} no contribuye al problema")
        if not outs(id, "ORIGINA"):
            errs.append(f"{id} no origina ningún requerimiento")
    if t == "Decision" and not inn(id, "TOMA"):
        errs.append(f"{id} sin TOMA")
    if t == "Decision" and not out[id]:
        errs.append(f"{id} no afecta nada")
    if t == "Consulta" and not outs(id, "USA"):
        errs.append(f"{id} no usa ninguna base")
    if t == "Operacion" and not outs(id, "USA"):
        errs.append(f"{id} no usa ninguna base")
    if t == "Regla" and not outs(id, "SE_IMPONE_EN"):
        errs.append(f"{id} sin dónde se impone")
    if t == "Concepto":
        if not inn(id, "FUENTE_DE_VERDAD_DE"):
            errs.append(f"{id} sin fuente de verdad")
        if len(inn(id, "FUENTE_DE_VERDAD_DE")) > 1:
            errs.append(f"{id} con más de una fuente de verdad")
    if t == "Entregable" and not inn(id, "ENTREGA"):
        errs.append(f"{id} sin ENTREGA")
    # nodos aislados
    if not inc[id] and not out[id]:
        errs.append(f"{id} aislado")

# referencias a ids en descripciones que no existen como nodo
import re
eliminados = {x for n in N.values() for x in n.get("ids_eliminados", [])}
for id, n in N.items():
    for ref in re.findall(r"\b(?:RF|RI|O|D|DT|HU|C|H|E)-\d+\b", n["descripcion"]):
        if ref not in N and ref not in eliminados:
            warns.append(f"{id} menciona {ref}, que no existe como nodo")

print("Nodos:", len(N), "Relaciones:", len(g["relaciones"]))
print("Por tipo:", dict(Counter(n["tipo"] for n in N.values())))
print("Huecos:", dict(Counter(n["estado"] for n in N.values() if n["tipo"] == "Hueco")))
print("Deudas:", dict(Counter(n["estado"] for n in N.values() if n["tipo"] == "DeudaTecnica")))
print("\nERRORES:", len(errs))
for e in errs: print("  -", e)
print("AVISOS:", len(warns))
for w in warns: print("  -", w)
