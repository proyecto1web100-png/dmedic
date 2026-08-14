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

## Notas de seguridad

- Contraseña con Argon2id; bloqueo progresivo tras 5 intentos fallidos.
- Código de recuperación de un solo uso, entregado al instalar. **No se puede reemitir.**
- El archivo de la base de datos **no está cifrado**: quien copie `dmedic.db` a otra
  computadora puede leerlo. Se recomienda activar BitLocker en el equipo de la clínica.
- Las consultas solo se pueden editar el mismo día en que se crearon; después se
  agregan adendas fechadas. Ninguna consulta se elimina: se anula con motivo.
