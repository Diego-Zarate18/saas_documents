import { useState } from 'react'
import { useAreas, useCatalogos, useRegistrarSalida } from '../../api/consultas'
import type { DocumentoEncontrado, NuevaSalida, TipoDocumento } from '../../api/tipos'
import { AreaTexto, Campo } from '../../componentes/base/Campo'
import { Boton } from '../../componentes/base/Boton'
import { TEXTO_TIPO } from '../../componentes/base/textos'
import { BuscadorDocumento } from '../../componentes/compuestos/BuscadorDocumento'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Modal } from '../../componentes/compuestos/Modal'
import { CampoSelector } from '../../componentes/compuestos/Selector'
import estilos from './Salidas.module.css'

/** Lo que el panel de acuse necesita de la salida recién registrada. */
export interface SalidaRegistrada {
  id: string
  folio: string
  sintesis: string
  destinatario: string
  respondeA: DocumentoEncontrado | null
}

interface Props {
  abierto: boolean
  alCambiar: (abierto: boolean) => void
  alRegistrar: (salida: SalidaRegistrada) => void
}

/** V-13b Registrar salida externa (O-20): emisor interno, destinatario externo; si responde a otro, RESPONDE_A. */
export function RegistrarSalida({ abierto, alCambiar, alRegistrar }: Props) {
  const [tipo, setTipo] = useState<TipoDocumento>('oficio')
  const [numero, setNumero] = useState('')
  const [idArea, setIdArea] = useState('')
  const [destinatario, setDestinatario] = useState('')
  const [sintesis, setSintesis] = useState('')
  const [respondeA, setRespondeA] = useState<DocumentoEncontrado | null>(null)
  const [intentado, setIntentado] = useState(false)
  const catalogos = useCatalogos()
  const areas = useAreas()
  const registrar = useRegistrarSalida()
  const falta = (valor: string, mensaje: string) => (intentado && !valor.trim() ? mensaje : undefined)

  function cerrar(abrir: boolean) {
    if (!abrir) {
      setTipo('oficio')
      setNumero('')
      setIdArea('')
      setDestinatario('')
      setSintesis('')
      setRespondeA(null)
      setIntentado(false)
      registrar.reset()
    }
    alCambiar(abrir)
  }

  function enviar() {
    setIntentado(true)
    if (![numero, idArea, destinatario, sintesis].every((v) => v.trim())) return
    const salida: NuevaSalida = { tipo, numero, id_area_emisora: idArea, destinatario, sintesis, id_responde_a: respondeA?.id ?? null }
    registrar.mutate(salida, {
      onSuccess: ({ id, folio }) => {
        alRegistrar({ id, folio, sintesis, destinatario, respondeA })
        cerrar(false)
      },
    })
  }

  return (
    <Modal
      abierto={abierto}
      alCambiar={cerrar}
      titulo="Registrar salida externa"
      descripcion="Sale de un área hacia un actor externo. El folio de salida se asigna al guardar."
      ancho={680}
      pie={
        <>
          <Boton variante="fantasma" onClick={() => cerrar(false)}>
            Cancelar
          </Boton>
          <Boton icono="salida" onClick={enviar} pendiente={registrar.isPending}>
            Registrar salida
          </Boton>
        </>
      }
    >
      <div className={estilos.fila}>
        <CampoSelector
          blanco
          etiqueta="Tipo de documento"
          ayuda="Catálogo de 7 tipos (D-17)."
          valor={tipo}
          cargando={catalogos.isPending}
          opciones={(catalogos.data?.tipos_documento ?? []).map((t) => ({ valor: t, texto: TEXTO_TIPO[t] }))}
          alCambiar={(t) => setTipo(t as TipoDocumento)}
        />
        <Campo
          blanco
          etiqueta="Número del documento"
          error={falta(numero, 'Escribe el número del documento.')}
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
        />
      </div>
      <div className={estilos.fila}>
        <CampoSelector
          blanco
          etiqueta="Área emisora"
          error={falta(idArea, 'Elige el área emisora.')}
          marcador="Elige un área"
          valor={idArea}
          cargando={areas.isPending}
          opciones={(areas.data?.elementos ?? []).map((a) => ({ valor: a.id, texto: a.nombre }))}
          alCambiar={setIdArea}
        />
        <Campo
          blanco
          etiqueta="Destinatario externo"
          ayuda="¿No está? Regístralo en Actores externos."
          error={falta(destinatario, 'Escribe el destinatario externo.')}
          value={destinatario}
          onChange={(e) => setDestinatario(e.target.value)}
        />
      </div>
      <AreaTexto
        blanco
        etiqueta="Síntesis"
        error={falta(sintesis, 'Escribe la síntesis.')}
        value={sintesis}
        onChange={(e) => setSintesis(e.target.value)}
      />
      <BuscadorDocumento
        etiqueta="Responde a (opcional)"
        ayuda="Crea la relación RESPONDE_A en el grafo."
        elegido={respondeA}
        alElegir={setRespondeA}
      />
      <ErrorOperacion error={registrar.error} que="registrar la salida" />
    </Modal>
  )
}
