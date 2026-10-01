import type { Tema } from './contenido'

/**
 * Temas del manual para lo que se agrego despues de la primera version: ficha
 * social del paciente, empresas con convenio, estudios adjuntos, medicacion
 * permanente, incapacidades, referencias, inventario y periodo de prueba.
 *
 * Viven aparte para que contenido.ts no crezca sin limite; se insertan en sus
 * secciones desde alli.
 */

export const TEMAS_FICHA_SOCIAL: Tema[] = [
  {
    id: 'ficha-social',
    titulo: 'Datos sociales, laborales y quién relata la historia',
    resumen: 'Escolaridad, ocupación, estado civil, historiador y empresa del paciente.',
    permiso: 'pacientes.registrar',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'Al registrar o editar un paciente, debajo de los datos de contacto hay un apartado de datos sociales y laborales. No son datos clínicos, pero cambian cómo se lee todo el expediente: no se explica igual un tratamiento a alguien que terminó primaria que a alguien con estudios universitarios, ni se interpreta igual una historia que relata el propio paciente que una que relata un familiar.'
      },
      {
        tipo: 'ficha',
        titulo: 'Qué se guarda',
        datos: [
          {
            termino: 'Nivel educativo',
            detalle: 'Desde ninguno hasta postgrado. Orienta cómo dar las indicaciones.'
          },
          { termino: 'Estado civil', detalle: 'Soltero, casado, unión libre, divorciado o viudo.' },
          { termino: 'Ocupación', detalle: 'A qué se dedica. Muchas dolencias vienen del trabajo.' },
          {
            termino: 'Historiador',
            detalle:
              'Quién relata la historia clínica y qué parentesco tiene. En un menor o en alguien que no puede relatar, no es el propio paciente, y eso hay que poder saberlo después.'
          },
          {
            termino: 'Empresa con convenio',
            detalle: 'La empresa a la que pertenece el paciente, y su número de empleado.'
          }
        ]
      },
      {
        tipo: 'aviso',
        tono: 'info',
        texto:
          'Todos estos campos son opcionales. Lo que llene aparece en la cabecera del expediente y en el expediente impreso.'
      }
    ]
  },
  {
    id: 'historia-inicial',
    titulo: 'Registrar alergias y antecedentes al dar de alta',
    resumen: 'Capturar la historia clínica en el mismo momento del registro.',
    permiso: 'pacientes.registrar',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'El formulario de paciente nuevo incluye un apartado de historia clínica inicial donde puede anotar las alergias y los antecedentes que el paciente le refiere en ese momento, sin tener que guardar primero y volver a entrar al expediente.'
      },
      {
        tipo: 'pasos',
        pasos: [
          'En el formulario de paciente nuevo, baje hasta "Historia clínica inicial".',
          'Use "Agregar alergia" para cada sustancia: indique la reacción y la gravedad.',
          'Use "Agregar antecedente" para cada uno: elija el tipo y escriba la descripción.',
          'Registre el paciente. Todo queda fechado igual que si lo hubiera agregado después.'
        ]
      },
      {
        tipo: 'aviso',
        tono: 'info',
        texto:
          'Este apartado solo aparece al crear el paciente. Una vez abierto el expediente, las alergias y los antecedentes se administran desde ahí, que es donde queda constancia de cuándo se agregó o se retiró cada uno.'
      }
    ]
  }
]

export const TEMAS_EXPEDIENTE: Tema[] = [
  {
    id: 'estudios-adjuntos',
    titulo: 'Adjuntar laboratorios, radiografías e imágenes',
    resumen: 'Guardar en el expediente los resultados que el paciente trae.',
    permiso: 'expediente.adjuntar',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'En el expediente, la pestaña «Estudios y archivos» guarda los resultados de laboratorio, las radiografías, los ultrasonidos y cualquier documento del paciente, cada uno con su interpretación escrita por usted.'
      },
      {
        tipo: 'pasos',
        pasos: [
          'Abra el expediente del paciente y vaya a la pestaña "Estudios y archivos".',
          'Pulse "Agregar estudio" y seleccione el archivo desde su computadora.',
          'Escriba el título, elija el tipo y ponga la fecha en que se realizó el estudio.',
          'En "Interpretación o descripción" escriba qué muestra y qué significa para ese paciente.',
          'Pulse "Agregar".'
        ]
      },
      {
        tipo: 'aviso',
        tono: 'info',
        texto:
          'El archivo se copia dentro de la carpeta del paciente. Puede mover o borrar el original sin que el expediente pierda nada, y los respaldos se lo llevan.'
      },
      {
        tipo: 'lista',
        titulo: 'Qué tener en cuenta',
        items: [
          'Se admiten PDF, imágenes (JPG, PNG, GIF, WEBP, BMP, TIFF) y documentos de texto (DOC, DOCX, TXT).',
          'Cada archivo puede pesar hasta 40 MB.',
          'Las imágenes se ven dentro del programa al pulsar su título; los PDF y documentos se abren con el programa que Windows tenga asociado.',
          'Desde una consulta guardada puede pulsar "Adjuntar" para que el estudio quede ligado a esa consulta.',
          'Al eliminar un estudio también se borra su copia del disco.'
        ]
      }
    ]
  },
  {
    id: 'medicacion-permanente',
    titulo: 'Medicación que el paciente ya toma',
    resumen: 'Registrar los medicamentos permanentes por enfermedad de base.',
    permiso: 'pacientes.editar_clinico',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'La pestaña «Medicación permanente» del expediente guarda lo que el paciente toma de forma continua por su enfermedad de base: su antihipertensivo, su medicamento para la diabetes. Es distinto de las recetas, que son de cada consulta.'
      },
      {
        tipo: 'parrafo',
        texto:
          'Al abrir una consulta nueva, esa medicación se muestra en un aviso arriba del formulario, para que la tenga presente antes de recetar. Es informativa: no entra sola en la receta, usted decide si la repite.'
      },
      {
        tipo: 'lista',
        titulo: 'Suspender en lugar de borrar',
        items: [
          '"Suspender" retira el medicamento de la lista activa pero lo conserva en el historial del paciente.',
          'Un medicamento suspendido sigue apareciendo en el expediente impreso, marcado como suspendido.',
          'Use "Eliminar" solo cuando el registro se creó por error.'
        ]
      }
    ]
  }
]

