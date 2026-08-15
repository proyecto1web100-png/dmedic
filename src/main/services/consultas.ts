import { consultaInputSchema } from '@shared/validation/consulta'
import { calcularImc } from '@shared/lib/vitales'
import { hoyIso } from '@shared/lib/fecha'
import * as repo from '../repositories/consulta'
import * as pacientesRepo from '../repositories/paciente'
import * as citas from './citas'
import { auditar } from '../audit/auditoria'
import { exigirSesion } from '../security/sesion'
import type {
  ConsultaCompleta,
  ConsultaInput,
  ConsultaResumen,
  FiltroHistorial,
  ResumenDashboard,
  Sesion
} from '@shared/types'
import { nombreCompleto } from '@shared/lib/paciente'

function validar(entrada: ConsultaInput): ConsultaInput {
  const resultado = consultaInputSchema.safeParse(entrada)
  if (!resultado.success) {
    throw new Error(resultado.error.issues[0].message)
  }
  const datos = resultado.data as ConsultaInput
  // El IMC se recalcula siempre en el servidor: nunca se confia en el valor de la interfaz.
  datos.signos.imc = calcularImc(datos.signos.peso, datos.signos.altura)
  return datos
}

export function crear(entrada: ConsultaInput): number {
  const sesion = exigirSesion()
  const datos = validar(entrada)
  if (!pacientesRepo.obtener(datos.pacienteId)) {
    throw new Error('El paciente no existe')
  }

  const id = repo.crear(datos, sesion.usuarioId)

  // La próxima cita indicada al final de la consulta queda agendada sin que haya
  // que registrarla otra vez a mano.
  citas.sincronizarDesdeConsulta(
    id,
    datos.pacienteId,
    sesion.usuarioId,
    datos.sinProximaCita ? null : (datos.proximaCitaFecha ?? null)
  )
  if (datos.citaId) citas.vincularConsulta(datos.citaId, id)

  auditar({
    accion: 'consulta.creada',
    entidad: 'consulta',
    entidadId: id,
    detalle: `paciente ${datos.pacienteId}`
  })
  return id
}

export class ErrorConsultaAjena extends Error {
  readonly codigo = 'CONSULTA_AJENA'
  constructor(readonly nombreDoctor: string | null) {
    super(
      nombreDoctor
        ? `Esta consulta fue registrada por ${nombreDoctor}. Solo quien la atendió puede modificarla; usted puede agregarle una adenda.`
        : 'Solo el doctor que atendió la consulta puede modificarla.'
    )
  }
}

/** Solo su autor corrige una consulta. Los demás dejan constancia con una adenda. */
function exigirAutoria(id: number): Sesion {
  const sesion = exigirSesion()
  const consulta = repo.obtenerCompleta(id)
  if (!consulta) throw new Error('La consulta no existe')
  if (consulta.usuarioId !== null && consulta.usuarioId !== sesion.usuarioId) {
    throw new ErrorConsultaAjena(consulta.nombreDoctor)
  }
  return sesion
}

export function actualizar(id: number, entrada: ConsultaInput): void {
  const sesion = exigirAutoria(id)
  const datos = validar(entrada)
  repo.actualizar(id, datos)
  citas.sincronizarDesdeConsulta(
    id,
    datos.pacienteId,
    sesion.usuarioId,
    datos.sinProximaCita ? null : (datos.proximaCitaFecha ?? null)
  )
  auditar({ accion: 'consulta.editada', entidad: 'consulta', entidadId: id })
}

export function obtener(id: number): ConsultaCompleta {
  const consulta = repo.obtenerCompleta(id)
  if (!consulta) throw new Error('La consulta no existe')

  // "Editable" depende de quién pregunta: mismo día y además autoría propia.
  const sesion = exigirSesion()
  const esAutor = consulta.usuarioId === null || consulta.usuarioId === sesion.usuarioId
  return { ...consulta, editable: consulta.editable && esAutor }
}

export function historial(pacienteId: number, filtro: FiltroHistorial = {}): ConsultaResumen[] {
  return repo.historial(pacienteId, filtro)
}

export function ultima(pacienteId: number): ConsultaCompleta | null {
  return repo.ultimaConsulta(pacienteId)
}

export function anular(id: number, motivo: string): void {
  const texto = motivo.trim()
  if (texto.length < 5) {
    throw new Error('Indique el motivo de la anulación (mínimo 5 caracteres)')
  }
  const consulta = repo.obtener(id)
  if (!consulta) throw new Error('La consulta no existe')
  if (consulta.estado === 'anulada') throw new Error('La consulta ya está anulada')

  repo.anular(id, texto)
  auditar({ accion: 'consulta.anulada', entidad: 'consulta', entidadId: id, detalle: texto })
}

export function agregarAdenda(consultaId: number, texto: string): number {
  const contenido = texto.trim()
  if (contenido.length < 3) throw new Error('La adenda no puede estar vacía')
  if (!repo.obtener(consultaId)) throw new Error('La consulta no existe')

  const id = repo.agregarAdenda(consultaId, contenido)
  auditar({ accion: 'consulta.adenda', entidad: 'consulta', entidadId: consultaId })
  return id
}

/** Comparacion lado a lado de dos consultas del historial. */
export function comparar(idA: number, idB: number): [ConsultaCompleta, ConsultaCompleta] {
  return [obtener(idA), obtener(idB)]
}

export function dashboard(): ResumenDashboard {
  const hoy = hoyIso()
  const inicioMes = `${hoy.slice(0, 7)}-01T00:00:00.000Z`

  return {
    totalPacientes: pacientesRepo.contarActivos(),
    consultasHoy: repo.contarDelDia(hoy),
    citasHoy: citas.contarAgendadasHoy(),
    pacientesNuevosMes: pacientesRepo.contarNuevosDesde(inicioMes),
    ultimosAtendidos: repo.ultimosAtendidos().map((f) => ({
      pacienteId: f.paciente_id,
      nombreCompleto: nombreCompleto({
        primerNombre: f.primer_nombre,
        segundoNombre: f.segundo_nombre,
        primerApellido: f.primer_apellido,
        segundoApellido: f.segundo_apellido
      }),
      numeroExpediente: f.numero_expediente,
      fecha: f.fecha,
      motivo: f.motivo
    }))
  }
}
