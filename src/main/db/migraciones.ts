import type { Database } from 'better-sqlite3'

interface Migracion {
  version: number
  nombre: string
  sql: string
}

const ESQUEMA_INICIAL = `
-- ===== Sistema =====
CREATE TABLE usuario (
  id                INTEGER PRIMARY KEY,
  nombre            TEXT    NOT NULL,
  password_hash     TEXT    NOT NULL,
  recuperacion_hash TEXT,
  recuperacion_usada INTEGER NOT NULL DEFAULT 0,
  intentos_fallidos INTEGER NOT NULL DEFAULT 0,
  bloqueado_hasta   TEXT,
  creado_en         TEXT    NOT NULL
);

CREATE TABLE configuracion_clinica (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  nombre_clinica TEXT NOT NULL,
  direccion      TEXT,
  telefono       TEXT,
  logo_data_url  TEXT,
  nombre_doctor  TEXT NOT NULL,
  especialidad   TEXT,
  tema           TEXT NOT NULL DEFAULT 'claro' CHECK (tema IN ('claro','oscuro')),
  tamano_fuente  TEXT NOT NULL DEFAULT 'normal' CHECK (tamano_fuente IN ('normal','grande'))
);

CREATE TABLE auditoria (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha      TEXT NOT NULL,
  accion     TEXT NOT NULL,
  entidad    TEXT,
  entidad_id INTEGER,
  detalle    TEXT
);
CREATE INDEX idx_auditoria_fecha ON auditoria(fecha DESC);

-- ===== Paciente =====
CREATE TABLE paciente (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_expediente      TEXT    NOT NULL UNIQUE,
  primer_nombre          TEXT    NOT NULL,
  segundo_nombre         TEXT,
  primer_apellido        TEXT    NOT NULL,
  segundo_apellido       TEXT,
  fecha_nacimiento       TEXT    NOT NULL,
  sexo                   TEXT    NOT NULL CHECK (sexo IN ('M','F')),
  numero_identidad       TEXT    UNIQUE,
  telefono               TEXT,
  correo                 TEXT,
  direccion              TEXT,
  tipo_sangre            TEXT,
  aseguradora            TEXT,
  referido_por           TEXT,
  notas                  TEXT,
  responsable_id         INTEGER REFERENCES paciente(id) ON DELETE SET NULL,
  responsable_parentesco TEXT,
  activo                 INTEGER NOT NULL DEFAULT 1,
  creado_en              TEXT    NOT NULL,
  actualizado_en         TEXT    NOT NULL
);
CREATE INDEX idx_paciente_apellidos ON paciente(primer_apellido, primer_nombre);
CREATE INDEX idx_paciente_activo ON paciente(activo);
CREATE INDEX idx_paciente_responsable ON paciente(responsable_id);

-- Busqueda instantanea sobre nombre, identidad y expediente.
-- rowid = paciente.id. Se mantiene desde el repositorio en la misma transaccion.
CREATE VIRTUAL TABLE paciente_fts USING fts5(
  texto,
  tokenize="unicode61 remove_diacritics 2"
);

CREATE TABLE contacto_emergencia (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
  nombre      TEXT    NOT NULL,
  telefono    TEXT    NOT NULL,
  parentesco  TEXT
);
CREATE INDEX idx_contacto_paciente ON contacto_emergencia(paciente_id);

CREATE TABLE alergia (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id   INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
  sustancia     TEXT    NOT NULL,
  reaccion      TEXT,
  gravedad      TEXT    NOT NULL CHECK (gravedad IN ('leve','moderada','grave')),
  activa        INTEGER NOT NULL DEFAULT 1,
  registrada_en TEXT    NOT NULL
);
CREATE INDEX idx_alergia_paciente ON alergia(paciente_id, activa);

CREATE TABLE antecedente (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id  INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
  tipo         TEXT    NOT NULL CHECK (tipo IN
                 ('personal_patologico','familiar','quirurgico','habitos','gineco_obstetrico')),
  descripcion  TEXT    NOT NULL,
  registrado_en TEXT   NOT NULL,
  vigente      INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_antecedente_paciente ON antecedente(paciente_id, tipo);

CREATE TABLE problema_cronico (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id  INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
  codigo_cie10 TEXT,
  descripcion  TEXT    NOT NULL,
  desde        TEXT,
  activo       INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_cronico_paciente ON problema_cronico(paciente_id, activo);

-- ===== Catalogos =====
CREATE TABLE cie10 (
  codigo      TEXT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  categoria   TEXT
);
CREATE INDEX idx_cie10_descripcion ON cie10(descripcion);

CREATE TABLE medicamento (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT    NOT NULL,
  forma         TEXT,
  concentracion TEXT,
  via           TEXT,
  activo        INTEGER NOT NULL DEFAULT 1,
  UNIQUE (nombre, concentracion, forma)
);
CREATE INDEX idx_medicamento_nombre ON medicamento(nombre);

-- Protocolos propios del doctor. El sistema nunca genera contenido clinico.
CREATE TABLE plantilla_tratamiento (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_cie10    TEXT    NOT NULL REFERENCES cie10(codigo),
  nombre          TEXT    NOT NULL,
  tratamiento     TEXT,
  recomendaciones TEXT
);
CREATE INDEX idx_plantilla_cie10 ON plantilla_tratamiento(codigo_cie10);

CREATE TABLE plantilla_tratamiento_item (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  plantilla_id   INTEGER NOT NULL REFERENCES plantilla_tratamiento(id) ON DELETE CASCADE,
  medicamento_id INTEGER REFERENCES medicamento(id),
  nombre         TEXT    NOT NULL,
  concentracion  TEXT,
  forma          TEXT,
  dosis          TEXT    NOT NULL,
  frecuencia     TEXT    NOT NULL,
  duracion       TEXT,
  via            TEXT,
  indicaciones   TEXT
);
CREATE INDEX idx_plantilla_item ON plantilla_tratamiento_item(plantilla_id);

-- ===== Clinico =====
CREATE TABLE consulta (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id        INTEGER NOT NULL REFERENCES paciente(id),
  fecha              TEXT    NOT NULL,
  motivo             TEXT    NOT NULL,
  sintomas           TEXT,
  exploracion        TEXT,
  tratamiento        TEXT,
  observaciones      TEXT,
  recomendaciones    TEXT,
  proxima_cita_fecha TEXT,
  sin_proxima_cita   INTEGER NOT NULL DEFAULT 0,
  estado             TEXT    NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','anulada')),
  motivo_anulacion   TEXT,
  creada_en          TEXT    NOT NULL,
  actualizada_en     TEXT    NOT NULL
);
CREATE INDEX idx_consulta_paciente ON consulta(paciente_id, fecha DESC);
CREATE INDEX idx_consulta_fecha ON consulta(fecha DESC);

CREATE TABLE signos_vitales (
  consulta_id            INTEGER PRIMARY KEY REFERENCES consulta(id) ON DELETE CASCADE,
  peso                   REAL,
  altura                 REAL,
  imc                    REAL,
  presion_sistolica      REAL,
  presion_diastolica     REAL,
  temperatura            REAL,
  frecuencia_cardiaca    REAL,
  frecuencia_respiratoria REAL,
  saturacion_oxigeno     REAL,
  glucosa                REAL
);

CREATE TABLE consulta_diagnostico (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  consulta_id  INTEGER NOT NULL REFERENCES consulta(id) ON DELETE CASCADE,
  codigo_cie10 TEXT    NOT NULL,
  descripcion  TEXT    NOT NULL,
  es_principal INTEGER NOT NULL DEFAULT 0,
  nota         TEXT
);
CREATE INDEX idx_diagnostico_consulta ON consulta_diagnostico(consulta_id);
CREATE INDEX idx_diagnostico_codigo ON consulta_diagnostico(codigo_cie10);

-- Una consulta cerrada no se reescribe: se le agregan adendas fechadas.
CREATE TABLE adenda_consulta (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  consulta_id INTEGER NOT NULL REFERENCES consulta(id) ON DELETE CASCADE,
  texto       TEXT    NOT NULL,
  creada_en   TEXT    NOT NULL
);
CREATE INDEX idx_adenda_consulta ON adenda_consulta(consulta_id);

-- ===== Receta =====
CREATE TABLE receta (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  consulta_id  INTEGER NOT NULL UNIQUE REFERENCES consulta(id) ON DELETE CASCADE,
  fecha        TEXT    NOT NULL,
  archivo_path TEXT
);

CREATE TABLE receta_item (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  receta_id      INTEGER NOT NULL REFERENCES receta(id) ON DELETE CASCADE,
  medicamento_id INTEGER REFERENCES medicamento(id),
  nombre         TEXT    NOT NULL,
  concentracion  TEXT,
  forma          TEXT,
  dosis          TEXT    NOT NULL,
  frecuencia     TEXT    NOT NULL,
  duracion       TEXT,
  via            TEXT,
  indicaciones   TEXT,
  orden          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_receta_item ON receta_item(receta_id, orden);

CREATE TABLE documento_generado (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id  INTEGER NOT NULL REFERENCES paciente(id),
  consulta_id  INTEGER REFERENCES consulta(id),
  tipo         TEXT    NOT NULL,
  archivo_path TEXT    NOT NULL,
  creado_en    TEXT    NOT NULL
);
CREATE INDEX idx_documento_paciente ON documento_generado(paciente_id, creado_en DESC);
`

