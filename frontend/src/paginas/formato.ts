// Formatos de fecha y de días de las vistas. Fechas en America/Mexico_City (arquitectura, sección 4).

const partes = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function piezas(iso: string) {
  const p = Object.fromEntries(partes.formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  return { dia: p.day, mes: p.month, anio: p.year, hora: `${p.hour}:${p.minute}` }
}

/** «17 nov 2026» de una fecha AAAA-MM-DD (sin cambio de zona). */
export function fecha(aaaammdd: string) {
  const { dia, mes, anio } = piezas(`${aaaammdd}T12:00:00-06:00`)
  return `${dia} ${mes} ${anio}`
}

/** «18 nov 2026, 09:12». */
export function fechaHora(iso: string) {
  const { dia, mes, anio, hora } = piezas(iso)
  return `${dia} ${mes} ${anio}, ${hora}`
}

/** «18 nov, 09:12» (ficha) o «18 nov 09:12» (vista previa de la bandeja). */
export function diaHora(iso: string, coma = true) {
  const { dia, mes, hora } = piezas(iso)
  return `${dia} ${mes}${coma ? ',' : ''} ${hora}`
}

/** «1 día», «12 días». */
export const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`
