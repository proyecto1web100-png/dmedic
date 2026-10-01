import { formatearFecha, formatearFechaLarga } from '@shared/lib/fecha'
import { edadLegible, formatearIdentidad, nombreCompleto } from '@shared/lib/paciente'
import {
  avisoAlergias,
  cabecera,
  campo,
  documento,
  esc,
  firma,
  parrafo,
  pie,
  seccion
} from './plantillas'
import type {
  ConfiguracionClinica,
  ExpedienteResumen,
  Incapacidad,
  Referencia,
  ReporteEmpresa
} from '@shared/types'

/**
 * Documentos que la clinica entrega en mano y que tienen valor fuera de ella:
 * la constancia de incapacidad que el paciente lleva a su trabajo, la hoja de
 * referencia que lleva al especialista y el reporte que se le pasa a la empresa.
 */

/** Bloque de identificacion mas completo que el de la receta: estos papeles salen de la clinica. */
function bloqueIdentificacion(expediente: ExpedienteResumen, fecha: string): string {
  const p = expediente.paciente
  return `<section class="paciente">
    ${campo('Paciente', nombreCompleto(p))}
    ${campo('Identidad', p.numeroIdentidad ? formatearIdentidad(p.numeroIdentidad) : 'No registrada')}
    ${campo('Edad', edadLegible(p.fechaNacimiento))}
    ${campo('Expediente', p.numeroExpediente)}
    ${campo('Fecha', formatearFechaLarga(fecha))}
    ${p.empresaNombre ? campo('Empresa', p.empresaNombre) : ''}
  </section>`
}

function bloqueFolio(folio: string, anulado: boolean): string {
  return `<div class="folio">
    <span>Folio</span> <strong>${esc(folio)}</strong>
    ${anulado ? '<span class="etiqueta roja">ANULADA</span>' : ''}
  </div>`
}

/** Firma con el numero de colegiacion: sin el, el documento no tiene valor legal. */
function firmaProfesional(
  config: ConfiguracionClinica,
  nombreDoctor: string,
  colegiacion: string | null
): string {
  if (!colegiacion) return firma(config, nombreDoctor)
  return `<div class="firma">
    <div class="linea"></div>
    <div class="nombre">${esc(nombreDoctor)}</div>
    ${config.especialidad ? `<div class="detalle">${esc(config.especialidad)}</div>` : ''}
    <div class="detalle">Colegiación N.º ${esc(colegiacion)}</div>
  </div>`
}

// ===== Constancia de incapacidad =====

export function htmlIncapacidad(
  config: ConfiguracionClinica,
  expediente: ExpedienteResumen,
  incapacidad: Incapacidad
): string {
  const doctor = incapacidad.nombreDoctor ?? config.nombreDoctor
  const dias = `${incapacidad.dias} ${incapacidad.dias === 1 ? 'día' : 'días'}`

  const cuerpo = `
    ${cabecera(config, doctor)}
    <div class="titulo-documento">Constancia de incapacidad médica</div>
    ${bloqueFolio(incapacidad.folio, incapacidad.estado === 'anulada')}
    ${bloqueIdentificacion(expediente, incapacidad.fechaEmision)}

    <section class="seccion">
      <p class="texto">
        Por este medio se hace constar que el paciente arriba identificado fue evaluado en esta
        consulta y, por su condición de salud, requiere <strong>${esc(dias)}</strong> de reposo,
        comprendidos del <strong>${esc(formatearFechaLarga(incapacidad.desde))}</strong>
        al <strong>${esc(formatearFechaLarga(incapacidad.hasta))}</strong>, ambos inclusive.
      </p>
    </section>

    <section class="paciente tres">
      ${campo('Desde', formatearFecha(incapacidad.desde))}
      ${campo('Hasta', formatearFecha(incapacidad.hasta))}
      ${campo('Días concedidos', String(incapacidad.dias))}
    </section>

    ${seccion('Motivo', parrafo(incapacidad.motivo))}
    ${
      incapacidad.diagnostico
        ? seccion(
            'Diagnóstico',
            parrafo(
              [incapacidad.codigoCie10, incapacidad.diagnostico].filter(Boolean).join(' — ')
            )
          )
        : ''
    }
    ${seccion('Observaciones', parrafo(incapacidad.observaciones))}
    ${
      incapacidad.estado === 'anulada'
        ? seccion('Anulación', parrafo(incapacidad.motivoAnulacion))
        : ''
    }

    ${firmaProfesional(config, doctor, incapacidad.numeroColegiacion)}
    ${pie(config, `Constancia ${incapacidad.folio} · emitida el ${formatearFecha(incapacidad.fechaEmision)}`)}`

  return documento(`Incapacidad ${incapacidad.folio}`, cuerpo, 'carta')
}

