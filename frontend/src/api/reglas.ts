import type { DestinoTurno } from './tipos'

/**
 * O-03 / RI-10: valida un grupo de turno. Devuelve el mensaje de error o null si es válido.
 * La usa la fuente simulada (como lo hará el servicio) y V-05 para deshabilitar «Turnar».
 */
export function validarGrupoTurno(destinos: Pick<DestinoTurno, 'id_area' | 'rol'>[]): string | null {
  if (destinos.length === 0) return 'Agrega al menos un área.'
  if (destinos.some((d) => !d.id_area)) return 'Elige el área de cada fila.'
  if (new Set(destinos.map((d) => d.id_area)).size !== destinos.length) return 'Cada área puede aparecer una sola vez.'
  const responsables = destinos.filter((d) => d.rol === 'responsable').length
  if (responsables === 0) return 'Falta un responsable en el grupo.'
  if (responsables > 1) return 'Solo puede haber un responsable en el grupo.'
  return null
}
