import { z } from 'zod'

const textoOpcional = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null))

const nombreRequerido = z
  .string()
  .trim()
  .min(2, 'Debe tener al menos 2 caracteres')
  .max(60, 'Máximo 60 caracteres')

const nombreOpcional = z
  .string()
  .trim()
  .max(60, 'Máximo 60 caracteres')
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null))

/** Identidad hondurena: 13 digitos. Se permite vacia (menores atados a un responsable). */
export const identidadSchema = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v.replace(/\D/g, '') : null))
  .refine((v) => v === null || v.length === 13, {
    message: 'La identidad debe tener 13 dígitos'
  })

export const telefonoSchema = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || /^[\d\s+()-]{8,20}$/.test(v), {
    message: 'Teléfono inválido'
  })

export const contactoEmergenciaSchema = z.object({
  id: z.number().optional(),
  nombre: z.string().trim().min(2, 'Nombre requerido').max(120),
  telefono: z.string().trim().min(8, 'Teléfono requerido').max(20),
  parentesco: nombreOpcional
})

export const pacienteInputSchema = z
  .object({
    primerNombre: nombreRequerido,
    segundoNombre: nombreOpcional,
    primerApellido: nombreRequerido,
    segundoApellido: nombreOpcional,
    fechaNacimiento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
      .refine((v) => {
        const fecha = new Date(`${v}T00:00:00`)
        if (Number.isNaN(fecha.getTime())) return false
        const hoy = new Date()
        const limite = new Date()
        limite.setFullYear(hoy.getFullYear() - 120)
        return fecha <= hoy && fecha >= limite
      }, 'La fecha de nacimiento no es razonable'),
    sexo: z.enum(['M', 'F']),
    numeroIdentidad: identidadSchema,
    telefono: telefonoSchema,
    correo: z
      .string()
      .trim()
      .nullish()
      .transform((v) => (v && v.length > 0 ? v : null))
      .refine((v) => v === null || z.string().email().safeParse(v).success, {
        message: 'Correo inválido'
      }),
    direccion: textoOpcional,
    tipoSangre: z
      .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
      .nullish()
      .transform((v) => v ?? null),
    aseguradora: nombreOpcional,
    referidoPor: nombreOpcional,
    notas: z
      .string()
      .trim()
      .max(2000)
      .nullish()
      .transform((v) => (v && v.length > 0 ? v : null)),
    responsableId: z
      .number()
      .int()
      .positive()
      .nullish()
      .transform((v) => v ?? null),
    responsableParentesco: nombreOpcional,
    contactos: z.array(contactoEmergenciaSchema).max(3, 'Máximo 3 contactos').default([])
  })
  .refine((datos) => datos.numeroIdentidad !== null || datos.responsableId !== null, {
    message: 'Indique el número de identidad o vincule un responsable',
    path: ['numeroIdentidad']
  })

export type PacienteInputValidado = z.infer<typeof pacienteInputSchema>

export const alergiaSchema = z.object({
  sustancia: z.string().trim().min(2, 'Sustancia requerida').max(120),
  reaccion: nombreOpcional,
  gravedad: z.enum(['leve', 'moderada', 'grave'])
})

export const antecedenteSchema = z.object({
  tipo: z.enum([
    'personal_patologico',
    'familiar',
    'quirurgico',
    'habitos',
    'gineco_obstetrico'
  ]),
  descripcion: z.string().trim().min(2, 'Descripción requerida').max(1000)
})

export const cronicoSchema = z.object({
  codigoCie10: nombreOpcional,
  descripcion: z.string().trim().min(2, 'Descripción requerida').max(300),
  desde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish()
    .transform((v) => v ?? null)
})
