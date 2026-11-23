import type { Canal, FormaConclusion, MotivoDevolucion, Movimiento, RolTurno, TipoDocumento, TipoRelacion } from '../../api/tipos'

/** Motivos de devolución (D-32), como los escribe el Figma. */
export const TEXTO_MOTIVO: Record<MotivoDevolucion, string> = {
  falta_informacion: 'falta información',
  falta_firma: 'falta firma',
  falta_anexo: 'falta anexo',
  corregir_dato: 'corregir un dato',
  no_competencia: 'no es de su competencia',
}

/** Relaciones entre documentos (D-05). */
export const TEXTO_RELACION: Record<TipoRelacion, string> = {
  responde_a: 'Responde a',
  da_seguimiento_a: 'Da seguimiento a',
  en_alcance_a: 'En alcance a',
  sustituye_a: 'Sustituye a',
}

/** Estados del documento (en trámite, concluido, cancelado, sin efecto) y marcas. Rebote es una detección de C3. */
export type ClaveEstado =
  | 'en_tramite'
  | 'concluido'
  | 'cancelado'
  | 'sin_efecto'
  | 'posible_duplicado'
  | 'rebote'
  | 'confidencial'
  | 'extemporaneo'

export const TEXTO_ESTADO: Record<ClaveEstado, string> = {
  en_tramite: 'En trámite',
  concluido: 'Concluido',
  cancelado: 'Cancelado',
  sin_efecto: 'Sin efecto',
  posible_duplicado: 'Posible duplicado',
  rebote: 'Rebote',
  confidencial: 'Confidencial',
  extemporaneo: 'Extemporáneo',
}

export const TEXTO_ROL: Record<RolTurno, string> = {
  responsable: 'Responsable',
  apoyo: 'Apoyo',
  conocimiento: 'Conocimiento',
}

/** Los siete tipos de documento (D-65), como los nombra la interfaz. */
export const TEXTO_TIPO: Record<TipoDocumento, string> = {
  oficio: 'Oficio',
  solicitud_material_pago: 'Solicitud de material o pago',
  requerimiento_auditoria: 'Requerimiento de auditoría',
  solicitud_transparencia: 'Solicitud de transparencia',
  memorandum: 'Memorándum',
  circular: 'Circular',
  informe: 'Informe',
}

export const TEXTO_CANAL: Record<Canal, string> = { correo: 'Correo', papel: 'Papel' }

/** Formas de conclusión (D-59), como las escribe el Figma. */
export const TEXTO_FORMA: Record<FormaConclusion, string> = {
  con_respuesta: 'Con documento de respuesta',
  atencion_sin_oficio: 'Atención sin oficio',
  enterado: 'Enterado',
  no_procede: 'No procede',
  duplicado: 'Duplicado',
}

/** Qué fue un movimiento, en una línea: «Turno como responsable», «Devolución · falta firma». */
export function textoMovimiento(m: Movimiento): string {
  switch (m.tipo) {
    case 'registro':
      return 'Registro'
    case 'devolucion':
      return `Devolución · ${m.motivo ? TEXTO_MOTIVO[m.motivo] : ''}`
    case 'atraccion':
      return 'Atracción como responsable'
    case 'conclusion':
      return `Conclusión · ${m.forma_conclusion ? TEXTO_FORMA[m.forma_conclusion].toLowerCase() : ''}`
    case 'correccion':
      return `Corrección del rol a ${m.rol}`
    case 'turno':
      return m.rol === 'conocimiento' ? 'Turno para conocimiento' : `Turno como ${m.rol}`
  }
}