export const TEMAS_DOCUMENTOS: Tema[] = [
  {
    id: 'incapacidades',
    titulo: 'Emitir una constancia de incapacidad',
    resumen: 'Días de reposo con folio, periodo calculado y copia en PDF.',
    permiso: 'documentos.incapacidad',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'Una incapacidad se emite desde la pestaña «Incapacidades» del expediente, o directamente desde una consulta guardada con el botón "Incapacidad", que ya trae el diagnóstico de esa consulta.'
      },
      {
        tipo: 'pasos',
        pasos: [
          'Indique desde qué día empieza el reposo y cuántos días son.',
          'El sistema calcula y le muestra hasta qué día llega, inclusive.',
          'Escriba el motivo y, si hace falta, observaciones.',
          'Pulse "Emitir e imprimir": se genera el PDF y se abre para imprimirlo.'
        ]
      },
      {
        tipo: 'ficha',
        titulo: 'Qué lleva la constancia',
        datos: [
          {
            termino: 'Folio',
            detalle: 'Numeración propia por año: INC-2026-0001, INC-2026-0002, y así.'
          },
          {
            termino: 'Identificación',
            detalle: 'Nombre, identidad, edad, expediente y empresa del paciente.'
          },
          { termino: 'Periodo', detalle: 'Desde, hasta y cantidad de días, en letra y en fecha.' },
          {
            termino: 'Firma',
            detalle:
              'Nombre del doctor que la emite y su número de colegiación, si está registrado en Equipo.'
          }
        ]
      },
      {
        tipo: 'aviso',
        tono: 'alerta',
        texto:
          'Una constancia entregada no se borra. Si se emitió por error, use "Anular" y escriba el motivo: queda marcada como anulada y su copia se vuelve a imprimir con el sello.'
      }
    ]
  },
  {
    id: 'referencias',
    titulo: 'Referir a otro médico o especialista',
    resumen: 'Hoja de referencia con resumen clínico y hallazgos.',
    permiso: 'documentos.referencia',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'La hoja de referencia es lo que el paciente lleva al especialista. Se emite desde la pestaña «Referencias» del expediente, o desde una consulta guardada con el botón "Referir", que propone el diagnóstico y el resumen de esa consulta.'
      },
      {
        tipo: 'lista',
        titulo: 'Qué se llena',
        items: [
          'A quién va dirigida, su especialidad y la institución.',
          'El motivo de la referencia: por qué necesita esa valoración.',
          'El resumen clínico: lo que el especialista necesita conocer del caso.',
          'Los hallazgos: exploración, laboratorios e imágenes ya practicados.',
          'Si es urgente, márquelo: el documento sale con el aviso destacado.'
        ]
      },
      {
        tipo: 'aviso',
        tono: 'info',
        texto:
          'La referencia lleva las alergias del paciente impresas. También se numera por año (REF-2026-0001) y se puede anular igual que una incapacidad.'
      }
    ]
  }
]

