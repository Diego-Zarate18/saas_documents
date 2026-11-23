import type { MotivoDevolucion, RolTurno, TipoRelacion } from '../../api/tipos'

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
