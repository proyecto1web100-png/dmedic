# DMedic

Sistema de gestión clínica de escritorio para Windows. Funciona **100 % sin internet**:
la base de datos, los expedientes y los backups viven en la computadora de la clínica.

## Requisitos de desarrollo

- Node.js 20 o superior
- Windows 10/11 de 64 bits

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias |
| `npm run dev` | Ejecuta la aplicación en modo desarrollo |
| `npm run verificar` | Banco de pruebas del núcleo (pacientes, consultas, agenda, backups) |
| `npm run verificar:expediente` | Banco de pruebas del expediente ampliado, inventario y empresas |
| `npm run verificar:licencia` | Banco de pruebas del periodo de prueba y la activación |
| `npm run codigo -- <ID> [días]` | Genera un código de activación para un equipo |
| `npm run demo:sembrar` | Crea un perfil de ejemplo en `%TEMP%/dmedic-demo` para revisar la interfaz |
| `npm run typecheck` | Comprueba los tipos de los tres procesos |
| `npm run build` | Compila la aplicación a `out/` |
| `npm run dist` | Genera el instalador de Windows en `dist/` |

## Versión para Mac

El mismo código genera un instalador `.dmg` aparte (Apple Silicon e Intel).
El instalador de Windows no cambia y sus clientes no notan nada.

- **Sin un Mac:** cada release publicado con `npm run publicar` dispara el flujo
  `.github/workflows/mac.yml`, que compila en un Mac de GitHub y agrega los `.dmg`
  a ese mismo release. También se puede lanzar a mano desde *Actions → Version para
  Mac → Run workflow* y descargar los `.dmg` como artefacto.
- **En un Mac:** `npm run dist:mac` (o `npm run publicar:mac`).

La app no está firmada por Apple. La primera vez, el cliente la arrastra a
Aplicaciones y ejecuta en Terminal:

```bash
xattr -cr /Applications/DMedic.app
```

Por lo mismo, en Mac el botón *Descargar* de Configuración abre la página del
release en lugar de instalar solo: se descarga el `.dmg` nuevo, se reemplaza la
app en Aplicaciones y se repite el comando `xattr`. Firmar con una cuenta de
Apple Developer (99 USD/año) elimina ambos pasos.

Los datos se guardan en `~/Library/Application Support/DMedic/`, con la misma
estructura que en Windows. Se recomienda activar FileVault y Time Machine.

## Dónde se guardan los datos

Fuera de la carpeta del programa, para que una reinstalación o actualización
nunca los toque:

```
C:\Users\<usuario>\AppData\Roaming\DMedic\
├─ data\dmedic.db          Base de datos SQLite
├─ expedientes\            Un directorio por paciente, con sus PDF
├─ backups\                Copias automáticas (diarias y al cerrar)
├─ logs\auditoria.log      Registro técnico de auditoría
```

## Arquitectura

```
src/
├─ main/        Proceso principal: base de datos, servicios, PDF, backups, seguridad
├─ preload/     Puente tipado y aislado entre la ventana y el proceso principal
├─ renderer/    Interfaz React
└─ shared/      Tipos y validaciones que ambos lados comparten
```

La ventana no tiene acceso a Node, al sistema de archivos ni a la base de datos:
toda operación pasa por un canal IPC concreto y validado.

## Roles y permisos

| | Doctor | Secretaria | Administrador |
|---|:---:|:---:|:---:|
| Ver expedientes y consultas | Sí | **No** | Sí |
| Crear y editar consultas | Sí | No | Sí |
| Registrar pacientes y editar contacto | Sí | Sí | Sí |
| Alergias, antecedentes, crónicos | Sí | No | Sí |
| Ver la agenda | Sí | Sí | Sí |
| Gestionar **su propia** agenda | Sí | — | Sí |
| Agendar **para otro doctor** | **No** | **Sí** | No |
| Reportes de agenda en PDF | Sí (la suya) | Sí (todos) | Sí |
| Diagnósticos propios y protocolos | Sí | No | Sí |
| Gestionar usuarios | No | No | Sí |
| Restaurar copias de seguridad | No | No | Sí |
| Eliminar expedientes definitivamente | No | No | Sí |

Administrador es un permiso adicional que se suma al rol; hoy lo tiene el primer
usuario creado.

Reglas que se aplican en el proceso principal, no en la interfaz:

- Una consulta solo la corrige **su autor**, y solo el mismo día. Los demás
  doctores dejan constancia mediante adendas fechadas.
