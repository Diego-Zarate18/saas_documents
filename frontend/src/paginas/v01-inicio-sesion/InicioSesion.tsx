import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Boton } from '../../componentes/base/Boton'
import { Campo } from '../../componentes/base/Campo'
import { ErrorOperacion } from '../../componentes/compuestos/ErrorOperacion'
import { Icono } from '../../iconos/Icono'
import { Isotipo } from '../../iconos/Isotipo'
import { inicioDe } from '../../rutas/menu'
import { useIniciarSesion, useSesion } from '../../sesion/sesion'
import estilos from './InicioSesion.module.css'


/** V-01 Inicio de sesión (O-36). */
export function InicioSesion() {
  const sesion = useSesion()
  const iniciar = useIniciarSesion()
  const desde = (useLocation().state as { desde?: string } | null)?.desde
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')

  // Al iniciar sesión la consulta de sesión se llena y esta misma línea redirige.
  if (sesion.data) return <Navigate to={desde ?? inicioDe(sesion.data.rol)} replace />

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    iniciar.mutate({ correo, contrasena })
  }

  return (
    <main className={estilos.pagina}>
      <span className={estilos.brillo} aria-hidden="true" />
      <span className={estilos.brillo} aria-hidden="true" />
      <span className={estilos.brillo} aria-hidden="true" />
      <div className={estilos.presentacion}>
        <p className={estilos.logotipo}>
          <Isotipo tamano={64} />
          SIGEDOC
        </p>
        <p className={estilos.lema}>Seguimiento de documentos entre departamentos</p>
        <p className={estilos.bajada}>Dónde está cada documento, quién lo atiende y por dónde pasó.</p>
      </div>
      <form className={estilos.formulario} onSubmit={enviar} noValidate>
        <h1 className={estilos.titulo}>Iniciar sesión</h1>
        <p className={estilos.instruccion}>Usa tu correo institucional.</p>
        <Campo
          etiqueta="Correo"
          type="email"
          autoComplete="username"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
        />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
        />
        <ErrorOperacion error={iniciar.error} que="iniciar sesión" />
        <Boton type="submit" ancho pendiente={iniciar.isPending}>
          Entrar
        </Boton>
        <p className={estilos.bloqueo}>
          <Icono nombre="candado" tamano={14} />
          Tras varios intentos fallidos el acceso se bloquea unos minutos.
        </p>
      </form>
    </main>
  )
}
