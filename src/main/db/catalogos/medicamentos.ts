/**
 * Catalogo inicial de medicamentos genericos de uso habitual, para que el
 * autocompletado no arranque vacio. Es un catalogo de referencia, NO una
 * recomendacion clinica: el doctor lo edita, amplia o vacia desde Configuracion.
 */
export interface FilaMedicamento {
  nombre: string
  forma: string
  concentracion: string | null
  via: string
}

export const MEDICAMENTOS_BASE: FilaMedicamento[] = [
  { nombre: 'Acetaminofén', forma: 'Tableta', concentracion: '500 mg', via: 'Oral' },
  { nombre: 'Acetaminofén', forma: 'Jarabe', concentracion: '160 mg/5 mL', via: 'Oral' },
  { nombre: 'Ibuprofeno', forma: 'Tableta', concentracion: '400 mg', via: 'Oral' },
  { nombre: 'Ibuprofeno', forma: 'Suspensión', concentracion: '100 mg/5 mL', via: 'Oral' },
  { nombre: 'Naproxeno', forma: 'Tableta', concentracion: '500 mg', via: 'Oral' },
  { nombre: 'Diclofenaco', forma: 'Tableta', concentracion: '50 mg', via: 'Oral' },
  { nombre: 'Amoxicilina', forma: 'Cápsula', concentracion: '500 mg', via: 'Oral' },
  { nombre: 'Amoxicilina', forma: 'Suspensión', concentracion: '250 mg/5 mL', via: 'Oral' },
  { nombre: 'Amoxicilina + Ácido clavulánico', forma: 'Tableta', concentracion: '875/125 mg', via: 'Oral' },
  { nombre: 'Azitromicina', forma: 'Tableta', concentracion: '500 mg', via: 'Oral' },
  { nombre: 'Cefalexina', forma: 'Cápsula', concentracion: '500 mg', via: 'Oral' },
  { nombre: 'Ciprofloxacino', forma: 'Tableta', concentracion: '500 mg', via: 'Oral' },
  { nombre: 'Trimetoprima + Sulfametoxazol', forma: 'Tableta', concentracion: '160/800 mg', via: 'Oral' },
  { nombre: 'Metronidazol', forma: 'Tableta', concentracion: '500 mg', via: 'Oral' },
  { nombre: 'Nitrofurantoína', forma: 'Cápsula', concentracion: '100 mg', via: 'Oral' },
  { nombre: 'Doxiciclina', forma: 'Cápsula', concentracion: '100 mg', via: 'Oral' },
  { nombre: 'Fluconazol', forma: 'Cápsula', concentracion: '150 mg', via: 'Oral' },
  { nombre: 'Albendazol', forma: 'Tableta', concentracion: '400 mg', via: 'Oral' },
  { nombre: 'Loratadina', forma: 'Tableta', concentracion: '10 mg', via: 'Oral' },
  { nombre: 'Cetirizina', forma: 'Tableta', concentracion: '10 mg', via: 'Oral' },
  { nombre: 'Omeprazol', forma: 'Cápsula', concentracion: '20 mg', via: 'Oral' },
  { nombre: 'Ranitidina', forma: 'Tableta', concentracion: '150 mg', via: 'Oral' },
  { nombre: 'Metoclopramida', forma: 'Tableta', concentracion: '10 mg', via: 'Oral' },
  { nombre: 'Butilhioscina', forma: 'Tableta', concentracion: '10 mg', via: 'Oral' },
  { nombre: 'Sales de rehidratación oral', forma: 'Sobre', concentracion: null, via: 'Oral' },
  { nombre: 'Losartán', forma: 'Tableta', concentracion: '50 mg', via: 'Oral' },
  { nombre: 'Enalapril', forma: 'Tableta', concentracion: '10 mg', via: 'Oral' },
  { nombre: 'Amlodipino', forma: 'Tableta', concentracion: '5 mg', via: 'Oral' },
  { nombre: 'Hidroclorotiazida', forma: 'Tableta', concentracion: '25 mg', via: 'Oral' },
  { nombre: 'Atenolol', forma: 'Tableta', concentracion: '50 mg', via: 'Oral' },
  { nombre: 'Metformina', forma: 'Tableta', concentracion: '850 mg', via: 'Oral' },
  { nombre: 'Glibenclamida', forma: 'Tableta', concentracion: '5 mg', via: 'Oral' },
  { nombre: 'Atorvastatina', forma: 'Tableta', concentracion: '20 mg', via: 'Oral' },
  { nombre: 'Levotiroxina', forma: 'Tableta', concentracion: '50 mcg', via: 'Oral' },
  { nombre: 'Salbutamol', forma: 'Inhalador', concentracion: '100 mcg/dosis', via: 'Inhalatoria' },
  { nombre: 'Prednisona', forma: 'Tableta', concentracion: '20 mg', via: 'Oral' },
  { nombre: 'Betametasona', forma: 'Crema', concentracion: '0.05 %', via: 'Tópica' },
  { nombre: 'Hidrocortisona', forma: 'Crema', concentracion: '1 %', via: 'Tópica' },
  { nombre: 'Clotrimazol', forma: 'Crema', concentracion: '1 %', via: 'Tópica' },
  { nombre: 'Mupirocina', forma: 'Ungüento', concentracion: '2 %', via: 'Tópica' },
  { nombre: 'Ácido fólico', forma: 'Tableta', concentracion: '5 mg', via: 'Oral' },
  { nombre: 'Sulfato ferroso', forma: 'Tableta', concentracion: '300 mg', via: 'Oral' },
  { nombre: 'Complejo B', forma: 'Tableta', concentracion: null, via: 'Oral' },
  { nombre: 'Carbonato de calcio + Vitamina D', forma: 'Tableta', concentracion: '600 mg/400 UI', via: 'Oral' }
]
