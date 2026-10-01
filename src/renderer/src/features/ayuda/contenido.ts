import type { Permiso } from '@shared/types'
import {
  TEMAS_CATALOGO,
  TEMAS_DOCUMENTOS,
  TEMAS_EXPEDIENTE,
  TEMAS_FICHA_SOCIAL,
  TEMAS_LICENCIA
} from './contenido-expediente'

/**
 * Contenido del manual. Vive separado de la pantalla para que actualizar el
 * texto no obligue a tocar la interfaz: al agregar una función al sistema, se
 * agrega aquí su tema y aparece en el índice y en el buscador sin más cambios.
 *
 * Todo lo que se afirma aquí describe el comportamiento real del programa. Si
 * una función cambia, este archivo debe cambiar con ella.
 */

export type Publico = 'doctor' | 'secretaria' | 'administrador'

export type Bloque =
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'pasos'; titulo?: string; pasos: string[] }
  | { tipo: 'lista'; titulo?: string; items: string[] }
  | { tipo: 'aviso'; tono: 'info' | 'alerta' | 'critico'; texto: string }
  | { tipo: 'tabla'; encabezados: string[]; filas: string[][] }
  | { tipo: 'ficha'; titulo?: string; datos: { termino: string; detalle: string }[] }

export interface Tema {
  id: string
  titulo: string
  resumen: string
  /** Para quién es relevante. Vacío = para todos. */
  publico?: Publico[]
  /** Si se indica, el tema solo se muestra a quien tenga el permiso. */
  permiso?: Permiso
  bloques: Bloque[]
}

export interface SeccionManual {
  id: string
  titulo: string
  temas: Tema[]
}