const AGENDA = `
CREATE TABLE cita (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Nulo cuando se agenda a alguien que todavia no es paciente registrado.
  paciente_id           INTEGER REFERENCES paciente(id) ON DELETE CASCADE,
  nombre_provisional    TEXT,
  telefono_provisional  TEXT,
  fecha                 TEXT    NOT NULL,
  -- Nula cuando la consulta solo indico el dia, sin hora concreta.
  hora                  TEXT,
  duracion_minutos      INTEGER NOT NULL DEFAULT 30,
  motivo                TEXT,
  estado                TEXT    NOT NULL DEFAULT 'agendada'
                          CHECK (estado IN ('agendada','atendida','no_asistio','cancelada')),
  notas                 TEXT,
  -- Consulta que origino esta cita de control, y consulta en que se atendio.
  consulta_origen_id    INTEGER REFERENCES consulta(id) ON DELETE SET NULL,
  consulta_atencion_id  INTEGER REFERENCES consulta(id) ON DELETE SET NULL,
  creada_en             TEXT    NOT NULL,
  actualizada_en        TEXT    NOT NULL,
  CHECK (paciente_id IS NOT NULL OR nombre_provisional IS NOT NULL)
);
CREATE INDEX idx_cita_fecha ON cita(fecha, hora);
CREATE INDEX idx_cita_paciente ON cita(paciente_id, fecha DESC);
CREATE INDEX idx_cita_estado ON cita(estado);
CREATE UNIQUE INDEX idx_cita_origen ON cita(consulta_origen_id)
  WHERE consulta_origen_id IS NOT NULL;
`