- Los expedientes son compartidos entre doctores, y **cada apertura queda
  registrada** en la auditoría con el nombre de quien la hizo.
- La receta se firma con el nombre del doctor que atendió la consulta, no con
  el configurado a nivel de clínica.
- La cita de control que un doctor indica al cerrar una consulta se agenda sola,
  en la agenda de ese mismo doctor.
- Un doctor solo ve y modifica **su** agenda. La secretaría ve la de todos y es
  la única que puede asignar una cita a otro doctor.
- El cruce de horarios se evalúa dentro de la agenda de cada doctor: dos
  doctores atendiendo a la misma hora no es un conflicto.

## Exámenes y procedimientos

En cada consulta se pueden indicar estudios —análisis de sangre, orina, imagen o
procedimientos—, buscándolos en el catálogo de la clínica o escribiendo uno que
no esté catalogado. Cada estudio lleva su tipo, su preparación (que se carga
sola desde el catálogo y queda editable) y una marca de **urgente**.

Lo indicado se imprime en la receta, en el resumen de consulta y en el
expediente. Cuando una consulta **no lleva medicamentos pero sí estudios**, el
documento sale titulado *Orden de exámenes* en lugar de receta, con una casilla
por estudio para que el laboratorio la marque.

Igual que los medicamentos de la receta, los estudios se copian dentro de la
consulta: editar o retirar un examen del catálogo nunca cambia lo que ya se le
indicó a un paciente. El catálogo se administra en **Catálogo clínico →
Exámenes y procedimientos**.

Los **protocolos de tratamiento** también pueden incluir los estudios que el
doctor suele pedir para un diagnóstico: al aplicar el protocolo en una consulta,
sus exámenes se agregan junto a sus medicamentos, y todo queda editable.

## Documentos en PDF

Todos en **tamaño carta** (612 × 792 pt), salvo la receta, que es configurable.
El banco de pruebas verifica el `MediaBox` de cada PDF generado: es la única
comprobación fiable de que saldrá en el papel correcto.

| Documento | Contenido | Dónde se guarda |
|---|---|---|
| Receta | Prescripción y exámenes indicados, con alergias visibles y firma del doctor que atendió. Si la consulta solo indica estudios, sale como **orden de exámenes** | `expedientes/<paciente>/Recetas` |
| Resumen de consulta | Una consulta completa | `expedientes/<paciente>/Consultas` |
| Expediente | Datos, contactos, alergias, antecedentes, crónicos e historial íntegro | `expedientes/<paciente>/Documentos` |
| Reporte de agenda | Citas por día, semana o mes, de un doctor o de todos | `reportes/` |

## Módulos

| Módulo | Estado |
|---|---|
| Autenticación y recuperación | Completo |
| Pacientes (alta, edición, búsqueda, archivado, borrado) | Completo |
| Expediente: alergias, antecedentes, problemas crónicos | Completo |
| Consultas, signos vitales, diagnósticos CIE-10, recetas | Completo |
| Exámenes y procedimientos indicados en consulta | Completo |
| Historial con línea de tiempo, tabla, filtros y comparación | Completo |
| Documentos PDF: receta y resumen de consulta | Completo |
| Agenda de citas: mes, semana, día | Completo |
| Backups automáticos, verificación y restauración | Completo |
| Configuración y auditoría | Completo |
| Plantillas de tratamiento del doctor (con medicamentos y exámenes) | Completo |
| Catálogo de exámenes de la clínica | Completo |
| Ficha social: escolaridad, ocupación, estado civil, historiador | Completo |
| Estudios adjuntos (laboratorios, radiografías) con interpretación | Completo |
| Constancias de incapacidad con folio y PDF | Completo |
| Referencias a otro médico o especialista | Completo |
| Medicación permanente por enfermedad de base | Completo |
| Inventario de medicamentos con entradas, salidas y ajustes | Completo |
| Empresas con convenio y reporte de atenciones | Completo |
| Periodo de prueba y activación por equipo | Completo |
| Exportación a Excel/CSV | No incluida (descartada por decisión de producto) |

## Periodo de prueba y activación

Cada equipo arranca con 24 horas de prueba. Al agotarse, el proceso principal
rechaza todos los canales IPC salvo los que la pantalla de bloqueo necesita, así
que el candado no se puede saltar desde la interfaz.

