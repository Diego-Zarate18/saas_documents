import { useQuery } from '@tanstack/react-query'
import { type NombreBase, obtenerSalud } from '../../api/salud'
import { Aviso } from './Aviso'

const NOMBRE: Record<NombreBase, string> = { postgres: 'PostgreSQL', mongo: 'MongoDB', neo4j: 'Neo4j' }

/**
 * Lo que main.tsx muestra con VITE_API_MODO=real mientras las vistas no se conectan a la API (T-15): el aviso de
 * siempre y, debajo, una línea por base con el resultado de GET /api/salud (T-03).
 */
export function AvisoApiReal() {
  const salud = useQuery({ queryKey: ['salud'], queryFn: ({ signal }) => obtenerSalud(signal) })

  return (
    <Aviso tono="info" rol="alert">
      <p>La API real aún no está disponible.</p>
      {salud.isPending && <p>Consultando el estado de la API…</p>}
      {salud.isError && <p>No se pudo consultar el estado de la API</p>}
      {salud.isSuccess && (
        <ul aria-label="Estado de las bases">
          {(Object.keys(NOMBRE) as NombreBase[]).map((base) => {
            const { ok, error } = salud.data.bases[base]
            return <li key={base}>{`${NOMBRE[base]}: ${ok ? 'ok' : error}`}</li>
          })}
        </ul>
      )}
    </Aviso>
  )
}
