import { useEffect, useState } from 'react'
import { api, pedir } from '../../lib/api'
import type { PacienteConResumen } from '@shared/types'

const RETARDO_MS = 160

interface Resultado {
  texto: string
  setTexto: (valor: string) => void
  resultados: PacienteConResumen[]
  buscando: boolean
  recargar: () => void
}

/**
 * Búsqueda con retardo corto: el doctor escribe y ve resultados sin lanzar una
 * consulta por cada tecla. Una respuesta que llega tarde nunca pisa a una más
 * reciente.
 */
export function useBusquedaPacientes(opciones: { incluirInactivos?: boolean } = {}): Resultado {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<PacienteConResumen[]>([])
  const [buscando, setBuscando] = useState(false)
  const [version, setVersion] = useState(0)

  const incluirInactivos = opciones.incluirInactivos ?? false

  useEffect(() => {
    let vigente = true
    setBuscando(true)

    const temporizador = window.setTimeout(async () => {
      try {
        const datos = await pedir(api.pacientes.buscar(texto, { incluirInactivos }))
        if (vigente) setResultados(datos)
      } catch {
        if (vigente) setResultados([])
      } finally {
        if (vigente) setBuscando(false)
      }
    }, RETARDO_MS)

    return () => {
      vigente = false
      window.clearTimeout(temporizador)
    }
  }, [texto, incluirInactivos, version])

  return {
    texto,
    setTexto,
    resultados,
    buscando,
    recargar: () => setVersion((v) => v + 1)
  }
}
