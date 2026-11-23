// Reglas que comparten la fuente simulada (como lo hará el servicio) y los formularios, para que el
// error en línea y el rechazo del servidor digan lo mismo.
import type { CampoTipo, Conclusion, DatosTipo, DestinoTurno } from './tipos'

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

/** D-66: errores por campo propio del tipo (obligatorios vacíos). Vacío si todo es válido. */
export function validarDatosTipo(campos: CampoTipo[], datos: DatosTipo): Record<string, string> {
  const errores: Record<string, string> = {}
  for (const c of campos) {
    const valor = datos[c.clave]
    const lleno = Array.isArray(valor) ? valor.some((v) => v.trim()) : Boolean(valor?.trim())
    if (c.obligatorio && !lleno) errores[c.clave] = `Escribe el campo «${c.etiqueta}».`
  }
  return errores
}

/** O-05 / D-59: lo que exige cada forma de conclusión. Devuelve el mensaje de error o null. */
export function validarConclusion(c: Conclusion): string | null {
  if (c.forma === 'con_respuesta' && !c.id_respuesta) return 'Elige el documento de respuesta.'
  if (c.forma === 'duplicado' && !c.id_original) return 'Elige el documento original.'
  // Toda forma salvo con_respuesta y enterado lleva nota obligatoria.
  if (c.forma !== 'con_respuesta' && c.forma !== 'enterado' && !c.nota.trim())
    return c.forma === 'atencion_sin_oficio' ? 'Escribe la evidencia de la atención.' : 'Escribe el motivo.'
  return null
}
