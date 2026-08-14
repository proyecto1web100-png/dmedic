import { formatearFechaLarga } from '@shared/lib/fecha'
import { edadLegible, nombreCompleto } from '@shared/lib/paciente'
import type {
  ConfiguracionClinica,
  ConsultaCompleta,
  ExpedienteResumen,
  MedicamentoRecetado
} from '@shared/types'

/** Impide que un dato del paciente rompa el HTML o inyecte marcado. */
function esc(valor: string | null | undefined): string {
  if (valor === null || valor === undefined) return ''
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function textoMultilinea(valor: string | null): string {
  if (!valor) return ''
  return esc(valor).replace(/\n/g, '<br>')
}

const ESTILOS_BASE = `
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Arial, sans-serif;
    color: #16202b;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .encabezado {
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 2px solid #0f766e;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  .encabezado img { height: 52px; width: auto; object-fit: contain; }
  .clinica-nombre {
    font-size: 16px;
    font-weight: 700;
    color: #0f766e;
    letter-spacing: 0.2px;
  }
  .clinica-datos { font-size: 9px; color: #5b6b7a; line-height: 1.45; }
  .doctor { margin-left: auto; text-align: right; font-size: 9.5px; line-height: 1.45; }
  .doctor strong { display: block; font-size: 11px; color: #16202b; }
  .paciente {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    background: #f4f7f8;
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 10px;
    margin-bottom: 12px;
  }
  .paciente .campo { line-height: 1.5; }
  .paciente .etiqueta { color: #6b7c8c; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.4px; }
  .paciente .valor { font-weight: 600; }
  .titulo-seccion {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #0f766e;
    margin: 14px 0 6px;
  }
  .alergias {
    border: 1px solid #dc2626;
    background: #fef2f2;
    color: #991b1b;
    border-radius: 6px;
    padding: 6px 9px;
    font-size: 9.5px;
    font-weight: 600;
    margin-bottom: 10px;
  }
  .medicamento {
    border-left: 3px solid #0f766e;
    padding: 6px 0 6px 9px;
    margin-bottom: 9px;
    page-break-inside: avoid;
  }
  .medicamento .nombre { font-size: 11.5px; font-weight: 700; }
  .medicamento .pauta { font-size: 10px; margin-top: 2px; line-height: 1.5; }
  .medicamento .extra { font-size: 9px; color: #5b6b7a; margin-top: 2px; font-style: italic; }
  .firma {
    margin-top: 34px;
    text-align: center;
    page-break-inside: avoid;
  }
  .firma .linea {
    border-top: 1px solid #16202b;
    width: 200px;
    margin: 0 auto 4px;
  }
  .firma .rotulo { font-size: 9px; color: #5b6b7a; }
  .pie {
    margin-top: 14px;
    border-top: 1px solid #dfe6ea;
    padding-top: 6px;
    font-size: 8px;
    color: #93a3b1;
    text-align: center;
  }
  table.datos { width: 100%; border-collapse: collapse; font-size: 10px; }
  table.datos td { padding: 3px 6px; border-bottom: 1px solid #eef2f4; vertical-align: top; }
  table.datos td.campo { color: #6b7c8c; width: 34%; }
  .bloque { margin-bottom: 10px; page-break-inside: avoid; }
  .bloque p { margin: 3px 0; font-size: 10px; line-height: 1.55; }
`

function encabezado(config: ConfiguracionClinica): string {
  const logo = config.logoDataUrl
    ? `<img src="${esc(config.logoDataUrl)}" alt="">`
    : ''
  const datosClinica = [config.direccion, config.telefono].filter(Boolean).map(esc).join('<br>')

  return `
    <div class="encabezado">
      ${logo}
      <div>
        <div class="clinica-nombre">${esc(config.nombreClinica)}</div>
        <div class="clinica-datos">${datosClinica}</div>
      </div>
      <div class="doctor">
        <strong>${esc(config.nombreDoctor)}</strong>
        ${esc(config.especialidad)}
      </div>
    </div>`
}

function bloquePaciente(expediente: ExpedienteResumen, fecha: string): string {
  const p = expediente.paciente
  return `
    <div class="paciente">
      <div class="campo">
        <div class="etiqueta">Paciente</div>
        <div class="valor">${esc(nombreCompleto(p))}</div>
      </div>
      <div class="campo">
        <div class="etiqueta">Edad</div>
        <div class="valor">${esc(edadLegible(p.fechaNacimiento))}</div>
      </div>
      <div class="campo">
        <div class="etiqueta">Expediente</div>
        <div class="valor">${esc(p.numeroExpediente)}</div>
      </div>
      <div class="campo">
        <div class="etiqueta">Fecha</div>
        <div class="valor">${esc(formatearFechaLarga(fecha))}</div>
      </div>
    </div>`
}

function avisoAlergias(expediente: ExpedienteResumen): string {
  const activas = expediente.alergias.filter((a) => a.activa)
  if (activas.length === 0) return ''
  const lista = activas.map((a) => `${a.sustancia} (${a.gravedad})`).join(' · ')
  return `<div class="alergias">⚠ Alergias: ${esc(lista)}</div>`
}

function itemMedicamento(m: MedicamentoRecetado, indice: number): string {
  const titulo = [m.nombre, m.concentracion].filter(Boolean).join(' ')
  const pauta = [m.dosis, m.frecuencia, m.duracion].filter(Boolean).join(' · ')
  const extra = [m.via ? `Vía ${m.via}` : null, m.indicaciones].filter(Boolean).join(' — ')
  return `
    <div class="medicamento">
      <div class="nombre">${indice + 1}. ${esc(titulo)}${m.forma ? ` <span style="font-weight:400;color:#5b6b7a">(${esc(m.forma)})</span>` : ''}</div>
      <div class="pauta">${esc(pauta)}</div>
      ${extra ? `<div class="extra">${esc(extra)}</div>` : ''}
    </div>`
}

function firma(config: ConfiguracionClinica): string {
  return `
    <div class="firma">
      <div class="linea"></div>
      <div class="rotulo">${esc(config.nombreDoctor)}${config.especialidad ? ` · ${esc(config.especialidad)}` : ''}</div>
    </div>`
}

function documento(titulo: string, cuerpo: string): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>${ESTILOS_BASE}</style></head>
<body>${cuerpo}</body></html>`
}

export function htmlReceta(
  config: ConfiguracionClinica,
  expediente: ExpedienteResumen,
  consulta: ConsultaCompleta
): string {
  const medicamentos = consulta.medicamentos.map(itemMedicamento).join('')
  const cuerpo = `
    ${encabezado(config)}
    ${bloquePaciente(expediente, consulta.fecha)}
    ${avisoAlergias(expediente)}
    <div class="titulo-seccion">Receta médica</div>
    ${medicamentos || '<p style="font-size:10px;color:#6b7c8c">Sin medicamentos prescritos.</p>'}
    ${consulta.recomendaciones ? `<div class="titulo-seccion">Recomendaciones</div><div class="bloque"><p>${textoMultilinea(consulta.recomendaciones)}</p></div>` : ''}
    ${firma(config)}
    <div class="pie">${esc(config.nombreClinica)} · Documento generado el ${esc(formatearFechaLarga(new Date().toISOString()))}</div>`
  return documento('Receta médica', cuerpo)
}

export function htmlResumenConsulta(
  config: ConfiguracionClinica,
  expediente: ExpedienteResumen,
  consulta: ConsultaCompleta
): string {
  const s = consulta.signos
  const filasVitales: [string, string][] = [
    ['Peso', s.peso ? `${s.peso} kg` : ''],
    ['Altura', s.altura ? `${s.altura} cm` : ''],
    ['IMC', s.imc ? `${s.imc}` : ''],
    [
      'Presión arterial',
      s.presionSistolica && s.presionDiastolica
        ? `${s.presionSistolica}/${s.presionDiastolica} mmHg`
        : ''
    ],
    ['Temperatura', s.temperatura ? `${s.temperatura} °C` : ''],
    ['Frecuencia cardíaca', s.frecuenciaCardiaca ? `${s.frecuenciaCardiaca} lpm` : ''],
    ['Frecuencia respiratoria', s.frecuenciaRespiratoria ? `${s.frecuenciaRespiratoria} rpm` : ''],
    ['Saturación de oxígeno', s.saturacionOxigeno ? `${s.saturacionOxigeno} %` : ''],
    ['Glucosa', s.glucosa ? `${s.glucosa} mg/dL` : '']
  ]
  const vitales = filasVitales
    .filter(([, valor]) => valor !== '')
    .map(([campo, valor]) => `<tr><td class="campo">${esc(campo)}</td><td>${esc(valor)}</td></tr>`)
    .join('')

  const diagnosticos = consulta.diagnosticos
    .map(
      (d) =>
        `<p><strong>${esc(d.codigoCie10)}</strong> · ${esc(d.descripcion)}${d.esPrincipal ? ' <em>(principal)</em>' : ''}${d.nota ? `<br><span style="color:#5b6b7a">${esc(d.nota)}</span>` : ''}</p>`
    )
    .join('')

  const seccion = (titulo: string, contenido: string): string =>
    contenido
      ? `<div class="titulo-seccion">${esc(titulo)}</div><div class="bloque">${contenido}</div>`
      : ''

  const cuerpo = `
    ${encabezado(config)}
    ${bloquePaciente(expediente, consulta.fecha)}
    ${avisoAlergias(expediente)}
    ${seccion('Motivo de consulta', `<p>${textoMultilinea(consulta.motivo)}</p>`)}
    ${seccion('Síntomas e historia actual', consulta.sintomas ? `<p>${textoMultilinea(consulta.sintomas)}</p>` : '')}
    ${vitales ? `<div class="titulo-seccion">Signos vitales</div><table class="datos">${vitales}</table>` : ''}
    ${seccion('Exploración física', consulta.exploracion ? `<p>${textoMultilinea(consulta.exploracion)}</p>` : '')}
    ${seccion('Diagnóstico', diagnosticos)}
    ${seccion('Tratamiento', consulta.tratamiento ? `<p>${textoMultilinea(consulta.tratamiento)}</p>` : '')}
    ${consulta.medicamentos.length > 0 ? `<div class="titulo-seccion">Medicamentos</div>${consulta.medicamentos.map(itemMedicamento).join('')}` : ''}
    ${seccion('Observaciones', consulta.observaciones ? `<p>${textoMultilinea(consulta.observaciones)}</p>` : '')}
    ${seccion('Recomendaciones', consulta.recomendaciones ? `<p>${textoMultilinea(consulta.recomendaciones)}</p>` : '')}
    ${seccion('Próxima cita', consulta.sinProximaCita ? '<p>Sin próxima cita programada.</p>' : `<p>${esc(formatearFechaLarga(consulta.proximaCitaFecha))}</p>`)}
    ${consulta.adendas.length > 0 ? `<div class="titulo-seccion">Adendas</div>${consulta.adendas.map((a) => `<div class="bloque"><p><strong>${esc(formatearFechaLarga(a.creadaEn))}</strong><br>${textoMultilinea(a.texto)}</p></div>`).join('')}` : ''}
    ${firma(config)}
    <div class="pie">${esc(config.nombreClinica)} · Documento generado el ${esc(formatearFechaLarga(new Date().toISOString()))}</div>`

  return documento('Resumen de consulta', cuerpo)
}
