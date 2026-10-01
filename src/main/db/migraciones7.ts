/**
 * Migracion 7. Amplia el expediente con lo que la clinica pidio despues de la
 * primera version: ficha social del paciente, archivos de estudios, constancias
 * de incapacidad, referencias a especialista, medicacion permanente, control de
 * existencias de medicamentos y convenios con empresas.
 *
 * Vive en su propio archivo porque es larga: migraciones.ts se volvia dificil
 * de leer con todo el SQL mezclado.
 */
export const EXPEDIENTE_AMPLIADO = `
-- ===== Ficha social del paciente =====
-- Datos que no cambian por consulta y que el doctor necesita para interpretar
-- la historia: escolaridad, ocupacion y quien relata los hechos.
ALTER TABLE paciente ADD COLUMN nivel_educativo TEXT;
ALTER TABLE paciente ADD COLUMN ocupacion TEXT;
ALTER TABLE paciente ADD COLUMN estado_civil TEXT;
-- "Historiador": quien da la historia clinica. En un menor o en un paciente que
-- no puede relatar, no es el propio paciente, y eso cambia como se lee todo.
ALTER TABLE paciente ADD COLUMN historiador TEXT;
ALTER TABLE paciente ADD COLUMN historiador_parentesco TEXT;

-- ===== Empresas con convenio =====
CREATE TABLE empresa (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo    TEXT    NOT NULL UNIQUE,
  nombre    TEXT    NOT NULL,
  contacto  TEXT,
  telefono  TEXT,
  correo    TEXT,
  notas     TEXT,
  activa    INTEGER NOT NULL DEFAULT 1,
  creada_en TEXT    NOT NULL
);
CREATE INDEX idx_empresa_nombre ON empresa(nombre);

ALTER TABLE paciente ADD COLUMN empresa_id INTEGER REFERENCES empresa(id) ON DELETE SET NULL;
-- Numero de empleado dentro de la empresa: es como la empresa lo identifica.
ALTER TABLE paciente ADD COLUMN codigo_empleado TEXT;
CREATE INDEX idx_paciente_empresa ON paciente(empresa_id);

-- ===== Archivos de estudios =====
-- Resultados de laboratorio, radiografias e imagenes. El archivo se copia a la
-- carpeta del paciente: si el original se mueve o se borra, el expediente
-- conserva el suyo y los respaldos lo incluyen.
CREATE TABLE adjunto (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id     INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
  consulta_id     INTEGER REFERENCES consulta(id) ON DELETE SET NULL,
  categoria       TEXT    NOT NULL DEFAULT 'laboratorio'
                    CHECK (categoria IN ('laboratorio','imagen','procedimiento','otro')),
  titulo          TEXT    NOT NULL,
  descripcion     TEXT,
  fecha_estudio   TEXT,
  archivo_path    TEXT    NOT NULL,
  nombre_original TEXT    NOT NULL,
  extension       TEXT,
  tamano_bytes    INTEGER NOT NULL DEFAULT 0,
  usuario_id      INTEGER REFERENCES usuario(id),
  creado_en       TEXT    NOT NULL
);
CREATE INDEX idx_adjunto_paciente ON adjunto(paciente_id, creado_en DESC);
CREATE INDEX idx_adjunto_consulta ON adjunto(consulta_id);

-- ===== Incapacidades =====
CREATE TABLE incapacidad (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id      INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
  consulta_id      INTEGER REFERENCES consulta(id) ON DELETE SET NULL,
  folio            TEXT    NOT NULL UNIQUE,
  fecha_emision    TEXT    NOT NULL,
  desde            TEXT    NOT NULL,
  hasta            TEXT    NOT NULL,
  dias             INTEGER NOT NULL,
  motivo           TEXT    NOT NULL,
  codigo_cie10     TEXT,
  diagnostico      TEXT,
  observaciones    TEXT,
  -- Una constancia entregada no se borra: se anula dejando el motivo escrito.
  estado           TEXT    NOT NULL DEFAULT 'vigente'
                     CHECK (estado IN ('vigente','anulada')),
  motivo_anulacion TEXT,
  usuario_id       INTEGER REFERENCES usuario(id),
  archivo_path     TEXT,
  creada_en        TEXT    NOT NULL,
  CHECK (dias > 0),
  CHECK (hasta >= desde)
);
CREATE INDEX idx_incapacidad_paciente ON incapacidad(paciente_id, desde DESC);

-- ===== Referencias a otro medico =====
CREATE TABLE referencia (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id      INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
  consulta_id      INTEGER REFERENCES consulta(id) ON DELETE SET NULL,
  folio            TEXT    NOT NULL UNIQUE,
  fecha            TEXT    NOT NULL,
  dirigida_a       TEXT    NOT NULL,
  especialidad     TEXT,
  institucion      TEXT,
  motivo           TEXT    NOT NULL,
  resumen_clinico  TEXT,
  hallazgos        TEXT,
  codigo_cie10     TEXT,
  diagnostico      TEXT,
  urgente          INTEGER NOT NULL DEFAULT 0,
  estado           TEXT    NOT NULL DEFAULT 'vigente'
                     CHECK (estado IN ('vigente','anulada')),
  motivo_anulacion TEXT,
  usuario_id       INTEGER REFERENCES usuario(id),
  archivo_path     TEXT,
  creada_en        TEXT    NOT NULL
);
CREATE INDEX idx_referencia_paciente ON referencia(paciente_id, fecha DESC);

-- ===== Medicacion permanente =====
-- Lo que el paciente ya toma por su enfermedad de base, independiente de las
-- recetas de cada consulta. Es informativa: se muestra al atender para que el
-- doctor la tenga presente al recetar.
CREATE TABLE medicacion_cronica (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id    INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
  medicamento_id INTEGER REFERENCES medicamento(id),
  nombre         TEXT    NOT NULL,
  concentracion  TEXT,
  forma          TEXT,
  dosis          TEXT    NOT NULL,
  frecuencia     TEXT    NOT NULL,
  via            TEXT,
  indicaciones   TEXT,
  -- Enfermedad base por la que la toma: "hipertension", "diabetes tipo 2".
  motivo         TEXT,
  desde          TEXT,
  activa         INTEGER NOT NULL DEFAULT 1,
  registrada_en  TEXT    NOT NULL
);
CREATE INDEX idx_cronica_paciente ON medicacion_cronica(paciente_id, activa);

-- ===== Existencias de medicamentos =====
-- Solo los medicamentos que la clinica entrega llevan control; el resto del
-- catalogo se sigue usando para recetar sin inventario de por medio.
ALTER TABLE medicamento ADD COLUMN controla_inventario INTEGER NOT NULL DEFAULT 0;
ALTER TABLE medicamento ADD COLUMN existencia REAL NOT NULL DEFAULT 0;
ALTER TABLE medicamento ADD COLUMN minimo REAL NOT NULL DEFAULT 0;
ALTER TABLE medicamento ADD COLUMN unidad TEXT;
ALTER TABLE medicamento ADD COLUMN vencimiento TEXT;

CREATE TABLE movimiento_inventario (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  medicamento_id        INTEGER NOT NULL REFERENCES medicamento(id) ON DELETE CASCADE,
  tipo                  TEXT    NOT NULL CHECK (tipo IN ('entrada','salida','ajuste')),
  cantidad              REAL    NOT NULL,
  -- Existencia que quedo despues del movimiento: deja el historial auditable
  -- sin tener que recalcular toda la cadena.
  existencia_resultante REAL    NOT NULL,
  lote                  TEXT,
  vencimiento           TEXT,
  motivo                TEXT,
  paciente_id           INTEGER REFERENCES paciente(id) ON DELETE SET NULL,
  consulta_id           INTEGER REFERENCES consulta(id) ON DELETE SET NULL,
  usuario_id            INTEGER REFERENCES usuario(id),
  fecha                 TEXT    NOT NULL
);
CREATE INDEX idx_movimiento_medicamento ON movimiento_inventario(medicamento_id, fecha DESC);
CREATE INDEX idx_movimiento_fecha ON movimiento_inventario(fecha DESC);

-- ===== Datos del profesional =====
-- Una incapacidad y una referencia son documentos con valor legal: llevan el
-- numero de colegiacion de quien las firma.
ALTER TABLE usuario ADD COLUMN numero_colegiacion TEXT;
`
