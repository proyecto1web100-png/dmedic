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
| `npm run verificar` | Ejecuta el banco de pruebas contra el código real |
| `npm run typecheck` | Comprueba los tipos de los tres procesos |
| `npm run build` | Compila la aplicación a `out/` |
| `npm run dist` | Genera el instalador de Windows en `dist/` |

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

## Documentos en PDF

Todos en **tamaño carta** (612 × 792 pt), salvo la receta, que es configurable.
El banco de pruebas verifica el `MediaBox` de cada PDF generado: es la única
comprobación fiable de que saldrá en el papel correcto.

| Documento | Contenido | Dónde se guarda |
|---|---|---|
| Receta | Prescripción con alergias visibles y firma del doctor que atendió | `expedientes/<paciente>/Recetas` |
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
| Historial con línea de tiempo, tabla, filtros y comparación | Completo |
| Documentos PDF: receta y resumen de consulta | Completo |
| Agenda de citas: mes, semana, día | Completo |
| Backups automáticos, verificación y restauración | Completo |
| Configuración y auditoría | Completo |
| Plantillas de tratamiento del doctor | Motor listo; falta pantalla de gestión |
| Exportación a Excel/CSV | No incluida (descartada por decisión de producto) |

## Cómo publicar una actualización

La aplicación busca versiones nuevas en GitHub Releases. Descarga solo el
programa: **ninguna información de pacientes sale de la computadora de la
clínica**, y si no hay internet todo lo demás funciona igual.

Antes de la primera publicación, en `electron-builder.yml` hay que reemplazar
`owner` por el usuario real de GitHub.

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
