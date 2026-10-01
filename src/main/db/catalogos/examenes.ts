/**
 * Catalogo inicial de examenes y procedimientos de indicacion habitual, para
 * que el buscador no arranque vacio. Es un catalogo de referencia, NO una
 * indicacion clinica: el doctor lo edita, amplia o vacia desde el catalogo.
 */
import type { CategoriaExamen } from '@shared/types'

export interface FilaExamen {
  nombre: string
  categoria: CategoriaExamen
  preparacion: string | null
}

export const EXAMENES_BASE: FilaExamen[] = [
  // ===== Laboratorio =====
  { nombre: 'Hemograma completo', categoria: 'laboratorio', preparacion: null },
  { nombre: 'Glucosa en ayunas', categoria: 'laboratorio', preparacion: 'Ayuno de 8 horas' },
  { nombre: 'Hemoglobina glicosilada (HbA1c)', categoria: 'laboratorio', preparacion: null },
  { nombre: 'Perfil lipídico', categoria: 'laboratorio', preparacion: 'Ayuno de 12 horas' },
  { nombre: 'Perfil hepático', categoria: 'laboratorio', preparacion: 'Ayuno de 8 horas' },
  { nombre: 'Perfil renal (creatinina y urea)', categoria: 'laboratorio', preparacion: null },
  { nombre: 'Ácido úrico', categoria: 'laboratorio', preparacion: 'Ayuno de 8 horas' },
  { nombre: 'Electrolitos séricos', categoria: 'laboratorio', preparacion: null },
  { nombre: 'Examen general de orina', categoria: 'laboratorio', preparacion: 'Primera orina de la mañana, chorro medio' },
  { nombre: 'Urocultivo', categoria: 'laboratorio', preparacion: 'Antes de iniciar antibiótico' },
  { nombre: 'Examen general de heces', categoria: 'laboratorio', preparacion: null },
  { nombre: 'Perfil tiroideo (TSH, T3, T4)', categoria: 'laboratorio', preparacion: null },
  { nombre: 'Prueba de embarazo en sangre', categoria: 'laboratorio', preparacion: null },
  { nombre: 'Tipeo sanguíneo y Rh', categoria: 'laboratorio', preparacion: null },
  { nombre: 'Proteína C reactiva', categoria: 'laboratorio', preparacion: null },
  { nombre: 'Velocidad de sedimentación globular', categoria: 'laboratorio', preparacion: null },
  { nombre: 'Prueba rápida de dengue', categoria: 'laboratorio', preparacion: null },
  { nombre: 'Gota gruesa (malaria)', categoria: 'laboratorio', preparacion: null },
  { nombre: 'Antígeno prostático (PSA)', categoria: 'laboratorio', preparacion: null },
  { nombre: 'Tiempos de coagulación (TP y TPT)', categoria: 'laboratorio', preparacion: null },

  // ===== Imagen =====
  { nombre: 'Radiografía de tórax', categoria: 'imagen', preparacion: null },
  { nombre: 'Radiografía de abdomen', categoria: 'imagen', preparacion: null },
  { nombre: 'Ultrasonido abdominal', categoria: 'imagen', preparacion: 'Ayuno de 8 horas' },
  { nombre: 'Ultrasonido pélvico', categoria: 'imagen', preparacion: 'Con vejiga llena' },
  { nombre: 'Ultrasonido obstétrico', categoria: 'imagen', preparacion: null },
  { nombre: 'Ultrasonido renal y vías urinarias', categoria: 'imagen', preparacion: 'Con vejiga llena' },
  { nombre: 'Mamografía', categoria: 'imagen', preparacion: 'Sin desodorante ni talco el día del estudio' },
  { nombre: 'Tomografía computarizada', categoria: 'imagen', preparacion: null },
  { nombre: 'Resonancia magnética', categoria: 'imagen', preparacion: 'Retirar objetos metálicos' },

  // ===== Procedimientos =====
  { nombre: 'Electrocardiograma', categoria: 'procedimiento', preparacion: null },
  { nombre: 'Espirometría', categoria: 'procedimiento', preparacion: null },
  { nombre: 'Citología cervical (Papanicolaou)', categoria: 'procedimiento', preparacion: 'Sin relaciones ni óvulos 48 horas antes' },
  { nombre: 'Curación de herida', categoria: 'procedimiento', preparacion: null },
  { nombre: 'Retiro de puntos', categoria: 'procedimiento', preparacion: null },
  { nombre: 'Nebulización', categoria: 'procedimiento', preparacion: null }
]