export const TEMAS_CATALOGO: Tema[] = [
  {
    id: 'inventario',
    titulo: 'Existencias de medicamentos',
    resumen: 'Entradas, salidas, mínimos y vencimientos de lo que la clínica entrega.',
    permiso: 'inventario.ver',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'La pestaña «Inventario» del catálogo lleva las existencias de los medicamentos que la clínica entrega. No todos los medicamentos del catálogo llevan control: solo los que usted marque.'
      },
      {
        tipo: 'pasos',
        titulo: 'Poner un medicamento en inventario',
        pasos: [
          'En la pestaña Inventario, pulse "Poner un medicamento en inventario".',
          'Busque el medicamento en el catálogo y elíjalo.',
          'Indique la existencia mínima (por debajo de ella se le avisa) y la unidad en que lo cuenta.',
          'Guarde. Su existencia empieza en cero: regístrele una entrada después.'
        ]
      },
      {
        tipo: 'ficha',
        titulo: 'Los tres movimientos',
        datos: [
          {
            termino: 'Entrada',
            detalle:
              'Lo que llega. Suma a la existencia. Puede anotar lote y vencimiento; el vencimiento más próximo pasa a ser el de referencia.'
          },
          {
            termino: 'Salida',
            detalle:
              'Lo que se va: entrega al paciente, producto vencido, merma. Resta de la existencia.'
          },
          {
            termino: 'Ajuste',
            detalle:
              'Corrige la existencia al número que se contó físicamente. No suma ni resta: la fija.'
          }
        ]
      },
      {
        tipo: 'aviso',
        tono: 'info',
        texto:
          'La cantidad nunca se teclea directamente: solo cambia con un movimiento, y cada movimiento queda con su fecha, su motivo y quién lo hizo. Así siempre se puede explicar por qué hay lo que hay.'
      },
      {
        tipo: 'lista',
        titulo: 'Avisos automáticos',
        items: [
          'Cuando la existencia baja del mínimo, el medicamento se marca y aparece un aviso arriba.',
          'Cuando un medicamento vence, aparece en rojo con aviso para retirarlo.',
          'Cuando le faltan menos de dos meses para vencer, se avisa con tiempo de usarlo.',
          'Al recetar, la existencia se ve junto a cada medicamento en el buscador.',
          'El sistema no deja sacar más de lo que hay.'
        ]
      }
    ]
  },
  {
    id: 'empresas',
    titulo: 'Empresas con convenio',
    resumen: 'Agrupar pacientes por empresa y reportarle sus atenciones.',
    permiso: 'empresas.gestionar',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'Cuando la clínica atiende a los empleados de una empresa, la pestaña «Empresas» del catálogo permite registrarla con su código propio, ver a sus pacientes y entregarle el detalle de las atenciones de su gente.'
      },
      {
        tipo: 'pasos',
        pasos: [
          'En la pestaña Empresas, pulse "Nueva empresa" y ponga su código y su nombre.',
          'Al registrar o editar un paciente, elija esa empresa y anote su número de empleado.',
          'Desde la empresa, "Pacientes" lista a todos sus empleados registrados.',
          'Desde la empresa, "Reporte" muestra las atenciones de un periodo y permite imprimirlo.'
        ]
      },
      {
        tipo: 'lista',
        titulo: 'Qué lleva el reporte',
        items: [
          'Fecha de cada atención, código y nombre del empleado, expediente, diagnóstico y quién lo atendió.',
          'Cuántas atenciones hubo y cuántos empleados distintos se atendieron.',
          'Es lo que se le suele entregar a la empresa para facturarle el periodo.'
        ]
      },
      {
        tipo: 'aviso',
        tono: 'alerta',
        texto:
          'El reporte incluye diagnósticos, así que solo pueden verlo e imprimirlo los doctores. La secretaria sí puede registrar empresas y asignar pacientes.'
      },
      {
        tipo: 'parrafo',
        texto:
          'Al buscar un paciente puede escribir su número de empleado: el buscador también encuentra por ese dato.'
      }
    ]
  }
]

export const TEMAS_LICENCIA: Tema[] = [
  {
    id: 'periodo-prueba',
    titulo: 'Periodo de prueba y activación',
    resumen: 'Qué significa la franja de arriba y cómo activar el programa.',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'Cuando DMedic se instala para evaluarlo, arranca con un periodo de prueba. Mientras dure, una franja en la parte superior muestra cuánto tiempo queda. Al agotarse, el programa deja de responder y pide un código de activación.'
      },
      {
        tipo: 'aviso',
        tono: 'info',
        texto:
          'La información de la clínica no se pierde ni se toca al terminar la prueba. Queda guardada en esta computadora y vuelve a estar disponible en cuanto se escribe el código.'
      },
      {
        tipo: 'pasos',
        titulo: 'Cómo activar',
        pasos: [
          'En la pantalla de "Periodo de prueba finalizado" aparece el ID de este equipo.',
          'Pulse "Copiar" y envíelo por WhatsApp a quien le entregó el programa.',
          'Le devolverán un código de cuatro grupos que solo sirve en esta computadora.',
          'Escríbalo y pulse "Activar DMedic". El programa se reinicia solo y queda listo.'
        ]
      },
      {
        tipo: 'lista',
        titulo: 'Lo que conviene saber',
        items: [
          'El código va ligado a esta computadora: uno de otro equipo no funciona aquí.',
          'Hay códigos que activan el programa de forma definitiva y otros que solo conceden más días de prueba.',
          'Un código de días ya usado no se puede volver a usar para sumar más tiempo.',
          'Mientras dura la prueba el programa no busca actualizaciones. Al activarlo vuelven a funcionar solas.'
        ]
      }
    ]
  }
]