/**
 * De un solo doctor a un equipo con roles. Todo lo existente se atribuye al
 * unico usuario que habia, que pasa a ser administrador: ningun expediente ni
 * consulta queda sin autor.
 */
const USUARIOS_Y_ROLES = `
ALTER TABLE usuario ADD COLUMN rol TEXT NOT NULL DEFAULT 'doctor';
ALTER TABLE usuario ADD COLUMN es_administrador INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuario ADD COLUMN activo INTEGER NOT NULL DEFAULT 1;
ALTER TABLE usuario ADD COLUMN debe_cambiar_password INTEGER NOT NULL DEFAULT 0;

UPDATE usuario
   SET rol = 'doctor', es_administrador = 1
 WHERE id = (SELECT MIN(id) FROM usuario);

ALTER TABLE consulta ADD COLUMN usuario_id INTEGER REFERENCES usuario(id);
UPDATE consulta
   SET usuario_id = (SELECT MIN(id) FROM usuario)
 WHERE usuario_id IS NULL;
CREATE INDEX idx_consulta_usuario ON consulta(usuario_id);

ALTER TABLE cita ADD COLUMN creada_por INTEGER REFERENCES usuario(id);
UPDATE cita
   SET creada_por = (SELECT MIN(id) FROM usuario)
 WHERE creada_por IS NULL;

-- Con varios usuarios, una accion sin autor no sirve de nada.
ALTER TABLE auditoria ADD COLUMN usuario_id INTEGER;
ALTER TABLE auditoria ADD COLUMN usuario_nombre TEXT;
`

/**
 * Cada cita pasa a pertenecer a un doctor concreto: sin eso no se puede separar
 * la agenda de cada uno ni emitir reportes por doctor.
 */
