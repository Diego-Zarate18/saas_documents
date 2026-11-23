// Acciones que la ficha muestra a cada rol (D-44, D-62). El servicio vuelve a validar cada operación.
import type { Ficha, Sesion } from '../api/tipos'

export interface AccionesFicha {
  turnar: boolean
  relacionar: boolean
  devolver: boolean
  concluir: boolean
  masAcciones: boolean
  agregarAnexo: boolean
  agregarNota: boolean
}

export function accionesFicha({ rol, nombre_area }: Sesion, ficha: Ficha): AccionesFicha {
  const enTramite = ficha.registro.estado === 'en_tramite' && ficha.acceso === 'completo'
  const aqui = ficha.ubicacion_actual.find((u) => u.area === nombre_area)
  const responsableAqui = aqui?.rol === 'responsable'
  return {
    // Oficialía y dirección turnan cualquier documento; el titular, lo que tiene pendiente en su área.
    turnar: enTramite && (rol === 'OF' || rol === 'DI' || (rol === 'TI' && aqui !== undefined)),
    relacionar: enTramite && rol === 'OF',
    devolver: enTramite && rol === 'TI' && aqui !== undefined,
    // Concluye el titular o el personal del área responsable (D-44, D-58).
    concluir: enTramite && (rol === 'TI' || rol === 'PE') && responsableAqui,
    masAcciones: enTramite && rol !== 'DI',
    agregarAnexo: enTramite && rol === 'OF',
    agregarNota: enTramite && rol !== 'DI',
  }
}