export const MANUAL: SeccionManual[] = [
  // ==========================================================================
  {
    id: 'primeros-pasos',
    titulo: 'Primeros pasos',
    temas: [
      {
        id: 'que-es',
        titulo: 'Qué es DMedic y cómo está organizado',
        resumen: 'Panorama general del sistema y de la ventana principal.',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'DMedic es el sistema de expedientes de la clínica. Guarda pacientes, consultas, recetas, agenda y documentos. Funciona por completo en esta computadora: no necesita internet para trabajar y ninguna información de pacientes sale de aquí.'
          },
          {
            tipo: 'lista',
            titulo: 'La barra de la izquierda',
            items: [
              'Inicio: resumen del día, buscador rápido de pacientes y agenda de hoy.',
              'Pacientes: lista completa y acceso a cada expediente.',
              'Agenda: calendario de citas por día, semana o mes.',
              'Catálogo: sus protocolos de tratamiento, exámenes y diagnósticos propios.',
              'Equipo: usuarios del sistema (solo el administrador lo ve).',
              'Configuración: datos de la clínica, apariencia, contraseña, copias de seguridad y actualizaciones.',
              'Manual: esta guía.'
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'Abajo de esa barra están el botón de tema claro/oscuro y el de cerrar sesión. Cada usuario ve únicamente las secciones que su rol permite.'
          }
        ]
      },
      {
        id: 'instalacion-inicial',
        titulo: 'La primera vez que se abre el programa',
        resumen: 'Configuración inicial, primera cuenta y código de recuperación.',
        publico: ['administrador'],
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'La primera vez que se abre DMedic no hay ningún usuario todavía. El programa pide crear la cuenta principal. Este paso se hace una sola vez en la vida del sistema.'
          },
          {
            tipo: 'pasos',
            pasos: [
              'Escriba el nombre del doctor tal como debe aparecer en las recetas.',
              'Escriba el nombre de la clínica.',
              'Elija una contraseña de al menos 8 caracteres y repítala.',
              'Pulse «Crear cuenta».'
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'Esa primera cuenta siempre es Doctor y Administrador: alguien tiene que poder crear al resto del equipo.'
          },
          {
            tipo: 'aviso',
            tono: 'critico',
            texto:
              'Enseguida aparece el código de recuperación, con el formato XXXXX-XXXXX-XXXXX-XXXXX. Se muestra UNA sola vez y no hay forma de volver a verlo. Imprímalo o guárdelo fuera de esta computadora. Es la única manera de recuperar el acceso si se olvida la contraseña del administrador; sin él no se puede entrar al sistema ni leer los expedientes.'
          }
        ]
      },
      {
        id: 'iniciar-sesion',
        titulo: 'Entrar y salir del sistema',
        resumen: 'Elegir usuario, contraseña, bloqueo por intentos fallidos y cierre de sesión.',
        bloques: [
          {
            tipo: 'pasos',
            pasos: [
              'Al abrir DMedic aparece la lista de usuarios activos. Pulse el suyo. Si solo hay un usuario, el sistema lo selecciona solo.',
              'Escriba su contraseña y pulse «Entrar».',
              'Para salir, use «Cerrar sesión» al final de la barra izquierda.'
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'Si el administrador le asignó una contraseña temporal, el sistema le obligará a elegir una propia antes de dejarle entrar a las pantallas. Esto es a propósito: mientras no la cambie, otra persona conoce su clave y el registro de auditoría no podría atribuirle sus acciones con certeza.'
          },
          {
            tipo: 'aviso',
            tono: 'alerta',
            texto:
              'Tras 5 contraseñas incorrectas seguidas, el usuario se bloquea temporalmente: 1 minuto, luego 2, 4, 8 y 15 minutos como máximo. El bloqueo es por usuario, así que bloquear a un doctor no deja fuera a los demás. Con la contraseña correcta el contador vuelve a cero.'
          }
        ]
      },
      {
        id: 'olvide-password',
        titulo: 'Si olvidó su contraseña',
        resumen: 'Recuperación con código para el administrador; reinicio para el resto del equipo.',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Depende de quién sea usted. No hay servidor ni correo electrónico, así que la recuperación es distinta según el caso.'
          },
          {
            tipo: 'lista',
            titulo: 'Administrador (la cuenta principal)',
            items: [
              'En la pantalla de acceso pulse «Olvidé mi contraseña».',
              'Escriba el código de recuperación que se le entregó al instalar el sistema.',
              'Elija la nueva contraseña y repítala.',
              'El sistema emite un código de recuperación NUEVO: el anterior deja de servir. Guárdelo igual que el primero.'
            ]
          },
          {
            tipo: 'lista',
            titulo: 'Cualquier otro usuario',
            items: [
              'Pida al administrador que entre a Equipo y le asigne una contraseña temporal.',
              'Entre con esa contraseña temporal; el sistema le pedirá elegir una propia de inmediato.'
            ]
          },
          {
            tipo: 'aviso',
            tono: 'critico',
            texto:
              'Si se pierde el código de recuperación y además se olvida la contraseña del administrador, no existe ninguna forma de entrar. Es la consecuencia directa de que nada se guarda en un servidor externo.'
          }
        ]
      },
      {
        id: 'apariencia',
        titulo: 'Tema oscuro y tamaño de letra',
        resumen: 'Ajustes de comodidad visual.',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'El botón de sol/luna al final de la barra izquierda cambia entre tema claro y oscuro al instante. En Configuración → Apariencia están los mismos ajustes más el tamaño de letra: «Normal» o «Grande», útil para consultorios donde la pantalla se ve de lejos.'
          }
        ]
      }
    ]
  },

  // ==========================================================================
  {
    id: 'pacientes',
    titulo: 'Pacientes',
    temas: [
      {
        id: 'registrar-paciente',
        titulo: 'Registrar un paciente nuevo',
        resumen: 'Datos permanentes, identidad, contactos de emergencia y aviso de duplicados.',
        permiso: 'pacientes.registrar',
        bloques: [
          {
            tipo: 'pasos',
            pasos: [
              'Entre a Pacientes y pulse «Nuevo paciente».',
              'Complete nombres y apellidos, fecha de nacimiento y sexo. El sistema calcula y muestra la edad sola.',
              'Escriba el número de identidad (13 dígitos). Si es un menor sin identidad, deje el campo vacío y vincule a su responsable en el recuadro que aparece debajo.',
              'Agregue teléfono, correo, dirección, tipo de sangre, aseguradora o quién lo refirió, si los tiene.',
              'Agregue hasta 3 contactos de emergencia con nombre, teléfono y parentesco.',
              'Pulse «Registrar paciente».'
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'El número de expediente se asigna solo, con el formato EXP-2026-0001. El contador se reinicia cada año.'
          },
          {
            tipo: 'aviso',
            tono: 'info',
            texto:
              'En esta ficha van únicamente los datos permanentes de la persona. Todo lo clínico de cada visita —síntomas, diagnóstico, receta— se captura en la consulta, no aquí.'
          },
          {
            tipo: 'lista',
            titulo: 'Lo que el sistema comprueba al guardar',
            items: [
              'Dos pacientes no pueden compartir el mismo número de identidad: si ya existe, el sistema dice en qué expediente está y no deja duplicarlo.',
              'Si hay otro paciente con el mismo primer nombre, primer apellido y fecha de nacimiento, aparece un aviso de posible duplicado. Es solo un aviso: usted decide si continúa.',
              'La fecha de nacimiento debe ser real y de los últimos 120 años.',
              'Debe indicar el número de identidad o vincular un responsable; uno de los dos es obligatorio.'
            ]
          }
        ]
      },
      {
        id: 'menores-responsable',
        titulo: 'Registrar a un menor: vincularlo a su responsable',
        resumen: 'Cómo identificar a un niño que todavía no tiene tarjeta de identidad.',
        permiso: 'pacientes.registrar',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Todo paciente debe quedar identificado de alguna manera: con su propio número de identidad, o a través del adulto que responde por él. Es lo que permite registrar a un niño sin inventarle un número ni prestarle el de su madre.'
          },
          {
            tipo: 'pasos',
            pasos: [
              'Registre primero al adulto como paciente, con su número de identidad. El responsable tiene que existir en el sistema.',
              'Registre al menor: complete sus nombres, fecha de nacimiento y sexo, y deje vacío el número de identidad.',
              'Aparecerá el recuadro «Responsable». Busque al adulto por nombre, identidad o expediente y púlselo.',
              'Escriba el parentesco: Madre, Padre, Abuela, Tutor…',
              'Guarde con «Registrar paciente».'
            ]
          },
          {
            tipo: 'lista',
            titulo: 'Cómo se comporta el recuadro',
            items: [
              'Aparece solo cuando hace falta: si el paciente es menor de 18 años, si el campo de identidad está vacío, o si ya tiene un responsable vinculado. En el alta de un adulto con su tarjeta no estorba.',
              'El responsable debe ser un paciente registrado, no un texto suelto: así el expediente del niño apunta a una identidad real y verificable.',
              'Nadie puede ser su propio responsable, y no se acepta un responsable que no exista.',
              'Si el adulto elegido tampoco tiene identidad registrada, el sistema lo advierte y deja guardar igual: conviene completar la del adulto para que el menor quede bien identificado.'
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'Una vez vinculado, el expediente del menor muestra bajo su nombre «Responsable: María López (Madre)». La secretaria también lo ve, porque es un dato de contacto y no información clínica.'
          },
          {
            tipo: 'aviso',
            tono: 'info',
            texto:
              'El vínculo no ata los expedientes: cada uno es independiente. Si algún día se elimina al adulto, el expediente del menor se conserva íntegro y solo se queda sin responsable. Y cuando el menor saque su propia identidad, basta con escribirla en su ficha.'
          },
          {
            tipo: 'parrafo',
            texto:
              'El responsable es distinto de un contacto de emergencia. El responsable identifica legalmente al menor y es un paciente del sistema; los contactos de emergencia son nombres y teléfonos a quienes llamar, hasta tres, y no necesitan estar registrados.'
          }
        ]
      },
      {
        id: 'buscar-paciente',
        titulo: 'Buscar un paciente',
        resumen: 'Búsqueda por nombre, identidad, expediente o teléfono.',
        permiso: 'pacientes.ver',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Hay dos buscadores y funcionan igual: el de la pantalla de Inicio y el de la pantalla Pacientes. Puede escribir el nombre, el número de identidad, el número de expediente o el teléfono; el sistema busca mientras escribe.'
          },
          {
            tipo: 'parrafo',
            texto:
              'La lista muestra expediente, nombre, identidad, edad, teléfono y la fecha de la última consulta. Los pacientes archivados aparecen marcados con la etiqueta «Archivado». Pulse una fila para abrir el expediente.'
          }
        ]
      },
      {
        id: 'expediente',
        titulo: 'La pantalla del expediente',
        resumen: 'Qué contiene y qué se puede hacer desde ahí.',
        permiso: 'pacientes.ver',
        bloques: [
          {
            tipo: 'lista',
            titulo: 'De arriba hacia abajo',
            items: [
              'Cabecera: nombre, expediente, edad, sexo y un resumen de alergias, problemas crónicos y medicación actual.',
              'Datos clínicos: alergias, antecedentes y problemas crónicos, con sus botones para agregar y quitar.',
              'Citas del paciente: sus citas agendadas y pasadas.',
              'Historial: todas sus consultas.'
            ]
          },
          {
            tipo: 'lista',
            titulo: 'Botones de la parte superior',
            items: [
              '«Nueva consulta»: abre el editor de consulta para este paciente.',
              '«Imprimir expediente»: genera el expediente completo en PDF tamaño carta.',
              '«Archivar» / «Reactivar»: saca al paciente de las listas habituales o lo devuelve, conservando todo.',
              '«Eliminar»: borrado definitivo. Solo el administrador lo ve.'
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'El historial se puede ver de dos maneras, con los botones de la derecha: en lista con la consulta seleccionada al lado, o en tabla con fecha, motivo, diagnóstico principal y cuántos medicamentos y exámenes llevó cada una. El campo «Filtrar historial…» busca dentro de las consultas de ese paciente.'
          },
          {
            tipo: 'parrafo',
            texto:
              'Con dos o más consultas aparece el botón «Comparar», que muestra dos consultas lado a lado; en cada lado puede cambiar cuál se está viendo. Sirve para ver la evolución sin ir y venir entre pantallas.'
          },
          {
            tipo: 'aviso',
            tono: 'info',
            texto:
              'Cada vez que se abre un expediente queda registrado quién lo abrió y cuándo. Los expedientes se comparten entre los doctores, y ese registro es lo que permite distinguir una consulta legítima de la curiosidad sobre el expediente de un conocido.'
          }
        ]
      },
      {
        id: 'datos-clinicos',
        titulo: 'Alergias, antecedentes y problemas crónicos',
        resumen: 'Información permanente del paciente que no pertenece a una sola consulta.',
        permiso: 'pacientes.editar_clinico',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Estos tres bloques viven en el expediente, no en la consulta, porque acompañan al paciente toda su vida. Se registran desde el panel «Datos clínicos» del expediente.'
          },
          {
            tipo: 'lista',
            titulo: 'Alergias',
            items: [
              'Sustancia (obligatoria): penicilina, mariscos, polen…',
              'Reacción: urticaria, edema, dificultad respiratoria…',
              'Gravedad: leve, moderada o grave.',
              'Una alergia puede desactivarse sin borrarla, cuando deja de considerarse vigente.'
            ]
          },
          {
            tipo: 'lista',
            titulo: 'Antecedentes',
            items: [
              'Personal patológico',
              'Familiar',
              'Quirúrgico',
              'Hábitos',
              'Gineco-obstétrico'
            ]
          },
          {
            tipo: 'lista',
            titulo: 'Problemas crónicos',
            items: [
              'Descripción obligatoria, por ejemplo «Diabetes mellitus tipo 2».',
              'Código CIE-10 opcional, por ejemplo E11.9.',
              'Fecha «Desde» opcional.',
              'Pueden marcarse como inactivos sin perder el registro.'
            ]
          },
          {
            tipo: 'aviso',
            tono: 'alerta',
            texto:
              'Las alergias activas se muestran en rojo en la parte superior del editor de consulta, y si receta un medicamento cuyo nombre coincide con una alergia registrada, el sistema lo advierte. Advierte, no bloquea: la decisión siempre es del doctor.'
          }
        ]
      },
      {
        id: 'archivar-eliminar',
        titulo: 'Archivar frente a eliminar',
        resumen: 'La diferencia entre esconder un expediente y destruirlo.',
        permiso: 'pacientes.archivar',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Archivar es lo que se usa casi siempre. El paciente deja de aparecer en las listas habituales, pero su expediente se conserva íntegro y puede reactivarse con un clic cuando regrese.'
          },
          {
            tipo: 'parrafo',
            texto:
              'Eliminar destruye el expediente completo —consultas, recetas, diagnósticos— de forma irreversible. Solo el administrador puede hacerlo, y para confirmarlo hay que escribir a mano el número de expediente exacto: es imposible destruir un expediente por un clic accidental.'
          },
          {
            tipo: 'aviso',
            tono: 'critico',
            texto:
              'Eliminar no se puede deshacer desde la aplicación. Lo único que podría recuperar ese expediente es restaurar una copia de seguridad anterior, lo que a su vez descarta todo lo registrado después de esa copia.'
          }
        ]
      },
      ...TEMAS_FICHA_SOCIAL,
      ...TEMAS_EXPEDIENTE
    ]
  },

  // ==========================================================================
  {
    id: 'consultas',
    titulo: 'Consultas',
    temas: [
      {
        id: 'nueva-consulta',
        titulo: 'Registrar una consulta',
        resumen: 'El recorrido completo del editor de consulta, campo por campo.',
        permiso: 'consultas.crear',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Se llega desde el botón «Nueva consulta» del expediente, o desde una cita de la agenda con «Atender». En el segundo caso el motivo de la cita se copia como motivo de consulta y la cita queda vinculada a la consulta.'
          },
          {
            tipo: 'parrafo',
            texto:
              'Si el paciente ya tiene consultas previas, la pantalla se divide: a la izquierda el formulario, a la derecha las 3 consultas anteriores para consultarlas mientras escribe. Si es su primera consulta, el formulario ocupa una sola columna más ancha.'
          },
          {
            tipo: 'lista',
            titulo: 'Los bloques del formulario, en orden',
            items: [
              'Signos vitales: peso, altura, presión sistólica y diastólica, temperatura, frecuencia cardíaca, frecuencia respiratoria, saturación de oxígeno y glucosa.',
              'Motivo de consulta (obligatorio, mínimo 3 caracteres).',
              'Síntomas e historia actual.',
              'Exploración física.',
              'Diagnóstico: se buscan y agregan códigos CIE-10.',
              'Tratamiento: texto libre.',
              'Medicamentos: la receta.',
              'Exámenes y procedimientos: los estudios que el paciente debe realizarse.',
              'Observaciones.',
              'Recomendaciones.',
              'Próxima cita (obligatorio: una fecha, o marcar «Sin próxima cita»).'
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'Al terminar, pulse «Guardar consulta» arriba a la derecha. El sistema vuelve al expediente con la consulta ya registrada.'
          },
          {
            tipo: 'aviso',
            tono: 'info',
            texto:
              'Mientras escribe una consulta nueva, el sistema guarda un borrador local cada pocos segundos. Si se va la luz o se cierra el programa, al volver a abrir esa consulta aparece el aviso «Se recuperó un borrador sin guardar» y el texto sigue ahí. El borrador se descarta al guardar la consulta.'
          }
        ]
      },
      {
        id: 'signos-vitales',
        titulo: 'Signos vitales, IMC y rangos de referencia',
        resumen: 'Cómo se calcula el IMC y qué significan los bordes de color.',
        permiso: 'consultas.crear',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'El IMC se calcula solo en cuanto hay peso y altura, y se muestra con su clasificación: bajo peso, normal, sobrepeso u obesidad I, II o III. No hace falta escribirlo.'
          },
          {
            tipo: 'parrafo',
            texto:
              'Un valor fuera del rango de referencia para adultos pinta el borde del campo de ámbar (atención) o rojo (crítico), y debajo se indica cuántos valores están fuera de rango. Es una señal visual discreta, no un diagnóstico, y nunca impide guardar.'
          },
          {
            tipo: 'tabla',
            encabezados: ['Signo', 'Rango normal', 'Se marca crítico fuera de'],
            filas: [
              ['Presión sistólica', '90 – 129 mmHg', '80 – 180'],
              ['Presión diastólica', '60 – 84 mmHg', '50 – 120'],
              ['Temperatura', '36 – 37.5 °C', '35 – 39.5'],
              ['Frecuencia cardíaca', '60 – 100 lpm', '40 – 130'],
              ['Frecuencia respiratoria', '12 – 20 rpm', '8 – 30'],
              ['Saturación de oxígeno', '95 – 100 %', 'menos de 90'],
              ['Glucosa', '70 – 140 mg/dL', '55 – 250']
            ]
          },
          {
            tipo: 'aviso',
            tono: 'alerta',
            texto:
              'Estos rangos son orientativos y para adultos. No son criterio diagnóstico ni están ajustados a niños o embarazo. La interpretación es siempre del doctor.'
          },
          {
            tipo: 'parrafo',
            texto:
              'Además hay límites de digitación que sí rechazan el guardado, y existen solo para atajar errores de tecleo: peso 0.5–400 kg, altura 20–250 cm, temperatura 30–45 °C, glucosa 20–800 mg/dL, entre otros. La presión sistólica debe ser mayor que la diastólica.'
          }
        ]
      },
      {
        id: 'diagnostico-cie10',
        titulo: 'Diagnósticos CIE-10',
        resumen: 'Buscar códigos, marcar el principal y usar protocolos guardados.',
        permiso: 'consultas.crear',
        bloques: [
          {
            tipo: 'pasos',
            pasos: [
              'En el bloque Diagnóstico, escriba parte del código o de la descripción: el sistema busca en el catálogo CIE-10 incluido y en sus diagnósticos propios.',
              'Pulse el resultado para agregarlo. El primero que agregue queda marcado como principal.',
              'Para cambiar cuál es el principal, pulse la palabra «Principal» en la línea que corresponda.',
              'Para quitar un diagnóstico, use la X de su línea.'
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'Solo puede haber un diagnóstico principal por consulta; el sistema lo verifica al guardar. Puede agregar tantos diagnósticos secundarios como necesite.'
          },
          {
            tipo: 'parrafo',
            texto:
              'Si tiene protocolos guardados para ese diagnóstico, aparece el recuadro «Sus protocolos guardados para este diagnóstico» con un botón por protocolo. Al pulsarlo se rellenan tratamiento, recomendaciones, medicamentos y exámenes de una sola vez, y todo queda editable.'
          },
          {
            tipo: 'aviso',
            tono: 'info',
            texto:
              'El sistema nunca inventa contenido clínico. Un protocolo devuelve exactamente lo que usted guardó antes en el Catálogo, ni más ni menos.'
          }
        ]
      },
      {
        id: 'medicamentos',
        titulo: 'Recetar medicamentos',
        resumen: 'Catálogo, dosis, frecuencia, duración y el aviso de alergias.',
        permiso: 'consultas.crear',
        bloques: [
          {
            tipo: 'pasos',
            pasos: [
              'Escriba en «Agregar medicamento del catálogo…» y elija uno de la lista, o escriba libremente el nombre si no está en el catálogo.',
              'Complete la dosis («1 tableta»), la frecuencia («cada 8 horas») y la duración («por 7 días»).',
              'Agregue indicaciones si hacen falta: «Tomar con alimentos».',
              'Repita para cada medicamento.'
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'La dosis y la frecuencia son obligatorias en cada medicamento; la duración y las indicaciones son opcionales. Al elegir del catálogo, la concentración, la forma y la vía se cargan solas.'
          },
          {
            tipo: 'aviso',
            tono: 'critico',
            texto:
              'Si el nombre de un medicamento coincide con una alergia activa del paciente, aparece un aviso rojo señalando cuál es. El sistema avisa y deja continuar: es un recordatorio, no un bloqueo.'
          }
        ]
      },
      {
        id: 'examenes-consulta',
        titulo: 'Indicar exámenes y procedimientos',
        resumen: 'Laboratorio, imagen y procedimientos con su preparación.',
        permiso: 'consultas.crear',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'En el bloque «Exámenes y procedimientos» escriba en «Indicar examen o procedimiento…» y elija del catálogo, o escriba el nombre libremente. Cada estudio se clasifica en laboratorio, imagen, procedimiento u otro, y puede marcarse como urgente.'
          },
          {
            tipo: 'parrafo',
            texto:
              'Las indicaciones de preparación —«Ayuno de 8 horas»— se cargan solas si el examen las tiene guardadas en el catálogo, y quedan editables para esa consulta en particular.'
          },
          {
            tipo: 'aviso',
            tono: 'info',
            texto:
              'Una consulta puede no llevar ningún medicamento y aun así indicar estudios. En ese caso el documento impreso sale como «Orden de exámenes» en lugar de «Receta médica», que es lo que el paciente necesita llevar al laboratorio.'
          }
        ]
      },
      {
        id: 'proxima-cita',
        titulo: 'La próxima cita se agenda sola',
        resumen: 'Qué pasa con la fecha que se indica al final de la consulta.',
        permiso: 'consultas.crear',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'El bloque «Próxima cita» es obligatorio: o pone una fecha, o marca «Sin próxima cita». No se puede dejar en blanco, para que ningún paciente se vaya sin que quede definido si vuelve.'
          },
          {
            tipo: 'parrafo',
            texto:
              'Si pone una fecha, el sistema crea la cita en su agenda automáticamente al guardar la consulta. No hay que registrarla otra vez a mano. Si después edita la consulta y cambia esa fecha, la cita se actualiza sola.'
          }
        ]
      },
      {
        id: 'editar-consulta',
        titulo: 'Corregir una consulta ya guardada',
        resumen: 'Quién puede editarla y hasta cuándo.',
        permiso: 'consultas.editar',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Una consulta se puede editar solo bajo dos condiciones a la vez: que se haya creado hoy mismo, y que la haya atendido usted. En el expediente, las consultas que cumplen ambas llevan la etiqueta «Editable hoy» y el botón «Editar», que devuelve al formulario de la consulta con todo lo escrito.'
          },
          {
            tipo: 'lista',
            titulo: 'Los dos límites, por separado',
            items: [
              'Por fecha: pasado el día en que se creó, deja de ser editable para todos, incluido su autor. Un expediente clínico no se reescribe días después.',
              'Por autoría: la consulta de otro doctor no se toca, ni siquiera el mismo día. El sistema lo dice con nombre y apellido: «Esta consulta fue registrada por…».'
            ]
          },
          {
            tipo: 'aviso',
            tono: 'info',
            texto:
              'Si necesita dejar constancia sobre una consulta que ya no es editable, use una adenda. Y si la consulta entera está mal —el paciente equivocado, un duplicado— anúlela indicando el motivo. Ambos botones están en la cabecera de la consulta, en el expediente.'
          }
        ]
      },
      {
        id: 'adenda',
        titulo: 'Agregar una adenda',
        resumen: 'Completar o corregir una consulta sin reescribirla.',
        permiso: 'consultas.editar',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Una adenda es una nota fechada que se añade al final de una consulta. Es la forma correcta de completar un expediente días después: llega un resultado de laboratorio, se corrige una indicación, se anota algo que faltó.'
          },
          {
            tipo: 'pasos',
            pasos: [
              'En el expediente, seleccione la consulta en el historial.',
              'Pulse «Adenda» en la cabecera de la consulta.',
              'Escriba el texto (mínimo 3 caracteres) y pulse «Agregar adenda».'
            ]
          },
          {
            tipo: 'aviso',
            tono: 'info',
            texto:
              'La adenda no modifica ni una letra de lo que ya estaba escrito: se agrega aparte, con su fecha y hora, y queda a la vista de quien lea la consulta después. Se puede agregar a cualquier consulta, sin límite de tiempo, y también a una consulta anulada.'
          }
        ]
      },
      {
        id: 'anular-consulta',
        titulo: 'Anular una consulta',
        resumen: 'Qué hacer con una consulta registrada por error.',
        permiso: 'consultas.anular',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Anular es para las consultas que no debieron existir: registradas en el paciente equivocado, duplicadas, abiertas por error. No es para corregir el contenido de una consulta legítima; para eso están la edición del mismo día y las adendas.'
          },
          {
            tipo: 'pasos',
            pasos: [
              'En el expediente, seleccione la consulta en el historial.',
              'Pulse «Anular» en la cabecera de la consulta.',
              'Escriba el motivo (mínimo 5 caracteres): queda guardado y visible.',
              'Confirme con «Anular consulta».'
            ]
          },
          {
            tipo: 'lista',
            titulo: 'Qué cambia al anularla',
            items: [
              'Sigue en el historial, marcada como «Anulada» y con el motivo a la vista. No se borra nada.',
              'Deja de poder imprimirse: no salen ni recetas ni resúmenes de una consulta anulada.',
              'Ya no puede editarse, aunque sea del mismo día y suya.',
              'Sí admite adendas, por si hace falta explicar algo más.'
            ]
          },
          {
            tipo: 'aviso',
            tono: 'alerta',
            texto:
              'Anular no se puede deshacer desde la aplicación, y queda registrado en la auditoría con su nombre y el motivo que escribió.'
          }
        ]
      }
    ]
  },

  // ==========================================================================
  {
    id: 'agenda',
    titulo: 'Agenda y citas',
    temas: [
      {
        id: 'ver-agenda',
        titulo: 'Moverse por la agenda',
        resumen: 'Vistas de día, semana y mes, y de quién es la agenda que ve.',
        permiso: 'citas.ver',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Arriba a la derecha se elige la vista: Día, Semana o Mes. Las flechas de la izquierda avanzan y retroceden un período, y el botón «Hoy» vuelve a la fecha actual. En la vista de mes, pulsar un día abre ese día en detalle.'
          },
          {
            tipo: 'lista',
            titulo: 'Quién ve qué',
            items: [
              'Un doctor ve únicamente su propia agenda. La pantalla se lo recuerda con un aviso.',
              'La secretaria ve la agenda de todos los doctores y puede filtrar por uno con el selector «Todos los doctores».'
            ]
          }
        ]
      },
      {
        id: 'crear-cita',
        titulo: 'Agendar una cita',
        resumen: 'Paciente registrado o no, hora, duración y aviso de cruce.',
        permiso: 'citas.gestionar',
        bloques: [
          {
            tipo: 'pasos',
            pasos: [
              'Pulse «Nueva cita», o pulse directamente un día del calendario.',
              'Si es secretaria, elija el doctor que atenderá. Si es doctor, la cita se le asigna a usted automáticamente.',
              'Elija el paciente: búsquelo por nombre, identidad o expediente si ya está registrado; si no lo está, escriba su nombre y teléfono como cita provisional.',
              'Indique fecha y, opcionalmente, hora y duración (30 minutos por defecto).',
              'Escriba el motivo («Control», «Primera vez», «Seguimiento…») y las notas que hagan falta.',
              'Pulse «Agendar».'
            ]
          },
          {
            tipo: 'aviso',
            tono: 'info',
            texto:
              'El horario es libre. Si la cita se cruza con otra del mismo doctor, el sistema avisa del cruce pero no impide guardarla: en una clínica real los sobrecupos existen y la decisión es de quien agenda.'
          },
          {
            tipo: 'parrafo',
            texto:
              'Una cita sin paciente registrado se marca como «Sin expediente». Sirve para apartar el espacio de alguien que llama por teléfono y todavía no se ha registrado.'
          }
        ]
      },
      {
        id: 'estados-cita',
        titulo: 'Estados de una cita y atender desde la agenda',
        resumen: 'Agendada, atendida, no asistió, cancelada; y el paso a consulta.',
        permiso: 'citas.gestionar',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Al pulsar una cita se abre su panel con los datos del paciente y los botones de estado.'
          },
          {
            tipo: 'tabla',
            encabezados: ['Estado', 'Cuándo se usa'],
            filas: [
              ['Agendada', 'Estado inicial de toda cita.'],
              ['Atendida', 'El paciente vino y fue atendido.'],
              ['No asistió', 'El paciente no llegó.'],
              ['Cancelada', 'La cita se canceló con antelación.']
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'Desde el panel de una cita de un paciente registrado, un doctor puede pasar directamente a la consulta: se abre el editor con el motivo ya copiado y la cita queda enlazada a la consulta que resulte.'
          },
          {
            tipo: 'aviso',
            tono: 'alerta',
            texto:
              'Una cita que ya tiene una consulta asociada se puede cancelar, pero no eliminar: borrarla dejaría a la consulta sin su origen. Un doctor solo puede modificar, cancelar o borrar citas de su propia agenda; la secretaría gestiona las de todos.'
          }
        ]
      },
      {
        id: 'reporte-agenda',
        titulo: 'Reporte de agenda para imprimir',
        resumen: 'El PDF que la secretaría entrega a cada doctor.',
        permiso: 'citas.reportes',
        bloques: [
          {
            tipo: 'pasos',
            pasos: [
              'En la Agenda, pulse «Reporte».',
              'Elija el período: día, semana o mes.',
              'Elija la fecha de referencia; el sistema toma la semana o el mes que la contiene.',
              'Si es secretaria, elija un doctor o déjelo en «Todos los doctores».',
              'Revise la vista previa y pulse generar: sale un PDF tamaño carta listo para imprimir.'
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'El reporte incluye fecha, hora, paciente, doctor, motivo y estado de cada cita, más los totales de agendadas, atendidas, no asistió y canceladas. Como no hay red entre las computadoras, el papel es el canal por el que la agenda llega a quien la necesita.'
          }
        ]
      }
    ]
  },

  // ==========================================================================
  {
    id: 'documentos',
    titulo: 'Documentos e impresión',
    temas: [
      {
        id: 'tipos-documento',
        titulo: 'Qué documentos genera el sistema',
        resumen: 'Receta, orden de exámenes, resumen de consulta, expediente y reporte de agenda.',
        permiso: 'documentos.generar',
        bloques: [
          {
            tipo: 'tabla',
            encabezados: ['Documento', 'Dónde se genera', 'Papel'],
            filas: [
              [
                'Receta médica',
                'Expediente → consulta seleccionada → «Receta»',
                'El que elija en Configuración'
              ],
              [
                'Orden de exámenes',
                'Igual que la receta, cuando la consulta no lleva medicamentos',
                'El que elija en Configuración'
              ],
              [
                'Resumen de consulta',
                'Expediente → consulta seleccionada',
                'Carta'
              ],
              [
                'Expediente completo',
                'Expediente → «Imprimir expediente»',
                'Carta'
              ],
              [
                'Reporte de agenda',
                'Agenda → «Reporte»',
                'Carta'
              ]
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'Al generar cualquiera de ellos, el PDF se abre solo en el visor del sistema, desde donde se imprime. El logo, el nombre de la clínica, la dirección, el teléfono y el nombre y especialidad del doctor salen de Configuración; la receta la firma el doctor que atendió esa consulta.'
          },
          {
            tipo: 'aviso',
            tono: 'alerta',
            texto:
              'Una consulta sin medicamentos ni exámenes no genera receta: el sistema avisa de que no hay nada que imprimir.'
          }
        ]
      },
      {
        id: 'donde-quedan',
        titulo: 'Dónde queda archivado cada PDF',
        resumen: 'Carpetas por paciente, dentro de los datos del programa.',
        permiso: 'documentos.generar',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Nada se guarda suelto. Cada documento se archiva automáticamente en la carpeta del propio paciente, de modo que el expediente en disco queda ordenado sin que nadie tenga que ordenarlo.'
          },
          {
            tipo: 'ficha',
            titulo: 'Estructura de carpetas',
            datos: [
              {
                termino: 'Carpeta del paciente',
                detalle: 'expedientes\\EXP-2026-0001 - Apellidos, Nombres\\'
              },
              { termino: 'Recetas\\', detalle: 'Recetas y órdenes de exámenes.' },
              { termino: 'Consultas\\', detalle: 'Resúmenes de consulta.' },
              { termino: 'Documentos\\', detalle: 'Expedientes completos impresos.' },
              { termino: 'reportes\\', detalle: 'Reportes de agenda, fuera de las carpetas de pacientes porque agrupan a varios.' }
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'El nombre de cada archivo lleva la fecha, el tipo y la hora —«2026-08-18 Receta 143205.pdf»— para que dos documentos del mismo día nunca se pisen.'
          }
        ]
      },
      {
        id: 'tamano-receta',
        titulo: 'Tamaño de papel de la receta',
        resumen: 'Carta o media carta, según el recetario del consultorio.',
        permiso: 'configuracion.clinica',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'En Configuración → Documentos impresos puede elegir el papel de la receta: Carta (8.5 × 11") o Media carta (5.5 × 8.5"), que es el recetario habitual de consultorio. El expediente, el resumen de consulta y los reportes de agenda siempre salen en carta.'
          }
        ]
      },
      ...TEMAS_DOCUMENTOS
    ]
  },

  // ==========================================================================
  {
    id: 'catalogo',
    titulo: 'Catálogo clínico',
    temas: [
      {
        id: 'protocolos',
        titulo: 'Protocolos de tratamiento',
        resumen: 'Guardar sus tratamientos habituales para que se carguen solos.',
        permiso: 'catalogo.gestionar',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Un protocolo es el tratamiento que usted suele indicar para un diagnóstico concreto. Se guarda una vez y, cada vez que agregue ese diagnóstico a una consulta, aparece como botón para aplicarlo entero.'
          },
          {
            tipo: 'pasos',
            pasos: [
              'Entre a Catálogo → Protocolos de tratamiento y pulse el botón de nuevo protocolo.',
              'Póngale un nombre reconocible: «Faringitis bacteriana — adulto».',
              'Elija el diagnóstico CIE-10 al que se asocia.',
              'Escriba el tratamiento y las recomendaciones que se cargarán en la consulta.',
              'Agregue los medicamentos habituales con su dosis, frecuencia y duración.',
              'Agregue los exámenes que suele indicar para ese caso.',
              'Guarde.'
            ]
          },
          {
            tipo: 'aviso',
            tono: 'info',
            texto:
              'Aplicar un protocolo no cierra ninguna decisión: todo lo que carga queda editable en esa consulta. Es un punto de partida para no volver a escribir lo mismo, no una prescripción automática.'
          }
        ]
      },
      {
        id: 'examenes-catalogo',
        titulo: 'Exámenes y procedimientos',
        resumen: 'El catálogo de estudios de la clínica y su preparación.',
        permiso: 'catalogo.gestionar',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Agregue aquí los estudios que indica con más frecuencia para no escribirlos cada vez. Cada examen lleva nombre, tipo (laboratorio, imagen, procedimiento u otro) y su preparación habitual, por ejemplo «Ayuno de 8 horas».'
          },
          {
            tipo: 'parrafo',
            texto:
              'La preparación se carga sola al indicar el examen en una consulta y sigue siendo editable ahí. El sistema trae 36 exámenes de uso común ya cargados.'
          }
        ]
      },
      {
        id: 'diagnosticos-propios',
        titulo: 'Diagnósticos propios',
        resumen: 'Cuando el CIE-10 incluido no alcanza.',
        permiso: 'catalogo.gestionar',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'El sistema trae un catálogo CIE-10 con los diagnósticos de uso frecuente. Si necesita uno que no está, puede crear el suyo en Catálogo → Diagnósticos propios.'
          },
          {
            tipo: 'aviso',
            tono: 'alerta',
            texto:
              'Use un código que no exista en el CIE-10 oficial —por ejemplo LOC-01— para no confundir un diagnóstico local con uno estándar. Sus diagnósticos propios aparecen en el mismo buscador que los oficiales al registrar una consulta.'
          }
        ]
      },
      ...TEMAS_CATALOGO
    ]
  },

  // ==========================================================================
  {
    id: 'equipo',
    titulo: 'Equipo y permisos',
    temas: [
      {
        id: 'roles',
        titulo: 'Los dos roles y el administrador',
        resumen: 'Qué puede hacer cada quién y por qué la frontera está donde está.',
        bloques: [
          {
            tipo: 'lista',
            titulo: 'Doctor',
            items: [
              'Atiende consultas y accede a la información clínica completa.',
              'Registra y edita pacientes, alergias, antecedentes y problemas crónicos.',
              'Archiva pacientes, genera documentos y gestiona el catálogo clínico.',
              'Gestiona SU propia agenda y puede crear copias de seguridad.'
            ]
          },
          {
            tipo: 'lista',
            titulo: 'Secretaria',
            items: [
              'Gestiona la agenda de TODOS los doctores y es la única que puede asignar una cita a otro doctor.',
              'Registra pacientes y edita sus datos de contacto.',
              'Ve nombres, teléfonos y motivos de cita; imprime reportes de agenda.',
              'Nunca ve diagnósticos, recetas, alergias ni consultas.'
            ]
          },
          {
            tipo: 'lista',
            titulo: 'Administrador (se suma al rol)',
            items: [
              'Gestionar los usuarios del equipo.',
              'Eliminar pacientes definitivamente.',
              'Restaurar copias de seguridad.',
              'Editar los datos de la clínica en Configuración.'
            ]
          },
          {
            tipo: 'aviso',
            tono: 'info',
            texto:
              'La frontera entre lo administrativo y lo clínico es el núcleo de la privacidad del expediente. La secretaria abre la ficha de un paciente y ve su contacto y sus citas, pero en lugar del historial ve un aviso explicando que lo clínico solo es accesible para los doctores.'
          }
        ]
      },
      {
        id: 'gestionar-equipo',
        titulo: 'Crear y administrar usuarios',
        resumen: 'Altas, contraseñas temporales, edición y desactivación.',
        permiso: 'usuarios.gestionar',
        bloques: [
          {
            tipo: 'pasos',
            titulo: 'Crear un usuario',
            pasos: [
              'Entre a Equipo y pulse el botón de nuevo usuario.',
              'Escriba el nombre tal como debe aparecer en las recetas que firme y en el historial de sus consultas.',
              'Elija el rol: Doctor o Secretaria.',
              'Escriba una contraseña inicial de al menos 8 caracteres y entréguesela a la persona.',
              'Guarde. La persona deberá cambiar esa contraseña la primera vez que entre.'
            ]
          },
          {
            tipo: 'lista',
            titulo: 'Otras acciones desde Equipo',
            items: [
              'Editar: cambiar el nombre, el rol o la condición de administrador.',
              'Asignar contraseña: entrega una temporal a quien olvidó la suya.',
              'Desactivar: la persona deja de aparecer en la pantalla de acceso, sin borrar nada de lo que registró.'
            ]
          },
          {
            tipo: 'aviso',
            tono: 'alerta',
            texto:
              'El sistema impide quedarse sin administradores: no puede quitar el último, ni desactivarlo, ni desactivar su propio usuario. Los nombres tampoco pueden repetirse entre usuarios.'
          }
        ]
      },
      {
        id: 'auditoria',
        titulo: 'Registro de auditoría',
        resumen: 'Qué queda registrado y dónde.',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Cada acción significativa queda registrada con fecha, autor y detalle: inicios de sesión (incluidos los fallidos), apertura de expedientes, alta y edición de pacientes y consultas, citas, documentos impresos, cambios en el equipo y copias de seguridad.'
          },
          {
            tipo: 'parrafo',
            texto:
              'El registro se guarda por duplicado a propósito: en la base de datos, para poder consultarlo, y en un archivo de texto aparte, que sobrevive aunque la base se restaure desde una copia anterior.'
          },
          {
            tipo: 'parrafo',
            texto:
              'El administrador puede revisarlo desde Configuración → Registro de auditoría, con el botón «Ver registro». Se muestran los 200 movimientos más recientes, con buscador por usuario, expediente o acción y filtro de fechas. Las acciones delicadas —expediente abierto, consulta anulada, paciente eliminado, copia restaurada, intento de acceso fallido— aparecen resaltadas.'
          },
          {
            tipo: 'aviso',
            tono: 'info',
            texto:
              'El registro es de solo lectura: no se puede editar ni borrar desde la aplicación.'
          }
        ]
      }
    ]
  },

  // ==========================================================================
  {
    id: 'respaldos',
    titulo: 'Copias de seguridad',
    temas: [
      {
        id: 'como-funcionan',
        titulo: 'Cuándo se crean las copias',
        resumen: 'Automáticas al abrir y al cerrar, y manuales cuando haga falta.',
        permiso: 'backups.crear',
        bloques: [
          {
            tipo: 'lista',
            items: [
              'Una copia diaria: al abrir el programa, si ese día todavía no se había hecho ninguna.',
              'Una copia al cerrar el programa, para que el último trabajo del día también quede respaldado.',
              'Las que usted cree a mano con «Crear backup ahora» en Configuración.'
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'Cada copia se verifica en cuanto se crea: el sistema la abre, comprueba su integridad y confirma que contiene el mismo número de pacientes que la base activa. Una copia dañada que nadie detecta es peor que no tener copia.'
          },
          {
            tipo: 'parrafo',
            texto:
              'Las copias se conservan 3 meses; las más antiguas se eliminan solas. Ninguna copia sobrescribe a otra jamás.'
          }
        ]
      },
      {
        id: 'copiar-usb',
        titulo: 'Llevarse una copia a una memoria USB',
        resumen: 'El paso que de verdad protege contra la pérdida del equipo.',
        permiso: 'backups.crear',
        bloques: [
          {
            tipo: 'aviso',
            tono: 'critico',
            texto:
              'Las copias se guardan en esta misma computadora, así que NO protegen si el disco duro falla, si el equipo se pierde o si lo roban. La copia a un medio externo es el único respaldo real.'
          },
          {
            tipo: 'pasos',
            pasos: [
              'Conecte la memoria USB.',
              'Entre a Configuración → Copias de seguridad.',
              'En la copia más reciente, pulse «Copiar a…».',
              'Elija la carpeta o la unidad de la memoria USB y confirme.'
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'Si pasan más de 7 días desde la última copia, la pantalla lo advierte con el número de días transcurridos. Una vez por semana es una costumbre razonable; guarde la memoria fuera de la clínica.'
          }
        ]
      },
      {
        id: 'restaurar',
        titulo: 'Restaurar una copia',
        resumen: 'Cómo volver a un estado anterior y qué se pierde al hacerlo.',
        permiso: 'backups.restaurar',
        bloques: [
          {
            tipo: 'aviso',
            tono: 'critico',
            texto:
              'Restaurar reemplaza TODA la información actual por la de la copia elegida. Los pacientes y consultas registrados después de esa fecha dejan de estar disponibles.'
          },
          {
            tipo: 'pasos',
            pasos: [
              'Entre a Configuración → Copias de seguridad.',
              'Pulse «Restaurar» en la copia que quiere recuperar.',
              'Lea la fecha de esa copia con atención.',
              'Escriba RESTAURAR para confirmar y pulse el botón rojo.',
              'La aplicación se recarga sola con la información restaurada.'
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'Antes de tocar nada, el sistema valida que el archivo sea una copia sana —si está dañada no se restaura y la base activa no se toca— y crea una copia del estado actual. Por eso restaurar siempre se puede deshacer: la pantalla le indica dónde quedó guardado el estado anterior.'
          }
        ]
      }
    ]
  },

  // ==========================================================================
  {
    id: 'actualizaciones',
    titulo: 'Actualizaciones y activación',
    temas: [
      ...TEMAS_LICENCIA,
      {
        id: 'como-actualizar',
        titulo: 'Instalar una versión nueva',
        resumen: 'Buscar, descargar e instalar sin volver a ejecutar un instalador.',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Cuando hay una versión nueva, DMedic se actualiza solo desde Configuración → Actualizaciones. No hay que descargar ni ejecutar ningún instalador a mano.'
          },
          {
            tipo: 'pasos',
            pasos: [
              'Al abrir el programa, unos segundos después, DMedic busca en silencio si hay novedades. También puede pulsar «Buscar actualizaciones» cuando quiera.',
              'Si hay una versión nueva, aparece con sus notas: qué cambió respecto a la que usa.',
              'Pulse «Descargar» y espere la barra de progreso.',
              'Cuando termine, pulse «Instalar». El programa se cierra, se actualiza y se vuelve a abrir.',
              'Al volver a abrirse aparece una ventana con el número de la versión nueva y la lista de cambios. Léala y pulse «Entendido»: se muestra una sola vez.'
            ]
          },
          {
            tipo: 'aviso',
            tono: 'info',
            texto:
              'El sistema nunca descarga ni instala por su cuenta: cada paso lo decide usted. Una actualización a mitad de una consulta sería inaceptable. Y al instalar, la copia de seguridad de cierre se hace ANTES de aplicar la actualización.'
          },
          {
            tipo: 'parrafo',
            texto:
              'Se necesita conexión a internet solo para este paso. Si no la hay, el sistema lo dice con claridad y todo lo demás sigue funcionando igual. Sus datos nunca se tocan: viven en una carpeta aparte que ninguna actualización modifica.'
          }
        ]
      }
    ]
  },

  // ==========================================================================
  {
    id: 'tecnico',
    titulo: 'Ficha técnica',
    temas: [
      {
        id: 'donde-viven-datos',
        titulo: 'Dónde vive la información',
        resumen: 'Carpetas, base de datos y formato de los archivos.',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Toda la información está en la carpeta de datos del usuario de Windows, no dentro del programa. Es lo que permite que reinstalar o actualizar DMedic nunca toque un expediente.'
          },
          {
            tipo: 'ficha',
            titulo: 'Carpeta %APPDATA%\\DMedic',
            datos: [
              { termino: 'data\\dmedic.db', detalle: 'La base de datos completa: pacientes, consultas, citas, catálogos, usuarios y auditoría. Formato SQLite.' },
              { termino: 'expedientes\\', detalle: 'Una carpeta por paciente con sus PDF, organizada en Recetas, Consultas, Exámenes y Documentos.' },
              { termino: 'backups\\', detalle: 'Las copias de seguridad, una por archivo, con fecha y hora en el nombre.' },
              { termino: 'reportes\\', detalle: 'Los reportes de agenda generados.' },
              { termino: 'logs\\', detalle: 'El registro de auditoría en texto plano.' }
            ]
          },
          {
            tipo: 'aviso',
            tono: 'alerta',
            texto:
              'Desinstalar DMedic no borra esta carpeta: los expedientes se conservan deliberadamente. Borrarla a mano sí destruye toda la información de la clínica.'
          }
        ]
      },
      {
        id: 'seguridad-tecnica',
        titulo: 'Seguridad',
        resumen: 'Contraseñas, sesión, aislamiento y red.',
        bloques: [
          {
            tipo: 'ficha',
            datos: [
              {
                termino: 'Contraseñas',
                detalle: 'Nunca se guardan. Se almacena un hash Argon2id con parámetros de coste altos (19 MB de memoria), de modo que probar contraseñas por fuerza bruta resulta extremadamente caro.'
              },
              {
                termino: 'Código de recuperación',
                detalle: '4 grupos de 5 caracteres de un alfabeto sin letras ni números ambiguos. También se guarda solo su hash; ni siquiera el programa puede volver a mostrarlo.'
              },
              {
                termino: 'Sesión',
                detalle: 'Vive únicamente en memoria del proceso principal. La interfaz no la almacena ni puede falsificarla: cada operación vuelve a preguntar quién es usted y qué permisos tiene.'
              },
              {
                termino: 'Permisos',
                detalle: 'Se verifican en el proceso principal, no en la pantalla. Ocultar un botón es comodidad; el control real está detrás.'
              },
              {
                termino: 'Red',
                detalle: 'La aplicación no puede navegar fuera de sí misma ni abrir otras ventanas. La única conexión que hace es buscar actualizaciones, y solo cuando usted lo pide o al arrancar.'
              },
              {
                termino: 'Una sola instancia',
                detalle: 'DMedic no puede abrirse dos veces a la vez: dos procesos escribiendo la misma base es una fuente segura de corrupción.'
              }
            ]
          }
        ]
      },
      {
        id: 'limites-datos',
        titulo: 'Límites y formatos de los datos',
        resumen: 'Lo que el sistema exige al guardar.',
        bloques: [
          {
            tipo: 'tabla',
            encabezados: ['Dato', 'Regla'],
            filas: [
              ['Número de expediente', 'EXP-AAAA-NNNN, asignado solo, reinicia cada año'],
              ['Número de identidad', '13 dígitos, único entre pacientes'],
              ['Contraseña', 'Mínimo 8 caracteres'],
              ['Nombre de usuario', 'Mínimo 3 caracteres, sin repetirse'],
              ['Fecha de nacimiento', 'No futura y de los últimos 120 años'],
              ['Contactos de emergencia', 'Hasta 3 por paciente'],
              ['Motivo de consulta', 'Obligatorio, mínimo 3 caracteres'],
              ['Diagnóstico principal', 'Como máximo uno por consulta'],
              ['Dosis y frecuencia', 'Obligatorias en cada medicamento recetado'],
              ['Duración de una cita', 'Entre 5 minutos y 8 horas; 30 minutos por defecto'],
              ['Logo de la clínica', 'PNG, JPG o SVG, hasta 512 KB']
            ]
          }
        ]
      },
      {
        id: 'catalogos-incluidos',
        titulo: 'Catálogos que trae el sistema',
        resumen: 'Lo que ya viene cargado desde el primer día.',
        bloques: [
          {
            tipo: 'ficha',
            datos: [
              { termino: 'Diagnósticos CIE-10', detalle: 'Alrededor de 144 códigos de uso frecuente en consulta general.' },
              { termino: 'Medicamentos', detalle: 'Cerca de 45 medicamentos habituales con su forma, concentración y vía.' },
              { termino: 'Exámenes y procedimientos', detalle: 'Unos 36 estudios de laboratorio, imagen y procedimientos con su preparación.' }
            ]
          },
          {
            tipo: 'parrafo',
            texto:
              'Todos son ampliables desde la pantalla Catálogo. Lo que usted agregue convive con lo incluido y aparece en los mismos buscadores.'
          }
        ]
      },
      {
        id: 'limitaciones',
        titulo: 'Los límites del sistema',
        resumen: 'Lo que DMedic deliberadamente no hace.',
        bloques: [
          {
            tipo: 'parrafo',
            texto:
              'Conviene tenerlos claros para no buscar lo que no está:'
          },
          {
            tipo: 'lista',
            items: [
              'Funciona en una sola computadora. No hay versión en red ni acceso desde otro equipo o desde el teléfono: los expedientes viven aquí y solo aquí.',
              'No puede abrirse dos veces a la vez en la misma computadora.',
              'No incluye facturación, cobros ni control de inventario.',
              'Los documentos se generan en PDF y se imprimen desde el visor de Windows; no hay firma electrónica.',
              'Lo único que necesita internet es buscar e instalar actualizaciones.'
            ]
          },
          {
            tipo: 'aviso',
            tono: 'info',
            texto:
              'Si alguna de estas hace falta en el día a día de la clínica, pídala: son decisiones de alcance, no impedimentos técnicos.'
          }
        ]
      }
    ]
  },

  // ==========================================================================
  {
    id: 'problemas',
    titulo: 'Problemas frecuentes',
    temas: [
      {
        id: 'soluciones',
        titulo: 'Qué hacer cuando algo no funciona',
        resumen: 'Los mensajes más comunes y su causa real.',
        bloques: [
          {
            tipo: 'tabla',
            encabezados: ['Lo que ve', 'Qué significa y qué hacer'],
            filas: [
              [
                '«Demasiados intentos fallidos»',
                'Cinco contraseñas incorrectas seguidas. Espere los minutos indicados; el bloqueo es solo para ese usuario.'
              ],
              [
                '«Esta consulta fue registrada por…»',
                'La consulta es de otro doctor y solo su autor puede modificarla.'
              ],
              [
                '«Esta consulta ya no puede editarse porque no fue creada hoy»',
                'Pasó el día en que se registró. Es el límite normal de un expediente clínico.'
              ],
              [
                '«Solo puede modificar las citas de su propia agenda»',
                'Un doctor gestiona su agenda; para tocar la de otro doctor debe hacerlo la secretaría.'
              ],
              [
                '«Ya existe un paciente registrado con ese número de identidad»',
                'El paciente ya está en el sistema. El mensaje indica en qué expediente; búsquelo en lugar de registrarlo otra vez.'
              ],
              [
                '«Esta consulta no tiene medicamentos ni exámenes indicados»',
                'No hay nada que imprimir en una receta. Agregue al menos un medicamento o un examen.'
              ],
              [
                '«Su usuario no tiene permiso para realizar esta acción»',
                'Su rol no cubre esa operación. Consulte la tabla de roles en la sección Equipo y permisos.'
              ],
              [
                '«No hay conexión a internet para buscar actualizaciones»',
                'Solo afecta a las actualizaciones. Todo lo demás funciona sin internet.'
              ],
              [
                'Está en modo desarrollo y no busca actualizaciones',
                'Está ejecutando una versión de prueba, no la instalada. Las actualizaciones solo funcionan en la versión instalada.'
              ]
            ]
          },
          {
            tipo: 'aviso',
            tono: 'alerta',
            texto:
              'Si el programa no abre o los datos parecen incompletos, no reinstale ni borre nada: avise a quien da soporte. La carpeta de datos y sus copias de seguridad son lo que permite recuperar la situación, y siguen intactas.'
          }
        ]
      }
    ]
  }
]

/** Texto plano de un tema, para poder buscar dentro del manual. */
export function textoDelTema(tema: Tema): string {
  const partes: string[] = [tema.titulo, tema.resumen]
  for (const bloque of tema.bloques) {
    switch (bloque.tipo) {
      case 'parrafo':
      case 'aviso':
        partes.push(bloque.texto)
        break
      case 'pasos':
        if (bloque.titulo) partes.push(bloque.titulo)
        partes.push(...bloque.pasos)
        break
      case 'lista':
        if (bloque.titulo) partes.push(bloque.titulo)
        partes.push(...bloque.items)
        break
      case 'tabla':
        partes.push(...bloque.encabezados, ...bloque.filas.flat())
        break
      case 'ficha':
        if (bloque.titulo) partes.push(bloque.titulo)
        for (const dato of bloque.datos) partes.push(dato.termino, dato.detalle)
        break
    }
  }
  return partes.join(' ').toLowerCase()
}
