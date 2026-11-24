import { useState } from 'react'
import { useCatalogos, useConcluir } from '../../api/consultas'
import { validarConclusion } from '../../api/reglas'
import type { DocumentoEncontrado, Ficha, FormaConclusion } from '../../api/tipos'
import { AreaTexto } from '../../componentes/base/Campo'
import { Boton } from '../../componentes/base/Boton'
import { DESCRIPCION_FORMA, TEXTO_FORMA } from '../../componentes/base/textos'
import { Aviso } from '../../componentes/compuestos/Aviso'
import { BuscadorDocumento } from '../../componentes/compuestos/BuscadorDocumento'
import { Chip } from '../../componentes/compuestos/Chip'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { GrupoOpciones } from '../../componentes/compuestos/GrupoOpciones'
import { Modal } from '../../componentes/compuestos/Modal'
import { OpcionRadio } from '../../componentes/compuestos/OpcionRadio'
import { Efectos, Resumen } from '../../componentes/compuestos/Resumen'

/** Etiqueta de la nota según la forma; con_respuesta y enterado no la piden (D-59). */
const NOTA: Partial<Record<FormaConclusion, string>> = {
  atencion_sin_oficio: 'Evidencia de la atención (obligatoria)',
  no_procede: 'Motivo (obligatorio)',
  duplicado: 'Nota (obligatoria)',
}

interface Props {
  ficha: Ficha
  areaPropia: string
  abierto: boolean
  alCambiar: (abierto: boolean) => void
}

/** V-09 y V-09b Concluir documento (O-05, D-59): solo el área responsable con el documento pendiente. */
export function Concluir({ ficha, areaPropia, abierto, alCambiar }: Props) {
  const [forma, setForma] = useState<FormaConclusion>('con_respuesta')
  const [documento, setDocumento] = useState<DocumentoEncontrado | null>(null)
  const [nota, setNota] = useState('')
  const [tocado, setTocado] = useState(false)
  const concluir = useConcluir(ficha.registro.id)
  const catalogos = useCatalogos()
  const formas = catalogos.data?.formas_conclusion ?? []
  const conclusion = {
    forma,
    id_respuesta: forma === 'con_respuesta' ? (documento?.id ?? null) : null,
    id_original: forma === 'duplicado' ? (documento?.id ?? null) : null,
    nota: NOTA[forma] ? nota : '',
  }
  const error = validarConclusion(conclusion)
  // Al concluir: las otras áreas que lo tienen pendiente y las que solo lo recibieron para conocimiento.
  const otras = ficha.ubicacion_actual.filter((u) => u.area !== areaPropia).map((u) => u.area)
  const conocimiento = [
    ...new Set(
      (ficha.recorrido ?? [])
        .filter((m) => m.rol === 'conocimiento' && !otras.includes(m.area_destino) && m.area_destino !== areaPropia)
        .map((m) => m.area_destino),
    ),
  ]

  function cerrar(abrir: boolean) {
    if (!abrir) {
      setForma('con_respuesta')
      setDocumento(null)
      setNota('')
      setTocado(false)
      concluir.reset()
    }
    alCambiar(abrir)
  }

  function elegirForma(f: FormaConclusion) {
    setForma(f)
    setDocumento(null)
    setTocado(false)
  }

  return (
    <Modal
      abierto={abierto}
      alCambiar={cerrar}
      folio={ficha.registro.folio}
      titulo="Concluir documento"
      descripcion="Cierra los pendientes del documento en todas las áreas. Solo lo concluye el área responsable."
      ancho={620}
      pie={
        <>
          <Boton variante="fantasma" onClick={() => cerrar(false)}>
            Cancelar
          </Boton>
          <Boton
            icono="check"
            disabled={error !== null}
            pendiente={concluir.isPending}
            onClick={() => concluir.mutate(conclusion, { onSuccess: () => cerrar(false) })}
          >
            Concluir documento
          </Boton>
        </>
      }
    >
      <Aviso tono="exito">{areaPropia} es la responsable y tiene el documento pendiente: puedes concluirlo.</Aviso>
      <GrupoOpciones leyenda="Forma de conclusión" marca={<Chip>Catálogo cerrado · D-59</Chip>}>
        {formas.map((f) => (
          <OpcionRadio
            key={f}
            name="forma"
            texto={TEXTO_FORMA[f]}
            codigo={f}
            descripcion={DESCRIPCION_FORMA[f]}
            checked={forma === f}
            onChange={() => elegirForma(f)}
          />
        ))}
      </GrupoOpciones>
      {forma === 'con_respuesta' && (
        <BuscadorDocumento
          etiqueta="Documento de respuesta (obligatorio con esta forma)"
          ayuda="Crea la relación RESPONDE_A entre la respuesta y este documento (D-59)."
          elegido={documento}
          alElegir={setDocumento}
          excluir={ficha.registro.id}
        />
      )}
      {forma === 'duplicado' && (
        <BuscadorDocumento
          etiqueta="Documento original (obligatorio con esta forma)"
          ayuda="Referencia al documento que ya existe (D-27)."
          elegido={documento}
          alElegir={setDocumento}
          excluir={ficha.registro.id}
        />
      )}
      {NOTA[forma] && (
        <AreaTexto
          blanco
          rows={3}
          etiqueta={NOTA[forma] ?? ''}
          error={tocado && !nota.trim() ? (error ?? undefined) : undefined}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={() => setTocado(true)}
        />
      )}
      {forma === 'atencion_sin_oficio' && (
        <Aviso tono="info" icono="nota">
          Se guarda en el expediente como nota «evidencia_atencion» ligada a este movimiento. No se puede eliminar después:
          sostiene la conclusión.
        </Aviso>
      )}
      <Resumen titulo="Al concluir">
        <Efectos>
          <li>Estado: en trámite → concluido</li>
          <li>
            {[areaPropia, ...otras].join(' y ')} {otras.length ? 'dejan' : 'deja'} de tenerlo pendiente
            {conocimiento.length > 0 && `; ${conocimiento.join(' y ')} solo lo tenía para conocimiento`}
          </li>
          <li>Sale de la bandeja de todas las áreas y del conteo de pendientes</li>
        </Efectos>
      </Resumen>
      <ErrorOperacion error={catalogos.error} que="cargar las opciones del catálogo" />
      <ErrorOperacion error={concluir.error} que="concluir el documento" />
    </Modal>
  )
}