const AGENDA_POR_DOCTOR = `
ALTER TABLE cita ADD COLUMN doctor_id INTEGER REFERENCES usuario(id);

-- Si la cita nacio de una consulta, pertenece al doctor que la atendio.
UPDATE cita
   SET doctor_id = (SELECT c.usuario_id FROM consulta c WHERE c.id = cita.consulta_origen_id)
 WHERE doctor_id IS NULL AND consulta_origen_id IS NOT NULL;

-- El resto se atribuye al primer doctor, para que ninguna quede huerfana.
UPDATE cita
   SET doctor_id = (SELECT MIN(id) FROM usuario WHERE rol = 'doctor')
 WHERE doctor_id IS NULL;

CREATE INDEX idx_cita_doctor ON cita(doctor_id, fecha);

-- Diagnosticos propios de la clinica, que no vienen del catalogo base.
ALTER TABLE cie10 ADD COLUMN es_personalizado INTEGER NOT NULL DEFAULT 0;

ALTER TABLE configuracion_clinica
  ADD COLUMN tamano_receta TEXT NOT NULL DEFAULT 'carta'
  CHECK (tamano_receta IN ('carta','media_carta'));
`

const MIGRACIONES: Migracion[] = [
  { version: 1, nombre: 'esquema_inicial', sql: ESQUEMA_INICIAL },
  { version: 2, nombre: 'agenda_de_citas', sql: AGENDA },
  { version: 3, nombre: 'usuarios_y_roles', sql: USUARIOS_Y_ROLES },
  { version: 4, nombre: 'agenda_por_doctor', sql: AGENDA_POR_DOCTOR }
]

/** Version de esquema que este programa sabe manejar. */
export const VERSION_ESQUEMA = MIGRACIONES[MIGRACIONES.length - 1].version

function asegurarTablaMigracion(db: Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS migracion (
    version   INTEGER PRIMARY KEY,
    nombre    TEXT NOT NULL,
    aplicada_en TEXT NOT NULL
  )`)
}

/** 0 cuando la base todavia no tiene ninguna migracion aplicada. */
export function versionDeLaBase(db: Database): number {
  asegurarTablaMigracion(db)
  const fila = db.prepare('SELECT MAX(version) AS version FROM migracion').get() as {
    version: number | null
  }
  return fila.version ?? 0
}

function versionesAplicadas(db: Database): Set<number> {
  asegurarTablaMigracion(db)
  return new Set(
    db
      .prepare('SELECT version FROM migracion')
      .all()
      .map((f) => (f as { version: number }).version)
  )
}

/**
 * Se compara contra el conjunto de migraciones aplicadas, no contra el numero
 * mas alto: si faltara una intermedia, seguir el maximo la daria por aplicada.
 */
export function migracionesPendientes(db: Database): number[] {
  const aplicadas = versionesAplicadas(db)
  return MIGRACIONES.filter((m) => !aplicadas.has(m.version)).map((m) => m.version)
}

export function hayMigracionesPendientes(db: Database): boolean {
  return migracionesPendientes(db).length > 0
}

/**
 * La base fue creada por una version mas nueva del programa. Seguir adelante
 * significaria operar contra un esquema desconocido y corromper expedientes,
 * asi que el arranque se detiene con un mensaje claro.
 */
export class ErrorBaseMasNueva extends Error {
  readonly codigo = 'BASE_MAS_NUEVA'
  constructor(
    readonly versionBase: number,
    readonly versionPrograma: number
  ) {
    super(
      `Esta información fue creada por una versión más reciente de DMedic ` +
        `(esquema ${versionBase}; este programa maneja hasta el ${versionPrograma}). ` +
        `Instale la versión más reciente para poder abrirla.`
    )
  }
}

export function aplicarMigraciones(db: Database): void {
  const actual = versionDeLaBase(db)
  if (actual > VERSION_ESQUEMA) throw new ErrorBaseMasNueva(actual, VERSION_ESQUEMA)

  const aplicadas = versionesAplicadas(db)

  const registrar = db.prepare(
    'INSERT INTO migracion (version, nombre, aplicada_en) VALUES (?, ?, ?)'
  )

  for (const migracion of MIGRACIONES) {
    if (aplicadas.has(migracion.version)) continue
    // Cada migracion es atomica: o se aplica entera o la base queda intacta.
    db.transaction(() => {
      db.exec(migracion.sql)
      registrar.run(migracion.version, migracion.nombre, new Date().toISOString())
    })()
  }
}
