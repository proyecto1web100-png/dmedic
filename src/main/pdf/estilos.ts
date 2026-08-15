/**
 * Hoja de estilos comun a todos los documentos.
 *
 * Las medidas estan en milimetros y puntos, no en pixeles: el destino es papel.
 * Carta = 215.9 x 279.4 mm. Con margenes de 15 mm el ancho util es 185.9 mm,
 * y ese es el ancho de la caja de contenido.
 */
export const ANCHO_UTIL_CARTA_MM = 185.9

export const ESTILOS = `
  @page { margin: 0; }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
  }

  body {
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #1a2430;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ===== Encabezado ===== */
  .cabecera {
    display: flex;
    align-items: flex-start;
    gap: 5mm;
    padding-bottom: 3mm;
    border-bottom: 0.6mm solid #0f766e;
  }
  .cabecera .logo {
    width: 18mm;
    height: 18mm;
    object-fit: contain;
    flex: 0 0 auto;
  }
  .cabecera .identidad { flex: 1 1 auto; min-width: 0; }
  .cabecera .clinica {
    font-size: 15pt;
    font-weight: 700;
    color: #0f766e;
    line-height: 1.15;
    letter-spacing: -0.01em;
  }
  .cabecera .contacto {
    font-size: 8pt;
    color: #5b6b7a;
    line-height: 1.4;
    margin-top: 0.8mm;
  }
  .cabecera .profesional {
    flex: 0 0 auto;
    text-align: right;
    font-size: 8.5pt;
    color: #5b6b7a;
    line-height: 1.4;
    max-width: 60mm;
  }
  .cabecera .profesional .nombre {
    display: block;
    font-size: 10.5pt;
    font-weight: 700;
    color: #1a2430;
  }

  .titulo-documento {
    margin-top: 4mm;
    font-size: 12pt;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #0f766e;
  }

  /* ===== Datos del paciente ===== */
  .paciente {
    margin-top: 3mm;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2mm 4mm;
    background: #f3f7f8;
    border: 0.2mm solid #dfe8ea;
    border-radius: 1.5mm;
    padding: 2.5mm 3mm;
  }
  .paciente.tres { grid-template-columns: repeat(3, 1fr); }
  .paciente .rotulo {
    font-size: 7pt;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #6b7c8c;
  }
  .paciente .dato {
    font-size: 9.5pt;
    font-weight: 600;
    line-height: 1.3;
  }

  .alerta-alergias {
    margin-top: 2.5mm;
    border: 0.3mm solid #c0392b;
    background: #fdf2f0;
    color: #8f2419;
    border-radius: 1.5mm;
    padding: 2mm 3mm;
    font-size: 9pt;
    font-weight: 600;
  }

  /* ===== Secciones ===== */
  .seccion { margin-top: 4.5mm; }
  .seccion > h2 {
    margin: 0 0 1.5mm;
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: #0f766e;
    border-bottom: 0.2mm solid #dfe8ea;
    padding-bottom: 1mm;
  }
  .seccion p { margin: 0 0 1.5mm; }
  .seccion p:last-child { margin-bottom: 0; }
  .texto { white-space: pre-wrap; }
  .vacio { color: #93a3b1; font-style: italic; }

  /* Evita que un bloque quede partido entre dos hojas. */
  .no-partir { break-inside: avoid; page-break-inside: avoid; }

  /* ===== Signos vitales ===== */
  .vitales {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1.5mm;
  }
  .vitales .celda {
    border: 0.2mm solid #dfe8ea;
    border-radius: 1.2mm;
    padding: 1.5mm 2mm;
  }
  .vitales .rotulo {
    font-size: 7pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7c8c;
  }
  .vitales .valor { font-size: 10.5pt; font-weight: 700; }
  .vitales .valor small { font-size: 7.5pt; font-weight: 500; color: #6b7c8c; }

  /* ===== Medicamentos ===== */
  .medicamento {
    display: flex;
    gap: 2.5mm;
    padding: 2mm 0;
    border-bottom: 0.2mm dotted #dfe8ea;
  }
  .medicamento:last-child { border-bottom: none; }
  .medicamento .indice {
    flex: 0 0 6mm;
    height: 6mm;
    border-radius: 50%;
    background: #0f766e;
    color: #fff;
    font-size: 9pt;
    font-weight: 700;
    text-align: center;
    line-height: 6mm;
  }
  .medicamento .cuerpo { flex: 1 1 auto; min-width: 0; }
  .medicamento .nombre { font-size: 11pt; font-weight: 700; line-height: 1.25; }
  .medicamento .forma { font-weight: 500; color: #5b6b7a; }
  .medicamento .pauta { font-size: 9.5pt; margin-top: 0.5mm; }
  .medicamento .indicaciones {
    font-size: 8.5pt;
    color: #5b6b7a;
    font-style: italic;
    margin-top: 0.5mm;
  }

  /* ===== Tablas ===== */
  table { width: 100%; border-collapse: collapse; }
  table th {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7c8c;
    text-align: left;
    padding: 1.5mm 2mm;
    border-bottom: 0.3mm solid #cfdadd;
  }
  table td {
    font-size: 9pt;
    padding: 1.5mm 2mm;
    border-bottom: 0.2mm solid #eef2f4;
    vertical-align: top;
  }
  table tr { break-inside: avoid; page-break-inside: avoid; }
  table .num { text-align: right; font-variant-numeric: tabular-nums; }
  .anulada td { color: #93a3b1; text-decoration: line-through; }

  /* ===== Consultas del expediente ===== */
  .consulta {
    border: 0.2mm solid #dfe8ea;
    border-radius: 1.5mm;
    padding: 3mm;
    margin-bottom: 3mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .consulta > header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 3mm;
    border-bottom: 0.2mm solid #eef2f4;
    padding-bottom: 1.5mm;
    margin-bottom: 2mm;
  }
  .consulta .fecha { font-size: 10.5pt; font-weight: 700; }
  .consulta .autor { font-size: 8.5pt; color: #5b6b7a; }
  .consulta .campo { margin-bottom: 1.5mm; }
  .consulta .campo:last-child { margin-bottom: 0; }
  .consulta .campo .rotulo {
    font-size: 7pt;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7c8c;
  }
  .consulta .campo .contenido { font-size: 9.5pt; white-space: pre-wrap; }

  .etiqueta {
    display: inline-block;
    border-radius: 4mm;
    padding: 0.3mm 2mm;
    font-size: 7.5pt;
    font-weight: 700;
  }
  .etiqueta.marca { background: #d7f0eb; color: #0b5a52; }
  .etiqueta.gris { background: #e8edef; color: #5b6b7a; }
  .etiqueta.roja { background: #fbe2de; color: #8f2419; }
  .etiqueta.ambar { background: #fdf0d9; color: #8a5a12; }
  .etiqueta.verde { background: #ddf1e3; color: #1d6b38; }

  /* ===== Firma y pie ===== */
  .firma {
    margin-top: 14mm;
    text-align: center;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .firma .linea {
    width: 70mm;
    margin: 0 auto 1.2mm;
    border-top: 0.3mm solid #1a2430;
  }
  .firma .nombre { font-size: 9.5pt; font-weight: 600; }
  .firma .detalle { font-size: 8pt; color: #5b6b7a; }

  .pie {
    margin-top: 6mm;
    padding-top: 2mm;
    border-top: 0.2mm solid #eef2f4;
    font-size: 7.5pt;
    color: #93a3b1;
    display: flex;
    justify-content: space-between;
    gap: 4mm;
  }
`
