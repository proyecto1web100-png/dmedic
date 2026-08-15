import { z } from 'zod'

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null))

export const citaInputSchema = z
  .object({
    doctorId: z
      .number()
      .int()
      .positive()
      .nullish()
      .transform((v) => v ?? null),
    pacienteId: z
      .number()
      .int()
      .positive()
      .nullish()
      .transform((v) => v ?? null),
    nombreProvisional: textoOpcional(160),
    telefonoProvisional: textoOpcional(20),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    hora: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida')
      .nullish()
      .transform((v) => (v && v.length > 0 ? v : null)),
    duracionMinutos: z
      .number()
      .int()
      .min(5, 'La duración mínima es de 5 minutos')
      .max(480, 'La duración máxima es de 8 horas')
      .default(30),
    motivo: textoOpcional(300),
    notas: textoOpcional(1000),
    consultaOrigenId: z
      .number()
      .int()
      .positive()
      .nullish()
      .transform((v) => v ?? null)
  })
  .refine((d) => d.pacienteId !== null || d.nombreProvisional !== null, {
    message: 'Seleccione un paciente registrado o escriba el nombre de la persona',
    path: ['nombreProvisional']
  })

export type CitaInputValidada = z.infer<typeof citaInputSchema>
