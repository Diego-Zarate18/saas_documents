// Sesión simulada (D-63): hace el papel de la cookie httpOnly de D-49 hasta T-15.
// sessionStorage puede no existir o lanzar (modo privado, almacenamiento bloqueado); sin él, la sesión
// dura lo que dure la pestaña en memoria.

const CLAVE = 'sigedoc.sesion'
let enMemoria: string | null = null

export function leerSesionGuardada(): string | null {
  try {
    return sessionStorage.getItem(CLAVE) ?? enMemoria
  } catch {
    return enMemoria
  }
}

export function guardarSesion(idPersona: string): void {
  enMemoria = idPersona
  try {
    sessionStorage.setItem(CLAVE, idPersona)
  } catch {
    // Sin almacenamiento: queda en memoria.
  }
}

export function borrarSesion(): void {
  enMemoria = null
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {
    // Sin almacenamiento: ya se borró de memoria.
  }
}
