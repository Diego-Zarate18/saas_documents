// GET /api/salud (T-03): estado de la conexión de la API con las tres bases. Solo lo usa el aviso del modo «real»;
// queda fuera de ApiSigedoc y del simulador y no se exporta desde index.ts. En desarrollo, Vite reenvía /api al backend.

export type NombreBase = 'postgres' | 'mongo' | 'neo4j'

export interface EstadoBase {
  ok: boolean
  ms: number
  /** Fijo en el backend: nunca lleva detalles del driver. */
  error: 'sin conexión' | 'tiempo agotado' | null
}

export interface Salud {
  estado: 'ok' | 'degradado'
  bases: Record<NombreBase, EstadoBase>
}

/** 200 (todo bien) y 503 (alguna base falla) traen el mismo cuerpo; otra respuesta o un fallo de red, rechaza. */
export async function obtenerSalud(senal?: AbortSignal): Promise<Salud> {
  const respuesta = await fetch('/api/salud', { signal: senal, headers: { Accept: 'application/json' } })
  if (respuesta.status !== 200 && respuesta.status !== 503) throw new Error(`GET /api/salud respondió ${respuesta.status}`)
  return (await respuesta.json()) as Salud
}
