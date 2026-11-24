// Diseño propio para revisar: el Figma solo dibuja «+ Agregar» en Anexos y Notas (V-04).
// Siguen el patrón de los modales de T-02a: botón deshabilitado hasta que es válido, error en línea al salir del campo.
import { useState } from 'react'
import { useAgregarAnexo, useAgregarNota } from '../../api/consultas'
import type { Ficha } from '../../api/tipos'
import { AreaTexto, Campo } from '../../componentes/base/Campo'
import { Boton } from '../../componentes/base/Boton'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Modal } from '../../componentes/compuestos/Modal'

interface Props {
  ficha: Ficha
  abierto: boolean
  alCambiar: (abierto: boolean) => void
}

const VACIO = { titulo: '', hojas: '', ubicacion: '' }

/** O-28 Agregar anexo: solo datos descriptivos, sin archivo (DT-03). */
export function AgregarAnexo({ ficha, abierto, alCambiar }: Props) {
  const [anexo, setAnexo] = useState(VACIO)
  const [tocado, setTocado] = useState<Partial<Record<keyof typeof VACIO, boolean>>>({})
  const agregar = useAgregarAnexo(ficha.registro.id)
  const hojas = Number(anexo.hojas)
  const errores = {
    titulo: anexo.titulo.trim() ? undefined : 'Escribe la descripción del anexo.',
    hojas: Number.isInteger(hojas) && hojas >= 1 ? undefined : 'El número de hojas debe ser 1 o más.',
    ubicacion: anexo.ubicacion.trim() ? undefined : 'Escribe la ubicación física.',
  }
  const valido = !errores.titulo && !errores.hojas && !errores.ubicacion

  function cerrar(abrir: boolean) {
    if (!abrir) {
      setAnexo(VACIO)
      setTocado({})
      agregar.reset()
    }
    alCambiar(abrir)
  }

  const campo = (clave: keyof typeof VACIO) => ({
    value: anexo[clave],
    error: tocado[clave] ? errores[clave] : undefined,
    onChange: (e: { target: { value: string } }) => setAnexo((a) => ({ ...a, [clave]: e.target.value })),
    onBlur: () => setTocado((t) => ({ ...t, [clave]: true })),
  })

  return (
    <Modal
      abierto={abierto}
      alCambiar={cerrar}
      folio={ficha.registro.folio}
      titulo="Agregar anexo"
      descripcion="Solo se registran los datos del anexo en papel: qué es, cuántas hojas tiene y dónde está."
      ancho={560}
      pie={
        <>
          <Boton variante="fantasma" onClick={() => cerrar(false)}>
            Cancelar
          </Boton>
          <Boton
            icono="mas"
            disabled={!valido}
            pendiente={agregar.isPending}
            onClick={() =>
              agregar.mutate({ titulo: anexo.titulo, hojas, ubicacion: anexo.ubicacion }, { onSuccess: () => cerrar(false) })
            }
          >
            Agregar anexo
          </Boton>
        </>
      }
    >
      <Campo blanco etiqueta="Descripción" {...campo('titulo')} />
      <Campo blanco etiqueta="Número de hojas" type="number" min={1} step={1} inputMode="numeric" {...campo('hojas')} />
      <Campo blanco etiqueta="Ubicación física" ayuda="Por ejemplo: Archivo de oficialía, gaveta 2." {...campo('ubicacion')} />
      <ErrorOperacion error={agregar.error} que="agregar el anexo" />
    </Modal>
  )
}

/** O-29 Agregar nota: autor, área y fecha los pone el servidor. */
export function AgregarNota({ ficha, abierto, alCambiar }: Props) {
  const [texto, setTexto] = useState('')
  const [tocado, setTocado] = useState(false)
  const agregar = useAgregarNota(ficha.registro.id)
  const vacio = !texto.trim()

  function cerrar(abrir: boolean) {
    if (!abrir) {
      setTexto('')
      setTocado(false)
      agregar.reset()
    }
    alCambiar(abrir)
  }

  return (
    <Modal
      abierto={abierto}
      alCambiar={cerrar}
      folio={ficha.registro.folio}
      titulo="Agregar nota"
      descripcion="La nota queda en el expediente con tu nombre, tu área y la fecha."
      ancho={560}
      pie={
        <>
          <Boton variante="fantasma" onClick={() => cerrar(false)}>
            Cancelar
          </Boton>
          <Boton
            icono="mas"
            disabled={vacio}
            pendiente={agregar.isPending}
            onClick={() => agregar.mutate(texto, { onSuccess: () => cerrar(false) })}
          >
            Agregar nota
          </Boton>
        </>
      }
    >
      <AreaTexto
        blanco
        rows={4}
        etiqueta="Nota"
        error={tocado && vacio ? 'Escribe la nota.' : undefined}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => setTocado(true)}
      />
      <ErrorOperacion error={agregar.error} que="agregar la nota" />
    </Modal>
  )
}
