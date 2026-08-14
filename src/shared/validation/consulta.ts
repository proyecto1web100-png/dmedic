import { z } from 'zod'

/**
 * Los rangos amplios no son criterio clinico: solo descartan errores de digitacion
 * (un peso de 900 kg, una temperatura de 200 grados). La interpretacion es del doctor.
 */
const numeroOpcional = (min: number, max: number, etiqueta: string) =>
  z
    .number()
    .min(min, `${etiqueta}: valor fuera de rango`)
    .max(max, `${etiqueta}: valor fuera de rango`)
    .nullish()
    .transform((v) => (v === undefined ? null : v))

export const signosVitalesSchema = z.object({
  peso: numeroOpcional(0.5, 400, 'Peso'),
  altura: numeroOpcional(20, 250, 'Altura'),
  imc: numeroOpcional(5, 120, 'IMC'),
  presionSistolica: numeroOpcional(50, 300, 'Presión sistólica'),
  presionDiastolica: numeroOpcional(20, 200, 'Presión diastólica'),
  temperatura: numeroOpcional(30, 45, 'Temperatura'),
  frecuenciaCardiaca: numeroOpcional(20, 250, 'Frecuencia cardíaca'),
  frecuenciaRespiratoria: numeroOpcional(5, 90, 'Frecuencia respiratoria'),
  saturacionOxigeno: numeroOpcional(40, 100, 'Saturación de oxígeno'),
  glucosa: numeroOpcional(20, 800, 'Glucosa')
})

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null))

export const diagnosticoSchema = z.object({
  id: z.number().optional(),
  codigoCie10: z.string().trim().min(2, 'Código requerido').max(10),
  descripcion: z.string().trim().min(2).max(300),
  esPrincipal: z.boolean(),
  nota: textoOpcional(300)
})

export const medicamentoRecetadoSchema = z.object({
  id: z.number().optional(),
  medicamentoId: z
    .number()
    .int()
    .positive()
    .nullish()
    .transform((v) => v ?? null),
  nombre: z.string().trim().min(2, 'Nombre del medicamento requerido').max(160),
  concentracion: textoOpcional(60),
  forma: textoOpcional(60),
  dosis: z.string().trim().min(1, 'Dosis requerida').max(80),
  frecuencia: z.string().trim().min(1, 'Frecuencia requerida').max(80),
  duracion: textoOpcional(80),
  via: textoOpcional(60),
  indicaciones: textoOpcional(300)
})

export const consultaInputSchema = z
  .object({
    pacienteId: z.number().int().positive(),
    citaId: z
      .number()
      .int()
      .positive()
      .nullish()
      .transform((v) => v ?? null),
    motivo: z.string().trim().min(3, 'El motivo de consulta es obligatorio').max(500),
    sintomas: textoOpcional(4000),
    exploracion: textoOpcional(4000),
    tratamiento: textoOpcional(4000),
    observaciones: textoOpcional(4000),
    recomendaciones: textoOpcional(4000),
    proximaCitaFecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
      .nullish()
      .transform((v) => v ?? null),
    sinProximaCita: z.boolean(),
    signos: signosVitalesSchema,
    diagnosticos: z.array(diagnosticoSchema).default([]),
    medicamentos: z.array(medicamentoRecetadoSchema).default([])
  })
  .refine((d) => d.sinProximaCita || d.proximaCitaFecha !== null, {
    message: 'Indique la fecha de la próxima cita o marque "sin próxima cita"',
    path: ['proximaCitaFecha']
  })
  .refine(
    (d) => d.diagnosticos.filter((x) => x.esPrincipal).length <= 1,
    { message: 'Solo puede haber un diagnóstico principal', path: ['diagnosticos'] }
  )
  .refine(
    (d) => {
      const sis = d.signos.presionSistolica
      const dia = d.signos.presionDiastolica
      return sis === null || dia === null || sis > dia
    },
    { message: 'La presión sistólica debe ser mayor que la diastólica', path: ['signos'] }
  )

export type ConsultaInputValidada = z.infer<typeof consultaInputSchema>