// ===== Hoja de referencia =====

export function htmlReferencia(
  config: ConfiguracionClinica,
  expediente: ExpedienteResumen,
  referencia: Referencia
): string {
  const doctor = referencia.nombreDoctor ?? config.nombreDoctor
  const destino = [referencia.dirigidaA, referencia.especialidad, referencia.institucion]
    .filter(Boolean)
    .join(' · ')

  const cuerpo = `
    ${cabecera(config, doctor)}
    <div class="titulo-documento">Hoja de referencia médica</div>
    ${bloqueFolio(referencia.folio, referencia.estado === 'anulada')}
    ${referencia.urgente ? '<div class="alerta-alergias">⚠ REFERENCIA URGENTE</div>' : ''}
    ${bloqueIdentificacion(expediente, referencia.fecha)}
    ${avisoAlergias(expediente)}

    <section class="paciente tres">
      ${campo('Dirigida a', referencia.dirigidaA)}
      ${campo('Especialidad', referencia.especialidad ?? 'No especificada')}
      ${campo('Institución', referencia.institucion ?? 'No especificada')}
    </section>

    ${seccion('Motivo de la referencia', parrafo(referencia.motivo))}
    ${
      referencia.diagnostico
        ? seccion(
            'Diagnóstico',
            parrafo([referencia.codigoCie10, referencia.diagnostico].filter(Boolean).join(' — '))
          )
        : ''
    }
    ${seccion('Resumen clínico', parrafo(referencia.resumenClinico))}
    ${seccion('Hallazgos y estudios realizados', parrafo(referencia.hallazgos))}
    ${
      referencia.estado === 'anulada'
        ? seccion('Anulación', parrafo(referencia.motivoAnulacion))
        : ''
    }

    <section class="seccion">
      <p class="texto">Agradezco de antemano su valoración y manejo. Quedo atento a su respuesta.</p>
    </section>

    ${firmaProfesional(config, doctor, referencia.numeroColegiacion)}
    ${pie(config, `Referencia ${referencia.folio} a ${destino}`)}`

  return documento(`Referencia ${referencia.folio}`, cuerpo, 'carta')
}

// ===== Reporte de atenciones por empresa =====

export function htmlReporteEmpresa(
  config: ConfiguracionClinica,
  reporte: ReporteEmpresa
): string {
  const filas = reporte.atenciones
    .map(
      (a) => `<tr>
        <td>${esc(formatearFecha(a.fecha))}</td>
        <td>${esc(a.codigoEmpleado ?? '—')}</td>
        <td>${esc(a.nombreCompleto)}</td>
        <td>${esc(a.numeroExpediente)}</td>
        <td>${esc(a.diagnosticoPrincipal ?? a.motivo)}</td>
        <td>${esc(a.nombreDoctor ?? '—')}</td>
      </tr>`
    )
    .join('')

  const tabla =
    reporte.atenciones.length > 0
      ? `<table>
          <thead><tr>
            <th>Fecha</th><th>Código</th><th>Empleado</th>
            <th>Expediente</th><th>Diagnóstico</th><th>Atendió</th>
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>`
      : '<p class="vacio">No hubo atenciones de esta empresa en el periodo.</p>'

  const cuerpo = `
    ${cabecera(config, config.nombreDoctor)}
    <div class="titulo-documento">Reporte de atenciones por empresa</div>

    <section class="paciente">
      ${campo('Empresa', reporte.empresa.nombre)}
      ${campo('Código', reporte.empresa.codigo)}
      ${campo('Desde', formatearFecha(reporte.desde))}
      ${campo('Hasta', formatearFecha(reporte.hasta))}
    </section>

    <section class="paciente tres">
      ${campo('Atenciones', String(reporte.totalAtenciones))}
      ${campo('Empleados atendidos', String(reporte.totalPacientes))}
      ${campo('Contacto', reporte.empresa.contacto ?? '—')}
    </section>

    <section class="seccion">${tabla}</section>
    ${pie(config, `Reporte de ${reporte.empresa.nombre} · ${formatearFecha(reporte.desde)} a ${formatearFecha(reporte.hasta)}`)}`

  return documento(`Reporte ${reporte.empresa.codigo}`, cuerpo, 'carta')
}
