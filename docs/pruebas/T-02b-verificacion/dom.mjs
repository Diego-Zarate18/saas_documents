// Ayudas que se inyectan en la página para manejar los controles de la interfaz con eventos del DOM
// (el Chrome sin interfaz no siempre entrega el ratón de CDP a los portales de Radix).
// Se definen en window.t02a y cada script las llama con js(`t02a.…`).
export const AYUDAS = `
window.t02a = (() => {
  const texto = (e) => e.textContent.replace(/\\s+/g, ' ').trim()
  const ambito = (dialogo) => (dialogo ? document.querySelector('[role="dialog"]') : document.querySelector('main'))
  const tecla = (e, key) => e.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  const poner = (control, valor) => {
    const proto = control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(control, valor)
    control.dispatchEvent(new Event('input', { bubbles: true }))
  }
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
  const hasta = async (fn, ms = 5000) => {
    const fin = Date.now() + ms
    while (Date.now() < fin) {
      const r = fn()
      if (r) return r
      await esperar(25)
    }
    throw new Error('tiempo agotado')
  }
  return {
    texto,
    boton: (t, dialogo) => {
      const b = [...ambito(dialogo).querySelectorAll('button, a')].find((x) => texto(x) === t)
      if (!b) throw new Error('sin botón ' + t)
      b.click()
    },
    escribir: (etiqueta, valor, dialogo) => {
      // Solo cajas de texto: un segmento puede llamarse igual que el campo (V-03: «Actor externo»).
      const l = [...ambito(dialogo).querySelectorAll('label')].find(
        (x) => texto(x) === etiqueta && x.control && !['radio', 'checkbox'].includes(x.control.type),
      )
      const c = l?.control ?? ambito(dialogo).querySelector('[aria-label="' + etiqueta + '"]')
      if (!c) throw new Error('sin campo ' + etiqueta)
      poner(c, valor)
    },
    radio: (t, dialogo) => {
      const l = [...ambito(dialogo).querySelectorAll('label')].find((x) => texto(x).startsWith(t))
      if (!l) throw new Error('sin opción ' + t)
      l.querySelector('input').click()
    },
    elegir: async (combo, opcion, dialogo) => {
      const c = [...ambito(dialogo).querySelectorAll('[role="combobox"]')].find((x) => texto(x).startsWith(combo))
      if (!c) throw new Error('sin selector ' + combo)
      // Radix ignora el Intro si llega antes de que la lista termine de montarse: se reintenta hasta que el
      // selector muestre la opción elegida.
      for (let intento = 0; intento < 4 && !texto(c).endsWith(opcion); intento++) {
        if (c.getAttribute('aria-expanded') !== 'true') {
          c.focus()
          tecla(c, 'Enter')
        }
        const o = await hasta(() => [...document.querySelectorAll('[role="listbox"] [role="option"]')].find((x) => texto(x) === opcion))
        await esperar(120)
        o.focus()
        tecla(o, 'Enter')
        await hasta(() => !o.isConnected, 1500).catch(() => {})
      }
      if (!texto(c).endsWith(opcion)) throw new Error('no se eligió ' + opcion)
    },
    buscar: async (etiqueta, consulta, folio, dialogo) => {
      const l = [...ambito(dialogo).querySelectorAll('label')].find((x) => texto(x) === etiqueta)
      poner(l.control, consulta)
      const o = await hasta(() => [...document.querySelectorAll('[role="option"]')].find((x) => texto(x).startsWith(folio)))
      o.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    },
    menu: async (boton, opcion) => {
      const b = [...document.querySelectorAll('main header button')].find((x) => texto(x) === boton)
      b.focus()
      tecla(b, 'Enter')
      const o = await hasta(() => [...document.querySelectorAll('[role="menuitem"]')].find((x) => texto(x).startsWith(opcion)))
      o.focus()
      tecla(o, 'Enter')
    },
    ir: (ruta) => {
      history.pushState({}, '', ruta)
      dispatchEvent(new PopStateEvent('popstate'))
    },
  }
})()
`
