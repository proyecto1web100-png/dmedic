import type { AlertaVital, NivelAlerta, SignosVitales } from '../types/consulta'

export function calcularImc(pesoKg: number | null, alturaCm: number | null): number | null {
  if (!pesoKg || !alturaCm || alturaCm <= 0) return null
  const metros = alturaCm / 100
  return Math.round((pesoKg / (metros * metros)) * 10) / 10
}

export function clasificarImc(imc: number | null): string | null {
  if (imc === null) return null
  if (imc < 18.5) return 'Bajo peso'
  if (imc < 25) return 'Normal'
  if (imc < 30) return 'Sobrepeso'
  if (imc < 35) return 'Obesidad I'
  if (imc < 40) return 'Obesidad II'
  return 'Obesidad III'
}

interface Rango {
  campo: keyof SignosVitales
  etiqueta: string
  normalMin: number
  normalMax: number
  criticoMin: number
  criticoMax: number
}

/**
 * Rangos de referencia orientativos para adultos. Sirven unicamente para marcar
 * un valor de forma discreta en la interfaz; no constituyen criterio diagnostico
 * ni bloquean el guardado. El doctor siempre decide.
 */
const RANGOS_ADULTO: Rango[] = [
  {
    campo: 'presionSistolica',
    etiqueta: 'Presión sistólica',
    normalMin: 90,
    normalMax: 129,
    criticoMin: 80,
    criticoMax: 180
  },
  {
    campo: 'presionDiastolica',
    etiqueta: 'Presión diastólica',
    normalMin: 60,
    normalMax: 84,
    criticoMin: 50,
    criticoMax: 120
  },
  {
    campo: 'temperatura',
    etiqueta: 'Temperatura',
    normalMin: 36,
    normalMax: 37.5,
    criticoMin: 35,
    criticoMax: 39.5
  },
  {
    campo: 'frecuenciaCardiaca',
    etiqueta: 'Frecuencia cardíaca',
    normalMin: 60,
    normalMax: 100,
    criticoMin: 40,
    criticoMax: 130
  },
  {
    campo: 'frecuenciaRespiratoria',
    etiqueta: 'Frecuencia respiratoria',
    normalMin: 12,
    normalMax: 20,
    criticoMin: 8,
    criticoMax: 30
  },
  {
    campo: 'saturacionOxigeno',
    etiqueta: 'Saturación de oxígeno',
    normalMin: 95,
    normalMax: 100,
    criticoMin: 90,
    criticoMax: 100
  },
  {
    campo: 'glucosa',
    etiqueta: 'Glucosa',
    normalMin: 70,
    normalMax: 140,
    criticoMin: 55,
    criticoMax: 250
  }
]

export function evaluarVital(
  campo: keyof SignosVitales,
  valor: number | null
): NivelAlerta {
  if (valor === null) return 'normal'
  const rango = RANGOS_ADULTO.find((r) => r.campo === campo)
  if (!rango) return 'normal'
  if (valor < rango.criticoMin || valor > rango.criticoMax) return 'critico'
  if (valor < rango.normalMin || valor > rango.normalMax) return 'atencion'
  return 'normal'
}

export function evaluarSignos(signos: SignosVitales): AlertaVital[] {
  const alertas: AlertaVital[] = []
  for (const rango of RANGOS_ADULTO) {
    const valor = signos[rango.campo]
    const nivel = evaluarVital(rango.campo, valor)
    if (nivel === 'normal' || valor === null) continue
    const direccion = valor < rango.normalMin ? 'por debajo' : 'por encima'
    alertas.push({
      campo: rango.campo,
      nivel,
      mensaje: `${rango.etiqueta} ${direccion} del rango de referencia (${rango.normalMin}–${rango.normalMax})`
    })
  }
  return alertas
}

export function signosVacios(): SignosVitales {
  return {
    peso: null,
    altura: null,
    imc: null,
    presionSistolica: null,
    presionDiastolica: null,
    temperatura: null,
    frecuenciaCardiaca: null,
    frecuenciaRespiratoria: null,
    saturacionOxigeno: null,
    glucosa: null
  }
}
