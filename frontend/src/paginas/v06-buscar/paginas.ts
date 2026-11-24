/**
 * Páginas que muestra el paginador de V-06: la primera, la última y las vecinas de la actual; `null` marca
 * un salto («…»). Con miles de documentos (API real, T-15) la fila no crece.
 */
export function paginasVisibles(actual: number, total: number): (number | null)[] {
  const visibles = Array.from({ length: total }, (_, i) => i + 1).filter((p) => p === 1 || p === total || Math.abs(p - actual) <= 1)
  return visibles.flatMap((p, i) => (i > 0 && p - (visibles[i - 1] ?? p) > 1 ? [null, p] : [p]))
}