El código se calcula con HMAC sobre el identificador del equipo
(`MachineGuid` de Windows), de modo que uno entregado a una clínica no sirve en
otra. Hay dos clases de código:

- **Definitivo**: activa el equipo para siempre y vuelve a habilitar las
  actualizaciones automáticas.
- **Prórroga** de 7, 15 o 30 días: concede esos días de prueba adicionales y
  nada más. Cada código de prórroga solo se puede usar una vez en el mismo
  equipo, y mientras dura las actualizaciones siguen apagadas.

Los códigos se generan desde la pestaña **Códigos de activación** del Publicador
(`npm run publicador`): se pega el ID que muestra la computadora de la clínica y
salen los cuatro códigos con su botón de copiar. El ID se acepta con guiones o
sin ellos, en mayúsculas o minúsculas. También existe la vía de línea de
comandos, `npm run codigo -- <ID> [días]`, que da exactamente los mismos códigos.

Generar un código **no depende de la versión instalada en la clínica**: lo único
que interviene es la semilla y el identificador del equipo. Mientras la semilla
no cambie, un código emitido hoy sirve para cualquier versión compilada con
ella, sin tener que publicar nada nuevo.

El estado vive por duplicado en `%APPDATA%/DMedic/licencia.json` y en
`HKCU\Software\DMedic`: borrar uno de los dos no reinicia la prueba, y atrasar
el reloj la da por consumida.

> La semilla que firma los códigos está en `publicador/semilla.txt`, fuera de
> git porque este repositorio es público. electron-vite la inyecta al compilar.
> **Respáldela**: si se pierde, los códigos ya entregados no se pueden regenerar.

## Cómo publicar una actualización

La aplicación busca versiones nuevas en GitHub Releases. Descarga solo el
programa: **ninguna información de pacientes sale de la computadora de la
clínica**, y si no hay internet todo lo demás funciona igual.

Antes de la primera publicación, en `electron-builder.yml` hay que reemplazar
`owner` por el usuario real de GitHub.

La forma normal de hacerlo es el **Publicador**, una herramienta interna que
vive en `publicador/`. Se abre con doble clic en `publicador/Publicador.bat`
(o con `npm run publicador`). Pide la versión nueva y las notas para el doctor,
y se encarga del resto: compila, sube el instalador como GitHub Release, escribe
las notas, y confirma `package.json` en el repositorio.

El token de GitHub se pide una sola vez y queda en `publicador/token.txt`, que
está en `.gitignore` y nunca se sube.

El Publicador **no forma parte de la aplicación**: el instalador solo empaqueta
`out/**` y `package.json` (ver `files:` en `electron-builder.yml`), así que esta
carpeta no puede llegar a la computadora de la clínica.

También se puede hacer a mano:

```bash
# 1. Subir el número de versión en package.json (1.0.0 → 1.1.0)
# 2. Confirmar que todo pasa
npm run verificar

# 3. Publicar (requiere la variable GH_TOKEN con un token de GitHub)
npm run publicar
```

Eso genera el instalador y lo sube como release. La próxima vez que el doctor
abra DMedic verá el aviso en Configuración, y decide cuándo instalarlo: nunca
se actualiza solo ni a mitad de una consulta.

### Reglas al cambiar la base de datos

- **Nunca se edita una migración ya publicada.** Se agrega una nueva al final
  del arreglo `MIGRACIONES` en `src/main/db/migraciones.ts`.
- Antes de aplicar cualquier migración pendiente, el programa guarda una copia
  intacta en `backups/` con el nombre `dmedic-pre-actualizacion-vN-…`.
- Si alguien instala una versión anterior sobre datos ya migrados, el programa
  se niega a abrir y lo explica, en lugar de operar contra un esquema
  desconocido.

### Si una actualización sale mal

1. Instalar el `.exe` de la versión anterior (guarda un archivo de cada versión
   que entregues).
2. Restaurar desde Configuración la copia `dmedic-pre-actualizacion-…`.

## Notas de seguridad

- Contraseña con Argon2id; bloqueo progresivo tras 5 intentos fallidos.
- Código de recuperación de un solo uso, entregado al instalar. **No se puede reemitir.**
- El archivo de la base de datos **no está cifrado**: quien copie `dmedic.db` a otra
  computadora puede leerlo. Se recomienda activar BitLocker en el equipo de la clínica.
- Las consultas solo se pueden editar el mismo día en que se crearon; después se
  agregan adendas fechadas. Ninguna consulta se elimina: se anula con motivo.
