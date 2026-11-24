// Acciones que la ficha muestra a cada rol (D-44, D-62). El servicio vuelve a validar cada operación.
import type { Ficha, Sesion } from '../api/tipos'

export interface AccionesFicha {
  turnar: boolean
  /** O-07: quien ve el contenido del documento (D-29). Oficialía lo tiene como botón (V-04); titular y personal, en «Más». */
  relacionar: boolean
  devolver: boolean
  atraer: boolean
  concluir: boolean
  /** «Más acciones» de oficialía (V-04d) o «Más» del área (V-04b, V-04e). */
  menu: 'oficialia' | 'area' | null
  agregarAnexo: boolean
  agregarNota: boolean
}

export function accionesFicha({ rol, nombre_area }: Sesion, ficha: Ficha): AccionesFicha {
  const enTramite = ficha.registro.estado === 'en_tramite' && ficha.acceso === 'completo'
  const aqui = ficha.ubicacion_actual.find((u) => u.area === nombre_area)
  const responsableAqui = aqui?.rol === 'responsable'
  const delArea = rol === 'TI' || rol === 'PE'
  return {
    // Oficialía y dirección turnan cualquier documento; el titular, lo que tiene pendiente en su área.
    turnar: enTramite && (rol === 'OF' || rol === 'DI' || (rol === 'TI' && aqui !== undefined)),
    relacionar: enTramite && rol !== 'DI' && !ficha.contenido_oculto,
    devolver: enTramite && rol === 'TI' && aqui !== undefined,
    // O-23: el titular con visibilidad (acceso completo) cuya área no es ya la responsable (V-08).
    atraer: enTramite && rol === 'TI' && !responsableAqui,
    // Concluye el titular o el personal del área responsable (D-44, D-58).
    concluir: enTramite && delArea && responsableAqui,
    // El «Más» del área solo tiene acciones sobre el contenido (relacionar y asunto): sin verlo, no aparece.
    menu: !enTramite ? null : rol === 'OF' ? 'oficialia' : delArea && !ficha.contenido_oculto ? 'area' : null,
    agregarAnexo: enTramite && rol === 'OF',
    agregarNota: enTramite && rol !== 'DI',
  }
}
