import { formatearFecha, formatearFechaHora, formatearFechaLarga } from '@shared/lib/fecha'
import { edadLegible, formatearIdentidad, nombreCompleto } from '@shared/lib/paciente'
import { clasificarImc } from '@shared/lib/vitales'
import { ESTILOS } from './estilos'
import type {
  Cie10,
  ConfiguracionClinica,
  ConsultaCompleta,
  ExpedienteResumen,
  MedicamentoRecetado,
  ReporteCitas,
  SignosVitales
} from '@shared/types'

/** Impide que un dato del paciente rompa el HTML o inyecte marcado. */
function esc(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return ''
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export type TamanoPagina = 'carta' | 'media_carta'

/** Carta: 215.9 x 279.4 mm. Media carta: 139.7 x 215.9 mm. */
const MARGENES: Record<TamanoPagina, string> = {
  carta: '15mm 15mm 12mm',
  media_carta: '10mm 10mm 9mm'
}

function documento(titulo: string, cuerpo: string, tamano: TamanoPagina): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>
${ESTILOS}
body { padding: ${MARGENES[tamano]}; }
${tamano === 'media_carta' ? 'body { font-size: 9pt; } .cabecera .clinica { font-size: 13pt; } .titulo-documento { font-size: 10.5pt; margin-top: 3mm; }' : ''}
</style></head>
<body>${cuerpo}</body></html>`
}

function cabecera(config: ConfiguracionClinica, nombreDoctor: string): string {
  const logo = config.logoDataUrl
    ? `<img class="logo" src="${esc(config.logoDataUrl)}" alt="">`
    : ''
  const contacto = [config.direccion, config.telefono].filter(Boolean).map(esc).join(' · ')

  return `<header class="cabecera">
    ${logo}
    <div class="identidad">
      <div class="clinica">${esc(config.nombreClinica)}</div>
      ${contacto ? `<div class="contacto">${contacto}</div>` : ''}
    </div>
    <div class="profesional">
      <span class="nombre">${esc(nombreDoctor)}</span>
      ${esc(config.especialidad)}
    </div>
  </header>`
}

function pie(config: ConfiguracionClinica, nota?: string): string {
  return `<div class="pie">
    <span>${esc(config.nombreClinica)}</span>
    <span>${esc(nota ?? `Generado el ${formatearFechaHora(new Date().toISOString())}`)}</span>
  </div>`
}

function firma(config: ConfiguracionClinica, nombreDoctor: string): string {
  return `<div class="firma">
    <div class="linea"></div>
    <div class="nombre">${esc(nombreDoctor)}</div>
    ${config.especialidad ? `<div class="detalle">${esc(config.especialidad)}</div>` : ''}
  </div>`
}

function campo(rotulo: string, dato: string): string {
  return `<div><div class="rotulo">${esc(rotulo)}</div><div class="dato">${esc(dato)}</div></div>`
}

function bloquePaciente(
  expediente: ExpedienteResumen,
  fecha: string,
  columnas: 3 | 4 = 4
): string {
  const p = expediente.paciente
  return `<section class="paciente ${columnas === 3 ? 'tres' : ''}">
    ${campo('Paciente', nombreCompleto(p))}
    ${campo('Edad', edadLegible(p.fechaNacimiento))}
    ${campo('Expediente', p.numeroExpediente)}
    ${campo('Fecha', formatearFechaLarga(fecha))}
  </section>`
}

function avisoAlergias(expediente: ExpedienteResumen): string {
  const activas = expediente.alergias.filter((a) => a.activa)
  if (activas.length === 0) return ''
  const lista = activas.map((a) => `${a.sustancia} (${a.gravedad})`).join(' · ')
  return `<div class="alerta-alergias">⚠ ALERGIAS: ${esc(lista)}</div>`
}

function seccion(titulo: string, contenido: string): string {
  if (!contenido.trim()) return ''
  return `<section class="seccion no-partir"><h2>${esc(titulo)}</h2>${contenido}</section>`
}

function parrafo(texto: string | null): string {
  if (!texto) return ''
  return `<p class="texto">${esc(texto)}</p>`
}

function itemMedicamento(m: MedicamentoRecetado, indice: number): string {
  const titulo = [m.nombre, m.concentracion].filter(Boolean).join(' ')
  const pauta = [m.dosis, m.frecuencia, m.duracion].filter(Boolean).join(' · ')
  const extra = [m.via ? `Vía ${m.via}` : null, m.indicaciones].filter(Boolean).join(' — ')
  return `<div class="medicamento">
    <div class="indice">${indice + 1}</div>
    <div class="cuerpo">
      <div class="nombre">${esc(titulo)}${m.forma ? ` <span class="forma">(${esc(m.forma)})</span>` : ''}</div>
      <div class="pauta">${esc(pauta)}</div>
      ${extra ? `<div class="indicaciones">${esc(extra)}</div>` : ''}
    </div>
  </div>`
}

const UNIDADES: { campo: keyof SignosVitales; rotulo: string; unidad: string }[] = [
  { campo: 'peso', rotulo: 'Peso', unidad: 'kg' },
  { campo: 'altura', rotulo: 'Altura', unidad: 'cm' },
  { campo: 'temperatura', rotulo: 'Temp.', unidad: '°C' },
  { campo: 'frecuenciaCardiaca', rotulo: 'F. cardíaca', unidad: 'lpm' },
  { campo: 'frecuenciaRespiratoria', rotulo: 'F. resp.', unidad: 'rpm' },
  { campo: 'saturacionOxigeno', rotulo: 'SpO₂', unidad: '%' },
  { campo: 'glucosa', rotulo: 'Glucosa', unidad: 'mg/dL' }
]

function bloqueVitales(s: SignosVitales): string {
  const celdas: string[] = []

  for (const { campo: c, rotulo, unidad } of UNIDADES) {
    const valor = s[c]
    if (valor === null) continue
    celdas.push(
      `<div class="celda"><div class="rotulo">${esc(rotulo)}</div><div class="valor">${esc(valor)} <small>${esc(unidad)}</small></div></div>`
    )
  }

  if (s.presionSistolica !== null && s.presionDiastolica !== null) {
    celdas.unshift(
      `<div class="celda"><div class="rotulo">Presión</div><div class="valor">${esc(s.presionSistolica)}/${esc(s.presionDiastolica)} <small>mmHg</small></div></div>`
    )
  }
  if (s.imc !== null) {
    celdas.push(
      `<div class="celda"><div class="rotulo">IMC</div><div class="valor">${esc(s.imc)} <small>${esc(clasificarImc(s.imc))}</small></div></div>`
    )
  }

  if (celdas.length === 0) return ''
  return `<div class="vitales">${celdas.join('')}</div>`
}

function listaDiagnosticos(consulta: ConsultaCompleta): string {
  if (consulta.diagnosticos.length === 0) return ''
  return consulta.diagnosticos
    .map(
      (d) =>
        `<p><strong>${esc(d.codigoCie10)}</strong> · ${esc(d.descripcion)}${
          d.esPrincipal ? ' <span class="etiqueta marca">Principal</span>' : ''
        }${d.nota ? `<br><span class="vacio">${esc(d.nota)}</span>` : ''}</p>`
    )
    .join('')
}

// ===== Receta =====

export function htmlReceta(
  config: ConfiguracionClinica,
  expediente: ExpedienteResumen,
  consulta: ConsultaCompleta,
  tamano: TamanoPagina
): string {
  const doctor = consulta.nombreDoctor ?? config.nombreDoctor
  const cuerpo = `
    ${cabecera(config, doctor)}
    <div class="titulo-documento">Receta médica</div>
    ${bloquePaciente(expediente, consulta.fecha)}
    ${avisoAlergias(expediente)}
    <section class="seccion">
      <h2>Prescripción</h2>
      ${
        consulta.medicamentos.length > 0
          ? consulta.medicamentos.map(itemMedicamento).join('')
          : '<p class="vacio">Sin medicamentos prescritos.</p>'
      }
    </section>
    ${seccion('Indicaciones generales', parrafo(consulta.recomendaciones))}
    ${firma(config, doctor)}
    ${pie(config)}`
  return documento('Receta médica', cuerpo, tamano)
}

// ===== Resumen de una consulta =====

export function htmlResumenConsulta(
  config: ConfiguracionClinica,
  expediente: ExpedienteResumen,
  consulta: ConsultaCompleta
): string {
  const doctor = consulta.nombreDoctor ?? config.nombreDoctor
  const cuerpo = `
    ${cabecera(config, doctor)}
    <div class="titulo-documento">Resumen de consulta</div>
    ${bloquePaciente(expediente, consulta.fecha)}
    ${avisoAlergias(expediente)}
    ${seccion('Motivo de consulta', parrafo(consulta.motivo))}
    ${seccion('Síntomas e historia actual', parrafo(consulta.sintomas))}
    ${seccion('Signos vitales', bloqueVitales(consulta.signos))}
    ${seccion('Exploración física', parrafo(consulta.exploracion))}
    ${seccion('Diagnóstico', listaDiagnosticos(consulta))}
    ${seccion('Tratamiento', parrafo(consulta.tratamiento))}
    ${seccion(
      'Medicamentos',
      consulta.medicamentos.length > 0
        ? consulta.medicamentos.map(itemMedicamento).join('')
        : ''
    )}
    ${seccion('Observaciones', parrafo(consulta.observaciones))}
    ${seccion('Recomendaciones', parrafo(consulta.recomendaciones))}
    ${seccion(
      'Próxima cita',
      `<p>${consulta.sinProximaCita ? 'Sin próxima cita programada.' : esc(formatearFechaLarga(consulta.proximaCitaFecha))}</p>`
    )}
    ${seccion(
      'Adendas',
      consulta.adendas
        .map(
          (a) =>
            `<p><strong>${esc(formatearFechaHora(a.creadaEn))}</strong><br><span class="texto">${esc(a.texto)}</span></p>`
        )
        .join('')
    )}
    ${firma(config, doctor)}
    ${pie(config)}`
  return documento('Resumen de consulta', cuerpo, 'carta')
}

// ===== Expediente completo =====

export function htmlExpediente(
  config: ConfiguracionClinica,
  expediente: ExpedienteResumen,
  consultas: ConsultaCompleta[]
): string {
  const p = expediente.paciente

  const datosPersonales = `<section class="paciente tres">
    ${campo('Nombre completo', nombreCompleto(p))}
    ${campo('Expediente', p.numeroExpediente)}
    ${campo('Identidad', formatearIdentidad(p.numeroIdentidad))}
    ${campo('Fecha de nacimiento', formatearFecha(p.fechaNacimiento))}
    ${campo('Edad', edadLegible(p.fechaNacimiento))}
    ${campo('Sexo', p.sexo === 'M' ? 'Masculino' : 'Femenino')}
    ${campo('Teléfono', p.telefono ?? '—')}
    ${campo('Tipo de sangre', p.tipoSangre ?? '—')}
    ${campo('Aseguradora', p.aseguradora ?? '—')}
  </section>`

  const contactos =
    expediente.contactos.length > 0
      ? `<table>
          <thead><tr><th>Contacto de emergencia</th><th>Parentesco</th><th>Teléfono</th></tr></thead>
          <tbody>${expediente.contactos
            .map(
              (c) =>
                `<tr><td>${esc(c.nombre)}</td><td>${esc(c.parentesco ?? '—')}</td><td>${esc(c.telefono)}</td></tr>`
            )
            .join('')}</tbody>
        </table>`
      : ''

  const alergias =
    expediente.alergias.length > 0
      ? `<table>
          <thead><tr><th>Sustancia</th><th>Reacción</th><th>Gravedad</th><th>Estado</th></tr></thead>
          <tbody>${expediente.alergias
            .map(
              (a) =>
                `<tr><td><strong>${esc(a.sustancia)}</strong></td><td>${esc(a.reaccion ?? '—')}</td><td>${esc(a.gravedad)}</td><td>${a.activa ? 'Activa' : 'Inactiva'}</td></tr>`
            )
            .join('')}</tbody>
        </table>`
      : '<p class="vacio">Sin alergias registradas.</p>'

  const antecedentes =
    expediente.antecedentes.length > 0
      ? `<table>
          <thead><tr><th style="width:32%">Tipo</th><th>Descripción</th><th style="width:20%">Registrado</th></tr></thead>
          <tbody>${expediente.antecedentes
            .map(
              (a) =>
                `<tr><td>${esc(a.tipo.replace(/_/g, ' '))}</td><td>${esc(a.descripcion)}</td><td>${esc(formatearFecha(a.registradoEn))}</td></tr>`
            )
            .join('')}</tbody>
        </table>`
      : '<p class="vacio">Sin antecedentes registrados.</p>'

  const cronicos =
    expediente.cronicos.length > 0
      ? `<table>
          <thead><tr><th style="width:16%">CIE-10</th><th>Descripción</th><th style="width:18%">Desde</th><th style="width:16%">Estado</th></tr></thead>
          <tbody>${expediente.cronicos
            .map(
              (c) =>
                `<tr><td>${esc(c.codigoCie10 ?? '—')}</td><td>${esc(c.descripcion)}</td><td>${esc(c.desde ? formatearFecha(c.desde) : '—')}</td><td>${c.activo ? 'Activo' : 'Resuelto'}</td></tr>`
            )
            .join('')}</tbody>
        </table>`
      : '<p class="vacio">Sin problemas crónicos registrados.</p>'

  const historial =
    consultas.length > 0
      ? consultas
          .map((c) => {
            const bloque = (rotulo: string, contenido: string | null): string =>
              contenido
                ? `<div class="campo"><div class="rotulo">${esc(rotulo)}</div><div class="contenido">${esc(contenido)}</div></div>`
                : ''

            const medicamentos =
              c.medicamentos.length > 0
                ? `<div class="campo"><div class="rotulo">Medicamentos</div>${c.medicamentos
                    .map(
                      (m) =>
                        `<div class="contenido">• ${esc([m.nombre, m.concentracion].filter(Boolean).join(' '))} — ${esc([m.dosis, m.frecuencia, m.duracion].filter(Boolean).join(' · '))}</div>`
                    )
                    .join('')}</div>`
                : ''

            const diagnosticos =
              c.diagnosticos.length > 0
                ? `<div class="campo"><div class="rotulo">Diagnóstico</div>${c.diagnosticos
                    .map(
                      (d) =>
                        `<div class="contenido"><strong>${esc(d.codigoCie10)}</strong> ${esc(d.descripcion)}${d.esPrincipal ? ' (principal)' : ''}</div>`
                    )
                    .join('')}</div>`
                : ''

            const adendas =
              c.adendas.length > 0
                ? `<div class="campo"><div class="rotulo">Adendas</div>${c.adendas
                    .map(
                      (a) =>
                        `<div class="contenido">${esc(formatearFecha(a.creadaEn))} — ${esc(a.texto)}</div>`
                    )
                    .join('')}</div>`
                : ''

            return `<article class="consulta">
              <header>
                <span class="fecha">${esc(formatearFechaLarga(c.fecha))}</span>
                <span class="autor">${esc(c.nombreDoctor ?? '')}${
                  c.estado === 'anulada'
                    ? ' <span class="etiqueta roja">Anulada</span>'
                    : ''
                }</span>
              </header>
              ${c.estado === 'anulada' ? `<div class="campo"><div class="contenido vacio">Motivo de anulación: ${esc(c.motivoAnulacion)}</div></div>` : ''}
              ${bloque('Motivo', c.motivo)}
              ${bloque('Síntomas', c.sintomas)}
              ${bloqueVitales(c.signos) ? `<div class="campo"><div class="rotulo">Signos vitales</div>${bloqueVitales(c.signos)}</div>` : ''}
              ${bloque('Exploración', c.exploracion)}
              ${diagnosticos}
              ${bloque('Tratamiento', c.tratamiento)}
              ${medicamentos}
              ${bloque('Observaciones', c.observaciones)}
              ${bloque('Recomendaciones', c.recomendaciones)}
              ${adendas}
            </article>`
          })
          .join('')
      : '<p class="vacio">Este paciente todavía no tiene consultas registradas.</p>'

  const cuerpo = `
    ${cabecera(config, config.nombreDoctor)}
    <div class="titulo-documento">Expediente médico</div>
    ${datosPersonales}
    ${seccion('Contactos de emergencia', contactos)}
    ${seccion('Alergias', alergias)}
    ${seccion('Antecedentes', antecedentes)}
    ${seccion('Problemas crónicos', cronicos)}
    <section class="seccion">
      <h2>Historial de consultas (${consultas.length})</h2>
      ${historial}
    </section>
    ${pie(config, `Expediente ${p.numeroExpediente} · impreso el ${formatearFechaHora(new Date().toISOString())}`)}`

  return documento(`Expediente ${p.numeroExpediente}`, cuerpo, 'carta')
}

// ===== Reporte de agenda =====

const ETIQUETA_ESTADO: Record<string, { texto: string; clase: string }> = {
  agendada: { texto: 'Agendada', clase: 'marca' },
  atendida: { texto: 'Atendida', clase: 'verde' },
  no_asistio: { texto: 'No asistió', clase: 'ambar' },
  cancelada: { texto: 'Cancelada', clase: 'gris' }
}

const NOMBRE_PERIODO: Record<string, string> = {
  dia: 'Agenda del día',
  semana: 'Agenda de la semana',
  mes: 'Agenda del mes'
}

export function htmlReporteCitas(
  config: ConfiguracionClinica,
  reporte: ReporteCitas
): string {
  const rango =
    reporte.desde === reporte.hasta
      ? formatearFechaLarga(reporte.desde)
      : `${formatearFechaLarga(reporte.desde)} — ${formatearFechaLarga(reporte.hasta)}`

  // Se agrupa por día: es como se lee una agenda en papel.
  const porDia = new Map<string, typeof reporte.citas>()
  for (const cita of reporte.citas) {
    const lista = porDia.get(cita.fecha) ?? []
    lista.push(cita)
    porDia.set(cita.fecha, lista)
  }

  const dias = [...porDia.entries()]
    .map(([fecha, citas]) => {
      const filas = citas
        .map((c) => {
          const estado = ETIQUETA_ESTADO[c.estado]
          return `<tr class="${c.estado === 'cancelada' ? 'anulada' : ''}">
            <td class="num">${esc(c.hora ?? '—')}</td>
            <td><strong>${esc(c.nombre)}</strong>${
              c.esPacienteRegistrado
                ? ''
                : ' <span class="etiqueta ambar">Sin expediente</span>'
            }</td>
            <td>${esc(c.numeroExpediente ?? '—')}</td>
            <td>${esc(c.telefono ?? '—')}</td>
            <td>${esc(c.motivo ?? '—')}</td>
            ${reporte.doctorId === null ? `<td>${esc(c.nombreDoctor ?? '—')}</td>` : ''}
            <td><span class="etiqueta ${estado.clase}">${esc(estado.texto)}</span></td>
          </tr>`
        })
        .join('')

      return `<section class="seccion no-partir">
        <h2>${esc(formatearFechaLarga(fecha))} · ${citas.length} ${citas.length === 1 ? 'cita' : 'citas'}</h2>
        <table>
          <thead><tr>
            <th style="width:12mm">Hora</th>
            <th>Paciente</th>
            <th style="width:24mm">Expediente</th>
            <th style="width:24mm">Teléfono</th>
            <th>Motivo</th>
            ${reporte.doctorId === null ? '<th style="width:30mm">Doctor</th>' : ''}
            <th style="width:22mm">Estado</th>
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </section>`
    })
    .join('')

  const resumen = `<section class="paciente">
    ${campo('Agendadas', String(reporte.totales.agendadas))}
    ${campo('Atendidas', String(reporte.totales.atendidas))}
    ${campo('No asistió', String(reporte.totales.noAsistio))}
    ${campo('Canceladas', String(reporte.totales.canceladas))}
  </section>`

  const cuerpo = `
    ${cabecera(config, reporte.nombreDoctor ?? 'Todos los doctores')}
    <div class="titulo-documento">${esc(NOMBRE_PERIODO[reporte.periodo])}</div>
    <p style="margin:2mm 0 0;font-size:10pt">${esc(rango)}</p>
    ${resumen}
    ${dias || '<p class="vacio" style="margin-top:5mm">No hay citas en este período.</p>'}
    ${pie(config, `Impreso el ${formatearFechaHora(new Date().toISOString())}`)}`

  return documento('Reporte de citas', cuerpo, 'carta')
}

// ===== Catalogo de diagnosticos (referencia interna) =====

export function htmlCatalogoDiagnosticos(
  config: ConfiguracionClinica,
  codigos: Cie10[]
): string {
  const filas = codigos
    .map(
      (c) =>
        `<tr><td><strong>${esc(c.codigo)}</strong></td><td>${esc(c.descripcion)}</td><td>${esc(c.categoria ?? '—')}</td></tr>`
    )
    .join('')

  const cuerpo = `
    ${cabecera(config, config.nombreDoctor)}
    <div class="titulo-documento">Catálogo de diagnósticos</div>
    <section class="seccion">
      <h2>${codigos.length} códigos</h2>
      <table>
        <thead><tr><th style="width:22mm">Código</th><th>Descripción</th><th style="width:38mm">Categoría</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </section>
    ${pie(config)}`

  return documento('Catálogo de diagnósticos', cuerpo, 'carta')
}
